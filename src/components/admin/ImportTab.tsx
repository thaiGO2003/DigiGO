import { useEffect, useState } from 'react'
import { supabase, Product } from '../../lib/supabase'
import { ShoppingCart, Plus, Trash2, Copy, CheckCircle, ExternalLink } from 'lucide-react'

type ImportItem = {
  id: string
  product_id: string
  product_name: string
  variant_id: string
  variant_name: string
  cost_price: number
  quantity: number
}

const SUPPLIER = {
  bankCode: 'TCB',
  accountNumber: '5272839319',
  accountName: 'LE QUOC NAM KHANH'
}

export default function ImportTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedVariantId, setSelectedVariantId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [items, setItems] = useState<ImportItem[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [transferContent, setTransferContent] = useState<string>('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, variants:product_variants(*)')
      .order('created_at', { ascending: false })
    if (error) return
    setProducts((data || []) as Product[])
  }

  const currentProduct = products.find(p => p.id === selectedProductId)
  const currentVariants = currentProduct?.variants || []
  const currentVariant = currentVariants.find(v => v.id === selectedVariantId)

  const addItem = () => {
    if (!currentProduct || !currentVariant || quantity <= 0) return
    const cost = currentVariant.cost_price || 0
    const newItem: ImportItem = {
      id: `${currentVariant.id}-${Date.now()}`,
      product_id: currentProduct.id,
      product_name: currentProduct.name,
      variant_id: currentVariant.id,
      variant_name: currentVariant.name,
      cost_price: cost,
      quantity
    }
    setItems(prev => [...prev, newItem])
    setSelectedProductId('')
    setSelectedVariantId('')
    setQuantity(1)
  }

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 0) return
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const getTotal = () => {
    return items.reduce((sum, i) => sum + i.cost_price * i.quantity, 0)
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  const generateQR = () => {
    const amount = Math.max(0, getTotal())
    
    // Format: Nhap Hang + [Tên sản phẩm] + [Tên gói sản phẩm] + [Số lượng]
    // Nối các sản phẩm lại nếu có nhiều
    const itemsText = items
      .map(i => `${i.product_name} + ${i.variant_name} + ${i.quantity}`)
      .join(', ')
    
    const content = `NHAP HANG + ${itemsText}`
    
    // Lưu ý: URL có thể quá dài nếu nội dung quá dài. Cần encodeURIComponent cẩn thận.
    const url = `https://img.vietqr.io/image/${SUPPLIER.bankCode}-${SUPPLIER.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(SUPPLIER.accountName)}`
    
    setTransferContent(content)
    setQrUrl(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          Nhập hàng (Dựa theo giá gốc)
        </h2>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm</label>
            <select
              value={selectedProductId}
              onChange={e => { setSelectedProductId(e.target.value); setSelectedVariantId('') }}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">-- Chọn sản phẩm --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gói</label>
            <select
              value={selectedVariantId}
              onChange={e => setSelectedVariantId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled={!currentProduct}
            >
              <option value="">-- Chọn gói --</option>
              {currentVariants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} • Giá gốc: {(v.cost_price || 0).toLocaleString('vi-VN')}đ
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
            <input
              type="number"
              value={quantity}
              min={1}
              onChange={e => setQuantity(parseInt(e.target.value || '1'))}
              className="w-full px-3 py-2 border rounded-md"
              disabled={!currentVariant}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addItem}
              disabled={!currentVariant || quantity <= 0}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Thêm vào bảng
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Bảng nhập hàng</h3>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Sản phẩm</th>
                <th className="py-2 pr-4">Gói</th>
                <th className="py-2 pr-4">Giá gốc</th>
                <th className="py-2 pr-4">Số lượng</th>
                <th className="py-2 pr-4">Thành tiền</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">Chưa có mặt hàng</td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="py-2 pr-4">{item.product_name}</td>
                  <td className="py-2 pr-4">{item.variant_name}</td>
                  <td className="py-2 pr-4 text-red-600">{item.cost_price.toLocaleString('vi-VN')}đ</td>
                  <td className="py-2 pr-4">
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={e => updateQuantity(item.id, parseInt(e.target.value || '0'))}
                      className="w-24 px-2 py-1 border rounded"
                    />
                  </td>
                  <td className="py-2 pr-4 font-semibold text-gray-900">
                    {(item.cost_price * item.quantity).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-gray-700">
            <div>Tổng cộng:</div>
            <div className="text-2xl font-black text-blue-600">{getTotal().toLocaleString('vi-VN')}đ</div>
          </div>
          <button
            onClick={generateQR}
            disabled={getTotal() <= 0}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <ExternalLink className="h-4 w-4" />
            Tạo QR chuyển khoản nhà cung cấp
          </button>
        </div>
      </div>

      {qrUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex flex-col md:flex-row items-center gap-6 h-full justify-center">
              <div className="flex-shrink-0 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <img src={qrUrl} alt="VietQR" className="w-[200px] h-[200px] rounded-lg" />
              </div>
              <div className="flex-grow text-left w-full md:w-auto">
                <h4 className="font-bold text-gray-900 text-lg mb-4 border-b pb-2">Thông tin chuyển khoản</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-medium text-gray-500 text-xs uppercase tracking-wider">Ngân hàng</div>
                    <div className="font-semibold text-gray-900 text-base">Techcombank (TCB)</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500 text-xs uppercase tracking-wider">Số tài khoản</div>
                    <div className="font-bold text-blue-600 text-xl font-mono tracking-tight">{SUPPLIER.accountNumber}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500 text-xs uppercase tracking-wider">Chủ tài khoản</div>
                    <div className="font-semibold text-gray-900 uppercase">{SUPPLIER.accountName}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Nội dung chuyển khoản</h4>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="font-bold text-yellow-800">{transferContent}</div>
              <button
                onClick={() => copyToClipboard(transferContent, 'content')}
                className={`p-2 rounded-xl transition-all ${copiedField === 'content' ? 'bg-green-500 text-white' : 'bg-white text-gray-400 hover:text-blue-600 shadow-sm'}`}
              >
                {copiedField === 'content' ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Chi tiết đơn nhập</h4>
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                {items.map(i => (
                  <li key={i.id}>
                    {i.variant_name} • SL {i.quantity} • Giá gốc {i.cost_price.toLocaleString('vi-VN')}đ • Thành tiền {(i.cost_price * i.quantity).toLocaleString('vi-VN')}đ
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
