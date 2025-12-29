import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, History, Copy, CheckCircle, Download, Timer, AlertCircle, RefreshCw, Globe } from 'lucide-react'
import { supabase, Transaction, BankConfig } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'
import { sepayService } from '../lib/sepay'

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000]

export default function TopUpPage() {
  const { user, loading: authLoading, isInitializing } = useAuth()
  const navigate = useNavigate()
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
  const [activeBankConfig, setActiveBankConfig] = useState<BankConfig | null>(null)
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const lastProcessedTxId = useRef<string | null>(null)
  const successModalTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => {
      clearInterval(timer)
      if (successModalTimerRef.current) {
        clearTimeout(successModalTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const amountParam = params.get('amount')
    if (amountParam) {
      const amount = parseInt(amountParam)
      if (!isNaN(amount) && amount > 0) {
        setCustomAmount(amount.toString())
        setSelectedAmount(null)
      }
    }
  }, [])

  useEffect(() => {
    if (activeTransaction) {
      const remaining = getRemainingSeconds(activeTransaction.created_at)
      if (remaining <= 0) {
        setQrUrl(null)
        setActiveTransaction(null)
      } else {
        setTimeLeft(remaining)
      }
    }
  }, [currentTime, activeTransaction])

  const isExpired = (createdAt: string) => {
    const created = new Date(createdAt).getTime()
    const now = currentTime
    return now - created > 15 * 60 * 1000
  }

  const getRemainingSeconds = (createdAt: string) => {
    const created = new Date(createdAt).getTime()
    const now = currentTime
    const diff = 15 * 60 * 1000 - (now - created)
    return Math.max(0, Math.floor(diff / 1000))
  }

  useEffect(() => {
    if (isInitializing || authLoading) return

    if (user) {
      fetchActiveBankConfig()
      fetchTransactions()

      // Realtime subscription for transactions
      const subscription = supabase
        .channel(`user-transactions-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Transaction change detected:', payload)
            fetchTransactions() // Refresh list on any change

            // If the active transaction was completed, close the QR display
            if (activeTransaction &&
              payload.new &&
              (payload.new as any).id === activeTransaction.id &&
              (payload.new as any).status === 'completed') {

              // Dedup alerts
              if (lastProcessedTxId.current === activeTransaction.id) return
              lastProcessedTxId.current = activeTransaction.id

              setQrUrl(null)
              setActiveTransaction(null)
              setPendingAmount(null)
              
              // Show success modal and auto-close after 5 seconds
              setShowSuccessModal(true)
              if (successModalTimerRef.current) {
                clearTimeout(successModalTimerRef.current)
              }
              successModalTimerRef.current = setTimeout(() => {
                setShowSuccessModal(false)
              }, 5000)
            }
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [isInitializing, authLoading, user?.id, activeTransaction?.id])

  useEffect(() => {
    if (isInitializing || authLoading) return
    setShowAuthModal(!user)
  }, [isInitializing, authLoading, user])

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

  const resumeTransaction = (transaction: Transaction) => {
    if (transaction.status !== 'pending' || isExpired(transaction.created_at)) return

    setQrUrl(transaction.metadata.qr_url)
    setPendingAmount(transaction.amount)
    setTransferContent(transaction.metadata.transfer_content)
    setActiveTransaction(transaction)
  }

  const handleCancelTransaction = async (e: React.MouseEvent, transactionId: string) => {
    e.stopPropagation() // Prevent triggering resumeTransaction
    if (!confirm('Bạn có chắc chắn muốn hủy giao dịch này không?')) return

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transactionId)

      if (error) throw error

      if (activeTransaction?.id === transactionId) {
        setQrUrl(null)
        setActiveTransaction(null)
        setPendingAmount(null)
      }

      fetchTransactions()
    } catch (error) {
      console.error('Error canceling transaction:', error)
      alert('Có lỗi xảy ra khi hủy giao dịch')
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

    // Check limit: max 2 pending transactions
    const pendingTransactions = transactions.filter(t => t.status === 'pending' && !isExpired(t.created_at))
    if (pendingTransactions.length >= 2) {
      alert('Bạn đang có 2 giao dịch đang xử lý. Vui lòng hoàn tất hoặc đợi chúng hết hạn.')
      return
    }

    setLoading(true)
    try {
      // Generate payment content in format: DH[8-10 random digits]
      // Example: DH1111111111
      const uniqueSuffix = Math.floor(10000000 + Math.random() * 9000000000).toString()
      const content = `DH${uniqueSuffix}`

      // Use SePay Service to create payment with active bank config
      const sepayPayment = await sepayService.createPayment(amount, content, activeBankConfig ? {
        bank_id: activeBankConfig.bank_id,
        bank_name: activeBankConfig.bank_name,
        account_number: activeBankConfig.account_number,
        account_name: activeBankConfig.account_name
      } : undefined)

      if (!sepayPayment.success) {
        throw new Error('Không thể tạo thông tin thanh toán SePay')
      }

      const qrCodeUrl = sepayPayment.qr_url
      setTransferContent(content)

      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          type: 'top_up',
          status: 'pending',
          metadata: {
            payment_method: 'sepay',
            transfer_content: content,
            qr_url: qrCodeUrl,
            bank_info: {
              bank_name: sepayPayment.bank_name,
              account_number: sepayPayment.bank_account,
              account_holder: sepayPayment.account_holder
            }
          }
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      setQrUrl(qrCodeUrl)
      setPendingAmount(amount)
      setActiveTransaction(transaction)

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

  const getStatusBadge = (transaction: Transaction) => {
    if (transaction.status === 'pending' && isExpired(transaction.created_at)) {
      return (
        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400">
          Hết hạn
        </span>
      )
    }

    switch (transaction.status) {
      case 'completed':
        return (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-600">
            Thành công
          </span>
        )
      case 'pending': {
        const seconds = getRemainingSeconds(transaction.created_at)
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-600">
              Đang xử lý
            </span>
            {seconds > 0 && (
              <span className="text-[10px] text-blue-500 font-medium">
                Còn {formatTime(seconds)}
              </span>
            )}
          </div>
        )
      }
      case 'failed':
        return (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
            Thất bại
          </span>
        )
      default:
        return null
    }
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
                        step="5000"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">đ</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Số tiền tối thiểu: 20,000đ
                    </p>
                  </div>

                  {activeBankConfig && (
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-blue-100">
                          <Globe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Ngân hàng thụ hưởng</p>
                          <p className="text-sm font-bold text-gray-900">{activeBankConfig.bank_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Số tài khoản</p>
                        <p className="text-sm font-bold text-gray-900">{activeBankConfig.account_number}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const amount = selectedAmount || parseInt(customAmount)
                      if (amount) handleTopUp(amount)
                    }}
                    disabled={loading || (!selectedAmount && !customAmount) || !activeBankConfig}
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
                  {!activeBankConfig && (
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
                    onClick={() => {
                      setQrUrl(null)
                      setActiveTransaction(null)
                    }}
                    className="text-gray-400 hover:text-red-500 font-medium text-sm py-2 transition-colors"
                  >
                    ← Hủy và tạo đơn khác
                  </button>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Nếu bạn đã nạp xong?</p>
                    <button
                      onClick={() => navigate('/profile#topups')}
                      className="text-blue-600 hover:text-blue-700 font-bold text-sm hover:underline"
                    >
                      Bấm vào đây để xem lịch sử nạp
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Payment Info */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                  <h3 className="text-xl font-bold flex items-center mb-6">
                    <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
                    Thông tin chuyển khoản SePay
                  </h3>

                  <div className="space-y-4">
                    {[
                      {
                        label: 'Ngân hàng',
                        value: activeTransaction?.metadata?.bank_info?.bank_name || 'TPBank',
                        key: 'bank'
                      },
                      {
                        label: 'Số tài khoản',
                        value: activeTransaction?.metadata?.bank_info?.account_number || '60394352614',
                        key: 'account'
                      },
                      {
                        label: 'Chủ tài khoản',
                        value: activeTransaction?.metadata?.bank_info?.account_holder || 'LUONG QUOC THAI',
                        key: 'name'
                      },
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
                      Sau khi chuyển khoản thành công, hệ thống SePay sẽ tự động xác nhận và cộng tiền vào tài khoản của bạn trong vòng 1-2 phút. Vui lòng giữ đúng nội dung chuyển khoản để được xử lý tự động.
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
                    {transactions.map((transaction) => {
                      const canResume = transaction.status === 'pending' && !isExpired(transaction.created_at)
                      return (
                        <div
                          key={transaction.id}
                          className={`p-4 transition-colors relative group/item ${canResume ? 'hover:bg-blue-50 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500' : 'hover:bg-gray-50'}`}
                          onClick={() => canResume && resumeTransaction(transaction)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-900">+{transaction.amount.toLocaleString('vi-VN')}đ</span>
                            <div className="flex items-center gap-2">
                              {canResume && (
                                <button
                                  onClick={(e) => handleCancelTransaction(e, transaction.id)}
                                  className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-100 text-red-500 rounded-md transition-all text-[10px] font-bold flex items-center gap-1 border border-red-200"
                                  title="Hủy giao dịch"
                                >
                                  Hủy đơn
                                </button>
                              )}
                              {getStatusBadge(transaction)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{new Date(transaction.created_at).toLocaleDateString('vi-VN')}</span>
                            <div className="flex items-center gap-2">
                              {canResume && (
                                <span className="text-[10px] text-blue-600 font-bold animate-pulse">Bấm để tiếp tục</span>
                              )}
                              <span className="text-[10px] text-gray-300 font-mono">#{transaction.id.slice(-6).toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h3>
              <p className="text-gray-600 mb-6">Số dư của bạn đã được cập nhật</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Số dư hiện tại</p>
                <p className="text-3xl font-bold text-blue-600">{user?.balance.toLocaleString('vi-VN')}đ</p>
              </div>
              {/* <button
                onClick={() => {
                  setShowSuccessModal(false)
                  if (successModalTimerRef.current) {
                    clearTimeout(successModalTimerRef.current)
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors"
              >
                Đóng
              </button> */}
              <p className="text-xs text-gray-400 mt-3">Tự động đóng sau 5 giây</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
