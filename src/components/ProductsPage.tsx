import { useState, useEffect } from 'react'
import { Search, RotateCcw, ShoppingCart, Clock, Package } from 'lucide-react'
import { supabase, Product } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

export default function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    priceMin: 0,
    priceMax: 1000000,
    search: ''
  })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [products, filters])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

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

    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.type === filters.type)
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === filters.category)
    }

    filtered = filtered.filter(p => 
      p.price >= filters.priceMin && p.price <= filters.priceMax
    )

    if (filters.search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.description.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    setFilteredProducts(filtered)
  }

  const resetFilters = () => {
    setFilters({
      type: 'all',
      category: 'all',
      priceMin: 0,
      priceMax: 1000000,
      search: ''
    })
  }

  const handlePurchase = (product: Product) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (user.balance < product.price) {
      alert('Số dư không đủ. Vui lòng nạp tiền!')
      return
    }

    setSelectedProduct(product)
    setShowConfirmModal(true)
  }

  const confirmPurchase = async () => {
    if (!selectedProduct || !user) return

    if ((selectedProduct.quantity || 0) <= 0) {
      alert('Sản phẩm này đã hết hàng!')
      setShowConfirmModal(false)
      return
    }

    try {
      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: -selectedProduct.price,
          type: 'purchase',
          status: 'completed'
        })

      if (transactionError) throw transactionError

      // Update user balance
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: user.balance - selectedProduct.price })
        .eq('id', user.id)

      if (balanceError) throw balanceError

      // Update product quantity
      const { error: productError } = await supabase
        .from('products')
        .update({ quantity: (selectedProduct.quantity || 0) - 1 })
        .eq('id', selectedProduct.id)

      if (productError) throw productError

      alert('Mua hàng thành công!')
      setShowConfirmModal(false)
      setSelectedProduct(null)
      fetchProducts() // Refresh list to show updated quantity
    } catch (error) {
      console.error('Error purchasing product:', error)
      alert('Có lỗi xảy ra khi mua hàng')
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
              Loại sản phẩm
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="email">Email</option>
              <option value="key">Key</option>
              <option value="package">Gói</option>
            </select>
          </div>

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
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
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
          <button
            onClick={resetFilters}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
            <img
              src={product.image_url || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=400'}
              alt={product.name}
              className="w-full h-48 object-cover rounded-t-lg"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
              
              <div className="flex flex-col space-y-1 mb-3 text-sm">
                {product.duration && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Thời hạn: {product.duration}</span>
                  </div>
                )}
                <div className={`flex items-center ${
                  (product.quantity || 0) <= 0 
                    ? 'text-red-600 font-bold' 
                    : (product.quantity || 0) < 10 
                      ? 'text-red-600 font-medium' 
                      : 'text-gray-600'
                }`}>
                  <Package className="h-4 w-4 mr-2" />
                  <span>
                    {(product.quantity || 0) <= 0 
                      ? 'Tạm hết hàng' 
                      : (product.quantity || 0) < 10 
                        ? `Sắp hết hàng: ${product.quantity}` 
                        : `Còn lại: ${product.quantity}`
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-blue-600">
                  {product.price.toLocaleString('vi-VN')}đ
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {product.type}
                </span>
              </div>
              <button
                onClick={() => handlePurchase(product)}
                disabled={(product.quantity || 0) <= 0}
                className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                  (product.quantity || 0) <= 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{(product.quantity || 0) <= 0 ? 'Hết hàng' : 'Mua ngay'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {products.length === 0 ? '0 sản phẩm' : 'Không tìm thấy sản phẩm nào phù hợp'}
          </div>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {showConfirmModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Xác nhận mua hàng</h3>
              <p className="text-gray-600 mb-4">
                Bạn có chắc chắn muốn mua "{selectedProduct.name}" với giá{' '}
                <span className="font-bold text-blue-600">
                  {selectedProduct.price.toLocaleString('vi-VN')}đ
                </span>?
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={confirmPurchase}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Xác nhận mua
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setSelectedProduct(null)
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
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