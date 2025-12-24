import { useState } from 'react'
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { User } from '../../lib/supabase'

interface ProfileUpdateFormProps {
  user: User
  onRefreshProfile?: () => void
}

export default function ProfileUpdateForm({ user, onRefreshProfile }: ProfileUpdateFormProps) {
  const [fullNameInput, setFullNameInput] = useState(user.full_name || '')
  const [usernameInput, setUsernameInput] = useState(user.username || '')
  const [fullNameMessage, setFullNameMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [usernameMessage, setUsernameMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [updatingFullName, setUpdatingFullName] = useState(false)
  const [updatingUsername, setUpdatingUsername] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const handleUpdateFullName = async () => {
    if (!fullNameInput.trim()) {
      setFullNameMessage({ type: 'error', text: 'Vui lòng nhập họ tên' })
      return
    }

    setUpdatingFullName(true)
    setFullNameMessage(null)
    try {
      const { data, error } = await supabase.rpc('update_full_name', { p_full_name: fullNameInput.trim() })
      if (error) throw error
      setFullNameMessage({ type: 'success', text: data?.message || 'Cập nhật họ tên thành công' })
      onRefreshProfile?.()
    } catch (error: any) {
      setFullNameMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' })
    } finally {
      setUpdatingFullName(false)
    }
  }

  const handleUpdateUsername = async () => {
    if (!usernameInput.trim()) {
      setUsernameMessage({ type: 'error', text: 'Vui lòng nhập tên đăng nhập' })
      return
    }

    setUpdatingUsername(true)
    setUsernameMessage(null)
    try {
      const { data, error } = await supabase.rpc('update_username', { p_new_username: usernameInput.trim() })
      if (error) throw error
      if (data?.success) {
        setUsernameMessage({ type: 'success', text: data?.message || 'Cập nhật tên đăng nhập thành công' })
        onRefreshProfile?.()
      } else {
        setUsernameMessage({ type: 'error', text: data?.message || 'Không thể cập nhật tên đăng nhập' })
      }
    } catch (error: any) {
      setUsernameMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' })
    } finally {
      setUpdatingUsername(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa tài khoản?\n\nHành động này sẽ xóa vĩnh viễn toàn bộ dữ liệu của bạn (lịch sử giao dịch, số dư, thông tin cá nhân) và KHÔNG THỂ hoàn tác.\n\nNhấn OK để xác nhận xóa.')) {
      return
    }
    
    const confirmText = prompt('Để xác nhận xóa tài khoản, vui lòng nhập chữ "DELETE" vào ô bên dưới:')
    if (confirmText !== 'DELETE') {
      if (confirmText !== null) alert('Mã xác nhận không đúng. Hủy thao tác xóa.')
      return
    }

    setDeletingAccount(true)
    try {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error: any) {
      console.error('Error deleting account:', error)
      alert('Không thể xóa tài khoản: ' + (error.message || 'Có lỗi xảy ra'))
    } finally {
      setDeletingAccount(false)
    }
  }

  const nextUsernameChange = user.last_username_change
    ? new Date(new Date(user.last_username_change).getTime() + 24 * 60 * 60 * 1000)
    : null
  const canChangeUsername = !nextUsernameChange || nextUsernameChange <= new Date()

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-8">
      {/* Update Full Name */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Cập nhật họ tên</h3>
        <div className="space-y-3">
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            placeholder="Nguyễn Văn A"
            value={fullNameInput}
            onChange={(e) => setFullNameInput(e.target.value)}
          />
          <button
            onClick={handleUpdateFullName}
            disabled={updatingFullName}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-blue-700 transition-colors"
          >
            {updatingFullName && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu họ tên
          </button>
          {fullNameMessage && (
            <p className={`text-xs flex items-center gap-1 ${fullNameMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              <AlertCircle className="h-3 w-3" />
              {fullNameMessage.text}
            </p>
          )}
        </div>
      </div>

      {/* Change Username */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Đổi tên đăng nhập</h3>
        <div className="space-y-3">
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 uppercase"
            placeholder="DIGIGO_USER"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value.replace(/\s+/g, '').toUpperCase())}
            disabled={!canChangeUsername}
          />
          <button
            onClick={handleUpdateUsername}
            disabled={!canChangeUsername || updatingUsername}
            className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-emerald-700 transition-colors"
          >
            {updatingUsername && <Loader2 className="h-4 w-4 animate-spin" />}
            {canChangeUsername ? 'Lưu tên đăng nhập' : 'Chưa thể đổi'}
          </button>
          {nextUsernameChange && !canChangeUsername && (
            <p className="text-xs text-orange-600">
              Có thể đổi lại sau {nextUsernameChange.toLocaleString('vi-VN')}
            </p>
          )}
          {usernameMessage && (
            <p className={`text-xs flex items-center gap-1 ${usernameMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              <AlertCircle className="h-3 w-3" />
              {usernameMessage.text}
            </p>
          )}
        </div>
      </div>

      {/* Delete Account */}
      <div className="pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-red-600 mb-2">Xóa tài khoản</h3>
        <p className="text-xs text-gray-500 mb-3">
          Hành động này sẽ xóa vĩnh viễn tài khoản và toàn bộ dữ liệu của bạn.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
        >
          {deletingAccount ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Xóa tài khoản vĩnh viễn
        </button>
      </div>
    </div>
  )
}




