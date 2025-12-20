import { useState, useEffect } from 'react'
import { Users, Calendar, DollarSign, Percent, Copy, CheckCircle, Gift } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

interface ReferralStats {
  totalReferrals: number
  monthlyEarnings: number
  totalEarnings: number
}

interface ReferredUser {
  id: string
  email: string
  full_name?: string
  created_at: string
}

export default function ReferralPage() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    monthlyEarnings: 0,
    totalEarnings: 0
  })
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (user) {
      setShowAuthModal(false)
      setDataLoading(true)
      fetchReferralData()
    } else {
      setShowAuthModal(true)
      setDataLoading(false)
    }
  }, [authLoading, user])

  const fetchReferralData = async () => {
    if (!user) return
    
    try {
      // Fetch referred users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      setReferredUsers(usersData || [])

      // Fetch earnings summary
      const { data: earningsData, error: earningsError } = await supabase
        .from('referral_earnings')
        .select('amount, created_at')
        .eq('referrer_id', user.id)

      if (earningsError) throw earningsError
      
      // Calculate stats
      const totalEarnings = (earningsData || []).reduce((sum, e) => sum + e.amount, 0)
      
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyEarnings = (earningsData || [])
        .filter(e => new Date(e.created_at) >= firstDayOfMonth)
        .reduce((sum, e) => sum + e.amount, 0)

      setStats({
        totalReferrals: usersData?.length || 0,
        monthlyEarnings,
        totalEarnings
      })
    } catch (error) {
      console.error('Error fetching referral data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const getReferralLink = () => {
    if (!user?.referral_code) return ''
    return `${window.location.origin}?ref=${user.referral_code}`
  }

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'code') {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      } else {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      }
    })
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Giới thiệu bạn bè</h1>
            <p className="text-gray-600">Vui lòng đăng nhập để xem thông tin giới thiệu</p>
          </div>
        </div>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    )
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center space-x-3 mb-2">
        <Gift className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Giới thiệu bạn bè</h1>
      </div>
      <p className="text-gray-600 mb-8">Chia sẻ link giới thiệu và nhận hoa hồng từ mỗi giao dịch</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Tổng người giới thiệu</div>
          <div className="text-3xl font-bold">{stats.totalReferrals}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-8 w-8 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Tháng này</div>
          <div className="text-3xl font-bold">{stats.monthlyEarnings.toLocaleString('vi-VN')}đ</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Tổng hoa hồng</div>
          <div className="text-3xl font-bold">{stats.totalEarnings.toLocaleString('vi-VN')}đ</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Percent className="h-8 w-8 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Tỷ lệ hoa hồng hiện tại</div>
          <div className="text-3xl font-bold">{Math.min(stats.totalReferrals * 2, 10)}%</div>
          {stats.totalReferrals < 5 && (
            <div className="text-xs opacity-75 mt-1">
              Còn {5 - stats.totalReferrals} người nữa đạt 10%
            </div>
          )}
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="bg-white rounded-lg shadow-md border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Copy className="h-5 w-5 mr-2 text-blue-600" />
          Link giới thiệu của bạn
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mã giới thiệu:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={user.referral_code || ''}
                readOnly
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-lg font-semibold"
              />
              <button
                onClick={() => copyToClipboard(user.referral_code || '', 'code')}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiedCode ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Đã copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Link giới thiệu:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={getReferralLink()}
                readOnly
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
              <button
                onClick={() => copyToClipboard(getReferralLink(), 'link')}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Đã copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
            <Gift className="h-4 w-4 mr-2" />
            Cách thức hoạt động:
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>✓ Chia sẻ link giới thiệu cho bạn bè</li>
            <li>✓ Hoa hồng tăng dần theo số người bạn giới thiệu:</li>
            <li className="ml-4">• Người thứ 1: <strong>2%</strong> hoa hồng</li>
            <li className="ml-4">• Người thứ 2: <strong>4%</strong> hoa hồng</li>
            <li className="ml-4">• Người thứ 3: <strong>6%</strong> hoa hồng</li>
            <li className="ml-4">• Người thứ 4: <strong>8%</strong> hoa hồng</li>
            <li className="ml-4">• Từ người thứ 5: <strong>10%</strong> hoa hồng (tối đa)</li>
            <li>✓ Hoa hồng tự động cộng vào số dư khi họ mua hàng</li>
          </ul>
        </div>
      </div>

      {/* Referred Users */}
      <div className="bg-white rounded-lg shadow-md border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-purple-600" />
          Người bạn đã giới thiệu
        </h2>

        {referredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Chưa có ai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đăng ký</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referredUsers.map((refUser) => (
                  <tr key={refUser.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{refUser.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{refUser.full_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(refUser.created_at).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
