import { Plus, Edit, Trash2, Landmark } from 'lucide-react'
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold">Cấu hình Ngân hàng</h2>
                <button
                    onClick={onAddBank}
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                    <Plus className="h-4 w-4" />
                    <span>Thêm Ngân hàng</span>
                </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white shadow rounded-lg overflow-hidden">
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
                                            className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteBank(config.id)}
                                            className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded"
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

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
                {bankConfigs.map((config) => (
                    <div key={config.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Landmark className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{config.bank_id}</p>
                                    <p className="text-xs text-gray-500">{config.bank_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onActivateBank(config.id)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${config.is_active
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                    }`}
                                disabled={config.is_active}
                            >
                                {config.is_active ? 'Đang dùng' : 'Kích hoạt'}
                            </button>
                        </div>

                        {/* Account Info */}
                        <div className="border-t pt-3 space-y-2">
                            <div>
                                <p className="text-xs text-gray-500">Số tài khoản</p>
                                <p className="font-mono text-sm text-gray-900">{config.account_number}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Chủ tài khoản</p>
                                <p className="text-sm font-medium text-gray-900">{config.account_name}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="border-t pt-3">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onEditBank(config)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                >
                                    <Edit className="h-4 w-4" />
                                    <span>Sửa</span>
                                </button>
                                <button
                                    onClick={() => onDeleteBank(config.id)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Xóa</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {bankConfigs.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border">
                        <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Chưa có thông tin ngân hàng nào</p>
                    </div>
                )}
            </div>
        </div>
    )
}
