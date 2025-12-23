import { User, Copy, Check, Calendar } from 'lucide-react'
import { User as UserType } from '../../lib/supabase'

interface ProfileSidebarProps {
  user: UserType
  copiedKey: string | null
  onCopyToClipboard: (text: string, id: string) => void
}

export default function ProfileSidebar({ user, copiedKey, onCopyToClipboard }: ProfileSidebarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex flex-col items-center mb-6">
        <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <User className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{user.full_name || 'Người dùng'}</h2>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Số dư</span>
          <span className="font-bold text-blue-600">{user.balance?.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Ngày tham gia</span>
          <span className="text-sm text-gray-900">
            {new Date(user.created_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
        {user.referral_code && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Mã giới thiệu</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {user.referral_code}
                </span>
                <button
                  onClick={() => onCopyToClipboard(user.referral_code!, 'ref-code')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="Sao chép mã giới thiệu"
                >
                  {copiedKey === 'ref-code' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



