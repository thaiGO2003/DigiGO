import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [referralCode, setReferralCode] = useState('')
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        onClose()
      } else if (mode === 'register') {
        const { error } = await signUp(email, password)
        if (error) throw error
        
        // If there's a referral code (from URL or manual input), wait a bit then set the referrer
        if (referralCode.trim()) {
          setTimeout(async () => {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser()
              if (currentUser) {
                const { data: refData, error: refError } = await supabase.rpc('set_referrer', {
                  p_user_id: currentUser.id,
                  p_referral_code: referralCode.trim().toUpperCase()
                })
                
                if (refError) {
                  console.error('Error setting referrer:', refError)
                } else if (refData?.success) {
                  console.log('Referrer set successfully')
                } else {
                  console.warn('Invalid referral code')
                }
              }
            } catch (refErr) {
              console.error('Error in referral setup:', refErr)
            }
          }, 1000)
        }
        
        setMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.')
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
          <h2 className="text-xl font-semibold">
            {mode === 'login' && 'Đăng nhập'}
            {mode === 'register' && 'Đăng ký'}
            {mode === 'forgot' && 'Quên mật khẩu'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-2">
                Mã giới thiệu (không bắt buộc)
              </label>
              <input
                type="text"
                id="referralCode"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã giới thiệu"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 uppercase"
                maxLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">Nếu bạn được giới thiệu, hãy nhập mã tại đây</p>
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-md text-sm ${
              message.includes('thành công') || message.includes('gửi')
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