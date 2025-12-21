import { CreditCard, Users, X as CloseIcon } from 'lucide-react'
import { AdjustBalanceModalProps } from './types'

export default function AdjustBalanceModal({ isOpen, onClose, user, onSubmit }: AdjustBalanceModalProps) {
    if (!isOpen || !user) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <h3 className="text-xl font-bold">Điều chỉnh số dư</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        title="Đóng"
                    >
                        <CloseIcon className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Users className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Người dùng</p>
                            <p className="font-bold text-gray-900 truncate max-w-[250px]">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                        <span className="text-sm font-medium text-blue-800">Số dư hiện tại</span>
                        <span className="text-lg font-black text-blue-700">{user.balance?.toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Số tiền điều chỉnh (VNĐ)</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="amount"
                                required
                                step="1000"
                                placeholder="VD: 50000 hoặc -50000"
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl font-bold transition-all outline-none"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold">đ</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium flex items-center gap-1">
                            💡 Sử dụng dấu trừ (-) để trừ tiền khỏi tài khoản
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú điều chỉnh</label>
                        <input
                            type="text"
                            name="note"
                            placeholder="VD: Khuyến mãi, Hoàn tiền đơn hàng..."
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl transition-all outline-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-4 border-2 border-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                        >
                            Xác nhận
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
