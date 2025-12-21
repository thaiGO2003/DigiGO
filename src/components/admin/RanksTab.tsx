import { Users, Package } from 'lucide-react'
import { RanksTabProps } from './types'
import { User } from '../../lib/supabase'

export default function RanksTab({ users, onUpdateRank }: RanksTabProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-6">Quản lý hạng người dùng</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User Ranks Overview */}
                <div className="border rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">Các hạng hiện tại</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <div>
                                <span className="font-medium text-green-600">Tân binh</span>
                                <p className="text-sm text-gray-500">Giảm giá: 0%</p>
                            </div>
                            <span className="text-sm text-gray-500">Dưới 500K nạp</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <div>
                                <span className="font-medium text-orange-600">Đồng</span>
                                <p className="text-sm text-gray-500">Giảm giá: 2%</p>
                            </div>
                            <span className="text-sm text-gray-500">500K - 1 triệu</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                            <div>
                                <span className="font-medium text-gray-600">Bạc</span>
                                <p className="text-sm text-gray-500">Giảm giá: 4%</p>
                            </div>
                            <span className="text-sm text-gray-500">1 - 2 triệu</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                            <div>
                                <span className="font-medium text-yellow-600">Vàng</span>
                                <p className="text-sm text-gray-500">Giảm giá: 6%</p>
                            </div>
                            <span className="text-sm text-gray-500">2 - 3 triệu</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <div>
                                <span className="font-medium text-blue-600">Platinum</span>
                                <p className="text-sm text-gray-500">Giảm giá: 8%</p>
                            </div>
                            <span className="text-sm text-gray-500">3 - 5 triệu</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <div>
                                <span className="font-medium text-purple-600">Kim cương</span>
                                <p className="text-sm text-gray-500">Giảm giá: 10%</p>
                            </div>
                            <span className="text-sm text-gray-500">Trên 5 triệu</span>
                        </div>
                    </div>
                </div>

                {/* Referral Commission Settings */}
                <div className="border rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg">Cài đặt hoa hồng</h3>
                    </div>
                    <div className="space-y-4">
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
                                <li>• Giảm giá hạng tối đa: 10%</li>
                                <li>• Các loại giảm giá được cộng dồn</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Rank Management */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Quản lý hạng người dùng
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người giới thiệu</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạng hiện tại</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảm giá</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => {
                                const referralCount = user.referral_count || 0
                                const currentRank = user.rank || 'newbie'
                                const rankDiscount = currentRank === 'bronze' ? 2 :
                                    currentRank === 'silver' ? 4 :
                                        currentRank === 'gold' ? 6 :
                                            currentRank === 'platinum' ? 8 :
                                                currentRank === 'diamond' ? 10 : 0

                                return (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{user.username || ''}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{referralCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentRank === 'newbie' ? 'bg-green-100 text-green-800' :
                                                currentRank === 'bronze' ? 'bg-orange-100 text-orange-800' :
                                                    currentRank === 'silver' ? 'bg-gray-200 text-gray-800' :
                                                        currentRank === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                                            currentRank === 'platinum' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-purple-100 text-purple-800'
                                                }`}>
                                                {currentRank === 'newbie' ? 'Tân binh' :
                                                    currentRank === 'bronze' ? 'Đồng' :
                                                        currentRank === 'silver' ? 'Bạc' :
                                                            currentRank === 'gold' ? 'Vàng' :
                                                                currentRank === 'platinum' ? 'Platinum' : 'Kim cương'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rankDiscount}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <select
                                                value={currentRank}
                                                onChange={(e) => onUpdateRank(user.id, e.target.value as User['rank'])}
                                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="newbie">Tân binh</option>
                                                <option value="bronze">Đồng</option>
                                                <option value="silver">Bạc</option>
                                                <option value="gold">Vàng</option>
                                                <option value="platinum">Platinum</option>
                                                <option value="diamond">Kim cương</option>
                                            </select>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
