import React, { useState, useEffect } from 'react'
import { CreditCard, History } from 'lucide-react'
import { supabase, Transaction } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000]

export default function TopUpPage() {
  const { user } = useAuth()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true)
    }
  }, [user])

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

    if (amount < 50000) {
      alert('Số tiền nạp tối thiểu là 50,000đ')
      return
    }

    setLoading(true)
    try {
      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          type: 'top_up',
          status: 'completed'
        })

      if (transactionError) throw transactionError

      // Update user balance
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance: user.balance + amount })
        .eq('id', user.id)

      if (updateError) throw updateError

      alert('Nạp tiền thành công!')
      setSelectedAmount(null)
      setCustomAmount('')
      fetchTransactions()
    } catch (error) {
      console.error('Error topping up:', error)
      alert('Có lỗi xảy ra khi nạp tiền')
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Nạp Tiền</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Up Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Nạp tiền vào tài khoản</h2>
          </div>

          <div className="mb-6">
            <span className="text-sm text-gray-600">Số dư hiện tại:</span>
            <div className="text-2xl font-bold text-blue-600">
              {user.balance.toLocaleString('vi-VN')}đ
            </div>
          </div>

          {/* Preset Amounts */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Chọn mệnh giá</h3>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    selectedAmount === amount
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {amount.toLocaleString('vi-VN')}đ
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hoặc nhập số tiền tùy chọn (tối thiểu 50,000đ)
            </label>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedAmount(null)
              }}
              placeholder="Nhập số tiền"
              min="50000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => {
              const amount = selectedAmount || parseInt(customAmount)
              if (amount) {
                handleTopUp(amount)
              }
            }}
            disabled={loading || (!selectedAmount && !customAmount)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang xử lý...' : 'Nạp tiền'}
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <History className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Lịch sử nạp tiền</h2>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Chưa có giao dịch nào</p>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      +{transaction.amount.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  {getStatusBadge(transaction.status)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}