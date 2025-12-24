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
      (user.rank === 'silver' ? 2 :
        user.rank === 'gold' ? 4 :
          user.rank === 'platinum' ? 6 :
            user.rank === 'diamond' ? 8 : 0) : 0
            
    // Giảm thêm 1% nếu người dùng được giới thiệu
    const referralDiscount = user?.referred_by ? 1 : 0
    
    // Tính tổng discount tích lũy trước
    const accumulatedDiscount = variantDiscount + rankDiscount + referralDiscount
    
    // Áp dụng giới hạn 20%
    const finalDiscount = Math.min(accumulatedDiscount, 20)
    
    return Math.round(price * (100 - finalDiscount) / 100)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
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

      {/* Content Container */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2" title={product.name}>{product.name}</h3>

        {/* Info */}
        <div className="space-y-2.5 flex-1 mb-4">
          {product.mechanism && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-0.5">Cơ chế:</p>
              <p className="text-xs text-gray-600 line-clamp-2 hover:line-clamp-none transition-all">{product.mechanism}</p>
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
              <p className="text-xs text-gray-600 line-clamp-2 hover:line-clamp-none transition-all">{product.strengths}</p>
            </div>
          )}

          {product.weaknesses && (
            <div>
              <p className="text-xs font-semibold text-red-700 mb-0.5">Điểm yếu:</p>
              <p className="text-xs text-gray-600 line-clamp-2 hover:line-clamp-none transition-all">{product.weaknesses}</p>
            </div>
          )}

          {product.guide_url && (
            <div>
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

        {/* Variants */}
        <div className="border-t pt-3 mt-auto">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Chọn gói ({product.variants?.length || 0} gói):
          </p>
          <div className="space-y-2 overflow-y-auto max-h-[180px] pr-1 custom-scrollbar">
            {product.variants?.map((variant) => (
              <div key={variant.id} className="p-2.5 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-gray-900 text-xs line-clamp-1" title={variant.name}>{variant.name}</span>
                  {/* Stock Status Badges */}
                  {(variant.stock || 0) <= 0 ? (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                      Hết hàng
                    </span>
                  ) : (variant.stock || 0) < 5 ? (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 whitespace-nowrap">
                      <AlertTriangle className="h-2 w-2" />
                      Sắp hết
                    </span>
                  ) : null}
                </div>

                <div className="flex items-end justify-between gap-2">
                  {/* Price */}
                  <div className="flex flex-col min-w-0">
                    {calculatePriceWithRank(variant.price, variant.discount_percent || 0) < variant.price ? (
                      <>
                        <span className="text-[10px] text-gray-400 line-through">
                          {variant.price.toLocaleString('vi-VN')}đ
                        </span>
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="text-sm font-bold text-red-600">
                            {calculatePriceWithRank(variant.price, variant.discount_percent || 0).toLocaleString('vi-VN')}đ
                          </span>
                          {(variant.discount_percent || 0) > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-medium">
                              -{variant.discount_percent}%
                            </span>
                          )}
                          {user?.referred_by && (
                             <span className="text-[10px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-medium">
                               Ref -1%
                             </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-blue-600">
                        {variant.price.toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => onPurchase(variant, product.name)}
                    disabled={(variant.stock || 0) <= 0}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center gap-1 flex-shrink-0 ${(variant.stock || 0) <= 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                      }`}
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Mua
                  </button>
                </div>

                {(variant.stock || 0) > 0 && (
                  <div className="mt-1 text-[10px] text-gray-500 flex items-center gap-1">
                    <Package className="h-2.5 w-2.5" />
                    {variant.stock} còn lại
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
