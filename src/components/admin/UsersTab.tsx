import { CreditCard, ShieldCheck, ShieldX, Lock, Unlock, Trash2, Search, RotateCcw, Users, Award, Package, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { UsersTabProps } from './types'
import { User } from '../../lib/supabase'
import React from 'react'

const getRankInfo = (rank: string) => {
    const ranks: Record<string, { label: string; discount: number; bgClass: string; textClass: string }> = {
        newbie: { label: 'Tân binh', discount: 0, bgClass: 'bg-green-100', textClass: 'text-green-800' },
        bronze: { label: 'Đồng', discount: 2, bgClass: 'bg-orange-100', textClass: 'text-orange-800' },
        silver: { label: 'Bạc', discount: 4, bgClass: 'bg-gray-200', textClass: 'text-gray-800' },
        gold: { label: 'Vàng', discount: 6, bgClass: 'bg-yellow-100', textClass: 'text-yellow-800' },
        platinum: { label: 'Platinum', discount: 8, bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
        diamond: { label: 'Kim cương', discount: 10, bgClass: 'bg-purple-100', textClass: 'text-purple-800' },
    }
    return ranks[rank] || ranks.newbie
}

export default function UsersTab({
    users,
    searchTerm = '',
    onSearchChange,
    onRefresh,
    onAdjustBalance,
    onToggleAdmin,
    onToggleBan,
    onDeleteUser,
    onUpdateRank,
    onChat
}: UsersTabProps) {
    const [showRankInfo, setShowRankInfo] = React.useState(false)
    
    const filteredUsers = React.useMemo(() => {
        if (!searchTerm) return users
        const term = searchTerm.toLowerCase()
        return users.filter(u => 
            u.email?.toLowerCase().includes(term) ||
            u.full_name?.toLowerCase().includes(term) ||
            u.username?.toLowerCase().includes(term)
        )
    }, [users, searchTerm])

    return (
        <div className="space-y-4">
            {/* Rank Info Collapsible */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button
                    onClick={() => setShowRankInfo(!showRankInfo)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-gray-900">Thông tin hạng & hoa hồng</span>
                    </div>
                    {showRankInfo ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </button>
                
                {showRankInfo && (
                    <div className="px-4 pb-4 border-t">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                            {/* Rank Overview */}
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    <h3 className="font-semibold text-sm">Các hạng hiện tại</h3>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { rank: 'Tân binh', discount: '0%', range: 'Dưới 500K', bgClass: 'bg-green-50', textClass: 'text-green-600' },
                                        { rank: 'Đồng', discount: '2%', range: '500K - 1 triệu', bgClass: 'bg-orange-50', textClass: 'text-orange-600' },
                                        { rank: 'Bạc', discount: '4%', range: '1 - 2 triệu', bgClass: 'bg-gray-100', textClass: 'text-gray-600' },
                                        { rank: 'Vàng', discount: '6%', range: '2 - 3 triệu', bgClass: 'bg-yellow-50', textClass: 'text-yellow-600' },
                                        { rank: 'Platinum', discount: '8%', range: '3 - 5 triệu', bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
                                        { rank: 'Kim cương', discount: '10%', range: 'Trên 5 triệu', bgClass: 'bg-purple-50', textClass: 'text-purple-600' },
                                    ].map((item) => (
                                        <div key={item.rank} className={`flex justify-between items-center p-2 ${item.bgClass} rounded-lg text-xs sm:text-sm`}>
                                            <div>
                                                <span className={`font-medium ${item.textClass}`}>{item.rank}</span>
                                                <span className="text-gray-500 ml-2">(-{item.discount})</span>
                                            </div>
                                            <span className="text-gray-500">{item.range}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Commission Settings */}
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Package className="h-4 w-4 text-green-600" />
                                    <h3 className="font-semibold text-sm">Cài đặt hoa hồng</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-700 font-medium">Hoa hồng giới thiệu: 1%</p>
                                        <p className="text-xs text-blue-600 mt-0.5">Người giới thiệu nhận 1% từ giao dịch</p>
                                    </div>
                                    <div className="p-2 bg-green-50 rounded-lg">
                                        <p className="text-xs text-green-700 font-medium">Giảm giá người được giới thiệu: 1%</p>
                                        <p className="text-xs text-green-600 mt-0.5">Người được giới thiệu giảm 1%</p>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                        <p>• Hoa hồng & giảm giá tối đa: 10%</p>
                                        <p>• Các loại giảm giá được cộng dồn</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Search and Refresh Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo email, họ tên, username..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={onRefresh}
                        className="px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-1 sm:gap-2 cursor-pointer"
                        title="Làm mới dữ liệu"
                    >
                        <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Làm mới</span>
                    </button>
                    <div className="text-xs sm:text-sm text-gray-500">
                        {filteredUsers.length} / {users.length} người dùng
                    </div>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số dư</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hạng</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.map((u) => {
                                const currentRank = u.rank || 'newbie'
                                const rankInfo = getRankInfo(currentRank)
                                
                                return (
                                    <tr key={u.id} id={`user-${u.id}`} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{u.full_name || '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">{u.username ? `@${u.username}` : '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{u.balance.toLocaleString('vi-VN')}đ</td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {onUpdateRank ? (
                                                <select
                                                    value={currentRank}
                                                    onChange={(e) => onUpdateRank(u.id, e.target.value as User['rank'])}
                                                    className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${rankInfo.bgClass} ${rankInfo.textClass} font-medium`}
                                                >
                                                    <option value="newbie">Tân binh</option>
                                                    <option value="bronze">Đồng</option>
                                                    <option value="silver">Bạc</option>
                                                    <option value="gold">Vàng</option>
                                                    <option value="platinum">Platinum</option>
                                                    <option value="diamond">Kim cương</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rankInfo.bgClass} ${rankInfo.textClass}`}>
                                                    {rankInfo.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            {u.is_admin ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Admin</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">User</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                {onChat && (
                                                    <button
                                                        onClick={() => onChat(u)}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                                        title="Chat với khách"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onAdjustBalance(u)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                                    title="Điều chỉnh số dư"
                                                >
                                                    <CreditCard className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => onToggleAdmin(u.id, u.is_admin)}
                                                    className={`p-1.5 rounded transition-colors cursor-pointer ${
                                                        u.is_admin ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                                                    }`}
                                                    title={u.is_admin ? "Gỡ quyền Admin" : "Cấp quyền Admin"}
                                                >
                                                    {u.is_admin ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    onClick={() => onToggleBan(u)}
                                                    className={`p-1.5 rounded transition-colors cursor-pointer ${
                                                        u.is_banned ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-100'
                                                    }`}
                                                    title={u.is_banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                                                >
                                                    {u.is_banned ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    onClick={() => onDeleteUser(u)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                                    title="Xóa tài khoản"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
                {filteredUsers.map((u) => {
                    const currentRank = u.rank || 'newbie'
                    const rankInfo = getRankInfo(currentRank)
                    
                    return (
                        <div key={u.id} id={`user-${u.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3 transition-all">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                                    {u.full_name && (
                                        <p className="text-xs text-gray-500 mt-1">{u.full_name}</p>
                                    )}
                                    {u.username && (
                                        <p className="text-xs text-gray-400">@{u.username}</p>
                                    )}
                                </div>
                                <div className="ml-2 flex flex-col items-end gap-1">
                                    {u.is_admin ? (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Admin</span>
                                    ) : (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">User</span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rankInfo.bgClass} ${rankInfo.textClass}`}>
                                        {rankInfo.label}
                                    </span>
                                </div>
                            </div>

                            {/* Balance & Rank */}
                            <div className="border-t pt-3 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Số dư</p>
                                    <p className="text-base font-bold text-gray-900">{u.balance.toLocaleString('vi-VN')}đ</p>
                                </div>
                                {onUpdateRank && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Thay đổi hạng</p>
                                        <select
                                            value={currentRank}
                                            onChange={(e) => onUpdateRank(u.id, e.target.value as User['rank'])}
                                            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="newbie">Tân binh</option>
                                            <option value="bronze">Đồng</option>
                                            <option value="silver">Bạc</option>
                                            <option value="gold">Vàng</option>
                                            <option value="platinum">Platinum</option>
                                            <option value="diamond">Kim cương</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="border-t pt-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => onAdjustBalance(u)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-sm font-medium"
                                    >
                                        <CreditCard className="h-4 w-4" />
                                        <span>Số dư</span>
                                    </button>
                                    {onChat && (
                                        <button
                                            onClick={() => onChat(u)}
                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer text-sm font-medium"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            <span>Chat</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onToggleAdmin(u.id, u.is_admin)}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm font-medium ${
                                            u.is_admin
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                                        }`}
                                    >
                                        {u.is_admin ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                        <span>{u.is_admin ? 'Gỡ Admin' : 'Cấp Admin'}</span>
                                    </button>
                                    <button
                                        onClick={() => onToggleBan(u)}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm font-medium ${
                                            u.is_banned
                                                ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {u.is_banned ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                        <span>{u.is_banned ? 'Mở khóa' : 'Khóa'}</span>
                                    </button>
                                    <button
                                        onClick={() => onDeleteUser(u)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer text-sm font-medium"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Xóa</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {filteredUsers.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">{searchTerm ? 'Không tìm thấy người dùng phù hợp' : 'Không có người dùng nào'}</p>
                </div>
            )}
        </div>
    )
}
