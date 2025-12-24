import { Plus, Edit, Trash2, Key, ArrowUp, ArrowDown, Flame } from 'lucide-react'
import { ProductsTabProps } from './types'

export default function ProductsTab({
    products,
    onAddProduct,
    onEditProduct,
    onDeleteProduct,
    onToggleHot,
    onMoveProduct,
    onAddVariant,
    onEditVariant,
    onDeleteVariant,
    onManageKeys
}: ProductsTabProps) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Quản lý sản phẩm</h2>
                <button
                    onClick={onAddProduct}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                    <Plus className="h-4 w-4" />
                    <span>Thêm sản phẩm</span>
                </button>
            </div>

            <div className="space-y-6">
                {products.map((product) => (
                    <div key={product.id} className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start gap-4">
                                <div className="flex flex-col gap-1">
                                    <button 
                                        onClick={() => onMoveProduct(product, 'up')}
                                        className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded hover:bg-gray-100"
                                        title="Lên"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={() => onMoveProduct(product, 'down')}
                                        className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded hover:bg-gray-100"
                                        title="Xuống"
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </button>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                                        {product.is_hot && (
                                            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                <Flame className="h-3 w-3" fill="currentColor" />
                                                HOT
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{product.category}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
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

                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-gray-700">Gói</h4>
                                <button
                                    onClick={() => onAddVariant(product)}
                                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                >
                                    <Plus className="inline h-3 w-3 mr-1" />
                                    Thêm gói
                                </button>
                            </div>
                            <div className="space-y-2">
                                {product.variants?.map((variant) => (
                                    <div key={variant.id} className="border rounded p-3 flex justify-between items-center">
                                        <div className="flex-1">
                                            <span className="font-medium">{variant.name}</span>
                                            <span className="mx-2">-</span>
                                            <span className="text-blue-600 font-semibold">{variant.price.toLocaleString('vi-VN')}đ</span>
                                            <span className="mx-2">-</span>
                                            <span className="text-gray-600">Stock: {variant.stock || 0}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onManageKeys(product, variant)}
                                                className="text-purple-600 hover:text-purple-900"
                                                title="Quản lý keys"
                                            >
                                                <Key className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onEditVariant(product, variant)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteVariant(variant.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
