import React, { useState, useEffect } from 'react'
import { User, Mail, CreditCard, Save, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ProfilePage() {
  const { user, signOut, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name)
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile() // Refresh user data in context
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật.' })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <User className="h-6 w-6 mr-2 text-blue-600" />
            Thông tin tài khoản
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {message.text && (
            <div className={`p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                <Mail className="h-4 w-4 mr-2" />
                <span>{user.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên của bạn"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số dư hiện tại
              </label>
              <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-blue-600 font-bold">
                <CreditCard className="h-4 w-4 mr-2" />
                <span>{user.balance.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>

              <button
                type="button"
                onClick={signOut}
                className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
