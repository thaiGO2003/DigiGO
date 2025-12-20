import React, { useState, useEffect } from 'react'
import { Package, Calendar, CreditCard, Key, Copy, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

interface PurchaseDetail {
  id: string
  amount: number
  status: string
  created_at: string
  variant_name?: string
  product_name?: string
  duration_days?: number
  key_value?: string
}

export default function PurchasedPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<PurchaseDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPurchases()
    } else {
      setShowAuthModal(true)
      setLoading(false)
    }
  }, [user])

  const fetchPurchases = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          status,
          created_at,
          variant_id,
          key_id,
          product_variants (
            name,
            duration_days,
            products (
              name
            )
          ),
          product_keys (
            key_value
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'purchase')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedPurchases = (data || []).map((t: any) => ({
        id: t.id,
        amount: t.amount,
        status: t.status,
        created_at: t.created_at,
        variant_name: t.product_variants?.name,
        product_name: t.product_variants?.products?.name,
        duration_days: t.product_variants?.duration_days,
        key_value: t.product_keys?.key_value
      }))

      setPurchases(formattedPurchases)
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(id)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { text: 'Đang xử lý', bg: 'bg-yellow-100 text-yellow-800' },
      completed: { text: 'Thành công', bg: 'bg-green-100 text-green-800' },
      failed: { text: 'Thất bại', bg: 'bg-red-100 text-red-800' },
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.bg}`}>
        {statusInfo.text}
      </span>
    )
  }

  if (!user) {
    return (
      <>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Đã Mua</h1>
            <p className="text-gray-600">Vui lòng đăng nhập để xem lịch sử mua hàng</p>
          </div>
        </div>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <Package className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Đã Mua</h1>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
          <p className="text-gray-500">
            Bạn chưa mua sản phẩm nào. Hãy khám phá các sản phẩm tại cửa hàng!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 rounded-full p-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {purchase.product_name || 'Sản phẩm'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {purchase.variant_name}
                        {purchase.duration_days && ` - ${purchase.duration_days} ngày`}
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(purchase.created_at).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(purchase.status)}
                </div>

                <div className="border-t pt-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-600">Số tiền:</span>
                      <div className="text-xl font-bold text-red-600">
                        -{Math.abs(purchase.amount).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-600">Mã GD:</span>
                      <div className="font-mono text-xs text-gray-500">
                        #{purchase.id.slice(-8).toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>

                {purchase.status === 'completed' && purchase.key_value && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 rounded-full p-2 mt-1">
                        <Key className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">Key sản phẩm của bạn:</h4>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <code className="text-sm font-mono text-gray-900 select-all">
                              {purchase.key_value}
                            </code>
                            <button
                              onClick={() => copyToClipboard(purchase.key_value!, purchase.id)}
                              className="ml-3 flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                              title="Sao chép key"
                            >
                              {copiedKey === purchase.id ? (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Đã copy!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          💡 Vui lòng lưu lại key này. Key chỉ hiển thị một lần sau khi mua.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {purchase.status === 'completed' && !purchase.key_value && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-sm text-green-700 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Giao dịch đã hoàn tất thành công!
                    </p>
                  </div>
                )}

                {purchase.status === 'failed' && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-sm text-red-700">
                      ❌ Giao dịch thất bại. Vui lòng liên hệ hỗ trợ.
                    </p>
                  </div>
                )}

                {purchase.status === 'pending' && (
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      ⏳ Giao dịch đang được xử lý...
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
