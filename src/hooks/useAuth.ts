import { useState, useEffect } from 'react'
import { supabase, User } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Auto-refresh profile every 10 seconds to keep balance/info updated
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      refreshProfile()
    }, 3000)

    return () => clearInterval(interval)
  }, [user?.id])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUser(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
    }
  }

  const signIn = async (identity: string, password: string, captchaToken?: string) => {
    let emailToUse = identity

    // Nếu không phải là email, tìm email từ username
    if (!identity.includes('@')) {
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_email_by_identity', {
        p_identity: identity
      })

      if (resolvedEmail) {
        emailToUse = resolvedEmail
      } else if (!rpcError) {
        // RPC thành công nhưng không tìm thấy user
        return { error: { message: 'Tên đăng nhập không tồn tại' } as any }
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
      options: {
        captchaToken
      }
    })
    return { error }
  }

  const signUp = async (email: string, password: string, username?: string, fullName?: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        },
        captchaToken
      },
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
  }
}