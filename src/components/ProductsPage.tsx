import { useState, useEffect } from 'react'
import { Search, RotateCcw, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { supabase, Product, ProductVariant } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

export default function ProductsPage() {
  const { user, refreshProfile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: 'all',
    priceMin: 0,
    priceMax: 10000000,
    search: ''
  })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedProductName, setSelectedProductName] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [products, filters])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_products_with_variants')
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = products

    if (filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === filters.category)
    }

    if (filters.search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (p.mechanism && p.mechanism.toLowerCase().includes(filters.search.toLowerCase()))
      )
    }

    filtered = filtered.filter(p => {
      const minPrice = Math.min(...(p.variants?.map(v => v.price) || [0]))
      return minPrice >= filters.priceMin && minPrice <= filters.priceMax
    })

    setFilteredProducts(filtered)
  }

  const resetFilters = () => {
    setFilters({
      category: 'all',
      priceMin: 0,
      priceMax: 10000000,
      search: ''
    })
  }

  const handlePurchaseVariant = (variant: ProductVariant, productName: string) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    const finalPrice = Math.round(variant.price * (100 - (variant.discount_percent || 0)) / 100)
    
    if (user.balance < finalPrice) {
      alert('Số dư không đủ. Vui lòng nạp tiền!')
      return
    }

    if ((variant.stock || 0) <= 0) {
      alert('Gói này đã hết hàng!')
      return
    }

    setSelectedVariant(variant)
    setSelectedProductName(productName)
    setShowConfirmModal(true)
  }

  const confirmPurchase = async () => {
    if (!selectedVariant || !user) return

    setPurchasing(true)
    try {
      const { data, error } = await supabase.rpc('purchase_product', {
        p_variant_id: selectedVariant.id,
        p_user_id: user.id
      })

      if (error) throw error

      if (data?.success) {
        alert(`Mua hàng thành công!\n\nKey của bạn: ${data.key_value}\n\nVui lòng lưu lại key này!`)
        await refreshProfile()
        await fetchProducts()
        setShowConfirmModal(false)
        setSelectedVariant(null)
      }
    } catch (error: any) {
      console.error('Error purchasing:', error)
      alert(`Lỗi: ${error.message || 'Có lỗi xảy ra khi mua hàng'}`)
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Sản Phẩm</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Danh mục
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="software">Phần mềm</option>
              <option value="game">Game</option>
              <option value="education">Giáo dục</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giá tối thiểu (VNĐ)
            </label>
            <input
              type="number"
              value={filters.priceMin}
              onChange={(e) => setFilters({ ...filters, priceMin: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giá tối đa (VNĐ)
            </label>
            <input
              type="number"
              value={filters.priceMax}
              onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min="0"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tìm kiếm
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
            <img
              src={product.image_url || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=400'}
              alt={product.name}
              className="w-full h-48 object-cover rounded-t-lg"
            />
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
              
              {product.mechanism && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Cơ chế:</p>
                  <p className="text-sm text-gray-600">{product.mechanism}</p>
                </div>
              )}

              {product.recommended_model && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Model khuyến dùng:</p>
                  <p className="text-sm text-blue-600">{product.recommended_model}</p>
                </div>
              )}

              {product.strengths && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-green-700 mb-1">Điểm mạnh:</p>
                  <p className="text-sm text-gray-600">{product.strengths}</p>
                </div>
              )}

              {product.weaknesses && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-red-700 mb-1">Điểm yếu:</p>
                  <p className="text-sm text-gray-600">{product.weaknesses}</p>
                </div>
              )}

              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Chọn gói:</p>
                <div className="space-y-2">
                  {product.variants?.map((variant) => (
                    <div key={variant.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{variant.name}</span>
                          {(variant.discount_percent || 0) > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                              -{variant.discount_percent}%
                            </span>
                          )}
                          {(variant.stock || 0) <= 0 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                              Hết hàng
                            </span>
                          )}
                          {(variant.stock || 0) > 0 && (variant.stock || 0) < 5 && (
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Sắp hết
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-2">
                            {(variant.discount_percent || 0) > 0 ? (
                              <>
                                <span className="text-sm text-gray-400 line-through">
                                  {variant.price.toLocaleString('vi-VN')}đ
                                </span>
                                <span className="text-lg font-bold text-red-600">
                                  {Math.round(variant.price * (100 - (variant.discount_percent || 0)) / 100).toLocaleString('vi-VN')}đ
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-blue-600">
                                {variant.price.toLocaleString('vi-VN')}đ
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {variant.stock || 0} còn lại
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePurchaseVariant(variant, product.name)}
                        disabled={(variant.stock || 0) <= 0}
                        className={`ml-3 px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                          (variant.stock || 0) <= 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {(variant.stock || 0) <= 0 ? 'Hết' : 'Mua'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {products.length === 0 ? 'Chưa có sản phẩm' : 'Không tìm thấy sản phẩm nào phù hợp'}
          </div>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {showConfirmModal && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Xác nhận mua hàng</h3>
              <p className="text-gray-600 mb-2">
                Sản phẩm: <span className="font-semibold">{selectedProductName}</span>
              </p>
              <p className="text-gray-600 mb-2">
                Gói: <span className="font-semibold">{selectedVariant.name}</span>
              </p>
              <div className="mb-4">
                {(selectedVariant.discount_percent || 0) > 0 ? (
                  <>
                    <p className="text-gray-600">Giá gốc: <span className="text-gray-400 line-through">{selectedVariant.price.toLocaleString('vi-VN')}đ</span></p>
                    <p className="text-gray-600">Giảm giá: <span className="text-red-600 font-semibold">-{selectedVariant.discount_percent}%</span></p>
                    <p className="text-gray-600">Giá sau giảm: <span className="font-bold text-red-600 text-xl">
                      {Math.round(selectedVariant.price * (100 - (selectedVariant.discount_percent || 0)) / 100).toLocaleString('vi-VN')}đ
                    </span></p>
                  </>
                ) : (
                  <p className="text-gray-600">Giá: <span className="font-bold text-blue-600 text-xl">
                    {selectedVariant.price.toLocaleString('vi-VN')}đ
                  </span></p>
                )}
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={confirmPurchase}
                  disabled={purchasing}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {purchasing ? 'Đang xử lý...' : 'Xác nhận mua'}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setSelectedVariant(null)
                  }}
                  disabled={purchasing}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  )
}
