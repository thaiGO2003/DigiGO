import { useState, useEffect } from 'react'
import { Search, RotateCcw, ShoppingCart, Package, AlertTriangle, Plus, Minus, ExternalLink, Copy, Check, Key } from 'lucide-react'
import { supabase, Product, ProductVariant } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { sendTelegramNotification } from '../lib/telegram'
import AuthModal from './AuthModal'

import ProductCard from './ProductCard'

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
  const [quantity, setQuantity] = useState(1)
  const [purchaseResult, setPurchaseResult] = useState<{ keys: string[], guideUrl?: string } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

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

    if ((variant.stock || 0) <= 0) {
      alert('Gói này đã hết hàng!')
      return
    }

    setSelectedVariant(variant)
    setSelectedProductName(productName)
    setQuantity(1)
    setPurchaseResult(null)
    setShowConfirmModal(true)
  }

  const calculatePriceWithRank = (price: number, variantDiscount: number = 0) => {
    const rankDiscount = user?.rank ? 
      (user.rank === 'silver' ? 2 : 
       user.rank === 'gold' ? 4 : 
       user.rank === 'platinum' ? 6 : 
       user.rank === 'diamond' ? 8 : 0) : 0
    const totalDiscount = Math.min(variantDiscount + rankDiscount, 100)
    return Math.round(price * (100 - totalDiscount) / 100)
  }

  const getUnitPrice = () => {
    if (!selectedVariant) return 0
    return calculatePriceWithRank(selectedVariant.price, selectedVariant.discount_percent || 0)
  }

  const getTotalPrice = () => {
    return getUnitPrice() * quantity
  }

  const canAfford = () => {
    return user && user.balance >= getTotalPrice()
  }

  const maxQuantity = () => {
    if (!selectedVariant) return 1
    return Math.min(selectedVariant.stock || 1, 10)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const confirmPurchase = async () => {
    if (!selectedVariant || !user) return

    if (!canAfford()) {
      alert('Số dư không đủ. Vui lòng nạp tiền!')
      return
    }

    setPurchasing(true)
    try {
      const { data, error } = await supabase.rpc('purchase_product', {
        p_variant_id: selectedVariant.id,
        p_user_id: user.id,
        p_quantity: quantity
      })

      if (error) throw error

      if (data?.success) {
        // Send Telegram notifications
        const orderMsg = `<b>Đơn hàng mới!</b>\n\nUser: ${user.email}\nSản phẩm: ${selectedProductName}\nGói: ${selectedVariant.name}\nSố lượng: ${quantity}\nTổng tiền: ${data.total_price?.toLocaleString('vi-VN')}đ`
        sendTelegramNotification(orderMsg)

        if ((selectedVariant.stock || 0) <= quantity) {
          const oosMsg = `<b>⚠️ CẢNH BÁO HẾT HÀNG!</b>\n\nSản phẩm: ${selectedProductName}\nGói: ${selectedVariant.name}\nKho đã hết key.`
          sendTelegramNotification(oosMsg)
        }

        // Show purchase result
        setPurchaseResult({
          keys: data.key_values || [data.key_value],
          guideUrl: data.guide_url || selectedVariant.guide_url
        })

        await refreshProfile()
        await fetchProducts()
      }
    } catch (error: any) {
      console.error('Error purchasing:', error)
      alert(`Lỗi: ${error.message || 'Có lỗi xảy ra khi mua hàng'}`)
    } finally {
      setPurchasing(false)
    }
  }

  const closeModal = () => {
    setShowConfirmModal(false)
    setSelectedVariant(null)
    setPurchaseResult(null)
    setQuantity(1)
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
              step="50000"
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
              step="50000"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm h-[42px]"
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
              placeholder="Tìm kiếm Sản phẩm..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            user={user}
            onPurchase={handlePurchaseVariant}
          />
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
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-6">
              {!purchaseResult ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    Xác nhận mua hàng
                  </h3>

                  {/* Product Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-gray-600">
                      <span className="text-gray-500">Sản phẩm:</span>{' '}
                      <span className="font-semibold text-gray-900">{selectedProductName}</span>
                    </p>
                    <p className="text-gray-600 mt-1">
                      <span className="text-gray-500">Gói:</span>{' '}
                      <span className="font-semibold text-gray-900">{selectedVariant.name}</span>
                    </p>
                    <p className="text-gray-600 mt-1">
                      <span className="text-gray-500">Còn lại:</span>{' '}
                      <span className="font-semibold text-orange-600">{selectedVariant.stock || 0} sản phẩm</span>
                    </p>
                  </div>

                  {/* Guide URL */}
                  {selectedVariant.guide_url && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                      <div className="flex items-center gap-2 text-blue-700">
                        <ExternalLink className="h-4 w-4" />
                        <a
                          href={selectedVariant.guide_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold hover:underline"
                        >
                          Xem hướng dẫn sử dụng
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Quantity Selector */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng</label>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-2xl font-bold text-gray-900 w-12 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(maxQuantity(), quantity + 1))}
                        disabled={quantity >= maxQuantity()}
                        className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 mb-6 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Đơn giá:</span>
                      <div className="text-right">
                        {(selectedVariant.discount_percent || 0) > 0 || (user?.rank && user.rank !== 'bronze') ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 line-through text-sm">
                              {selectedVariant.price.toLocaleString('vi-VN')}đ
                            </span>
                            {(selectedVariant.discount_percent || 0) > 0 && (
                              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-medium">
                                -{selectedVariant.discount_percent}%
                              </span>
                            )}
                            {user?.rank && user.rank !== 'bronze' && (
                              <span className="bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded text-xs font-medium">
                                -{user.rank === 'silver' ? 2 : 
                                   user.rank === 'gold' ? 4 : 
                                   user.rank === 'platinum' ? 6 : 8}%
                              </span>
                            )}
                            <span className="font-bold text-blue-600">
                              {getUnitPrice().toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-blue-600">{getUnitPrice().toLocaleString('vi-VN')}đ</span>
                        )}
                      </div>
                    </div>

                    {quantity > 1 && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Số lượng:</span>
                        <span className="font-medium text-gray-900">× {quantity}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Tổng thanh toán:</span>
                      <span className="text-2xl font-bold text-green-600">{getTotalPrice().toLocaleString('vi-VN')}đ</span>
                    </div>

                    {user && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-gray-500 text-sm">Số dư hiện tại:</span>
                        <span className={`text-sm font-medium ${canAfford() ? 'text-green-600' : 'text-red-600'}`}>
                          {user.balance.toLocaleString('vi-VN')}đ
                          {!canAfford() && ' (không đủ)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <button
                      onClick={confirmPurchase}
                      disabled={purchasing || !canAfford()}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg flex items-center justify-center gap-2"
                    >
                      {purchasing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          Xác nhận mua ({getTotalPrice().toLocaleString('vi-VN')}đ)
                        </>
                      )}
                    </button>
                    <button
                      onClick={closeModal}
                      disabled={purchasing}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
                    >
                      Hủy
                    </button>
                  </div>
                </>
              ) : (
                /* Purchase Success Result */
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Mua hàng thành công!</h3>
                    <p className="text-gray-500 mt-1">Cảm ơn bạn đã mua hàng</p>
                  </div>

                  {/* Guide URL in Result */}
                  {purchaseResult.guideUrl && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700">
                          <ExternalLink className="h-4 w-4" />
                          <span className="font-semibold">Hướng dẫn sử dụng:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={purchaseResult.guideUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm font-medium"
                          >
                            Mở link
                          </a>
                          <button
                            onClick={() => copyToClipboard(purchaseResult.guideUrl!, 'guide')}
                            className="text-gray-400 hover:text-blue-600 p-1"
                            title="Copy link"
                          >
                            {copiedKey === 'guide' ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Keys List */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-gray-900">
                        Key của bạn ({purchaseResult.keys.length}):
                      </span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {purchaseResult.keys.map((key, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <code className="text-sm font-mono text-gray-800 break-all flex-1">{key}</code>
                          <button
                            onClick={() => copyToClipboard(key, `key-${index}`)}
                            className="ml-2 text-gray-400 hover:text-blue-600 p-1 flex-shrink-0"
                            title="Copy key"
                          >
                            {copiedKey === `key-${index}` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Copy All Keys */}
                    {purchaseResult.keys.length > 1 && (
                      <button
                        onClick={() => copyToClipboard(purchaseResult.keys.join('\n'), 'all-keys')}
                        className="mt-3 w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center gap-2"
                      >
                        {copiedKey === 'all-keys' ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            Đã copy tất cả!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy tất cả keys
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={closeModal}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg"
                  >
                    Đóng
                  </button>
                </>
              )}
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
