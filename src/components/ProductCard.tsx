import { ShoppingCart, Package, AlertTriangle, ExternalLink, Flame } from 'lucide-react'
import { Product, ProductVariant, User } from '../lib/supabase'

interface ProductCardProps {
  product: Product
  user?: User | null
  onPurchase: (variant: ProductVariant, productName: string) => void
}

export default function ProductCard({ product, user = null, onPurchase }: ProductCardProps) {
  const calculatePriceWithRank = (price: number, variantDiscount: number = 0) => {
    const rankDiscount = user?.rank ?
      (user.rank === 'bronze' ? 2 :
        user.rank === 'silver' ? 4 :
          user.rank === 'gold' ? 6 :
            user.rank === 'platinum' ? 8 :
              user.rank === 'diamond' ? 10 : 0) : 0
            
    // Tính giảm giá từ referral (1% cho mỗi người giới thiệu, tối đa 10%)
    const referralCountDiscount = user?.referral_count ? Math.min(user.referral_count * 1, 10) : 0

    // Giảm thêm 1% nếu người dùng được giới thiệu
    const referralDiscount = user?.referred_by ? 1 : 0
    
    // Tính tổng discount tích lũy trước
    const accumulatedDiscount = variantDiscount + rankDiscount + referralCountDiscount + referralDiscount
    
    // Áp dụng giới hạn 20%
    const finalDiscount = Math.min(accumulatedDiscount, 20)
    
    return Math.round(price * (100 - finalDiscount) / 100)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow h-full overflow-hidden flex flex-col md:flex-row">
      {/* Left Column: Image & Info (50%) */}
      <div className="flex flex-col w-full md:w-1/2 border-b md:border-b-0 md:border-r border-gray-100">
        {/* Image Area */}
        <div className="relative h-48 bg-gray-100 flex-shrink-0 group">
          <img
            src={product.image_url || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=400'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {product.is_hot && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
              <Flame className="h-3 w-3" fill="currentColor" />
              HOT
            </div>
          )}
        </div>

        {/* Info Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2" title={product.name}>{product.name}</h3>

          {/* Info */}
          <div className="space-y-2.5 flex-1">
            {product.mechanism && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-0.5">Cơ chế:</p>
                <p className="text-xs text-gray-600 line-clamp-3 hover:line-clamp-none transition-all">{product.mechanism}</p>
              </div>
            )}

            {product.recommended_model && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-0.5">Model khuyến dùng:</p>
                <p className="text-xs text-blue-600 font-medium">{product.recommended_model}</p>
              </div>
            )}

            {product.strengths && (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-0.5">Điểm mạnh:</p>
                <p className="text-xs text-gray-600 line-clamp-3 hover:line-clamp-none transition-all">{product.strengths}</p>
              </div>
            )}

            {product.weaknesses && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-0.5">Điểm yếu:</p>
                <p className="text-xs text-gray-600 line-clamp-3 hover:line-clamp-none transition-all">{product.weaknesses}</p>
              </div>
            )}

            {product.guide_url && (
              <div className="pt-2">
                <a 
                  href={product.guide_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Xem hướng dẫn <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Variants (50% on XL) */}
      <div className="w-full xl:w-1/2 flex flex-col bg-gray-50/50">
        <div className="p-3 bg-white border-b border-gray-200">
          <p className="text-xs font-bold text-gray-700 flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            Chọn gói ({product.variants?.length || 0})
          </p>
        </div>
        
        <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          {product.variants?.map((variant) => (
            <div 
              key={variant.id} 
              className="bg-white p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all group relative"
            >
              {/* Variant Header */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <span className="font-bold text-gray-900 text-sm line-clamp-2" title={variant.name}>
                  {variant.name}
                </span>
                
                {/* Stock Status Badges */}
                {(variant.stock || 0) <= 0 ? (
                  <span className="flex-shrink-0 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Hết hàng
                  </span>
                ) : (variant.stock || 0) < 5 ? (
                  <span className="flex-shrink-0 text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Sắp hết
                  </span>
                ) : null}
              </div>

              {/* Price & Action Area */}
              <div className="flex items-end justify-between gap-3 mt-3">
                {/* Price Display */}
                <div className="flex flex-col">
                  {calculatePriceWithRank(variant.price, variant.discount_percent || 0) < variant.price ? (
                    <>
                      <span className="text-xs text-gray-400 line-through mb-0.5">
                        {variant.price.toLocaleString('vi-VN')}đ
                      </span>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-base font-extrabold text-red-600">
                          {calculatePriceWithRank(variant.price, variant.discount_percent || 0).toLocaleString('vi-VN')}đ
                        </span>
                        {(variant.discount_percent || 0) > 0 && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-semibold">
                            -{variant.discount_percent}%
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-base font-extrabold text-blue-600">
                      {variant.price.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                  
                  {(variant.stock || 0) > 0 && (
                    <span className="text-[10px] text-gray-500 mt-1">
                      Còn lại: {variant.stock}
                    </span>
                  )}
                </div>

                {/* Buy Button */}
                <button
                  onClick={() => onPurchase(variant, product.name)}
                  disabled={(variant.stock || 0) <= 0}
                  className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 ${(variant.stock || 0) <= 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                    }`}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Mua ngay
                </button>
              </div>
            </div>
          ))}
          
          {(!product.variants || product.variants.length === 0) && (
            <div className="text-center py-8 text-gray-400 text-sm italic">
              Đang cập nhật gói sản phẩm...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
