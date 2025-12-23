import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ProductModalProps } from './types'

export default function ProductModal({ isOpen, onClose, product, onSave }: ProductModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        mechanism: '',
        recommended_model: '',
        strengths: '',
        weaknesses: '',
        image_url: '',
        category: 'software',
        guide_url: '',
        variant_sort_strategy: 'default'
    })

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                mechanism: product.mechanism || '',
                recommended_model: product.recommended_model || '',
                strengths: product.strengths || '',
                weaknesses: product.weaknesses || '',
                image_url: product.image_url || '',
                category: product.category || 'software',
                guide_url: product.guide_url || '',
                variant_sort_strategy: (product as any).variant_sort_strategy || 'default'
            })
        } else {
            setFormData({
                name: '',
                mechanism: '',
                recommended_model: '',
                strengths: '',
                weaknesses: '',
                image_url: '',
                category: 'software',
                guide_url: '',
                variant_sort_strategy: 'default'
            })
        }
    }, [product, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            // Remove variant_sort_strategy if it's not supported by DB schema yet
            const saveData = async (data: any) => {
                if (product) {
                    const { error } = await supabase.from('products').update(data).eq('id', product.id)
                    if (error) throw error
                } else {
                    const { error } = await supabase.from('products').insert(data)
                    if (error) throw error
                }
            }

            try {
                await saveData(formData)
            } catch (error: any) {
                // If error is about missing column, try saving without it
                if (error.message?.includes('variant_sort_strategy')) {
                    const { variant_sort_strategy, ...dataWithoutSort } = formData
                    await saveData(dataWithoutSort)
                    alert('Đã lưu sản phẩm (nhưng chưa lưu cấu hình sắp xếp do chưa cập nhật DB). Vui lòng liên hệ Admin chạy lệnh SQL.')
                    onSave()
                    onClose()
                    return
                }
                throw error
            }

            onSave()
            onClose()
            alert('Đã lưu sản phẩm thành công!')
        } catch (error: any) {
            console.error('Error saving product:', error)
            alert('Có lỗi xảy ra khi lưu sản phẩm: ' + (error.message || 'Lỗi không xác định'))
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6">
                    <h3 className="text-lg font-semibold mb-4">{product ? 'Sửa' : 'Thêm'} sản phẩm</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Tên sản phẩm</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Cơ chế</label>
                            <textarea
                                value={formData.mechanism}
                                onChange={(e) => setFormData({ ...formData, mechanism: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Model khuyến dùng</label>
                            <input
                                type="text"
                                value={formData.recommended_model}
                                onChange={(e) => setFormData({ ...formData, recommended_model: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Điểm mạnh</label>
                            <textarea
                                value={formData.strengths}
                                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Điểm yếu</label>
                            <textarea
                                value={formData.weaknesses}
                                onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">URL hình ảnh</label>
                            <input
                                type="text"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="https://example.com/image.jpg"
                            />
                            {formData.image_url && (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Xem trước:</p>
                                    <img
                                        src={formData.image_url}
                                        alt="Preview"
                                        className="h-32 w-auto object-contain rounded-md border border-gray-200"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Danh mục</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="software">Phần mềm</option>
                                <option value="game">Game</option>
                                <option value="education">Giáo dục</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Sắp xếp gói sản phẩm</label>
                            <select
                                value={formData.variant_sort_strategy}
                                onChange={(e) => setFormData({ ...formData, variant_sort_strategy: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="default">Mặc định (Admin sắp xếp)</option>
                                <option value="price_asc">Giá: Thấp đến Cao</option>
                                <option value="price_desc">Giá: Cao đến Thấp</option>
                                <option value="duration_asc">Thời hạn: Ngắn đến Dài</option>
                                <option value="duration_desc">Thời hạn: Dài đến Ngắn</option>
                                <option value="bestselling">Bán chạy nhất</option>
                                <option value="stock_asc">Tồn kho: Thấp đến Cao</option>
                                <option value="stock_desc">Tồn kho: Cao đến Thấp</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Cấu hình này sẽ ghi đè cách sắp xếp mặc định khi hiển thị cho người dùng.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Link hướng dẫn cài đặt (Google Doc)</label>
                            <input
                                type="text"
                                value={formData.guide_url}
                                onChange={(e) => setFormData({ ...formData, guide_url: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="https://docs.google.com/document/d/..."
                            />
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
