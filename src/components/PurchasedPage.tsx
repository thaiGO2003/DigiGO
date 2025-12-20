import React, { useState, useEffect } from 'react'
import { Package, Calendar, CreditCard } from 'lucide-react'
import { supabase, Transaction } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

export default function PurchasedPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTransactions()
    } else {
      setShowAuthModal(true)
      setLoading(false)
    }
  }, [user])

  const fetchTransactions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'purchase')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
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

      {transactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
          <p className="text-gray-500">
            Bạn chưa mua sản phẩm nào. Hãy khám phá các sản phẩm tại cửa hàng!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Giao dịch #{transaction.id.slice(-8)}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(transaction.created_at).toLocaleDateString('vi-VN', {
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
                </div>
                {getStatusBadge(transaction.status)}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-600">Số tiền:</span>
                    <div className="text-xl font-bold text-red-600">
                      -{Math.abs(transaction.amount).toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">Loại giao dịch:</span>
                    <div className="font-medium">Mua hàng</div>
                  </div>
                </div>
              </div>

              {transaction.status === 'completed' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✅ Giao dịch đã hoàn tất. Sản phẩm đã được giao.
                  </p>
                </div>
              )}

              {transaction.status === 'failed' && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700">
                    ❌ Giao dịch thất bại. Vui lòng liên hệ hỗ trợ.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}