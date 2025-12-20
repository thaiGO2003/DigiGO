import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { 
  User, Calendar, CreditCard, 
  ShoppingBag, History, Copy, Check, Package, Key
} from 'lucide-react'
import AuthModal from './AuthModal'

type TransactionWithDetails = {
  id: string
  created_at: string
  amount: number
  type: 'top_up' | 'purchase'
  status: 'pending' | 'completed' | 'failed'
  metadata?: any
  variant_id?: string
  key_id?: string
  product_variants?: {
    name: string
    products?: {
      name: string
    }
  }
  product_keys?: {
    key_value: string
  }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'purchases' | 'topups'>('purchases')
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true)
      setLoading(false)
      return
    }
    fetchHistory()
  }, [user, activeTab])

  const fetchHistory = async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          product_variants (
            name,
            products (name)
          ),
          product_keys (key_value)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (activeTab === 'purchases') {
        query = query.eq('type', 'purchase')
      } else {
        query = query.eq('type', 'top_up')
      }

      const { data, error } = await query

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Vui lòng đăng nhập để xem thông tin cá nhân</p>
        </div>
        {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      </>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <User className="h-12 w-12 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{user.full_name || 'Người dùng'}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Số dư</span>
                <span className="font-bold text-blue-600">{user.balance?.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Ngày tham gia</span>
                <span className="text-sm text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
              {user.referral_code && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Mã giới thiệu</span>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {user.referral_code}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Tabs */}
            <div className="border-b">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('purchases')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 flex items-center space-x-2 ${
                    activeTab === 'purchases'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Lịch sử mua hàng</span>
                </button>
                <button
                  onClick={() => setActiveTab('topups')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 flex items-center space-x-2 ${
                    activeTab === 'topups'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Lịch sử nạp tiền</span>
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Chưa có giao dịch nào</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {tx.type === 'purchase' ? (
                              <Package className="h-4 w-4 text-purple-500" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-green-500" />
                            )}
                            <span className="font-medium text-gray-900">
                              {tx.type === 'purchase'
                                ? tx.product_variants?.products?.name || 'Sản phẩm'
                                : 'Nạp tiền vào tài khoản'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                tx.status === 'completed'
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
                          </div>
                          
                          <div className="text-sm text-gray-500 space-y-1">
                            <p className="flex items-center space-x-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(tx.created_at).toLocaleString('vi-VN')}
                              </span>
                            </p>
                            
                            {tx.type === 'purchase' && tx.product_variants && (
                              <p className="text-gray-600">
                                Gói: {tx.product_variants.name}
                              </p>
                            )}

                            {tx.type === 'top_up' && tx.metadata?.payment_method === 'bank_transfer' && (
                              <p className="text-gray-600">
                                Nội dung CK: {tx.metadata.transfer_content}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <span className={`font-bold ${
                            tx.type === 'purchase' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {tx.type === 'purchase' ? '-' : '+'}
                            {Math.abs(tx.amount).toLocaleString('vi-VN')}đ
                          </span>
                          
                          {tx.type === 'purchase' && tx.product_keys?.key_value && (
                            <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">
                              <Key className="h-3 w-3 text-gray-500" />
                              <code className="text-sm font-mono text-gray-800">
                                {tx.product_keys.key_value}
                              </code>
                              <button
                                onClick={() => copyToClipboard(tx.product_keys?.key_value || '', tx.id)}
                                className="text-gray-500 hover:text-blue-600 transition-colors"
                                title="Sao chép Key"
                              >
                                {copiedKey === tx.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
