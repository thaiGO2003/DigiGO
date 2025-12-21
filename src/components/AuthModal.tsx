import React, { useState, useEffect } from 'react'
import Turnstile from 'react-turnstile'
import { X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const { signIn, signUp, resetPassword } = useAuth()

  useEffect(() => {
    // Get referral code from URL query parameter
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      setReferralCode(ref)
      setMode('register') // Auto switch to register mode if ref code present
    }
  }, [isOpen])

  useEffect(() => {
    setCaptchaToken(null)
  }, [mode, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

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
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Username123"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">3-50 ký tự, chỉ chữ, số và gạch dưới</p>
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
              <input
                type="text"
                id="referralCode"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Nhập Mã giới thiệu nếu có"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 uppercase"
                maxLength={8}
              />
            </div>
          )}

          {/* Cloudflare Turnstile */}
          {mode !== 'forgot' && import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY && (
            <div className="flex justify-center my-4">
              <Turnstile
                key={`turnstile-${mode}`}
                sitekey={import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />
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
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Quên mật khẩu?
                </button>
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