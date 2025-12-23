import { useState } from 'react'
import {
  Users, Percent, Award, Copy, CheckCircle, Gift
} from 'lucide-react'
import { User } from '../../lib/supabase'

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

interface ReferralTabProps {
  user: User
  referralStats: ReferralStats
  referredUsers: ReferredUser[]
  loading: boolean
}

export default function ReferralTab({ user, referralStats, referredUsers, loading }: ReferralTabProps) {
  const [copiedReferralCode, setCopiedReferralCode] = useState(false)
  const [copiedReferralLink, setCopiedReferralLink] = useState(false)

  const getReferralLink = () => {
    if (!user.referral_code) return ''
    return `${window.location.origin}?ref=${user.referral_code}`
  }

  const copyReferral = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'code') {
        setCopiedReferralCode(true)
        setTimeout(() => setCopiedReferralCode(false), 2000)
      } else {
        setCopiedReferralLink(true)
        setTimeout(() => setCopiedReferralLink(false), 2000)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-6 w-6 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Tổng giới thiệu</div>
          <div className="text-2xl font-bold">{referralStats.totalReferrals}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Percent className="h-6 w-6 opacity-80" />
          </div>
          <div className="text-sm opacity-90 mb-1">Tỷ lệ hiện tại</div>
          <div className="text-2xl font-bold">{Math.min(referralStats.totalReferrals * 1, 10)}%</div>
          {referralStats.totalReferrals < 10 && (
            <div className="text-xs opacity-75 mt-1">
              Còn {10 - referralStats.totalReferrals} người để tăng %
            </div>
          )}
        </div>
      </div>

      {/* User Rank Section */}
      <div className="bg-gray-50 rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-yellow-600" />
          Hạng thành viên
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg capitalize">
                  {user.rank === 'bronze' ? 'Đồng' :
                    user.rank === 'silver' ? 'Bạc' :
                      user.rank === 'gold' ? 'Vàng' :
                        user.rank === 'platinum' ? 'Platinum' :
                          user.rank === 'diamond' ? 'Kim cương' : 'Tân binh'}
                </h3>
                <p className="text-sm text-gray-600">Hạng hiện tại</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Giảm giá hạng:</span>
                <span className="font-medium text-green-600">
                  {user.rank === 'bronze' ? '2%' :
                    user.rank === 'silver' ? '4%' :
                      user.rank === 'gold' ? '6%' :
                        user.rank === 'platinum' ? '8%' :
                          user.rank === 'diamond' ? '10%' : '0%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Giảm giá giới thiệu:</span>
                <span className="font-medium text-blue-600">{Math.min(referralStats.totalReferrals * 1, 10)}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-gray-600 font-medium">Tổng giảm giá tối đa:</span>
                <span className="font-bold text-purple-600">
                  {Math.min(referralStats.totalReferrals * 1, 10) + (
                    user.rank === 'bronze' ? 2 :
                      user.rank === 'silver' ? 4 :
                        user.rank === 'gold' ? 6 :
                          user.rank === 'platinum' ? 8 :
                            user.rank === 'diamond' ? 10 : 0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-3">Cấp độ tiếp theo</h4>
            <div className="space-y-3">
              {(() => {
                const currentDeposited = user.total_deposited || 0
                let nextMilestone = ''
                let neededAmount = 0
                let currentProgress = 0

                if (user.rank === 'diamond') {
                  return <p className="text-sm text-gray-600 text-center py-2">Bạn đã đạt hạng cao nhất (Kim Cương)!</p>
                }

                if (currentDeposited < 500000) {
                  nextMilestone = 'Đồng (500K)'
                  neededAmount = 500000 - currentDeposited
                  currentProgress = currentDeposited / 500000
                } else if (currentDeposited < 1000000) {
                  nextMilestone = 'Bạc (1 triệu)'
                  neededAmount = 1000000 - currentDeposited
                  currentProgress = (currentDeposited - 500000) / 500000
                } else if (currentDeposited < 2000000) {
                  nextMilestone = 'Vàng (2 triệu)'
                  neededAmount = 2000000 - currentDeposited
                  currentProgress = (currentDeposited - 1000000) / 1000000
                } else if (currentDeposited < 3000000) {
                  nextMilestone = 'Platinum (3 triệu)'
                  neededAmount = 3000000 - currentDeposited
                  currentProgress = (currentDeposited - 2000000) / 1000000
                } else if (currentDeposited < 5000000) {
                  nextMilestone = 'Kim cương (5 triệu)'
                  neededAmount = 5000000 - currentDeposited
                  currentProgress = (currentDeposited - 3000000) / 2000000
                } else {
                  return <p className="text-sm text-gray-600 text-center py-2">Bạn đã đạt hạng cao nhất!</p>
                }

                return (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Cần nạp thêm <span className="font-medium text-blue-600">{neededAmount.toLocaleString('vi-VN')}đ</span> để đạt <span className="font-medium">{nextMilestone}</span>
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(currentProgress * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="bg-white rounded-lg border border-blue-100 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono font-semibold"
              />
              <button
                onClick={() => copyReferral(user.referral_code || '', 'code')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiedReferralCode ? (
                  <><CheckCircle className="h-4 w-4" /><span>Đã copy</span></>
                ) : (
                  <><Copy className="h-4 w-4" /><span>Copy</span></>
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm overflow-ellipsis"
              />
              <button
                onClick={() => copyReferral(getReferralLink(), 'link')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                {copiedReferralLink ? (
                  <><CheckCircle className="h-4 w-4" /><span>Đã copy</span></>
                ) : (
                  <><Copy className="h-4 w-4" /><span>Copy</span></>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center text-sm">
            <Gift className="h-4 w-4 mr-2" />
            Cách thức hoạt động:
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1 ml-6 list-disc">
            <li>Chia sẻ link giới thiệu cho bạn bè</li>
            <li>Tăng 1% giảm giá trọn đời với mỗi người giới thiệu thành công</li>
            <li>Người được giới thiệu nhận ngay ưu đãi 1%</li>
          </ul>
        </div>
      </div>

      {/* Referred Users */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-purple-600" />
          Người bạn đã giới thiệu {referredUsers.length > 0 && `(${referredUsers.length})`}
        </h2>

        {referredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>Chưa có ai đăng ký qua link của bạn</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đăng ký</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referredUsers.map((refUser) => (
                  <tr key={refUser.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span>{refUser.email}</span>
                        {refUser.full_name && <span className="text-xs text-gray-500">{refUser.full_name}</span>}
                      </div>
                    </td>
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



