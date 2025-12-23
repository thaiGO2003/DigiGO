import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase, ProductKey } from '../../lib/supabase'
import { KeyModalProps } from './types'

export default function KeyModal({ isOpen, onClose, variant, onSave }: KeyModalProps) {
    const [keys, setKeys] = useState<ProductKey[]>([])
    const [newKey, setNewKey] = useState('')
    const [loading, setLoading] = useState(false)
    const [inputMode, setInputMode] = useState<'uuid' | 'freestyle'>('uuid')

    const [isManualDelivery, setIsManualDelivery] = useState(false)
    const [manualStock, setManualStock] = useState(0)

    useEffect(() => {
        if (variant && isOpen) {
            fetchKeys()
            setIsManualDelivery(variant.is_manual_delivery || false)
            setManualStock(variant.manual_stock || 0)
        }
    }, [variant, isOpen])

    const handleUpdateManualStock = async () => {
        if (!variant) return
        try {
            const { error } = await supabase
                .from('product_variants')
                .update({ manual_stock: manualStock })
                .eq('id', variant.id)

            if (error) throw error
            alert('Đã cập nhật số lượng tồn kho!')
            onSave()
        } catch (error: any) {
            alert('Lỗi cập nhật: ' + error.message)
        }
    }

    const handleToggleManualDelivery = async () => {
        if (!variant) return
        const newValue = !isManualDelivery
        try {
            const { error } = await supabase
                .from('product_variants')
                .update({ is_manual_delivery: newValue })
                .eq('id', variant.id)

            if (error) throw error
            setIsManualDelivery(newValue)
            onSave()
        } catch (error: any) {
            alert('Lỗi cập nhật: ' + error.message)
        }
    }

    const fetchKeys = async () => {
        if (!variant) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('product_keys')
                .select('*')
                .eq('variant_id', variant.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            setKeys(data || [])
        } catch (error) {
            console.error('Error fetching keys:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddKey = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!variant || !newKey.trim()) return
        try {
            const { error } = await supabase.from('product_keys').insert({
                variant_id: variant.id,
                key_value: inputMode === 'uuid' ? newKey.trim().toUpperCase() : newKey.trim()
            })
            if (error) throw error
            setNewKey('')
            fetchKeys()
            onSave()
        } catch (error: any) {
            alert(`Lỗi: ${error.message}`)
            console.error('Error adding key:', error)
        }
    }

    const handleDeleteKey = async (id: string) => {
        if (!confirm('Xóa key này?')) return
        try {
            const { error } = await supabase.from('product_keys').delete().eq('id', id)
            if (error) throw error
            fetchKeys()
            onSave()
        } catch (error) {
            console.error('Error deleting key:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">Quản lý Keys - {variant?.name}</h3>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                                <h4 className="font-semibold text-orange-900">Giao hàng bằng Mã giao dịch</h4>
                                <p className="text-sm text-orange-800 mt-1">
                                    Hệ thống sẽ gửi Mã giao dịch cho khách. Bạn cần gửi key thủ công qua tin nhắn sau khi kiểm tra.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isManualDelivery}
                                    onChange={handleToggleManualDelivery}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </label>
                        </div>
                    </div>

                    {isManualDelivery ? (
                        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng tồn kho (Manual Stock)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={manualStock}
                                    onChange={(e) => setManualStock(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-md"
                                    min="0"
                                    placeholder="Nhập số lượng..."
                                />
                                <button
                                    onClick={handleUpdateManualStock}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium whitespace-nowrap"
                                >
                                    Cập nhật Stock
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                * Số lượng này sẽ tự động giảm khi có người mua. Khi về 0, sản phẩm sẽ báo hết hàng.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleAddKey} className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium">Thêm Key mới</label>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => { setInputMode('uuid'); setNewKey('') }}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                            inputMode === 'uuid' 
                                            ? 'bg-white text-blue-600 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        UUID
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setInputMode('freestyle'); setNewKey('') }}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                            inputMode === 'freestyle' 
                                            ? 'bg-white text-blue-600 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Freestyle
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    placeholder={inputMode === 'uuid' ? "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" : "Nhập key tùy ý (Email|Pass, Text, Link...)"}
                                    className="flex-1 px-3 py-2 border rounded-md font-mono text-sm"
                                    pattern={inputMode === 'uuid' ? "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" : undefined}
                                />
                                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                            {inputMode === 'uuid' && (
                                <p className="text-xs text-gray-500 mt-1">Định dạng chuẩn UUID (ví dụ: 550e8400-e29b-41d4-a716-446655440000)</p>
                            )}
                        </form>
                    )}

                    {loading ? (
                        <div className="text-center py-4">Đang tải...</div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 mb-2">Tổng: {keys.length} keys ({keys.filter(k => !k.is_used).length} chưa dùng)</p>
                            {keys.map((key) => (
                                <div key={key.id} className={`flex justify-between items-center p-3 border rounded ${key.is_used ? 'bg-gray-50' : 'bg-white'
                                    }`}>
                                    <div className="flex-1">
                                        <code className="text-sm font-mono">{key.key_value}</code>
                                        <span className={`ml-3 text-xs px-2 py-1 rounded ${key.is_used ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {key.is_used ? 'Đã sử dụng' : 'Chưa sử dụng'}
                                        </span>
                                    </div>
                                    {!key.is_used && (
                                        <button
                                            onClick={() => handleDeleteKey(key.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t">
                    <button onClick={onClose} className="w-full bg-gray-300 py-2 rounded-md hover:bg-gray-400">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    )
}
