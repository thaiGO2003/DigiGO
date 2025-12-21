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
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số dư</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.full_name || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.balance.toLocaleString('vi-VN')}đ</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{u.is_admin ? '✅' : '❌'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(u.created_at).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onAdjustBalance(u)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Điều chỉnh số dư"
                                    >
                                        <CreditCard className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => onToggleAdmin(u.id, u.is_admin)}
                                        className={`p-1 rounded ${u.is_admin ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                        title={u.is_admin ? "Gỡ quyền Admin" : "Cấp quyền Admin"}
                                    >
                                        {u.is_admin ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                    </button>
                                    <button
                                        onClick={() => onToggleBan(u)}
                                        className={`p-1 rounded ${u.is_banned ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-100'}`}
                                        title={u.is_banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                                    >
                                        {u.is_banned ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                    </button>
                                    <button
                                        onClick={() => onDeleteUser(u)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
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
    )
}
