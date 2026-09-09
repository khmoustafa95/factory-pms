-- =============================================================================
-- نظام إدارة المشاريع — حسابات تجريبية فقط
-- التشغيل المحلي: `npm run supabase:reset`
-- Staging البعيد: `npx supabase db reset --linked`
-- الحسابات وكلمة المرور: انظر `supabase/demo-accounts.md`
-- =============================================================================

begin;

-- pgcrypto lives in schema `extensions` on hosted Supabase; local Docker
-- often exposes crypt/gen_salt via search_path, but remote seed does not.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- المصانع (مطلوبة لربط مدراء المصانع)
-- ---------------------------------------------------------------------------

insert into public.factories (id, name, code, location, is_active) values
  ('f1111111-1111-4111-8111-111111111111', 'مصنع دمشق للتصنيع', 'DMS', 'دمشق، سوريا', true),
  ('f2222222-2222-4222-8222-222222222222', 'مجمع حلب الصناعي', 'ALP', 'حلب، سوريا', true);

-- ---------------------------------------------------------------------------
-- مستخدمو المصادقة
-- تُنشأ الملفات الشخصية عبر on_auth_user_created من app_metadata
-- (role + factory_id + can_control). لا تعطّل مشغّلات auth.users.
-- كلمة المرور لجميع الحسابات: demo123456
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'director@demo.local',
    extensions.crypt('demo123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"company_director","can_control":true}'::jsonb,
    '{"full_name":"عمر الراشد"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a7777777-7777-4777-8777-777777777777',
    'authenticated',
    'authenticated',
    'director.viewer@demo.local',
    extensions.crypt('demo123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"company_director","can_control":false}'::jsonb,
    '{"full_name":"ليلى الحسن"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'fm.damascus@demo.local',
    extensions.crypt('demo123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"factory_manager","factory_id":"f1111111-1111-4111-8111-111111111111","can_control":true}'::jsonb,
    '{"full_name":"مصطفى الحربي"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a4444444-4444-4444-8444-444444444444',
    'authenticated',
    'authenticated',
    'fm.damascus.viewer@demo.local',
    extensions.crypt('demo123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"factory_manager","factory_id":"f1111111-1111-4111-8111-111111111111","can_control":false}'::jsonb,
    '{"full_name":"سارة الدمشقي"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a3333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'fm.aleppo@demo.local',
    extensions.crypt('demo123456', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"factory_manager","factory_id":"f2222222-2222-4222-8222-222222222222","can_control":true}'::jsonb,
    '{"full_name":"يوسف الابراهيم"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  );

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values
  ('a1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', '{"sub":"a1111111-1111-4111-8111-111111111111","email":"director@demo.local"}'::jsonb, 'email', 'a1111111-1111-4111-8111-111111111111', now(), now(), now()),
  ('a7777777-7777-4777-8777-777777777777', 'a7777777-7777-4777-8777-777777777777', '{"sub":"a7777777-7777-4777-8777-777777777777","email":"director.viewer@demo.local"}'::jsonb, 'email', 'a7777777-7777-4777-8777-777777777777', now(), now(), now()),
  ('a2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', '{"sub":"a2222222-2222-4222-8222-222222222222","email":"fm.damascus@demo.local"}'::jsonb, 'email', 'a2222222-2222-4222-8222-222222222222', now(), now(), now()),
  ('a4444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444', '{"sub":"a4444444-4444-4444-8444-444444444444","email":"fm.damascus.viewer@demo.local"}'::jsonb, 'email', 'a4444444-4444-4444-8444-444444444444', now(), now(), now()),
  ('a3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', '{"sub":"a3333333-3333-4333-8333-333333333333","email":"fm.aleppo@demo.local"}'::jsonb, 'email', 'a3333333-3333-4333-8333-333333333333', now(), now(), now());

insert into public.currencies (code, name_en, name_ar, symbol, is_default, is_active, sort_order) values
  ('USD', 'US Dollar', 'دولار أمريكي', '$', true, true, 0)
on conflict (code) do nothing;

commit;
