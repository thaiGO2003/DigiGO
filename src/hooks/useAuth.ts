import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, User } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const isFetchingProfile = useRef(false)
  const lastUserId = useRef<string | null>(null)
  const lastBalance = useRef<number | null>(null)
  const isShowingAlert = useRef(false)

  const fetchUserProfile = useCallback(async (userId: string, currentRetry = 0) => {
    if (isFetchingProfile.current && currentRetry === 0) return

    try {
      isFetchingProfile.current = true
      if (currentRetry > 0) {
        setIsRetrying(true)
        setRetryCount(currentRetry)
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      // Check for balance change
      if (lastBalance.current !== null && data.balance > lastBalance.current && !isShowingAlert.current) {
        const amount = data.balance - lastBalance.current
        isShowingAlert.current = true
        // Use a small timeout to ensure alert doesn't block the UI thread immediately
        setTimeout(() => {
          alert(`Nạp tiền thành công! +${amount.toLocaleString('vi-VN')}đ vào tài khoản.`)
          isShowingAlert.current = false
        }, 100)
      }
      lastBalance.current = data.balance

      setUser(data)
      lastUserId.current = userId
      setIsRetrying(false)
      setRetryCount(0)
      setLoading(false)
      setIsInitializing(false)
    } catch (error) {
      console.error(`Error fetching profile (Attempt ${currentRetry + 1}):`, error)

      if (currentRetry < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await fetchUserProfile(userId, currentRetry + 1)
      } else {
        setIsRetrying(false)
        setIsInitializing(false)
        setLoading(false)
        // Nếu không lấy được profile nhưng vẫn có session, ta vẫn giữ session
        // nhưng user profile sẽ là null. Không ép logout để tránh loop.
      }
    } finally {
      isFetchingProfile.current = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // 1. Lấy session hiện tại ngay lập tức
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return

      setSession(initialSession)
      if (initialSession?.user) {
        fetchUserProfile(initialSession.user.id)
      } else {
        setLoading(false)
        setIsInitializing(false)
      }
    })

    // 2. Lắng nghe thay đổi Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return

      console.log('Auth Event:', event)
      setSession(currentSession)

      if (currentSession?.user) {
        // Chỉ fetch lại nếu là user mới hoặc các sự kiện quan trọng
        if (currentSession.user.id !== lastUserId.current || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchUserProfile(currentSession.user.id)
        }
      } else {
        setUser(null)
        lastUserId.current = null
        setLoading(false)
        setIsInitializing(false)
      }
    })

    // 3. Lắng nghe thay đổi dữ liệu User (Realtime Balance/Profile)
    let userSubscription: any = null
    if (session?.user) {
      userSubscription = supabase
        .channel(`user-profile-${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('User profile updated via realtime:', payload.new)
            setUser(payload.new as User)
          }
        )
        .subscribe()
    }

    // 4. Xử lý khi quay lại Tab (Visibility Change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Kiểm tra nhanh session khi quay lại tab
        supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
          if (activeSession && activeSession.user.id !== lastUserId.current) {
            fetchUserProfile(activeSession.user.id)
          }
        })
      }
    }
    window.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (userSubscription) userSubscription.unsubscribe()
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchUserProfile, session?.user?.id])

  // Refresh profile định kỳ (mỗi 5 giây để check số dư theo yêu cầu)
  useEffect(() => {
    if (!session?.user) return

    const interval = setInterval(() => {
      fetchUserProfile(session.user.id)
    }, 5000)

    return () => clearInterval(interval)
  }, [session?.user?.id, fetchUserProfile])

  const signIn = async (identity: string, password: string, captchaToken?: string) => {
    let emailToUse = identity
    if (!identity.includes('@')) {
      const { data: resolvedEmail } = await supabase.rpc('get_email_by_identity', { p_identity: identity })
      if (resolvedEmail) emailToUse = resolvedEmail
      else return { error: { message: 'Tên đăng nhập không tồn tại' } as any }
    }
    return await supabase.auth.signInWithPassword({ email: emailToUse, password, options: { captchaToken } })
  }

  const signUp = async (email: string, password: string, username?: string, fullName?: string, captchaToken?: string, referralCode?: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
          referral_code: referralCode
        },
        captchaToken
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    lastUserId.current = null
    window.location.href = '/'
  }

  const resetPassword = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email)
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile: () => session?.user && fetchUserProfile(session.user.id),
    retryCount,
    isRetrying,
    isInitializing,
  }
}