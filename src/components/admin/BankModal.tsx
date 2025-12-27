import { BankModalProps, VIETNAM_BANKS, removeVietnameseTones } from './types'

export default function BankModal({ isOpen, onClose, bankConfig, onSave }: BankModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <form onSubmit={onSave} className="p-6">
                    <h3 className="text-lg font-semibold mb-4">{bankConfig ? 'Sửa' : 'Thêm'} thông tin ngân hàng</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Mã Ngân hàng (Bank ID)</label>
                            <select
                                name="bank_id"
                                defaultValue={bankConfig?.bank_id}
                                onChange={(e) => {
                                    const bank = VIETNAM_BANKS.find(b => b.id === e.target.value)
                                    if (bank) {
                                        const nameInput = (e.target.form as HTMLFormElement).elements.namedItem('bank_name') as HTMLInputElement
                                        const codeInput = (e.target.form as HTMLFormElement).elements.namedItem('napas_code') as HTMLInputElement
                                        if (nameInput) nameInput.value = bank.name
                                        if (codeInput) codeInput.value = bank.code
                                    }
                                }}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            >
                                <option value="">Chọn ngân hàng</option>
                                {VIETNAM_BANKS.map(bank => (
                                    <option key={bank.id} value={bank.id}>{bank.id} - {bank.name}</option>
                                ))}
                            </select>
                            <input type="hidden" name="napas_code" defaultValue={bankConfig?.napas_code} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tên Ngân hàng</label>
                            <input
                                name="bank_name"
                                type="text"
                                defaultValue={bankConfig?.bank_name}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                                placeholder="VD: MB Bank"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Số tài khoản</label>
                            <input
                                name="account_number"
                                type="text"
                                defaultValue={bankConfig?.account_number}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tên chủ tài khoản</label>
                            <input
                                name="account_name"
                                type="text"
                                defaultValue={bankConfig?.account_name}
                                onChange={(e) => {
                                    const input = e.target;
                                    const start = input.selectionStart;
                                    const end = input.selectionEnd;
                                    input.value = removeVietnameseTones(input.value);
                                    input.setSelectionRange(start, end);
                                }}
                                className="w-full px-3 py-2 border rounded-md font-mono"
                                required
                                placeholder="VIET HOA KHONG DAU"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                name="is_active"
                                type="checkbox"
                                id="is_active"
                                defaultChecked={bankConfig?.is_active}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                Đặt làm mặc định
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                            Lưu
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400"
                        >
                            Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
