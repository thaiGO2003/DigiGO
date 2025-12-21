import { CheckCircle, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PaymentReturnPage() {
  const navigate = useNavigate()

  const handleBackToTopUp = () => {
    navigate('/topup')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Yêu cầu nạp tiền đã được ghi nhận</h2>
          <p className="text-gray-600">
            Hệ thống đang xử lý giao dịch của bạn. Tiền sẽ được cộng vào tài khoản tự động trong vòng 1-2 phút sau khi bạn hoàn tất chuyển khoản.
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={handleBackToTopUp}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Kiểm tra số dư
            </button>
            <button
              onClick={() => navigate('/products')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Xem sản phẩm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
