import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RotateCcw, ShoppingCart, Plus, Minus, ExternalLink, Copy, Check, Key } from 'lucide-react'
import { supabase, Product, ProductVariant } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { sendTelegramNotification } from '../lib/telegram'
import AuthModal from './AuthModal'
import { useDiscounts } from '../hooks/useDiscounts'

import ProductCard from './ProductCard'

export default function ProductsPage() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: 'all',
    priceMin: 0,
    priceMax: 10000000,
    search: '',
    sortBy: 'default' as 'default' | 'stock' | 'bestselling'
  })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedProductGuideUrl, setSelectedProductGuideUrl] = useState<string | undefined>(undefined)
  const [selectedProductName, setSelectedProductName] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [purchaseResult, setPurchaseResult] = useState<{ 
    keys: string[], 
    guideUrl?: string,
    productName?: string,
    variantName?: string,
    manualDelivery?: boolean
  } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const { computePercent, getUnitPrice: calcUnitPrice } = useDiscounts()

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [products, filters])

  const fetchProducts = async () => {
    try {
      let data: Product[] | null = null
      let error: any = null

      // Try RPC first
      const rpcResponse = await supabase.rpc('get_products_with_variants')
      if (rpcResponse.error) {
        console.warn('RPC get_products_with_variants failed, falling back to standard select:', rpcResponse.error)
        // Fallback to standard select
        const selectResponse = await supabase
          .from('products')
          .select('*, variants:product_variants(*)')
          .order('created_at', { ascending: false })
        
        data = selectResponse.data as Product[]
        error = selectResponse.error
      } else {
        data = rpcResponse.data as Product[]
      }

      if (error) throw error
      
      if (data) {
        // Sort by sort_order (asc), then created_at (desc)
        const sorted = [...data].sort((a, b) => {
            const orderA = a.sort_order ?? 999999
            const orderB = b.sort_order ?? 999999
            
            if (orderA !== orderB) {
                return orderA - orderB
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setProducts(sorted)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
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

    // Sort variants within each product based on sortBy filter
    filtered = filtered.map(product => {
      if (!product.variants || product.variants.length === 0) return product
      
      const sortedVariants = [...product.variants]
      
      switch (filters.sortBy) {
        case 'stock':
          // Sort by stock quantity (highest first)
          sortedVariants.sort((a, b) => (b.stock || 0) - (a.stock || 0))
          break
        case 'bestselling':
          // Sort by total_sold (highest first)
          sortedVariants.sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
          break
        case 'default':
        default: {
          const strategy = product.variant_sort_strategy || 'default'

          if (strategy === 'price_asc') {
            sortedVariants.sort((a, b) => a.price - b.price)
          } else if (strategy === 'price_desc') {
            sortedVariants.sort((a, b) => b.price - a.price)
          } else if (strategy === 'duration_asc') {
            sortedVariants.sort((a, b) => (a.duration_days || 0) - (b.duration_days || 0))
          } else if (strategy === 'duration_desc') {
            sortedVariants.sort((a, b) => (b.duration_days || 0) - (a.duration_days || 0))
          } else if (strategy === 'bestselling') {
            sortedVariants.sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
          } else if (strategy === 'stock_asc') {
            sortedVariants.sort((a, b) => (a.stock || 0) - (b.stock || 0))
          } else if (strategy === 'stock_desc') {
            sortedVariants.sort((a, b) => (b.stock || 0) - (a.stock || 0))
          } else {
            sortedVariants.sort((a, b) => {
              if ((a.sort_order || 0) !== (b.sort_order || 0)) {
                return (a.sort_order || 0) - (b.sort_order || 0)
              }
              return a.price - b.price
            })
          }
          break
        }
      }
      
      return { ...product, variants: sortedVariants }
    })

    setFilteredProducts(filtered)
  }

  const resetFilters = () => {
    setFilters({
      category: 'all',
      priceMin: 0,
      priceMax: 10000000,
      search: '',
      sortBy: 'default'
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

    // Find the product to get guide_url
    const product = products.find(p => p.variants?.some(v => v.id === variant.id))

    setSelectedVariant(variant)
    setSelectedProductName(productName)
    setSelectedProductGuideUrl(product?.guide_url)
    setQuantity(1)
    setPurchaseResult(null)
    setShowConfirmModal(true)
  }

  const getUnitPrice = () => {
    if (!selectedVariant) return 0
    return calcUnitPrice(user, selectedVariant)
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
        const username = user.username || 'N/A'
        const fullName = user.full_name || user.email || 'N/A'

        // Lấy mã đơn hàng
        let orderCode = (data as any)?.order_codes?.[0] as string | undefined

        // Fallback 1: manual delivery thường embed mã đơn trong key_values
        if (!orderCode && selectedVariant.is_manual_delivery) {
          const kvs = (data as any)?.key_values || [(data as any)?.key_value]
          const kv = kvs?.[0]
          if (typeof kv === 'string') {
            const m = kv.match(/Mã đơn.*:\s*([A-Za-z0-9]+)/)
            if (m) orderCode = m[1]
          }
        }

        // Fallback 2: Nếu RPC không trả về order_codes, thử lấy từ tx_id (nếu có trong data)
        if (!orderCode && (data as any)?.transaction_id) {
            orderCode = (data as any).transaction_id.split('-')[0].toUpperCase()
        } else if (!orderCode && (data as any)?.transaction_ids?.[0]) {
            orderCode = (data as any).transaction_ids[0].split('-')[0].toUpperCase()
        }

        const orderCodeLine = `- Mã đơn hàng: <b>${orderCode || 'N/A'}</b>`

        // 1) Đơn hàng mới! (giữ thông tin giá)
        const unitPrice = (data as any)?.final_unit_price ?? getUnitPrice()
        const variantDisplay = selectedVariant.short_name ? `${selectedVariant.name} (${selectedVariant.short_name})` : selectedVariant.name
        const orderMsg = `<b>Đơn hàng mới!</b>\n\n- Họ tên: ${fullName}\n- Username: ${username}\n- Sản phẩm: ${selectedProductName}\n- Gói: ${variantDisplay}\n- Đơn giá: ${Number(unitPrice).toLocaleString('vi-VN')}đ\n- Số lượng: ${quantity}\n- Tổng tiền: ${data.total_price?.toLocaleString('vi-VN')}đ\n${orderCodeLine}`
        sendTelegramNotification(orderMsg, { username, full_name: fullName })

        // 2) Hãy nhập hàng! (KHÔNG có giá)
        const importMsg = `<b>Hãy nhập hàng!</b>\n\n- Họ tên: ${fullName}\n- Username: ${username}\n- Sản phẩm: ${selectedProductName}\n- Gói: ${variantDisplay}\n- Số lượng: ${quantity}\n${orderCodeLine}`
        sendTelegramNotification(importMsg, { username, full_name: fullName })

        // Cảnh báo hết hàng chỉ áp dụng cho auto-delivery (có kho key)
        if (!selectedVariant.is_manual_delivery && (selectedVariant.stock || 0) <= quantity) {
          const oosMsg = `<b>⚠️ CẢNH BÁO HẾT HÀNG!</b>\n\n- Sản phẩm: ${selectedProductName}\n- Gói: ${selectedVariant.name}\n- Kho đã hết key.`
          sendTelegramNotification(oosMsg)
        }

        // Show purchase result
        setPurchaseResult({
          keys: data.key_values || [data.key_value],
          guideUrl: data.guide_url || selectedVariant.guide_url || selectedProductGuideUrl,
          // Store these for copy logic
          productName: selectedProductName,
          variantName: selectedVariant.name,
          manualDelivery: selectedVariant.is_manual_delivery
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

  const handleSupportChat = () => {
    // Logic to open support chat
    // Assuming there's a global chat mechanism or redirect
    // For now, we'll try to trigger the chat widget if available, or redirect to chat page
    // Since we're in a modal, maybe we can just close modal and open chat?
    // But the user might want to keep the modal open to copy keys.
    // Let's assume we can dispatch an event or use a global context.
    // For simplicity, we'll alert for now if no direct method, or try to find a chat trigger.
    
    // Dispatch a custom event that the layout or chat component listens to
    window.dispatchEvent(new CustomEvent('open-chat-support', { 
        detail: { 
            message: `Tôi vừa mua đơn hàng: ${purchaseResult?.keys.join(', ')} (${selectedProductName} - ${selectedVariant?.name}). Nhờ hỗ trợ kích hoạt/nhận key.` 
        } 
    }))
    
    closeModal()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Sản Phẩm</h1>
      <div className="mb-2 text-sm text-gray-600">
        {(() => {
          const totalSoldAll = products.flatMap(p => p.variants || []).reduce((s, v) => s + (v.total_sold || 0), 0)
          return <span>Tổng đã bán: {totalSoldAll.toLocaleString('vi-VN')}</span>
        })()}
      </div>
      <div className="mb-4 sm:mb-6 text-sm text-gray-600">
        Liên hệ hỗ trợ:&nbsp;
        <a href="mailto:luongquocthai.thaigo.2003@gmail.com" className="text-blue-600 hover:underline">
          luongquocthai.thaigo.2003@gmail.com
        </a>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Danh mục
            </label>
            <select
              value={filters.category}
              onChange={(e) => {
                const cat = e.target.value
                setFilters({ ...filters, category: cat })
                window.location.hash = cat === 'all' ? '' : cat
              }}
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
              Sắp xếp gói
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="default">Mặc định</option>
              <option value="stock">Số lượng tồn kho</option>
              <option value="bestselling">Bán chạy nhất</option>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
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
                  <span className="text-gray-500">Thời hạn:</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {(selectedVariant.duration_days || 0) === 0 ? 'Vĩnh viễn' : `${selectedVariant.duration_days} ngày`}
                  </span>
                </p>
                <p className="text-gray-600 mt-1">
                      <span className="text-gray-500">Còn lại:</span>{' '}
                      <span className="font-semibold text-yellow-700">{selectedVariant.stock || 0} sản phẩm</span>
                    </p>
                  </div>

                  {/* Guide URL */}
                  {(selectedVariant.guide_url || selectedProductGuideUrl) && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                      <div className="flex items-center gap-2 text-blue-700">
                        <ExternalLink className="h-4 w-4" />
                        <a
                          href={selectedVariant.guide_url || selectedProductGuideUrl}
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

                  {/* Discount Breakdown Info */}
                  {(() => {
                    const { breakdown, integratedPercent, buyerPercent } = computePercent(user, selectedVariant)
                    const accumulatedDiscount = breakdown.accumulatedDiscount
                    const variantDiscount = breakdown.variantDiscount
                    const totalDiscount = integratedPercent

                    return (
                      <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg mb-4 text-sm space-y-1">
                        {variantDiscount > 0 && (
                          <div className="flex justify-between items-center">
                            <span>Giảm giá gói:</span>
                            <span className="font-semibold">-{variantDiscount}%</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span>Giảm giá tích lũy (Hạng + Giới thiệu):</span>
                          <span className="font-semibold">-{accumulatedDiscount}%</span>
                        </div>
                        <div className="border-t border-blue-200 my-1 pt-1 flex justify-between items-center font-medium">
                          <span>Tổng giảm giá:</span>
                          <span className="font-bold text-blue-900">-{totalDiscount}% {accumulatedDiscount >= 10 && <span className="text-xs font-normal text-blue-700">(Giảm tích lũy tối đa 10%)</span>}</span>
                        </div>
                        {buyerPercent > 0 && (
                          <div className="flex justify-between items-center">
                            <span>Giảm thêm (được giới thiệu):</span>
                            <span className="font-semibold">-{buyerPercent}%</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Pricing */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 mb-6 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Đơn giá:</span>
                      <div className="text-right">
                        {(selectedVariant.discount_percent || 0) > 0 || (user?.rank && user.rank !== 'newbie') || (user?.referral_count && user.referral_count > 0) || user?.referred_by ? (
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <span className="text-gray-400 line-through text-sm">
                              {selectedVariant.price.toLocaleString('vi-VN')}đ
                            </span>
                            {(() => {
                              const { integratedPercent, buyerPercent } = computePercent(user, selectedVariant)
                              const totalDiscount = integratedPercent + (buyerPercent > 0 ? buyerPercent : 0)
                              
                              return totalDiscount > 0 && (
                                <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-xs font-medium">
                                  -{totalDiscount}%
                                </span>
                              )
                            })()}
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

                  {/* Manual Delivery Warning */}
                  {selectedVariant.is_manual_delivery && (
                    <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg mb-6 text-sm border border-yellow-200">
                      <p className="font-semibold mb-1">⚠️ Lưu ý quan trọng:</p>
                      Sản phẩm này sẽ trả về <span className="font-bold">Mã đơn hàng</span>. Bạn vui lòng gửi mã này cho hỗ trợ khách hàng để nhận key sản phẩm.
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    {user && user.balance < getTotalPrice() ? (
                      <button
                        onClick={() => {
                          const amountNeeded = Math.max(10000, getTotalPrice() - user.balance)
                          navigate(`/topup?amount=${amountNeeded}`)
                          closeModal()
                        }}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Nạp tiền ngay (Thiếu {(getTotalPrice() - user.balance).toLocaleString('vi-VN')}đ)
                      </button>
                    ) : (
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
                    )}
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
                    {/* Manual Delivery Instruction */}
                    {selectedVariant?.is_manual_delivery && (
                      <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg mb-4 text-sm border border-yellow-200">
                        <p className="font-bold mb-1">👉 Hướng dẫn nhận hàng:</p>
                        Hãy gửi mã giao dịch bên dưới cho CSKH (Chat Support ở góc màn hình) để nhận key sản phẩm bạn nhé!
                      </div>
                    )}

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
                    {purchaseResult.keys.length > 0 && (
                      <button
                        onClick={() => {
                          const textToCopy = purchaseResult.keys.map(key => 
                            `${key} - ${purchaseResult.productName || selectedProductName} - ${purchaseResult.variantName || selectedVariant?.name}`
                          ).join(', ')
                          copyToClipboard(textToCopy, 'all-keys')
                        }}
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

                  {purchaseResult.manualDelivery ? (
                    <button
                      onClick={handleSupportChat}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg"
                    >
                      Gửi mã giao dịch đến hỗ trợ
                    </button>
                  ) : (
                    <button
                      onClick={closeModal}
                      className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      Đóng
                    </button>
                  )}
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
