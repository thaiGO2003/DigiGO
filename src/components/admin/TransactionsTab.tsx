import React from 'react'
import { CreditCard, RotateCcw, Check, X as CloseIcon, ChevronDown, ChevronUp, Package, Key, ExternalLink, Copy, Search } from 'lucide-react'
import { TransactionsTabProps } from './types'

export default function TransactionsTab({
    transactions,
    transactionFilter,
    dateFilter,
    onFilterChange,
    onRefresh,
    onApprove,
    onReject,
    expandedOrders,
    onToggleExpand,
    onNavigateToUser
}: TransactionsTabProps) {
    const [searchTerm, setSearchTerm] = React.useState('')

    const filteredTransactions = transactions.filter((tx) => {
        // Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            const txId = tx.id.toLowerCase()
            const shortId = txId.split('-')[0]
            
            const matchesId = txId.includes(term) || shortId.includes(term)
            const matchesUser = 
                tx.users?.email?.toLowerCase().includes(term) ||
                tx.users?.username?.toLowerCase().includes(term) ||
                tx.users?.full_name?.toLowerCase().includes(term)
            const matchesAmount = tx.amount.toString().includes(term)
            const matchesNote = tx.metadata?.note?.toLowerCase().includes(term)
            const matchesProduct = 
                tx.product_variants?.products?.name?.toLowerCase().includes(term) ||
                tx.product_variants?.name?.toLowerCase().includes(term)

            if (!matchesId && !matchesUser && !matchesAmount && !matchesNote && !matchesProduct) return false
        }

        // Date Filter
        if (dateFilter) {
            const txDate = new Date(tx.created_at).toISOString().substring(0, 10)
            if (txDate < dateFilter.start || txDate > dateFilter.end) return false
        }

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

    const totalDeposits = transactions
        .filter((tx: any) => tx.type === 'top_up' && tx.status === 'completed' && !tx.users?.is_admin)
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0)

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Summary Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500">Tổng tiền nạp thành công</p>
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                            {totalDeposits.toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                    <div className="p-3 sm:p-4 bg-green-50 rounded-full">
                        <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo mã đơn, email, username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
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
                            className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                                transactionFilter === filter.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTransactions.map((tx, index) => {
                                const createdAt = new Date(tx.created_at).getTime()
                                const now = new Date().getTime()
                                const isExpired = tx.status === 'pending' && (now - createdAt > 15 * 60 * 1000)
                                const isPurchase = tx.type === 'purchase'
                                const isExpanded = expandedOrders.has(tx.id)
                                const guideUrl = tx.metadata?.guide_url || tx.product_variants?.guide_url || tx.product_variants?.products?.guide_url

                                // Grouping Logic
                                const currentDate = new Date(tx.created_at).toLocaleDateString('vi-VN')
                                const prevDate = index > 0 ? new Date(filteredTransactions[index - 1].created_at).toLocaleDateString('vi-VN') : null
                                const showHeader = currentDate !== prevDate

                                return (
                                    <React.Fragment key={tx.id}>
                                        {showHeader && (
                                            <tr>
                                                <td colSpan={7} className="bg-gray-100 px-4 py-2 font-bold text-gray-700 text-sm">
                                                    {currentDate}
                                                </td>
                                            </tr>
                                        )}
                                        <tr
                                            className={`${isPurchase ? 'cursor-pointer hover:bg-gray-50' : ''} ${isExpanded ? 'bg-blue-50' : ''}`}
                                            onClick={isPurchase ? () => onToggleExpand(tx.id) : undefined}
                                        >
                                            <td className="px-3 py-4 whitespace-nowrap">
                                                {isPurchase && (
                                                    <button className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (onNavigateToUser && tx.user_id) {
                                                            onNavigateToUser(tx.user_id)
                                                        }
                                                    }}
                                                    className="text-left hover:bg-blue-50 rounded-lg p-1 -m-1 transition-colors cursor-pointer group"
                                                    title="Xem người dùng"
                                                >
                                                    <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{tx.users?.full_name || 'N/A'}</div>
                                                    {tx.users?.username && (
                                                        <div className="text-xs text-gray-400">@{tx.users.username}</div>
                                                    )}
                                                    <div className="text-xs text-gray-500">{tx.users?.email}</div>
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                <div>
                                                    <div>{tx.amount.toLocaleString('vi-VN')}đ</div>
                                                    {tx.type === 'purchase' && (
                                                        <div className="text-xs text-gray-400 font-normal mt-0.5">
                                                            Giá gốc: {(tx.metadata?.original_price ?? Math.abs(tx.amount)).toLocaleString('vi-VN')}đ
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {tx.type === 'top_up' ? (
                                                    <div>
                                                        <span className="block font-medium text-green-600">
                                                            {tx.metadata?.is_admin_adjustment ? 'Điều chỉnh' : 'Nạp tiền'}
                                                        </span>
                                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                            <span>#{tx.id.split('-')[0].toUpperCase()}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    navigator.clipboard.writeText(tx.id.split('-')[0].toUpperCase())
                                                                }}
                                                                className="text-gray-400 hover:text-blue-600 cursor-pointer"
                                                                title="Copy Mã giao dịch"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                        {tx.metadata?.note && (
                                                            <span className="text-xs text-gray-400 italic block mt-0.5">
                                                                {tx.metadata.note}
                                                            </span>
                                                        )}
                                                    </div>
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
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                        tx.status === 'completed'
                                                            ? 'bg-green-100 text-green-800'
                                                            : isExpired
                                                            ? 'bg-gray-100 text-gray-400'
                                                            : tx.status === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {tx.status === 'completed'
                                                        ? 'Thành công'
                                                        : isExpired
                                                        ? 'Hết hạn'
                                                        : tx.status === 'pending'
                                                        ? 'Chờ duyệt'
                                                        : 'Thất bại'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(tx.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                {tx.status === 'pending' && !isExpired && tx.type === 'top_up' && (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => onApprove(tx)}
                                                            className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-full cursor-pointer transition-colors"
                                                            title="Duyệt"
                                                        >
                                                            <Check className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onReject(tx)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-full cursor-pointer transition-colors"
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
                                                <td colSpan={7} className="px-4 py-4 bg-gradient-to-r from-blue-50 to-purple-50">
                                                    <div className="ml-4 sm:ml-8 space-y-3">
                                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                            <Package className="h-4 w-4 text-purple-600" />
                                                            Chi tiết đơn hàng
                                                        </h4>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                                            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Sản phẩm</p>
                                                                <p className="font-semibold text-gray-900 text-sm sm:text-base">{tx.product_variants?.products?.name || 'N/A'}</p>
                                                            </div>

                                                            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Gói sản phẩm</p>
                                                                <p className="font-semibold text-gray-900 text-sm sm:text-base">{tx.product_variants?.name || 'N/A'}</p>
                                                            </div>

                                                            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Key đã bán</p>
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Key className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                                                        <code className="font-mono text-xs sm:text-sm text-gray-800 truncate flex-1">
                                                                            {tx.product_keys?.key_value || (tx.product_variants?.products as any)?.account_info || 'N/A'}
                                                                        </code>
                                                                        {(tx.product_keys?.key_value || (tx.product_variants?.products as any)?.account_info) && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    navigator.clipboard.writeText(tx.product_keys?.key_value || (tx.product_variants?.products as any)?.account_info)
                                                                                }}
                                                                                className="text-gray-400 hover:text-blue-600 p-1 cursor-pointer transition-colors"
                                                                                title="Copy Key"
                                                                            >
                                                                                <Copy className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="bg-white rounded-lg p-3 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Mã giao dịch</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-semibold text-gray-900 text-sm">{tx.id.split('-')[0].toUpperCase()}</p>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            navigator.clipboard.writeText(tx.id.split('-')[0].toUpperCase())
                                                                        }}
                                                                        className="text-gray-400 hover:text-blue-600 p-1 cursor-pointer transition-colors flex-shrink-0"
                                                                        title="Copy Mã giao dịch"
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                                                                <p className="text-xs text-gray-500 mb-1">Thông tin thanh toán</p>
                                                                <div className="space-y-1">
                                                                    <p className="text-xs sm:text-sm">
                                                                        <span className="text-gray-500">Giá gốc:</span>{' '}
                                                                        <span className="text-gray-400 line-through">{(tx.metadata?.original_price ?? Math.abs(tx.amount)).toLocaleString('vi-VN')}đ</span>
                                                                    </p>
                                                                    <p className="text-xs sm:text-sm">
                                                                        <span className="text-gray-500">Giá bán:</span>{' '}
                                                                        <span className="font-bold text-red-600">{Math.abs(tx.amount).toLocaleString('vi-VN')}đ</span>
                                                                    </p>
                                                                    {tx.metadata?.referral_discount_applied && (
                                                                        <p className="text-xs sm:text-sm flex items-center gap-1">
                                                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                                                                Giảm giá giới thiệu đã áp dụng
                                                                            </span>
                                                                        </p>
                                                                    )}
                                                                    {tx.metadata?.quantity_in_order > 1 && (
                                                                        <p className="text-xs sm:text-sm">
                                                                            <span className="text-gray-500">Trong đơn hàng:</span>{' '}
                                                                            <span className="font-medium">{tx.metadata.order_index} / {tx.metadata.quantity_in_order} sản phẩm</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {guideUrl && (
                                                                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                                                                    <p className="text-xs text-gray-500 mb-1">Hướng dẫn sử dụng</p>
                                                                    <a
                                                                        href={guideUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-xs sm:text-sm cursor-pointer transition-colors"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ExternalLink className="h-4 w-4 flex-shrink-0" />
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

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
                {filteredTransactions.map((tx) => {
                    const createdAt = new Date(tx.created_at).getTime()
                    const now = new Date().getTime()
                    const isExpired = tx.status === 'pending' && (now - createdAt > 15 * 60 * 1000)
                    const isPurchase = tx.type === 'purchase'
                    const isExpanded = expandedOrders.has(tx.id)
                    const guideUrl = tx.metadata?.guide_url || tx.product_variants?.guide_url || tx.product_variants?.products?.guide_url

                    return (
                        <div
                            key={tx.id}
                            className={`bg-white rounded-lg border shadow-sm overflow-hidden ${
                                isPurchase ? 'cursor-pointer' : ''
                            } ${isExpanded ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                            onClick={isPurchase ? () => onToggleExpand(tx.id) : undefined}
                        >
                            <div className="p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {isPurchase && (
                                                <button className="text-gray-400 p-1 cursor-pointer">
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                            )}
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    tx.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : isExpired
                                                        ? 'bg-gray-100 text-gray-400'
                                                        : tx.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {tx.status === 'completed'
                                                    ? 'Thành công'
                                                    : isExpired
                                                    ? 'Hết hạn'
                                                    : tx.status === 'pending'
                                                    ? 'Chờ duyệt'
                                                    : 'Thất bại'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-gray-900">
                                                {tx.amount.toLocaleString('vi-VN')}đ
                                            </p>
                                            {tx.type === 'purchase' && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Giá gốc: {(tx.metadata?.original_price ?? Math.abs(tx.amount)).toLocaleString('vi-VN')}đ
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {tx.status === 'pending' && !isExpired && tx.type === 'top_up' && (
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => onApprove(tx)}
                                                className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-full cursor-pointer transition-colors"
                                                title="Duyệt"
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => onReject(tx)}
                                                className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full cursor-pointer transition-colors"
                                                title="Từ chối"
                                            >
                                                <CloseIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className="border-t pt-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (onNavigateToUser && tx.user_id) {
                                                onNavigateToUser(tx.user_id)
                                            }
                                        }}
                                        className="text-left hover:bg-blue-50 rounded-lg p-1 -m-1 transition-colors cursor-pointer group w-full"
                                        title="Xem người dùng"
                                    >
                                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{tx.users?.full_name || 'N/A'}</p>
                                        {tx.users?.username && (
                                            <p className="text-xs text-gray-400">@{tx.users.username}</p>
                                        )}
                                        <p className="text-xs text-gray-500 truncate">{tx.users?.email}</p>
                                    </button>
                                </div>

                                {/* Type Info */}
                                <div className="border-t pt-3">
                                    {tx.type === 'top_up' ? (
                                        <div>
                                            <span className="text-sm font-medium text-green-600">
                                                {tx.metadata?.is_admin_adjustment ? 'Điều chỉnh' : 'Nạp tiền'}
                                            </span>
                                            {tx.metadata?.note && (
                                                <p className="text-xs text-gray-400 italic mt-1">{tx.metadata.note}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <span className="text-sm font-medium text-purple-600">Mua hàng</span>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {tx.product_variants?.products?.name} - {tx.product_variants?.name}
                                            </p>
                                            {tx.metadata?.quantity_in_order > 1 && (
                                                <span className="inline-block mt-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                                    #{tx.metadata?.order_index}/{tx.metadata?.quantity_in_order}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Date */}
                                <div className="border-t pt-3">
                                    <p className="text-xs text-gray-500">
                                        {new Date(tx.created_at).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            </div>

                            {/* Expanded Details (Mobile) */}
                            {isPurchase && isExpanded && (
                                <div className="border-t bg-gradient-to-r from-blue-50 to-purple-50 p-4 space-y-3">
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                                        <Package className="h-4 w-4 text-purple-600" />
                                        Chi tiết đơn hàng
                                    </h4>

                                    <div className="space-y-3">
                                        <div className="bg-white rounded-lg p-3 shadow-sm border">
                                            <p className="text-xs text-gray-500 mb-1">Mã giao dịch</p>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900 text-sm">{tx.id.split('-')[0].toUpperCase()}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigator.clipboard.writeText(tx.id.split('-')[0].toUpperCase())
                                                    }}
                                                    className="text-gray-400 hover:text-blue-600 p-1 cursor-pointer transition-colors flex-shrink-0"
                                                    title="Copy Mã giao dịch"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-lg p-3 shadow-sm border">
                                            <p className="text-xs text-gray-500 mb-1">Sản phẩm</p>
                                            <p className="font-semibold text-gray-900 text-sm">{tx.product_variants?.products?.name || 'N/A'}</p>
                                        </div>

                                        <div className="bg-white rounded-lg p-3 shadow-sm border">
                                            <p className="text-xs text-gray-500 mb-1">Gói sản phẩm</p>
                                            <p className="font-semibold text-gray-900 text-sm">{tx.product_variants?.name || 'N/A'}</p>
                                        </div>

                                        <div className="bg-white rounded-lg p-3 shadow-sm border">
                                            <p className="text-xs text-gray-500 mb-1">Key đã bán</p>
                                            <div className="flex items-center gap-2">
                                                <Key className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                                <code className="font-mono text-xs text-gray-800 break-all flex-1">
                                                    {tx.product_keys?.key_value || (tx.product_variants?.products as any)?.account_info || (tx.metadata?.is_manual_delivery ? tx.id.split('-')[0].toUpperCase() : 'N/A')}
                                                </code>
                                                {(tx.product_keys?.key_value || (tx.product_variants?.products as any)?.account_info || tx.metadata?.is_manual_delivery) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            navigator.clipboard.writeText(tx.product_keys?.key_value || (tx.product_variants?.products as any)?.account_info || (tx.metadata?.is_manual_delivery ? tx.id.split('-')[0].toUpperCase() : ''))
                                                        }}
                                                        className="text-gray-400 hover:text-blue-600 p-1 cursor-pointer transition-colors flex-shrink-0"
                                                        title="Copy Key"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-lg p-3 shadow-sm border">
                                            <p className="text-xs text-gray-500 mb-1">Thông tin thanh toán</p>
                                            <div className="space-y-1">
                                                <p className="text-xs">
                                                    <span className="text-gray-500">Giá gốc:</span>{' '}
                                                    <span className="text-gray-400 line-through">{(tx.metadata?.original_price ?? Math.abs(tx.amount)).toLocaleString('vi-VN')}đ</span>
                                                </p>
                                                <p className="text-xs">
                                                    <span className="text-gray-500">Giá bán:</span>{' '}
                                                    <span className="font-bold text-red-600">{Math.abs(tx.amount).toLocaleString('vi-VN')}đ</span>
                                                </p>
                                                {tx.metadata?.referral_discount_applied && (
                                                    <p className="text-xs">
                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                            Giảm giá giới thiệu đã áp dụng
                                                        </span>
                                                    </p>
                                                )}
                                                {tx.metadata?.quantity_in_order > 1 && (
                                                    <p className="text-xs">
                                                        <span className="text-gray-500">Trong đơn hàng:</span>{' '}
                                                        <span className="font-medium">{tx.metadata.order_index} / {tx.metadata.quantity_in_order} sản phẩm</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {guideUrl && (
                                            <div className="bg-white rounded-lg p-3 shadow-sm border">
                                                <p className="text-xs text-gray-500 mb-1">Hướng dẫn sử dụng</p>
                                                <a
                                                    href={guideUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-xs cursor-pointer transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                                    <span className="break-all">{guideUrl}</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {filteredTransactions.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border">
                    <p className="text-gray-500">Không có giao dịch nào</p>
                </div>
            )}
        </div>
    )
}
