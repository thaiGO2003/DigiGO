import { ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { Product, ProductVariant, User } from '../lib/supabase'

interface ProductCardProps {
  product: Product
  user: User | null
  onPurchase: (variant: ProductVariant, productName: string) => void
}

export default function ProductCard({ product, user, onPurchase }: ProductCardProps) {
  const calculatePriceWithRank = (price: number, variantDiscount: number = 0) => {
    const rankDiscount = user?.rank ?
      (user.rank === 'silver' ? 2 :
        user.rank === 'gold' ? 4 :
          user.rank === 'platinum' ? 6 :
            user.rank === 'diamond' ? 8 : 0) : 0
    const totalDiscount = Math.min(variantDiscount + rankDiscount, 100)
    return Math.round(price * (100 - totalDiscount) / 100)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow flex flex-col lg:flex-row overflow-hidden h-full">
      {/* Left: Image (Vertical on Desktop, Top on Mobile) */}
      <div className="lg:w-1/3 xl:w-1/4 relative bg-gray-100 flex-shrink-0">
        <img
          src={product.image_url || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=400'}
          alt={product.name}
          className="w-full h-56 lg:h-full object-cover"
        />
      </div>

      {/* Content Container */}
      <div className="p-5 flex flex-col lg:flex-row gap-6 flex-1 w-full">

        {/* Middle: Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900 mb-3">{product.name}</h3>

          <div className="space-y-3">
            {product.mechanism && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Cơ chế:</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{product.mechanism}</p>
              </div>
            )}

            {product.recommended_model && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Model khuyến dùng:</p>
                <p className="text-sm text-blue-600 font-medium">{product.recommended_model}</p>
              </div>
            )}

            {product.strengths && (
              <div>
                <p className="text-sm font-semibold text-green-700 mb-1">Điểm mạnh:</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{product.strengths}</p>
              </div>
            )}

            {product.weaknesses && (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">Điểm yếu:</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{product.weaknesses}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Variants & Action */}
        <div className="lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 flex flex-col flex-shrink-0">
          <p className="text-sm font-semibold text-gray-700 mb-3">Chọn gói:</p>
          <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {product.variants?.map((variant) => (
              <div key={variant.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 text-sm">{variant.name}</span>
                  {/* Stock Status Badges */}
                  {(variant.stock || 0) <= 0 ? (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                      Hết hàng
                    </span>
                  ) : (variant.stock || 0) < 5 ? (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Sắp hết
                    </span>
                  ) : null}
                </div>

                <div className="flex items-end justify-between">
                  {/* Price */}
                  <div className="flex flex-col">
                    {(variant.discount_percent || 0) > 0 || (user?.rank && user.rank !== 'bronze') ? (
                      <>
                        <span className="text-xs text-gray-400 line-through">
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
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${(variant.stock || 0) <= 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
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
