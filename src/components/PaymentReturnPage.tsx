import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { vnpayService } from '../lib/vnpay'
import { supabase } from '../lib/supabase'

interface PaymentReturnPageProps {
  onNavigate: (page: string) => void
}

export default function PaymentReturnPage({ onNavigate }: PaymentReturnPageProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...')

  useEffect(() => {
    const processPaymentReturn = async () => {
      try {
        // Parse query parameters from current URL
        const queryParams = new URLSearchParams(window.location.search)
        const queryObject: Record<string, string> = {}
        
        for (const [key, value] of queryParams.entries()) {
          queryObject[key] = value
        }

        // Verify the payment result
        const verification = await vnpayService.verifyReturnUrl(queryObject)
        
        if (verification.isValid) {
          const { vnp_TxnRef, vnp_Amount, vnp_ResponseCode } = queryObject
          const amount = parseInt(vnp_Amount) / 100 // Convert from cents
          
          // Find the transaction
          const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .select('*')
            .eq('metadata->>order_id', vnp_TxnRef)
            .single()

          if (transactionError || !transaction) {
            throw new Error('Không tìm thấy giao dịch')
          }

          if (vnp_ResponseCode === '00') {
            // Payment successful
            setStatus('success')
            setMessage('Thanh toán thành công!')
            
            // Update transaction status
            await supabase
              .from('transactions')
              .update({ 
                status: 'completed',
                metadata: {
                  ...transaction.metadata,
                  vnpay_response: queryObject,
                  completed_at: new Date().toISOString()
                }
              })
              .eq('id', transaction.id)

            // Update user balance
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('balance')
              .eq('id', transaction.user_id)
              .single()

            if (!userError && user) {
              await supabase
                .from('users')
                .update({ balance: user.balance + amount })
                .eq('id', transaction.user_id)
            }

          } else {
            // Payment failed
            setStatus('failed')
            setMessage(`Thanh toán thất bại: ${getResponseMessage(vnp_ResponseCode)}`)
            
            // Update transaction status
            await supabase
              .from('transactions')
              .update({ 
                status: 'failed',
                metadata: {
                  ...transaction.metadata,
                  vnpay_response: queryObject,
                  failed_at: new Date().toISOString()
                }
              })
              .eq('id', transaction.id)
          }
        } else {
          setStatus('failed')
          setMessage('Kết quả thanh toán không hợp lệ')
        }
      } catch (error) {
        console.error('Payment return error:', error)
        setStatus('failed')
        setMessage('Có lỗi xảy ra khi xử lý kết quả thanh toán')
      }
    }

    processPaymentReturn()
  }, [location.search])

  const getResponseMessage = (responseCode: string): string => {
    const messages: Record<string, string> = {
      '00': 'Giao dịch thành công',
      '01': 'Giao dịch chưa hoàn tất',
      '02': 'Giao dịch bị lỗi',
      '04': 'Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công)',
      '05': 'Không thẩm định được người sử dụng ( Sai password hoặc tài khoản)',
      '06': 'Không thẩm định được người sử dụng ( Sai password hoặc tài khoản)',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
      '09': 'Giao dịch hoàn trả cho người mua',
      '79': 'Giao dịch không thành công do: Quá thời gian thanh toán',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
    }
    return messages[responseCode] || 'Không xác định'
  }

  const handleBackToTopUp = () => {
    onNavigate('topup')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Đang xử lý</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Thanh toán thành công!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500">Số dư của bạn đã được cập nhật. Bạn có thể sử dụng số tiền này để mua sản phẩm.</p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={handleBackToTopUp}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Quay lại nạp tiền
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Xem sản phẩm
              </button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Thanh toán thất bại</h2>
            <p className="text-gray-600">{message}</p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={handleBackToTopUp}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Quay lại trang chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}