import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { VariantModalProps } from './types'

export default function VariantModal({ isOpen, onClose, product, variant, onSave }: VariantModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        discount_percent: 0,
        duration_days: 0,
        description: '',
        guide_url: '',
        sort_order: 0
    })

    useEffect(() => {
        if (variant) {
            setFormData({
                name: variant.name || '',
                price: variant.price || 0,
                discount_percent: variant.discount_percent || 0,
                duration_days: variant.duration_days || 0,
                description: variant.description || '',
                guide_url: variant.guide_url || '',
                sort_order: (variant as any).sort_order || 0
            })
        } else {
            setFormData({
                name: '',
                price: 0,
                discount_percent: 0,
                duration_days: 0,
                description: '',
                guide_url: '',
                sort_order: 0
            })
        }
    }, [variant, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!product) return
        try {
            if (variant) {
                const { error } = await supabase.from('product_variants').update(formData).eq('id', variant.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('product_variants').insert({
                    ...formData,
                    product_id: product.id
                })
                if (error) throw error
            }
            onSave()
            onClose()
            alert('Đã lưu gói thành công!')
        } catch (error: any) {
            console.error('Error saving variant:', error)
            alert('Có lỗi xảy ra khi lưu gói: ' + (error.message || 'Lỗi không xác định'))
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md">
                <form onSubmit={handleSubmit} className="p-6">
                    <h3 className="text-lg font-semibold mb-4">{variant ? 'Sửa' : 'Thêm'} gói</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Tên gói</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                                placeholder="VD: 30 ngày"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Giá gốc (VNĐ)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                                min="0"
                                step="1000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Giảm giá (%)</label>
                            <input
                                type="number"
                                value={formData.discount_percent}
                                onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-md"
                                min="0"
                                max="100"
                                placeholder="VD: 10 = giảm 10%"
                            />
                            {formData.discount_percent > 0 && formData.price > 0 && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Giá sau giảm: <span className="font-semibold text-red-600">
                                        {Math.round(formData.price * (100 - formData.discount_percent) / 100).toLocaleString('vi-VN')}đ
                                    </span>
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Thời hạn (ngày)</label>
                            <input
                                type="number"
                                value={formData.duration_days}
                                onChange={(e) => setFormData({ ...formData, duration_days: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-md"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mô tả</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Thứ tự hiển thị</label>
                            <input
                                type="number"
                                value={formData.sort_order}
                                onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">Số nhỏ hơn sẽ hiển thị trước (nếu chọn sắp xếp mặc định)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Link hướng dẫn riêng cho gói này (tùy chọn)</label>
                            <input
                                type="text"
                                value={formData.guide_url}
                                onChange={(e) => setFormData({ ...formData, guide_url: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="https://docs.google.com/document/d/..."
                            />
                            <p className="text-xs text-gray-500 mt-1 italic">Để trống nếu dùng chung hướng dẫn của sản phẩm</p>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                            Lưu
                        </button>
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400">
                            Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
