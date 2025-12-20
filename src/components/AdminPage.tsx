import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Package, MessageCircle, Key, Send } from 'lucide-react'
import { supabase, Product, ProductVariant, ProductKey, User, ChatMessage } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AdminPage() {
  const { user } = useAuth()
  const isAdmin = user?.email === 'luongquocthai.thaigo.2003@gmail.com' || user?.is_admin
  const [activeTab, setActiveTab] = useState<'products' | 'users' | 'chat'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [chatUsers, setChatUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  useEffect(() => {
    if (isAdmin) {
      fetchProducts()
      fetchUsers()
      fetchChatUsers()
    }
  }, [user, isAdmin])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id)
      subscribeToMessages(selectedUser.id)
    }
  }, [selectedUser])

  useEffect(() => {
    if (activeTab === 'chat' && selectedUser) {
      const interval = setInterval(() => {
        fetchMessages(selectedUser.id)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [activeTab, selectedUser])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_products_with_variants')
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchChatUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('user_id, users(id, email, full_name)')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      
      const uniqueUsers = data?.reduce((acc: any[], msg: any) => {
        if (!acc.find((u: any) => u.id === msg.user_id) && msg.users) {
          acc.push(msg.users)
        }
        return acc
      }, []) || []
      setChatUsers(uniqueUsers)
    } catch (error) {
      console.error('Error fetching chat users:', error)
    }
  }

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const subscribeToMessages = (userId: string) => {
    const channel = supabase
      .channel(`admin-chat:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage])
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || !user) return
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: selectedUser.id,
          admin_id: user.id,
          message: newMessage.trim(),
          is_admin: true
        })
      if (error) throw error
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Xóa sản phẩm này? Tất cả variants và keys sẽ bị xóa.')) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const deleteVariant = async (id: string) => {
    if (!confirm('Xóa variant này? Tất cả keys sẽ bị xóa.')) return
    try {
      const { error } = await supabase.from('product_variants').delete().eq('id', id)
      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error deleting variant:', error)
    }
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Xóa key này?')) return
    try {
      const { error } = await supabase.from('product_keys').delete().eq('id', id)
      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error deleting key:', error)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển Admin</h1>
        <div className="text-sm text-gray-600">
          Xin chào, <span className="font-semibold">{user?.full_name || user?.email}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="inline h-5 w-5 mr-2" />
              Sản phẩm
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="inline h-5 w-5 mr-2" />
              Người dùng
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="inline h-5 w-5 mr-2" />
              Chat hỗ trợ
            </button>
          </nav>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý sản phẩm</h2>
            <button
              onClick={() => {
                setEditingProduct(null)
                setShowProductModal(true)
              }}
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
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProduct(product)
                        setShowProductModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700">Variants</h4>
                    <button
                      onClick={() => {
                        setSelectedProduct(product)
                        setSelectedVariant(null)
                        setShowVariantModal(true)
                      }}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      <Plus className="inline h-3 w-3 mr-1" />
                      Thêm variant
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
                            onClick={() => {
                              setSelectedProduct(product)
                              setSelectedVariant(variant)
                              setShowKeyModal(true)
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="Quản lý keys"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(product)
                              setSelectedVariant(variant)
                              setShowVariantModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteVariant(variant.id)}
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
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số dư</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.full_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.balance.toLocaleString('vi-VN')}đ</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{u.is_admin ? '✅' : '❌'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Cuộc trò chuyện</h3>
            <div className="space-y-2">
              {chatUsers.map((chatUser) => (
                <button
                  key={chatUser.id}
                  onClick={() => setSelectedUser(chatUser)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedUser?.id === chatUser.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  {chatUser.full_name || chatUser.email}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col h-96">
            {selectedUser ? (
              <>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">{selectedUser.full_name || selectedUser.email}</h3>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.is_admin ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${message.is_admin ? 'text-blue-100' : 'text-gray-500'}`}>
                          {new Date(message.created_at).toLocaleTimeString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendAdminMessage} className="p-4 border-t">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">Chọn một cuộc trò chuyện</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false)
          setEditingProduct(null)
        }}
        product={editingProduct}
        onSave={fetchProducts}
      />

      {/* Variant Modal */}
      <VariantModal
        isOpen={showVariantModal}
        onClose={() => {
          setShowVariantModal(false)
          setSelectedProduct(null)
          setSelectedVariant(null)
        }}
        product={selectedProduct}
        variant={selectedVariant}
        onSave={fetchProducts}
      />

      {/* Key Modal */}
      <KeyModal
        isOpen={showKeyModal}
        onClose={() => {
          setShowKeyModal(false)
          setSelectedVariant(null)
        }}
        variant={selectedVariant}
        onSave={fetchProducts}
      />
    </div>
  )
}

function ProductModal({ isOpen, onClose, product, onSave }: any) {
  const [formData, setFormData] = useState({
    name: '',
    mechanism: '',
    recommended_model: '',
    strengths: '',
    weaknesses: '',
    image_url: '',
    category: 'software'
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        mechanism: product.mechanism || '',
        recommended_model: product.recommended_model || '',
        strengths: product.strengths || '',
        weaknesses: product.weaknesses || '',
        image_url: product.image_url || '',
        category: product.category || 'software'
      })
    } else {
      setFormData({
        name: '',
        mechanism: '',
        recommended_model: '',
        strengths: '',
        weaknesses: '',
        image_url: '',
        category: 'software'
      })
    }
  }, [product, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (product) {
        const { error } = await supabase.from('products').update(formData).eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(formData)
        if (error) throw error
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-semibold mb-4">{product ? 'Sửa' : 'Thêm'} sản phẩm</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên sản phẩm</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cơ chế</label>
              <textarea
                value={formData.mechanism}
                onChange={(e) => setFormData({ ...formData, mechanism: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model khuyến dùng</label>
              <input
                type="text"
                value={formData.recommended_model}
                onChange={(e) => setFormData({ ...formData, recommended_model: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điểm mạnh</label>
              <textarea
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Điểm yếu</label>
              <textarea
                value={formData.weaknesses}
                onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL hình ảnh</label>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Danh mục</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="software">Phần mềm</option>
                <option value="game">Game</option>
                <option value="education">Giáo dục</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
              Lưu
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VariantModal({ isOpen, onClose, product, variant, onSave }: any) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    discount_percent: 0,
    duration_days: 0,
    description: ''
  })

  useEffect(() => {
    if (variant) {
      setFormData({
        name: variant.name || '',
        price: variant.price || 0,
        discount_percent: variant.discount_percent || 0,
        duration_days: variant.duration_days || 0,
        description: variant.description || ''
      })
    } else {
      setFormData({
        name: '',
        price: 0,
        discount_percent: 0,
        duration_days: 0,
        description: ''
      })
    }
  }, [variant, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    try {
      if (variant) {
        const { error } = await supabase.from('product_variants').update(formData).eq('id', variant.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('product_variants').insert({
          ...formData,
          product_id: product.id
        })
        if (error) throw error
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving variant:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-semibold mb-4">{variant ? 'Sửa' : 'Thêm'} variant</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên gói</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
                placeholder="VD: 30 ngày"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Giá gốc (VNĐ)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Giảm giá (%)</label>
              <input
                type="number"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
                min="0"
                max="100"
                placeholder="VD: 10 = giảm 10%"
              />
              {formData.discount_percent > 0 && formData.price > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Giá sau giảm: <span className="font-semibold text-red-600">
                    {Math.round(formData.price * (100 - formData.discount_percent) / 100).toLocaleString('vi-VN')}đ
                  </span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thời hạn (ngày)</label>
              <input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
              Lưu
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function KeyModal({ isOpen, onClose, variant, onSave }: any) {
  const [keys, setKeys] = useState<ProductKey[]>([])
  const [newKey, setNewKey] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (variant && isOpen) {
      fetchKeys()
    }
  }, [variant, isOpen])

  const fetchKeys = async () => {
    if (!variant) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('product_keys')
        .select('*')
        .eq('variant_id', variant.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setKeys(data || [])
    } catch (error) {
      console.error('Error fetching keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!variant || !newKey.trim()) return
    try {
      const { error } = await supabase.from('product_keys').insert({
        variant_id: variant.id,
        key_value: newKey.trim().toUpperCase()
      })
      if (error) throw error
      setNewKey('')
      fetchKeys()
      onSave()
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`)
      console.error('Error adding key:', error)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Xóa key này?')) return
    try {
      const { error } = await supabase.from('product_keys').delete().eq('id', id)
      if (error) throw error
      fetchKeys()
      onSave()
    } catch (error) {
      console.error('Error deleting key:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Quản lý Keys - {variant?.name}</h3>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleAddKey} className="mb-4">
            <label className="block text-sm font-medium mb-1">Thêm Key mới (UUID format)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                className="flex-1 px-3 py-2 border rounded-md font-mono text-sm"
                pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>

          {loading ? (
            <div className="text-center py-4">Đang tải...</div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-2">Tổng: {keys.length} keys ({keys.filter(k => !k.is_used).length} chưa dùng)</p>
              {keys.map((key) => (
                <div key={key.id} className={`flex justify-between items-center p-3 border rounded ${
                  key.is_used ? 'bg-gray-50' : 'bg-white'
                }`}>
                  <div className="flex-1">
                    <code className="text-sm font-mono">{key.key_value}</code>
                    <span className={`ml-3 text-xs px-2 py-1 rounded ${
                      key.is_used ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {key.is_used ? 'Đã sử dụng' : 'Chưa sử dụng'}
                    </span>
                  </div>
                  {!key.is_used && (
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <button onClick={onClose} className="w-full bg-gray-300 py-2 rounded-md hover:bg-gray-400">
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
