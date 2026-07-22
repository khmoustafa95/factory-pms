import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const isConfigured = isSupabaseConfigured()
  const [isLoading, setIsLoading] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) {
      return
    }

    const supabase = getSupabase()
    let isMounted = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        setSession(null)
        setProfile(null)
        setIsLoading(false)
        return
      }

      setSession(data.session)

      if (data.session?.user) {
        try {
          const nextProfile = await fetchProfile(data.session.user.id)
          if (isMounted) {
            setProfile(nextProfile)
          }
        } catch {
          if (isMounted) {
            setProfile(null)
          }
        }
      }

      if (isMounted) {
        setIsLoading(false)
      }
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (!nextSession?.user) {
        setProfile(null)
        return
      }

      void fetchProfile(nextSession.user.id)
        .then((nextProfile) => {
          if (isMounted) {
            setProfile(nextProfile)
          }
        })
        .catch(() => {
          if (isMounted) {
            setProfile(null)
          }
        })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [isConfigured])

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }
  }

  const signOut = async () => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isConfigured,
      signIn,
      signOut,
    }),
    [session, profile, isLoading, isConfigured, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
