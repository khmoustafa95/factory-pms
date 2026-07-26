import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type UserRole = 'company_director' | 'factory_manager' | 'project_manager'

interface ActorProfile {
  id: string
  role: UserRole
  factory_id: string | null
  is_active: boolean
}

interface CreateBody {
  action: 'create'
  email: string
  full_name: string
  role: UserRole
  factory_id: string | null
  is_active?: boolean
}

interface ResetBody {
  action: 'reset_password'
  user_id: string
}

type RequestBody = CreateBody | ResetBody

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function generatePassword(length = 12): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function canProvisionRole(
  actor: ActorProfile,
  targetRole: UserRole,
  targetFactoryId: string | null,
): boolean {
  if (!actor.is_active) {
    return false
  }

  if (actor.role === 'company_director') {
    return (
      (targetRole === 'factory_manager' || targetRole === 'project_manager') &&
      targetFactoryId !== null
    )
  }

  if (actor.role === 'factory_manager') {
    return (
      targetRole === 'project_manager' &&
      targetFactoryId !== null &&
      targetFactoryId === actor.factory_id
    )
  }

  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { data: actor, error: actorError } = await admin
    .from('profiles')
    .select('id, role, factory_id, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (actorError || !actor) {
    return jsonResponse({ error: 'Profile not found' }, 403)
  }

  const actorProfile = actor as ActorProfile

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (body.action === 'create') {
    const email = body.email?.trim().toLowerCase()
    const fullName = body.full_name?.trim()
    const role = body.role
    let factoryId = body.factory_id

    if (!email || !fullName || !role) {
      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    if (actorProfile.role === 'factory_manager') {
      factoryId = actorProfile.factory_id
    }

    if (!canProvisionRole(actorProfile, role, factoryId)) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    const password = generatePassword()

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          user_role: role,
          role,
          factory_id: factoryId,
        },
        app_metadata: {
          user_role: role,
          factory_id: factoryId,
        },
      })

    if (createError || !created.user) {
      return jsonResponse(
        { error: createError?.message ?? 'Unable to create user' },
        400,
      )
    }

    // Keep app_metadata in sync for future JWT/custom claims use.
    await admin.auth.admin.updateUserById(created.user.id, {
      app_metadata: {
        user_role: role,
        factory_id: factoryId,
      },
    })

    if (body.is_active === false) {
      const { error: deactivateError } = await admin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', created.user.id)

      if (deactivateError) {
        return jsonResponse(
          {
            error: `User created but failed to set inactive: ${deactivateError.message}`,
          },
          500,
        )
      }
    }

    return jsonResponse({
      user_id: created.user.id,
      email,
      password,
    })
  }

  if (body.action === 'reset_password') {
    const targetUserId = body.user_id
    if (!targetUserId) {
      return jsonResponse({ error: 'Missing user_id' }, 400)
    }

    const { data: target, error: targetError } = await admin
      .from('profiles')
      .select('id, role, factory_id, is_active')
      .eq('id', targetUserId)
      .maybeSingle()

    if (targetError || !target) {
      return jsonResponse({ error: 'Target account not found' }, 404)
    }

    const targetProfile = target as ActorProfile

    if (
      !canProvisionRole(
        actorProfile,
        targetProfile.role,
        targetProfile.factory_id,
      )
    ) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    const password = generatePassword()

    const { error: updateError } = await admin.auth.admin.updateUserById(
      targetUserId,
      { password },
    )

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400)
    }

    const { error: revokeError } = await admin.rpc('revoke_user_sessions', {
      p_user_id: targetUserId,
    })

    if (revokeError) {
      return jsonResponse(
        {
          error: `Password updated but failed to revoke sessions: ${revokeError.message}`,
        },
        500,
      )
    }

    return jsonResponse({
      user_id: targetUserId,
      password,
    })
  }

  return jsonResponse({ error: 'Unknown action' }, 400)
})
