import React, { useState, useEffect } from 'react'
import Turnstile from 'react-turnstile'
import { X, Eye, EyeOff, Check, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialReferralCode?: string
}

export default function AuthModal({ isOpen, onClose, initialReferralCode }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [checkingCode, setCheckingCode] = useState(false)
  const [codeValid, setCodeValid] = useState<boolean | null>(null)
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)

  const { signIn, signUp, resetPassword } = useAuth()

  useEffect(() => {
    // Get referral code from URL query parameter or prop
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref') || initialReferralCode
    
    if (ref) {
      // Force update order: Set code FIRST, then mode.
      // And ensure we don't clear it immediately in the other effect.
      // Use functional update to ensure we are setting it even if it was just cleared
      setReferralCode(ref)
      
      // We must also set mode to register
      setMode('register') 
      
      // And check code
      checkCode(ref)
    }
  }, [isOpen, initialReferralCode])

  useEffect(() => {
    setCaptchaToken(null)
    setCodeValid(null)
    
    // Only clear if NOT register.
    // AND if we have an initialReferralCode, ensure we don't clear it just because isOpen changed.
    // The previous fix used `!ref`, but ref is local to the other effect.
    // We need to check initialReferralCode prop OR the URL param again.
    
    const params = new URLSearchParams(window.location.search)
    const urlRef = params.get('ref')
    const hasPersistentRef = !!initialReferralCode || !!urlRef

    if (mode !== 'register') {
      // If we are not in register mode, we generally want to clear.
      // BUT if we have a persistent ref, and we just opened the modal (isOpen changed),
      // we might be in a transient state where mode is 'login' but about to be 'register'.
      // If we clear here, we lose the code.
      
      // If hasPersistentRef is true, we should be careful.
      // If user MANUALLY switched to login, we can clear.
      // But how to distinguish manual switch from initial load?
      // Initial load: isOpen=true, mode='login' (default).
      // Manual switch: isOpen=true, mode changes from 'register' to 'login'.
      
      // If hasPersistentRef is true, maybe we just DON'T clear it? 
      // If user goes to Login, the field is hidden anyway.
      // If they go back to Register, it's nice if the code is still there.
      // So simply: if there is a persistent ref, never auto-clear.
      
      if (!hasPersistentRef) {
        setReferralCode('')
      }
    }
  }, [mode, isOpen, initialReferralCode])

  const checkCode = async (code: string) => {
    if (!code || code.length < 8) {
      setCodeValid(null)
      return
    }
    setCheckingCode(true)
    console.log('Checking code:', code)
    try {
      const { data, error } = await supabase.rpc('check_referral_code', { p_code: code })
      
      console.log('Check result:', { data, error })

      if (error) {
        console.error('Error checking referral code:', error)
        // Nếu lỗi hệ thống, tạm thời cho là không hợp lệ để an toàn, nhưng log ra
        setCodeValid(false) 
      } else if (data === true) {
        setCodeValid(true)
      } else {
        setCodeValid(false)
      }
    } catch (err) {
      console.error('Exception checking referral code:', err)
      setCodeValid(false)
    } finally {
      setCheckingCode(false)
    }
  }

  const checkUsername = async (u: string) => {
    if (!u || u.length < 3) {
      setUsernameValid(null)
      return
    }
    // Regex check first
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(u)) {
      setUsernameValid(false)
      return
    }

    setCheckingUsername(true)
    try {
      const { data, error } = await supabase.rpc('check_username_exists', { p_username: u })
      if (error) {
        console.error('Error checking username:', error)
        // Assume valid if check fails to avoid blocking user, or false? 
        // Better to not block if system error, but here we want uniqueness.
        // Let's rely on submit error if check fails.
        setUsernameValid(null)
      } else {
        // data = true means exists (invalid for registration), false means available (valid)
        setUsernameValid(!data)
      }
    } catch (err) {
      console.error(err)
      setUsernameValid(null)
    } finally {
      setCheckingUsername(false)
    }
  }


  
  // Inside component
  const checkUsernameTimeoutRef = React.useRef<any>(null) // Use any to avoid NodeJS types issue if not installed

  const onUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value
    // Strip '@' if present
    val = val.replace(/@/g, '')
    
    setUsername(val)
    
    // Reset state
    setUsernameValid(null)
    
    if (checkUsernameTimeoutRef.current) clearTimeout(checkUsernameTimeoutRef.current)
    checkUsernameTimeoutRef.current = setTimeout(() => {
      checkUsername(val)
    }, 500)
  }
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase()
    setReferralCode(val)
    if (val.length === 8) {
      checkCode(val)
    } else {
      setCodeValid(null)
    }
  }

  const reloadCaptcha = () => {
    setCaptchaKey(prev => prev + 1)
    setCaptchaToken(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'register' && referralCode && codeValid === false) {
      setMessage('Mã giới thiệu không tồn tại. Vui lòng kiểm tra lại hoặc để trống.')
      setLoading(false)
      return
    }

    // Check Captcha for login and register
    if (mode !== 'forgot' && !captchaToken && import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY) {
      setMessage('Vui lòng hoàn thành xác thực bảo mật (Captcha)')
      setLoading(false)
      return
    }

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password, captchaToken || undefined)
        if (error) throw error
        onClose()
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp')
        }
        if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
          throw new Error('Tên đăng nhập không hợp lệ (3-50 ký tự, chỉ chữ, số và gạch dưới)')
        }
        
        // Prevent submit if username invalid
        if (usernameValid === false) {
          throw new Error('Tên đăng nhập đã tồn tại')
        }

        const { data, error } = await signUp(email, password, username, fullName, captchaToken || undefined, referralCode.trim())
        if (error) throw error

        if (data?.session) {
          setMessage('Đăng ký thành công! Đang đăng nhập...')
          setTimeout(() => onClose(), 1500)
        } else {
          setMessage('Đăng ký thành công! Bây giờ bạn có thể đăng nhập.')
          setMode('login')
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email)
        if (error) throw error
        setMessage('Email khôi phục mật khẩu đã được gửi!')
      }
    } catch (error: any) {
      if (error.message === 'Invalid login credentials') {
        setMessage('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.')
      } else if (error.message === 'User already registered') {
        setMessage('Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.')
      } else if (error.message?.includes('captcha')) {
        setMessage('Lỗi xác thực Captcha. Vui lòng nhấn "Tải lại Captcha" và thử lại.')
        setCaptchaToken(null)
      } else {
        setMessage(error.message || 'Có lỗi xảy ra')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">
              {mode === 'login' && 'Đăng nhập'}
              {mode === 'register' && 'Đăng ký tài khoản'}
              {mode === 'forgot' && 'Quên mật khẩu'}
            </h2>
            {mode === 'register' && (
              <p className="text-sm text-gray-500 mt-1">
                Hoặc <button onClick={() => setMode('login')} className="text-blue-600 hover:underline">đăng nhập</button> nếu đã có tài khoản
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={onUsernameChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10 ${
                      usernameValid === true ? 'border-green-500 bg-green-50' : 
                      usernameValid === false ? 'border-red-500 bg-red-50' : 
                      'border-gray-300'
                    }`}
                    placeholder="Username123"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {checkingUsername ? (
                      <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                    ) : usernameValid === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : usernameValid === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">3-50 ký tự, chỉ chữ, số và gạch dưới</p>
                {usernameValid === false && <p className="text-xs text-red-600 mt-1">Tên đăng nhập đã tồn tại hoặc không hợp lệ</p>}
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Họ tên
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {mode === 'login' ? 'Email hoặc Tên đăng nhập' : 'Email (để khôi phục tài khoản)'}
            </label>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder={mode === 'register' ? "Your@email.com" : "Email hoặc Tên đăng nhập"}
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder={mode === 'register' ? "Tối thiểu 6 ký tự" : "Nhập Mật khẩu"}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder="Nhập lại Mật khẩu"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-2">
                Mã giới thiệu <span className="text-gray-400 font-normal">(tùy chọn)</span>
              </label>
              <div className="relative">
                <input
                    type="text"
                    id="referralCode"
                    value={referralCode}
                    onChange={handleCodeChange}
                    placeholder="Nhập Mã giới thiệu nếu có"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 uppercase pr-10 ${
                      codeValid === true ? 'border-green-500 bg-green-50' : 
                      codeValid === false ? 'border-red-500 bg-red-50' : 
                      'border-gray-300'
                    } ${!!initialReferralCode && codeValid === true ? 'cursor-not-allowed opacity-75' : ''}`}
                    maxLength={8}
                    readOnly={!!initialReferralCode && codeValid === true}
                  />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {checkingCode ? (
                    <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                  ) : codeValid === true ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : codeValid === false ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              </div>
              {checkingCode && <p className="text-xs text-blue-500 mt-1">Đang kiểm tra...</p>}
              {codeValid === true && <p className="text-xs text-green-600 mt-1">Mã hợp lệ!</p>}
              {codeValid === false && <p className="text-xs text-red-600 mt-1">Mã không tồn tại (Vui lòng kiểm tra lại)</p>}
            </div>
          )}

          {/* Cloudflare Turnstile */}
          {mode !== 'forgot' && import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY && (
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative">
                <Turnstile
                  key={`turnstile-${mode}-${captchaKey}`}
                  sitekey={import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
              </div>
              <button
                type="button"
                onClick={reloadCaptcha}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Tải lại Captcha
              </button>
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-md text-sm ${message.includes('thành công') || message.includes('gửi')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
              }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang xử lý...' :
              mode === 'login' ? 'Đăng nhập' :
                mode === 'register' ? 'Đăng ký' : 'Gửi email khôi phục'}
          </button>

          <div className="text-center space-y-2 text-sm">
            {mode === 'login' && (
              <>
                <div>
                  <span className="text-gray-600">Chưa có tài khoản? </span>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Đăng ký
                  </button>
                </div>
              </>
            )}

            {mode === 'register' && (
              <div>
                <span className="text-gray-600">Đã có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Đăng nhập
                </button>
              </div>
            )}

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-600 hover:text-blue-800"
              >
                Quay lại đăng nhập
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}