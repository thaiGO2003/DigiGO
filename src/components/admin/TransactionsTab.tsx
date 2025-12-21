import React from 'react'
import { CreditCard, RotateCcw, Check, X as CloseIcon, ChevronDown, ChevronUp, Package, Key, ExternalLink, Copy } from 'lucide-react'
import { TransactionsTabProps } from './types'

export default function TransactionsTab({
    transactions,
    transactionFilter,
    onFilterChange,
    onRefresh,
    onApprove,
    onReject,
    expandedOrders,
    onToggleExpand
}: TransactionsTabProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Tổng tiền nạp thành công</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {transactions
                                    .filter((tx: any) => tx.type === 'top_up' && tx.status === 'completed')
                                    .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0)
                                    .toLocaleString('vi-VN')}đ
                            </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-full">
                            <CreditCard className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-2 h-fit">
                    <button
                        onClick={onRefresh}
                        className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-2"
                        title="Làm mới dữ liệu"
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span>Làm mới</span>
                    </button>
                    {[
                        { id: 'all', label: 'Tất cả' },
                        { id: 'purchase', label: 'Mua hàng' },
                        { id: 'pending', label: 'Chờ duyệt' },
                        { id: 'completed', label: 'Thành công' },
                        { id: 'expired', label: 'Hết hạn' },
                    ].map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => onFilterChange(filter.id as any)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${transactionFilter === filter.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {transactions
                            .filter((tx) => {
                                if (transactionFilter === 'all') return true
                                if (transactionFilter === 'purchase') return tx.type === 'purchase'

                                const createdAt = new Date(tx.created_at).getTime()
                                const now = new Date().getTime()
                                const isExpired = tx.status === 'pending' && (now - createdAt > 15 * 60 * 1000)

                                if (transactionFilter === 'pending') return tx.status === 'pending' && !isExpired
                                if (transactionFilter === 'completed') return tx.status === 'completed'
                                if (transactionFilter === 'expired') return isExpired
                                return true
                            })
                            .map((tx) => {
                                const createdAt = new Date(tx.created_at).getTime()
                                const now = new Date().getTime()
                                const isExpired = tx.status === 'pending' && (now - createdAt > 15 * 60 * 1000)
                                const isPurchase = tx.type === 'purchase'
                                const isExpanded = expandedOrders.has(tx.id)
                                const guideUrl = tx.metadata?.guide_url || tx.product_variants?.guide_url || tx.product_variants?.products?.guide_url

                                return (
                                    <React.Fragment key={tx.id}>
                                        <tr className={`${isPurchase ? 'cursor-pointer hover:bg-gray-50' : ''} ${isExpanded ? 'bg-blue-50' : ''}`}
                                            onClick={isPurchase ? () => onToggleExpand(tx.id) : undefined}>
                                            <td className="px-3 py-4 whitespace-nowrap">
                                                {isPurchase && (
                                                    <button className="text-gray-400 hover:text-gray-600 p-1">
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{tx.users?.full_name || 'N/A'}</div>
                                                <div className="text-xs text-gray-500">{tx.users?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                {tx.amount.toLocaleString('vi-VN')}đ
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {tx.type === 'top_up' ? (
                                                    'Nạp tiền'
                                                ) : (
                                                    <div>
                                                        <span className="block font-medium text-purple-600">Mua hàng</span>
                                                        <span className="text-xs text-gray-400">
                                                            {tx.product_variants?.products?.name} - {tx.product_variants?.name}
                                                        </span>
                                                        {tx.metadata?.quantity_in_order > 1 && (
                                                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                                                #{tx.metadata?.order_index}/{tx.metadata?.quantity_in_order}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    isExpired ? 'bg-gray-100 text-gray-400' :
                                                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {tx.status === 'completed' ? 'Thành công' :
                                                        isExpired ? 'Hết hạn' :
                                                            tx.status === 'pending' ? 'Chờ duyệt' :
                                                                'Thất bại'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(tx.created_at).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                {tx.status === 'pending' && !isExpired && tx.type === 'top_up' && (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => onApprove(tx)}
                                                            className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-full"
                                                            title="Duyệt"
                                                        >
                                                            <Check className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onReject(tx)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-full"
                                                            title="Từ chối"
                                                        >
                                                            <CloseIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>

                                        {/* Expanded Order Details */}
                                        {isPurchase && isExpanded && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50">
                                                    <div className="ml-8 space-y-3">
                                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                            <Package className="h-4 w-4 text-purple-600" />
                                                            Chi tiết đơn hàng
                                                        </h4>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            <div className="bg-white rounded-lg p-4 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Sản phẩm</p>
                                                                <p className="font-semibold text-gray-900">{tx.product_variants?.products?.name || 'N/A'}</p>
                                                            </div>

                                                            <div className="bg-white rounded-lg p-4 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Gói sản phẩm</p>
                                                                <p className="font-semibold text-gray-900">{tx.product_variants?.name || 'N/A'}</p>
                                                            </div>

                                                            <div className="bg-white rounded-lg p-4 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Key đã bán</p>
                                                                <div className="flex items-center gap-2">
                                                                    <Key className="h-4 w-4 text-purple-500" />
                                                                    <code className="font-mono text-sm text-gray-800 truncate flex-1">
                                                                        {tx.product_keys?.key_value || 'N/A'}
                                                                    </code>
                                                                    {tx.product_keys?.key_value && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                navigator.clipboard.writeText(tx.product_keys?.key_value)
                                                                                alert('Đã copy key!')
                                                                            }}
                                                                            className="text-gray-400 hover:text-blue-600 p-1"
                                                                            title="Copy Key"
                                                                        >
                                                                            <Copy className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="bg-white rounded-lg p-4 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Thông tin thanh toán</p>
                                                                <div className="space-y-1">
                                                                    <p className="text-sm">
                                                                        <span className="text-gray-500">Số tiền:</span>{' '}
                                                                        <span className="font-bold text-red-600">{Math.abs(tx.amount).toLocaleString('vi-VN')}đ</span>
                                                                    </p>
                                                                    {tx.metadata?.original_price && tx.metadata.original_price !== Math.abs(tx.amount) && (
                                                                        <p className="text-sm">
                                                                            <span className="text-gray-500">Giá gốc:</span>{' '}
                                                                            <span className="text-gray-400 line-through">{tx.metadata.original_price.toLocaleString('vi-VN')}đ</span>
                                                                        </p>
                                                                    )}
                                                                    {tx.metadata?.referral_discount_applied && (
                                                                        <p className="text-sm flex items-center gap-1">
                                                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                                                                Giảm giá giới thiệu đã áp dụng
                                                                            </span>
                                                                        </p>
                                                                    )}
                                                                    {tx.metadata?.quantity_in_order > 1 && (
                                                                        <p className="text-sm">
                                                                            <span className="text-gray-500">Trong đơn hàng:</span>{' '}
                                                                            <span className="font-medium">{tx.metadata.order_index} / {tx.metadata.quantity_in_order} sản phẩm</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {guideUrl && (
                                                                <div className="bg-white rounded-lg p-4 shadow-sm border">
                                                                    <p className="text-xs text-gray-500 mb-1">Hướng dẫn sử dụng</p>
                                                                    <a
                                                                        href={guideUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ExternalLink className="h-4 w-4" />
                                                                        <span className="truncate">{guideUrl}</span>
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
