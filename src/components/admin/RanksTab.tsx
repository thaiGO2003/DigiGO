import { Users, Package, Award } from 'lucide-react'
import { RanksTabProps } from './types'
import { User } from '../../lib/supabase'

export default function RanksTab({ users, onUpdateRank }: RanksTabProps) {
    const getRankInfo = (rank: string) => {
        const ranks: Record<string, { label: string; discount: number; bgClass: string; textClass: string }> = {
            newbie: { label: 'Tân binh', discount: 0, bgClass: 'bg-green-100', textClass: 'text-green-800' },
            dong: { label: 'Đồng', discount: 1, bgClass: 'bg-yellow-50', textClass: 'text-yellow-800' },
            sat: { label: 'Sắt', discount: 2, bgClass: 'bg-gray-200', textClass: 'text-gray-800' },
            vang: { label: 'Vàng', discount: 3, bgClass: 'bg-yellow-200', textClass: 'text-yellow-900' },
            luc_bao: { label: 'Lục bảo', discount: 4, bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
            kim_cuong: { label: 'Kim cương', discount: 5, bgClass: 'bg-purple-100', textClass: 'text-purple-800' },
        }
        return ranks[rank] || ranks.newbie
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Quản lý hạng người dùng</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* User Ranks Overview */}
                <div className="border rounded-lg p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-base sm:text-lg">Các hạng hiện tại</h3>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                        {[
                            { rank: 'Tân binh', discount: '0%', range: 'Dưới 100K', bgClass: 'bg-green-50', textClass: 'text-green-600' },
                            { rank: 'Đồng', discount: '1%', range: '≥ 100K', bgClass: 'bg-yellow-50', textClass: 'text-yellow-700' },
                            { rank: 'Sắt', discount: '2%', range: '≥ 200K', bgClass: 'bg-gray-100', textClass: 'text-gray-600' },
                            { rank: 'Vàng', discount: '3%', range: '≥ 300K', bgClass: 'bg-yellow-100', textClass: 'text-yellow-800' },
                            { rank: 'Lục bảo', discount: '4%', range: '≥ 400K', bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
                            { rank: 'Kim cương', discount: '5%', range: '≥ 500K', bgClass: 'bg-purple-50', textClass: 'text-purple-600' },
                        ].map((item) => (
                            <div key={item.rank} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-2.5 sm:p-3 ${item.bgClass} rounded-lg gap-1 sm:gap-0`}>
                                <div>
                                    <span className={`font-medium ${item.textClass} text-sm sm:text-base`}>{item.rank}</span>
                                    <p className="text-xs sm:text-sm text-gray-500">Giảm giá: {item.discount}</p>
                                </div>
                                <span className="text-xs sm:text-sm text-gray-500">{item.range}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Referral Commission Settings */}
                <div className="border rounded-lg p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-base sm:text-lg">Cài đặt hoa hồng</h3>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700 font-medium">Hoa hồng giới thiệu: 1%</p>
                            <p className="text-xs text-blue-600 mt-1">Mỗi người giới thiệu sẽ nhận 1% hoa hồng từ giao dịch của họ</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-700 font-medium">Giảm giá người được giới thiệu: 1%</p>
                            <p className="text-xs text-green-600 mt-1">Người được giới thiệu sẽ được giảm 1% khi mua hàng</p>
                        </div>
                        <div className="text-sm text-gray-600">
                            <p className="font-medium mb-2">Lưu ý:</p>
                            <ul className="space-y-1 text-xs">
                                <li>• Hoa hồng tối đa: 10%</li>
                                <li>• Giảm giá hạng tối đa: 5%</li>
                                <li>• Các loại giảm giá được cộng dồn</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Rank Management */}
            <div className="mt-6 sm:mt-8">
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    Quản lý hạng người dùng
                </h3>

                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giới thiệu</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạng</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảm giá</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => {
                                const referralCount = user.referral_count || 0
                                const currentRank = user.rank || 'newbie'
                                const rankInfo = getRankInfo(currentRank)

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{user.username || ''}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{referralCount}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rankInfo.bgClass} ${rankInfo.textClass}`}>
                                                {rankInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{rankInfo.discount}%</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                            <select
                                                value={currentRank}
                                                onChange={(e) => onUpdateRank(user.id, e.target.value as User['rank'])}
                                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="newbie">Tân binh</option>
                                                <option value="dong">Đồng</option>
                                                <option value="sat">Sắt</option>
                                                <option value="vang">Vàng</option>
                                                <option value="luc_bao">Lục bảo</option>
                                                <option value="kim_cuong">Kim cương</option>
                                            </select>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                    {users.map((user) => {
                        const referralCount = user.referral_count || 0
                        const currentRank = user.rank || 'newbie'
                        const rankInfo = getRankInfo(currentRank)

                        return (
                            <div key={user.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || 'N/A'}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                        {user.username && (
                                            <p className="text-xs text-gray-400">@{user.username}</p>
                                        )}
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rankInfo.bgClass} ${rankInfo.textClass}`}>
                                        {rankInfo.label}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Người giới thiệu</p>
                                        <p className="text-sm font-medium text-gray-900">{referralCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Giảm giá hạng</p>
                                        <p className="text-sm font-medium text-gray-900">{rankInfo.discount}%</p>
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="border-t pt-3">
                                    <label className="block text-xs text-gray-500 mb-1">Thay đổi hạng</label>
                                    <select
                                        value={currentRank}
                                        onChange={(e) => onUpdateRank(user.id, e.target.value as User['rank'])}
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="newbie">Tân binh</option>
                                        <option value="dong">Đồng</option>
                                        <option value="sat">Sắt</option>
                                        <option value="vang">Vàng</option>
                                        <option value="luc_bao">Lục bảo</option>
                                        <option value="kim_cuong">Kim cương</option>
                                    </select>
                                </div>
                            </div>
                        )
                    })}

                    {users.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border">
                            <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Không có người dùng nào</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
