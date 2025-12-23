import { CreditCard, ShieldCheck, ShieldX, Lock, Unlock, Trash2 } from 'lucide-react'
import { UsersTabProps } from './types'

export default function UsersTab({
    users,
    onAdjustBalance,
    onToggleAdmin,
    onToggleBan,
    onDeleteUser
}: UsersTabProps) {
    return (
        <>
            {/* Desktop Table */}
            <div className="hidden lg:block bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số dư</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{u.full_name || '-'}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{u.balance.toLocaleString('vi-VN')}đ</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                        {u.is_admin ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Admin</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">User</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
                {users.map((u) => (
                    <div key={u.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                                {u.full_name && (
                                    <p className="text-xs text-gray-500 mt-1">{u.full_name}</p>
                                )}
                            </div>
                            <div className="ml-2">
                                {u.is_admin ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Admin</span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">User</span>
                                )}
                            </div>
                        </div>

                        {/* Balance */}
                        <div className="border-t pt-3">
                            <p className="text-xs text-gray-500 mb-1">Số dư</p>
                            <p className="text-lg font-bold text-gray-900">{u.balance.toLocaleString('vi-VN')}đ</p>
                        </div>

                        {/* Date */}
                        <div className="border-t pt-3">
                            <p className="text-xs text-gray-500">
                                Ngày tạo: {new Date(u.created_at).toLocaleDateString('vi-VN')}
                            </p>
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
                ))}
            </div>

            {users.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border">
                    <p className="text-gray-500">Không có người dùng nào</p>
                </div>
            )}
        </>
    )
}
