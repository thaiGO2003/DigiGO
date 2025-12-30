import { useEffect, useRef, useState } from 'react'
import { Plus, Edit, Trash2, Key, ArrowUp, ArrowDown, Flame, Copy } from 'lucide-react'
import { ProductsTabProps } from './types'

export default function ProductsTab({
    products,
    highlightedProductId,
    onAddProduct,
    onEditProduct,
    onDeleteProduct,
    onToggleHot,
    onMoveProduct,
    onAddVariant,
    onEditVariant,
    onDeleteVariant,
    onMoveVariant,
    onManageKeys,
    onDuplicateVariant,
    onReorderProducts
}: ProductsTabProps) {
    const highlightedRef = useRef<HTMLDivElement>(null)
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [overId, setOverId] = useState<string | null>(null)

    useEffect(() => {
        if (highlightedProductId && highlightedRef.current) {
            highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
            highlightedRef.current.classList.add('ring-2', 'ring-blue-500')
            setTimeout(() => {
                highlightedRef.current?.classList.remove('ring-2', 'ring-blue-500')
            }, 2000)
        }
    }, [highlightedProductId])

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold">Quản lý sản phẩm</h2>
                <button
                    onClick={onAddProduct}
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                    <Plus className="h-4 w-4" />
                    <span>Thêm sản phẩm</span>
                </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
                {products.map((product) => (
                    <div 
                        key={product.id} 
                        ref={product.id === highlightedProductId ? highlightedRef : null}
                        className={`bg-white shadow rounded-lg p-4 sm:p-6 transition-all ${overId === product.id ? 'ring-2 ring-blue-400' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setOverId(product.id) }}
                        onDragEnter={() => setOverId(product.id)}
                        onDrop={() => { if (draggingId) { const targetIndex = products.findIndex(p => p.id === product.id); onReorderProducts(draggingId, targetIndex); } setDraggingId(null); setOverId(null) }}
                    >
                        {/* Product Header */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                            <div className="flex items-start gap-2 sm:gap-4">
                                {/* Move buttons */}
                                <div className="flex flex-row sm:flex-col gap-1">
                                    <button 
                                        onClick={() => onMoveProduct(product, 'up')}
                                        className="text-gray-400 hover:text-gray-600 p-1.5 sm:p-1 bg-gray-50 rounded hover:bg-gray-100"
                                        title="Lên"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={() => onMoveProduct(product, 'down')}
                                        className="text-gray-400 hover:text-gray-600 p-1.5 sm:p-1 bg-gray-50 rounded hover:bg-gray-100"
                                        title="Xuống"
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </button>
                                    <div
                                        draggable
                                        onDragStart={(e) => { setDraggingId(product.id); e.dataTransfer.setData('text/plain', product.id) }}
                                        onDragEnd={() => { setDraggingId(null); setOverId(null) }}
                                        className="mt-1 sm:mt-2 flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing select-none"
                                        title="Kéo thả để sắp xếp"
                                    >
                                        <span className="w-3 h-0.5 bg-current mb-0.5 rounded"></span>
                                        <span className="w-3 h-0.5 bg-current mb-0.5 rounded"></span>
                                        <span className="w-3 h-0.5 bg-current rounded"></span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base sm:text-lg font-bold text-gray-900 break-words">{product.name}</h3>
                                        {product.is_hot && (
                                            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 flex-shrink-0">
                                                <Flame className="h-3 w-3" fill="currentColor" />
                                                HOT
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-500">{product.category}</p>
                                </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex gap-1 sm:gap-2 self-end sm:self-start">
                                <button
                                    onClick={() => onToggleHot(product)}
                                    className={`p-2 rounded transition-colors ${product.is_hot ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                    title={product.is_hot ? "Tắt Hot" : "Bật Hot"}
                                >
                                    <Flame className="h-4 w-4" fill={product.is_hot ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={() => onEditProduct(product)}
                                    className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                                    title="Sửa"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onDeleteProduct(product.id)}
                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                                    title="Xóa"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Variants Section */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold text-gray-700 text-sm sm:text-base">Gói</h4>
                                <button
                                    onClick={() => onAddVariant(product)}
                                    className="text-xs sm:text-sm bg-green-600 text-white px-2 sm:px-3 py-1 rounded hover:bg-green-700 flex items-center"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    <span className="hidden xs:inline">Thêm gói</span>
                                    <span className="xs:hidden">Thêm</span>
                                </button>
                            </div>
                            <div className="space-y-2">
                                {product.variants?.map((variant) => (
                                    <div key={variant.id} className="border rounded p-2 sm:p-3">
                                        {/* Mobile: Stack layout */}
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                            <div className="flex items-start gap-2 min-w-0 flex-1">
                                                {/* Variant Move Buttons */}
                                                <div className="flex flex-col gap-0.5">
                                                    <button 
                                                        onClick={() => onMoveVariant(product, variant, 'up')}
                                                        disabled={product.variant_sort_strategy && product.variant_sort_strategy !== 'default'}
                                                        className={`text-gray-400 p-0.5 bg-gray-50 rounded ${
                                                            product.variant_sort_strategy && product.variant_sort_strategy !== 'default' 
                                                                ? 'opacity-30 cursor-not-allowed' 
                                                                : 'hover:text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                        title={product.variant_sort_strategy && product.variant_sort_strategy !== 'default' ? "Đang bật chế độ tự động sắp xếp (chọn Mặc định để sửa)" : "Lên"}
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </button>
                                                    <button 
                                                        onClick={() => onMoveVariant(product, variant, 'down')}
                                                        disabled={product.variant_sort_strategy && product.variant_sort_strategy !== 'default'}
                                                        className={`text-gray-400 p-0.5 bg-gray-50 rounded ${
                                                            product.variant_sort_strategy && product.variant_sort_strategy !== 'default' 
                                                                ? 'opacity-30 cursor-not-allowed' 
                                                                : 'hover:text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                        title={product.variant_sort_strategy && product.variant_sort_strategy !== 'default' ? "Đang bật chế độ tự động sắp xếp (chọn Mặc định để sửa)" : "Xuống"}
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col gap-0.5 text-sm">
                                                        <span className="font-medium break-words text-base">{variant.name}</span>
                                                        <span className="text-red-600 font-medium">Giá gốc: {(variant.cost_price || 0).toLocaleString('vi-VN')}đ</span>
                                                        <span className={`font-semibold ${
                                                            (variant.price < (variant.cost_price || 0)) 
                                                                ? 'text-yellow-600' 
                                                                : 'text-blue-600'
                                                        }`}>
                                                            Giá bán: {variant.price.toLocaleString('vi-VN')}đ
                                                        </span>
                                                        <span className="text-green-600 font-medium">
                                                            Tiền lời: {(variant.price - (variant.cost_price || 0)).toLocaleString('vi-VN')}đ
                                                        </span>
                                                        <span className="text-gray-500 text-xs sm:text-sm">Stock: {variant.stock || 0}</span>
                                                        <span className="text-gray-500 text-xs sm:text-sm">Đã bán: {variant.total_sold || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => onManageKeys(product, variant)}
                                                    className="text-purple-600 hover:text-purple-900 p-1.5 hover:bg-purple-50 rounded"
                                                    title="Quản lý keys"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDuplicateVariant(product, variant)}
                                                    className="text-green-600 hover:text-green-900 p-1.5 hover:bg-green-50 rounded"
                                                    title="Nhân bản"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => onEditVariant(product, variant)}
                                                    className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded"
                                                    title="Sửa"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteVariant(variant.id)}
                                                    className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!product.variants || product.variants.length === 0) && (
                                    <p className="text-sm text-gray-400 text-center py-3">Chưa có gói nào</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {products.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border">
                        <p className="text-gray-500">Chưa có sản phẩm nào</p>
                    </div>
                )}
            </div>
        </div>
    )
}
