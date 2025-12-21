import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  User, Users, Calendar, CreditCard,
  ShoppingBag, History, Copy, Check, Package, Key,
  AlertCircle, Loader2, ExternalLink, Gift, Percent, DollarSign, Award, CheckCircle
} from 'lucide-react'
import AuthModal from './AuthModal'

type TransactionWithDetails = {
  id: string
  created_at: string
  amount: number
  type: 'top_up' | 'purchase'
  status: 'pending' | 'completed' | 'failed'
  metadata?: {
    original_price?: number
    referral_discount_applied?: boolean
    quantity_in_order?: number
    order_index?: number
    guide_url?: string
    payment_method?: string
    transfer_content?: string
    is_manual_delivery?: boolean
  }
  variant_id?: string
  key_id?: string
  product_variants?: {
    name: string
    guide_url?: string
    price?: number
    discount_percent?: number
    products?: {
      name: string
      guide_url?: string
    }
  }
  product_keys?: {
    key_value: string
  }
}

interface ReferralStats {
  totalReferrals: number
  monthlyEarnings: number
  totalEarnings: number
}

interface ReferredUser {
  id: string
  email: string
  full_name?: string
  created_at: string
}

export default function ProfilePage() {
  const { user, session, isInitializing, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'purchases' | 'topups' | 'referral'>('purchases')
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])

  // Base Loading & UI States
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Profile Update States
  const [fullNameInput, setFullNameInput] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [fullNameMessage, setFullNameMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [usernameMessage, setUsernameMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [updatingFullName, setUpdatingFullName] = useState(false)
  const [updatingUsername, setUpdatingUsername] = useState(false)

  // Referral States
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    monthlyEarnings: 0,
    totalEarnings: 0
  })
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [referralLoading, setReferralLoading] = useState(false)
  const [copiedReferralCode, setCopiedReferralCode] = useState(false)
  const [copiedReferralLink, setCopiedReferralLink] = useState(false)

  useEffect(() => {
    setFullNameInput(user?.full_name || '')
    setUsernameInput(user?.username || '')
  }, [user?.full_name, user?.username])

  useEffect(() => {
    if (isInitializing) return

    if (!session) {
      setShowAuthModal(true)
      setLoading(false)
      return
    }

    setShowAuthModal(false)
    if (user) {
      if (activeTab === 'referral') {
        fetchReferralData()
      } else {
        fetchHistory()
      }
    }
  }, [user, session, activeTab, isInitializing])

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
            guide_url,
            products (name, guide_url)
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

  const fetchReferralData = async () => {
    if (!user) return
    setReferralLoading(true)

    try {
      // Fetch referred users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      setReferredUsers(usersData || [])

      // Fetch earnings summary
      const { data: earningsData, error: earningsError } = await supabase
        .from('referral_earnings')
        .select('amount, created_at')
        .eq('referrer_id', user.id)

      if (earningsError) throw earningsError

      // Calculate stats
      const totalEarnings = (earningsData || []).reduce((sum, e) => sum + e.amount, 0)

      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyEarnings = (earningsData || [])
        .filter(e => new Date(e.created_at) >= firstDayOfMonth)
        .reduce((sum, e) => sum + e.amount, 0)

      setReferralStats({
        totalReferrals: usersData?.length || 0,
        monthlyEarnings,
        totalEarnings
      })
    } catch (error) {
      console.error('Error fetching referral data:', error)
    } finally {
      setReferralLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getReferralLink = () => {
    if (!user?.referral_code) return ''
    return `${window.location.origin}?ref=${user.referral_code}`
  }

  const copyReferral = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'code') {
        setCopiedReferralCode(true)
        setTimeout(() => setCopiedReferralCode(false), 2000)
      } else {
        setCopiedReferralLink(true)
        setTimeout(() => setCopiedReferralLink(false), 2000)
      }
    })
  }

  const handleUpdateFullName = async () => {
    if (!fullNameInput.trim()) {
      setFullNameMessage({ type: 'error', text: 'Vui lòng nhập họ tên' })
      return
    }

    setUpdatingFullName(true)
    setFullNameMessage(null)
    try {
      const { data, error } = await supabase.rpc('update_full_name', { p_full_name: fullNameInput.trim() })
      if (error) {
        throw error
      }
      setFullNameMessage({ type: 'success', text: data?.message || 'Cập nhật họ tên thành công' })
      refreshProfile?.()
    } catch (error: any) {
      setFullNameMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' })
    } finally {
      setUpdatingFullName(false)
    }
  }

  const handleUpdateUsername = async () => {
    if (!usernameInput.trim()) {
      setUsernameMessage({ type: 'error', text: 'Vui lòng nhập tên đăng nhập' })
      return
    }

    setUpdatingUsername(true)
    setUsernameMessage(null)
    try {
      const { data, error } = await supabase.rpc('update_username', { p_new_username: usernameInput.trim() })
      if (error) {
        throw error
      }
      if (data?.success) {
        setUsernameMessage({ type: 'success', text: data?.message || 'Cập nhật tên đăng nhập thành công' })
        refreshProfile?.()
      } else {
        setUsernameMessage({ type: 'error', text: data?.message || 'Không thể cập nhật tên đăng nhập' })
      }
    } catch (error: any) {
      setUsernameMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' })
    } finally {
      setUpdatingUsername(false)
    }
  }

  const nextUsernameChange = user?.last_username_change
    ? new Date(new Date(user.last_username_change).getTime() + 24 * 60 * 60 * 1000)
    : null
  const canChangeUsername = !nextUsernameChange || nextUsernameChange <= new Date()

  if (!session || !user) {
    return (
      <>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Vui lòng đăng nhập để xem thông tin cá nhân</p>
        </div>
        {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      </>
    )
  }

  if (activeTab !== 'referral' && loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
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
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Mã giới thiệu</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {user.referral_code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(user.referral_code!, 'ref-code')}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Sao chép mã giới thiệu"
                      >
                        {copiedKey === 'ref-code' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Cập nhật họ tên</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  placeholder="Nguyễn Văn A"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                />
                <button
                  onClick={handleUpdateFullName}
                  disabled={updatingFullName}
                  className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {updatingFullName && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu họ tên
                </button>
                {fullNameMessage && (
                  <p className={`text-xs flex items-center gap-1 ${fullNameMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    <AlertCircle className="h-3 w-3" />
                    {fullNameMessage.text}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Đổi tên đăng nhập</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 uppercase"
                  placeholder="DIGIGO_USER"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value.replace(/\s+/g, '').toUpperCase())}
                  disabled={!canChangeUsername}
                />
                <button
                  onClick={handleUpdateUsername}
                  disabled={!canChangeUsername || updatingUsername}
                  className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {updatingUsername && <Loader2 className="h-4 w-4 animate-spin" />}
                  {canChangeUsername ? 'Lưu tên đăng nhập' : 'Chưa thể đổi'}
                </button>
                {nextUsernameChange && !canChangeUsername && (
                  <p className="text-xs text-orange-600">
                    Có thể đổi lại sau {nextUsernameChange.toLocaleString('vi-VN')}
                  </p>
                )}
                {usernameMessage && (
                  <p className={`text-xs flex items-center gap-1 ${usernameMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    <AlertCircle className="h-3 w-3" />
                    {usernameMessage.text}
                  </p>
                )}
              </div>
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
                  className={`py-4 px-6 text-sm font-medium border-b-2 flex items-center space-x-2 ${activeTab === 'purchases'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Lịch sử mua hàng</span>
                </button>
                <button
                  onClick={() => setActiveTab('topups')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 flex items-center space-x-2 ${activeTab === 'topups'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Lịch sử nạp tiền</span>
                </button>
                <button
                  onClick={() => setActiveTab('referral')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 flex items-center space-x-2 ${activeTab === 'referral'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Gift className="h-4 w-4" />
                  <span>Chương trình giới thiệu</span>
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab !== 'referral' && (
                <>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">Chưa có giao dịch nào</p>
                    </div>
                  ) : (
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
                                      ? tx.product_variants?.products?.name || 'Sản phẩm'
                                      : 'Nạp tiền vào tài khoản'}
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
                                <span className={`text-lg font-bold ${tx.type === 'purchase' ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                  {tx.type === 'purchase' ? '-' : '+'}
                                  {Math.abs(tx.amount).toLocaleString('vi-VN')}đ
                                </span>

                                {tx.type === 'purchase' && (
                                  <>
                                    {tx.metadata?.is_manual_delivery ? (
                                      <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200 w-full">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-orange-600 mb-0.5">Mã đơn hàng (Gửi Admin để nhận key):</p>
                                          <code className="text-sm font-mono text-orange-900 font-bold block truncate">
                                            {tx.id.split('-')[0].toUpperCase()}
                                          </code>
                                        </div>
                                        <button
                                          onClick={() => copyToClipboard(tx.id.split('-')[0].toUpperCase(), tx.id)}
                                          className="text-orange-400 hover:text-orange-600 p-1 flex-shrink-0"
                                          title="Sao chép Mã đơn"
                                        >
                                          {copiedKey === tx.id ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <Copy className="h-4 w-4" />
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      tx.product_keys?.key_value && (
                                        <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-purple-50 px-3 py-2 rounded-lg border border-gray-200 w-full">
                                          <Key className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                          <code className="text-sm font-mono text-gray-800 truncate flex-1">
                                            {tx.product_keys.key_value}
                                          </code>
                                          <button
                                            onClick={() => copyToClipboard(tx.product_keys?.key_value || '', tx.id)}
                                            className="text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0"
                                            title="Sao chép Key"
                                          >
                                            {copiedKey === tx.id ? (
                                              <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                              <Copy className="h-4 w-4" />
                                            )}
                                          </button>
                                        </div>
                                      )
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'referral' && (
                <div>
                  {referralLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-4 text-white">
                          <div className="flex items-center justify-between mb-2">
                            <Users className="h-6 w-6 opacity-80" />
                          </div>
                          <div className="text-sm opacity-90 mb-1">Tổng giới thiệu</div>
                          <div className="text-2xl font-bold">{referralStats.totalReferrals}</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-4 text-white">
                          <div className="flex items-center justify-between mb-2">
                            <Calendar className="h-6 w-6 opacity-80" />
                          </div>
                          <div className="text-sm opacity-90 mb-1">Tháng này</div>
                          <div className="text-2xl font-bold">{referralStats.monthlyEarnings.toLocaleString('vi-VN')}đ</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-4 text-white">
                          <div className="flex items-center justify-between mb-2">
                            <DollarSign className="h-6 w-6 opacity-80" />
                          </div>
                          <div className="text-sm opacity-90 mb-1">Tổng hoa hồng</div>
                          <div className="text-2xl font-bold">{referralStats.totalEarnings.toLocaleString('vi-VN')}đ</div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-4 text-white">
                          <div className="flex items-center justify-between mb-2">
                            <Percent className="h-6 w-6 opacity-80" />
                          </div>
                          <div className="text-sm opacity-90 mb-1">Tỷ lệ hiện tại</div>
                          <div className="text-2xl font-bold">{Math.min(referralStats.totalReferrals * 1, 10)}%</div>
                          {referralStats.totalReferrals < 10 && (
                            <div className="text-xs opacity-75 mt-1">
                              Còn {10 - referralStats.totalReferrals} người để tăng %
                            </div>
                          )}
                        </div>
                      </div>

                      {/* User Rank Section */}
                      <div className="bg-gray-50 rounded-lg border p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                          <Award className="h-5 w-5 mr-2 text-yellow-600" />
                          Hạng thành viên
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white border rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Award className="h-6 w-6 text-yellow-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg capitalize">
                                  {user.rank === 'bronze' ? 'Đồng' :
                                   user.rank === 'silver' ? 'Bạc' :
                                   user.rank === 'gold' ? 'Vàng' :
                                   user.rank === 'platinum' ? 'Platinum' :
                                   'Kim cương'}
                                </h3>
                                <p className="text-sm text-gray-600">Hạng hiện tại</p>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Giảm giá hạng:</span>
                                <span className="font-medium text-green-600">
                                  {user.rank === 'silver' ? '2%' :
                                    user.rank === 'gold' ? '4%' :
                                      user.rank === 'platinum' ? '6%' :
                                        user.rank === 'diamond' ? '8%' : '0%'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Giảm giá giới thiệu:</span>
                                <span className="font-medium text-blue-600">{Math.min(referralStats.totalReferrals * 1, 10)}%</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t mt-2">
                                <span className="text-gray-600 font-medium">Tổng giảm giá tối đa:</span>
                                <span className="font-bold text-purple-600">
                                  {Math.min(referralStats.totalReferrals * 1, 10) + (user.rank === 'silver' ? 2 :
                                    user.rank === 'gold' ? 4 :
                                      user.rank === 'platinum' ? 6 :
                                        user.rank === 'diamond' ? 8 : 0)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white border rounded-lg p-4">
                            <h4 className="font-medium mb-3">Cấp độ tiếp theo</h4>
                            <div className="space-y-3">
                              {(() => {
                                const currentDeposited = user.total_deposited || 0
                                let nextMilestone = ''
                                let neededAmount = 0
                                let currentProgress = 0

                                if (currentDeposited < 500000) {
                                  nextMilestone = 'Bạc (500K)'
                                  neededAmount = 500000 - currentDeposited
                                  currentProgress = currentDeposited / 500000
                                } else if (currentDeposited < 1000000) {
                                  nextMilestone = 'Vàng (1 triệu)'
                                  neededAmount = 1000000 - currentDeposited
                                  currentProgress = (currentDeposited - 500000) / 500000
                                } else if (currentDeposited < 2000000) {
                                  nextMilestone = 'Platinum (2 triệu)'
                                  neededAmount = 2000000 - currentDeposited
                                  currentProgress = (currentDeposited - 1000000) / 1000000
                                } else if (currentDeposited < 3000000) {
                                  nextMilestone = 'Kim cương (3 triệu)'
                                  neededAmount = 3000000 - currentDeposited
                                  currentProgress = (currentDeposited - 2000000) / 1000000
                                } else if (currentDeposited < 5000000) {
                                  nextMilestone = 'Kim cương+ (5 triệu)'
                                  neededAmount = 5000000 - currentDeposited
                                  currentProgress = (currentDeposited - 3000000) / 2000000
                                } else {
                                  return <p className="text-sm text-gray-600 text-center py-2">Bạn đã đạt hạng cao nhất!</p>
                                }

                                return (
                                  <div>
                                    <p className="text-sm text-gray-600 mb-2">
                                      Cần nạp thêm <span className="font-medium text-blue-600">{neededAmount.toLocaleString('vi-VN')}đ</span> để đạt <span className="font-medium">{nextMilestone}</span>
                                    </p>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{
                                          width: `${Math.min(currentProgress * 100, 100)}%`
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Referral Link Section */}
                      <div className="bg-white rounded-lg border border-blue-100 p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                          <Copy className="h-5 w-5 mr-2 text-blue-600" />
                          Link giới thiệu của bạn
                        </h2>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã giới thiệu:</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={user.referral_code || ''}
                                readOnly
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono font-semibold"
                              />
                              <button
                                onClick={() => copyReferral(user.referral_code || '', 'code')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                {copiedReferralCode ? (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Đã copy</span>
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

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Link giới thiệu:</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={getReferralLink()}
                                readOnly
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm overflow-ellipsis"
                              />
                              <button
                                onClick={() => copyReferral(getReferralLink(), 'link')}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                {copiedReferralLink ? (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Đã copy</span>
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
                        </div>

                        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center text-sm">
                            <Gift className="h-4 w-4 mr-2" />
                            Cách thức hoạt động:
                          </h3>
                          <ul className="text-sm text-yellow-700 space-y-1 ml-6 list-disc">
                            <li>Chia sẻ link giới thiệu cho bạn bè</li>
                            <li>Nhận hoa hồng trọn đời từ mỗi giao dịch của họ</li>
                            <li>Hoa hồng tự động cộng vào số dư tài khoản</li>
                          </ul>
                        </div>
                      </div>

                      {/* Referred Users */}
                      <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                          <Users className="h-5 w-5 mr-2 text-purple-600" />
                          Người bạn đã giới thiệu {referredUsers.length > 0 && `(${referredUsers.length})`}
                        </h2>

                        {referredUsers.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                            <p>Chưa có ai đăng ký qua link của bạn</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đăng ký</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {referredUsers.map((refUser) => (
                                  <tr key={refUser.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      <div className="flex flex-col">
                                        <span>{refUser.email}</span>
                                        {refUser.full_name && <span className="text-xs text-gray-500">{refUser.full_name}</span>}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {new Date(refUser.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
