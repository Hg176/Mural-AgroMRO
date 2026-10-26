import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Profile } from './types'

interface AuthState {
  loading: boolean
  session: Session | null
  /** Nulo para quem tem conta no Supabase mas não foi liberado no mural. */
  profile: Profile | null
  isAdmin: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string | undefined) {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      // Fora do callback para não travar o cliente do Supabase (recomendação da lib).
      setTimeout(() => loadProfile(newSession?.user.id), 0)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    loading,
    session,
    profile,
    isAdmin: profile?.role === 'admin',
    refreshProfile: () => loadProfile(session?.user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return context
}

/** Para as telas que só aparecem depois do login. */
// eslint-disable-next-line react-refresh/only-export-components
export function useProfile(): Profile {
  const { profile } = useAuth()
  if (!profile) throw new Error('Sem perfil carregado')
  return profile
}
