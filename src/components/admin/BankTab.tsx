import { Plus, Edit, Trash2 } from 'lucide-react'
import { BankTabProps } from './types'

export default function BankTab({
    bankConfigs,
    onAddBank,
    onEditBank,
    onDeleteBank,
    onActivateBank
}: BankTabProps) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Cấu hình Ngân hàng</h2>
                <button
                    onClick={onAddBank}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                    <Plus className="h-4 w-4" />
                    <span>Thêm Ngân hàng</span>
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngân hàng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tài khoản</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chủ tài khoản</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {bankConfigs.map((config) => (
                            <tr key={config.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">{config.bank_id}</div>
                                    <div className="text-sm text-gray-500">{config.bank_name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                    {config.account_number}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {config.account_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => onActivateBank(config.id)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${config.is_active
                                            ? 'bg-green-100 text-green-800 border-green-200 cursor-default'
                                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                            }`}
                                        disabled={config.is_active}
                                    >
                                        {config.is_active ? 'Đang dùng' : 'Kích hoạt'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => onEditBank(config)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteBank(config.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {bankConfigs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    Chưa có thông tin ngân hàng nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
