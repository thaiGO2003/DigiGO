import { useState, useEffect } from 'react'
import { CreditCard, History, Copy, CheckCircle, Download, Timer, AlertCircle, RefreshCw, Globe } from 'lucide-react'
import { supabase, Transaction, BankConfig } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'
import { vnpayService } from '../lib/vnpay'

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000]

export default function TopUpPage() {
  const { user, loading: authLoading } = useAuth()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)
  const [transferContent, setTransferContent] = useState('')
  const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutes
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'vnpay'>('bank_transfer')
  const [activeBankConfig, setActiveBankConfig] = useState<BankConfig | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    fetchTransactions()
    fetchActiveBankConfig()
  }, [authLoading, user])

  useEffect(() => {
    if (authLoading) return
    setShowAuthModal(!user)
  }, [authLoading, user])

  // Polling for transaction status
  useEffect(() => {
    if (!user || !qrUrl) return

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('type', 'top_up')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!error && data && data.length > 0) {
        // Find if any of these completed transactions are recent
        setQrUrl(null)
        setPendingAmount(null)
        alert('Thanh toán thành công! Số dư của bạn đã được cập nhật.')
        fetchTransactions()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [user?.id, qrUrl])

  // Countdown timer
  useEffect(() => {
    if (!qrUrl) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          setQrUrl(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [qrUrl])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const fetchActiveBankConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_configs')
        .select('*')
        .eq('is_active', true)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setActiveBankConfig(data)
      }
    } catch (error) {
      console.error('Error fetching bank config:', error)
    }
  }

  const fetchTransactions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'top_up')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const handleTopUp = async (amount: number) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (amount < 20000) {
      alert('Số tiền nạp tối thiểu là 20,000đ')
      return
    }

    setLoading(true)
    try {
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000)
      const orderId = `DIGIGO_${user.id}_${Date.now()}_${uniqueSuffix}`
      
      if (paymentMethod === 'vnpay') {
        // VNPay payment
        const ipAddress = '127.0.0.1' // In production, get real IP
        const orderInfo = `Nap tien DIGIGO ${amount.toLocaleString('vi-VN')}d`
        
        const paymentUrl = await vnpayService.createPaymentUrl({
          amount,
          orderId,
          orderInfo,
          ipAddress,
          locale: 'vn'
        })

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: amount,
            type: 'top_up',
            status: 'pending',
            metadata: {
              payment_method: 'vnpay',
              order_id: orderId,
              vnpay_url: paymentUrl
            }
          })

        if (transactionError) throw transactionError

        // Redirect to VNPay
        window.location.href = paymentUrl
        
      } else {
        // Bank transfer
        if (!activeBankConfig) {
          alert('Hệ thống nạp tiền đang bảo trì. Vui lòng liên hệ Admin.')
          setLoading(false)
          return
        }

        const content = `DIGIGO ${user.username || user.email?.split('@')[0]} ${uniqueSuffix}`.toUpperCase()
        setTransferContent(content)

        const bankId = activeBankConfig.bank_id
        const accountNo = activeBankConfig.account_number
        const accountName = activeBankConfig.account_name

        const qrCodeUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: amount,
            type: 'top_up',
            status: 'pending',
            metadata: {
              payment_method: 'bank_transfer',
              transfer_content: content,
              qr_url: qrCodeUrl
            }
          })

        if (transactionError) throw transactionError

        setQrUrl(qrCodeUrl)
        setPendingAmount(amount)
        setTimeLeft(15 * 60)
      }
      
      fetchTransactions()
    } catch (error) {
      console.error('Error topping up:', error)
      alert('Có lỗi xảy ra khi tạo giao dịch nạp tiền')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Nạp Tiền</h1>
            <p className="text-gray-600">Vui lòng đăng nhập để sử dụng tính năng này</p>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Nạp Tiền</h1>
          <p className="text-gray-500 mt-1">Nạp tiền vào ví để mua sắm các sản phẩm số</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-blue-50 p-2 rounded-xl">
            <CreditCard className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Số dư hiện tại</p>
            <p className="text-xl font-bold text-gray-900">{user.balance.toLocaleString('vi-VN')}đ</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Step 1: Input Amount */}
        <div className={`${qrUrl ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-8`}>
          {!qrUrl ? (
            <div className="bg-white rounded-3xl shadow-xl shadow-blue-50 border border-gray-100 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</div>
                  <h2 className="text-xl font-bold text-gray-900">Nhập số tiền muốn nạp</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Phương thức thanh toán</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left ${paymentMethod === 'bank_transfer'
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-6 w-6 text-blue-600" />
                          <div>
                            <p className="font-bold text-gray-900">Chuyển khoản ngân hàng</p>
                            <p className="text-sm text-gray-500">Quét mã QR hoặc chuyển khoản thủ công</p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('vnpay')}
                        className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left ${paymentMethod === 'vnpay'
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Globe className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-bold text-gray-900">VNPay</p>
                            <p className="text-sm text-gray-500">Thanh toán trực tuyến qua VNPay</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Chọn mệnh giá nhanh</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PRESET_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            setSelectedAmount(amount)
                            setCustomAmount('')
                          }}
                          className={`py-4 rounded-2xl border-2 transition-all duration-200 font-bold ${selectedAmount === amount
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md transform -translate-y-1'
                            : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50 text-gray-600'
                            }`}
                        >
                          {amount.toLocaleString('vi-VN')}đ
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Hoặc nhập số tiền tùy chọn</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value)
                          setSelectedAmount(null)
                        }}
                        placeholder="VD: 100,000"
                        className="w-full pl-6 pr-16 py-5 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-2xl font-bold transition-all outline-none"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">đ</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Số tiền tối thiểu: 20,000đ
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const amount = selectedAmount || parseInt(customAmount)
                      if (amount) handleTopUp(amount)
                    }}
                    disabled={loading || (!selectedAmount && !customAmount) || (paymentMethod === 'bank_transfer' && !activeBankConfig)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center group"
                  >
                    {loading ? (
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <span>Tiếp tục</span>
                        <RefreshCw className="h-5 w-5 ml-2 group-hover:rotate-180 transition-transform duration-500" />
                      </>
                    )}
                  </button>
                  {paymentMethod === 'bank_transfer' && !activeBankConfig && (
                    <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Hệ thống nạp tiền đang bảo trì
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-700">
              {/* Left: QR Display */}
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center flex flex-col items-center">
                <div className="mb-6">
                  <span className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-bold flex items-center mx-auto w-fit">
                    <Timer className="h-4 w-4 mr-2" />
                    Đơn hàng hết hạn sau: {formatTime(timeLeft)}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">Quét mã QR để thanh toán</h3>

                <div className="relative p-6 bg-white border-2 border-dashed border-gray-200 rounded-3xl mb-6 group">
                  <img src={qrUrl} alt="QR Code" className="w-[300px] h-[300px] rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-3xl backdrop-blur-sm">
                    <button
                      onClick={() => window.open(qrUrl, '_blank')}
                      className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-2 font-bold"
                    >
                      <Download className="h-5 w-5" />
                      Tải mã QR
                    </button>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-gray-500 font-medium">Số tiền nạp:</span>
                    <span className="text-2xl font-black text-blue-600">{pendingAmount?.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <button
                    onClick={() => setQrUrl(null)}
                    className="text-gray-400 hover:text-red-500 font-medium text-sm py-2 transition-colors"
                  >
                    ← Hủy và tạo đơn khác
                  </button>
                </div>
              </div>

              {/* Right: Payment Info */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                  <h3 className="text-xl font-bold flex items-center mb-6">
                    <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
                    Thông tin chuyển khoản
                  </h3>

                  <div className="space-y-4">
                    {[
                      { label: 'Ngân hàng', value: activeBankConfig?.bank_name || 'N/A', key: 'bank' },
                      { label: 'Số tài khoản', value: activeBankConfig?.account_number || 'N/A', key: 'account' },
                      { label: 'Chủ tài khoản', value: activeBankConfig?.account_name || 'N/A', key: 'name' },
                      { label: 'Nội dung chuyển khoản', value: transferContent, key: 'content', highlight: true },
                    ].map((item) => (
                      <div key={item.key} className={`p-4 rounded-2xl border-2 transition-all ${item.highlight ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">{item.label}</p>
                            <p className={`font-bold ${item.highlight ? 'text-lg text-yellow-800' : 'text-gray-900'}`}>{item.value}</p>
                          </div>
                          {item.key !== 'bank' && item.key !== 'name' && (
                            <button
                              onClick={() => copyToClipboard(item.value, item.key)}
                              className={`p-2 rounded-xl transition-all ${copiedField === item.key ? 'bg-green-500 text-white' : 'bg-white text-gray-400 hover:text-blue-600 shadow-sm'}`}
                            >
                              {copiedField === item.key ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-6 bg-green-50 rounded-2xl border border-green-100">
                    <h4 className="flex items-center text-green-800 font-bold mb-2 text-sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Hệ thống tự động cộng tiền
                    </h4>
                    <p className="text-green-700 text-xs leading-relaxed">
                      Sau khi chuyển khoản thành công, hệ thống sẽ tự động cộng tiền vào tài khoản của bạn trong vòng 1-2 phút. Vui lòng ghi chính xác nội dung chuyển khoản.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transaction History Sidebar */}
        {!qrUrl && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <History className="h-5 w-5 mr-2 text-blue-600" />
                  Giao dịch gần đây
                </h3>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-medium">Chưa có giao dịch</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-900">+{transaction.amount.toLocaleString('vi-VN')}đ</span>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{new Date(transaction.created_at).toLocaleDateString('vi-VN')}</span>
                          <span className="text-[10px] text-gray-300 font-mono">#{transaction.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}