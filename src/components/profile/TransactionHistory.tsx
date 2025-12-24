import { useState } from 'react'
import {
  History, Package, CreditCard, Calendar, ExternalLink,
  Copy, Check, Key
} from 'lucide-react'

// Define TransactionWithDetails type locally or import from a shared types file
type TransactionWithDetails = {
  id: string
  created_at: string
  amount: number
  type: 'top_up' | 'purchase'
  status: 'pending' | 'completed' | 'failed'
  metadata?: {
    guide_url?: string
    quantity_in_order?: number
    order_index?: number
    referral_discount_applied?: boolean
    payment_method?: string
    transfer_content?: string
    is_manual_delivery?: boolean
  }
  product_variants?: {
    name: string
    guide_url?: string
    products?: {
      name: string
      guide_url?: string
      account_info?: string
    }
  }
  product_keys?: {
    key_value: string
  }
}

interface TransactionHistoryProps {
  transactions: TransactionWithDetails[]
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">Chưa có giao dịch nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx) => {
        const guideUrl = tx.metadata?.guide_url || tx.product_variants?.guide_url || tx.product_variants?.products?.guide_url
        const quantityInOrder = tx.metadata?.quantity_in_order
        const orderIndex = tx.metadata?.order_index
        const hasReferralDiscount = tx.metadata?.referral_discount_applied

        return (
          <div
            key={tx.id}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors hover:border-blue-200"
          >
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              {/* Left Side - Main Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {tx.type === 'purchase' ? (
                    <Package className="h-4 w-4 text-purple-500" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-green-500" />
                  )}
                  <span className="font-medium text-gray-900">
                    {tx.type === 'purchase'
                      ? (tx.metadata?.is_manual_delivery 
                          ? `Mã giao dịch - ${tx.product_variants?.products?.name || 'Sản phẩm'} - ${tx.product_variants?.name || 'Gói'}`
                          : `${tx.product_variants?.products?.name || 'Sản phẩm'} - ${tx.product_variants?.name || 'Gói'}`)
                      : ((tx.metadata as any)?.is_admin_adjustment ? ((tx.metadata as any)?.note || 'Điều chỉnh số dư') : 'Nạp tiền vào tài khoản')
                    }
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : tx.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {tx.status === 'completed'
                      ? 'Thành công'
                      : tx.status === 'pending'
                        ? 'Đang xử lý'
                        : 'Thất bại'}
                  </span>
                  {quantityInOrder && quantityInOrder > 1 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      #{orderIndex}/{quantityInOrder}
                    </span>
                  )}
                  {hasReferralDiscount && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Giảm giá giới thiệu
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(tx.created_at).toLocaleString('vi-VN')}
                    </span>
                  </p>

                  <p className="text-gray-600">
                    <span className="text-gray-500">Mã giao dịch:</span>{' '}
                    <span className="font-mono font-medium text-gray-700 select-all" onClick={() => copyToClipboard(tx.id.split('-')[0].toUpperCase(), tx.id + '-txid')}>
                        {tx.id.split('-')[0].toUpperCase()}
                    </span>
                  </p>

                  {tx.type === 'purchase' && tx.product_variants && (
                    <p className="text-gray-600">
                      <span className="text-gray-500">Gói:</span>{' '}
                      <span className="font-medium">{tx.product_variants.name}</span>
                    </p>
                  )}

                  {tx.type === 'top_up' && tx.metadata?.payment_method === 'bank_transfer' && tx.metadata?.transfer_content && (
                    <p className="text-gray-600">
                      <span className="text-gray-500">Nội dung CK:</span>{' '}
                      <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{tx.metadata.transfer_content}</code>
                    </p>
                  )}
                </div>

                {/* Guide URL */}
                {tx.type === 'purchase' && guideUrl && (
                  <div className="mt-3 flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                    <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <a
                      href={guideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
                    >
                      Xem hướng dẫn sử dụng
                    </a>
                    <button
                      onClick={() => copyToClipboard(guideUrl, tx.id + '-guide')}
                      className="text-gray-400 hover:text-blue-600 p-1 flex-shrink-0"
                      title="Copy link hướng dẫn"
                    >
                      {copiedKey === tx.id + '-guide' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side - Amount & Key */}
              <div className="flex flex-col items-end gap-2 min-w-[180px]">
                <span className={`text-lg font-bold ${tx.type === 'purchase' ? 'text-red-600' : 'text-green-600'}`}>
                  {tx.type === 'purchase' ? '-' : '+'}
                  {Math.abs(tx.amount).toLocaleString('vi-VN')}đ
                </span>

                {tx.type === 'purchase' && (
                  <>
                    {tx.metadata?.is_manual_delivery ? (
                      <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 w-full">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-orange-600 mb-0.5">
                            {tx.product_variants?.products?.name || 'Sản phẩm'} - {tx.product_variants?.name || 'Gói'}:
                          </p>
                          <code className="text-sm font-mono text-orange-900 font-bold block truncate">
                            {tx.id.split('-')[0].toUpperCase()}
                          </code>
                          <p className="text-xs text-orange-500 mt-1">Gửi mã này cho Admin để nhận key</p>
                        </div>
                        <button
                          onClick={() => {
                            const copyText = `${tx.id.split('-')[0].toUpperCase()} - ${tx.product_variants?.products?.name || 'Sản phẩm'} - ${tx.product_variants?.name || 'Gói'}`
                            copyToClipboard(copyText, tx.id)
                          }}
                          className="text-orange-400 hover:text-orange-600 p-1 flex-shrink-0"
                          title="Sao chép Mã giao dịch"
                        >
                          {copiedKey === tx.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      (() => {
                        const displayKey = tx.product_keys?.key_value || tx.product_variants?.products?.account_info || 'N/A'
                        return (
                          <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-purple-50 px-3 py-2 rounded-lg border border-gray-200 w-full">
                            <Key className="h-4 w-4 text-purple-500 flex-shrink-0" />
                            <code className="text-sm font-mono text-gray-800 truncate flex-1">
                              {displayKey}
                            </code>
                            {displayKey !== 'N/A' && (
                              <button
                                onClick={() => copyToClipboard(displayKey, tx.id)}
                                className="text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0"
                                title="Sao chép Key"
                              >
                                {copiedKey === tx.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        )
                      })()
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}




