import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Package, MessageCircle, Key, Send, CreditCard, Check, X as CloseIcon, Landmark, RotateCcw, ShieldCheck, ShieldX, ChevronDown, ChevronUp, ExternalLink, Copy, Lock, Unlock, Award } from 'lucide-react'
import { supabase, Product, ProductVariant, ProductKey, User, ChatMessage, BankConfig } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VIETNAM_BANKS = [
  { id: 'VietinBank', name: 'VietinBank', code: 'ICB' },
  { id: 'Vietcombank', name: 'Vietcombank', code: 'VCB' },
  { id: 'BIDV', name: 'BIDV', code: 'BIDV' },
  { id: 'Agribank', name: 'Agribank', code: 'VBA' },
  { id: 'OCB', name: 'OCB', code: 'OCB' },
  { id: 'MBBank', name: 'MBBank', code: 'MB' },
  { id: 'Techcombank', name: 'Techcombank', code: 'TCB' },
  { id: 'ACB', name: 'ACB', code: 'ACB' },
  { id: 'VPBank', name: 'VPBank', code: 'VPB' },
  { id: 'Sacombank', name: 'Sacombank', code: 'STB' },
  { id: 'TPBank', name: 'TPBank', code: 'TPB' },
  { id: 'HDBank', name: 'HDBank', code: 'HDB' },
  { id: 'VIB', name: 'VIB', code: 'VIB' },
  { id: 'MSB', name: 'MSB', code: 'MSB' },
  { id: 'SHB', name: 'SHB', code: 'SHB' },
  { id: 'ABBANK', name: 'ABBANK', code: 'ABB' },
  { id: 'VietABank', name: 'VietABank', code: 'VAB' },
  { id: 'NamABank', name: 'NamABank', code: 'NAB' },
  { id: 'PGBank', name: 'PGBank', code: 'PGB' },
  { id: 'VietBank', name: 'VietBank', code: 'VIETBANK' },
  { id: 'BVB', name: 'BaoVietBank', code: 'BVB' },
]

const removeVietnameseTones = (str: string) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|ã|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Some system encode individual combining characters
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // huyền, sắc, ngã, hỏi, nặng
  str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // â, ă, ơ
  return str.toUpperCase();
}

export default function AdminPage() {
  const { user } = useAuth()
  const isAdmin = user?.email?.toLowerCase() === 'luongquocthai.thaigo.2003@gmail.com' || user?.is_admin
  const [activeTab, setActiveTab] = useState<'products' | 'users' | 'chat' | 'transactions' | 'bank' | 'settings' | 'ranks'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [chatUsers, setChatUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'purchase' | 'pending' | 'completed' | 'expired'>('all')
  const [bankConfigs, setBankConfigs] = useState<BankConfig[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showBankModal, setShowBankModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [editingBankConfig, setEditingBankConfig] = useState<BankConfig | null>(null)

  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState(false)
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isAdmin) {
      fetchProducts()
      fetchUsers()
      fetchChatUsers()
      fetchTransactions()
      fetchBankConfigs()

      // Subscribe to transaction changes
      const channel = supabase
        .channel('admin-transactions-all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions'
          },
          () => {
            console.log('Transactions updated, fetching latest data...')
            fetchTransactions()
            fetchUsers() // Also fetch users because balance might have changed
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, isAdmin])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id)
      subscribeToMessages(selectedUser.id)
    }
  }, [selectedUser])

  useEffect(() => {
    if (activeTab === 'chat') {
      const interval = setInterval(() => {
        fetchChatUsers()
        if (selectedUser) {
          fetchMessages(selectedUser.id)
        }
      }, 10000)
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

  const updateUserRank = async (userId: string, newRank: User['rank']) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ rank: newRank })
        .eq('id', userId)
      if (error) throw error
      fetchUsers() // Refresh the users list
    } catch (error) {
      console.error('Error updating user rank:', error)
    }
  }

  const fetchChatUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('user_id, users!chat_messages_user_id_fkey(id, email, full_name, username)')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false })
      if (error) throw error

      const uniqueUsers = data?.reduce((acc: any[], msg: any) => {
        const userData = (msg as any).users
        if (!acc.find((u: any) => u.id === msg.user_id) && userData) {
          acc.push(userData)
        }
        return acc
      }, []) || []
      setChatUsers(uniqueUsers)
    } catch (error) {
      console.error('Error fetching chat users:', error)
    }
  }

  const fetchBankConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_configs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setBankConfigs(data || [])
    } catch (error) {
      console.error('Error fetching bank configs:', error)
    }
  }

  const handleSaveBankConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const bankData = {
      bank_id: formData.get('bank_id') as string,
      bank_name: formData.get('bank_name') as string,
      napas_code: formData.get('napas_code') as string,
      account_number: formData.get('account_number') as string,
      account_name: removeVietnameseTones(formData.get('account_name') as string),
      is_active: formData.get('is_active') === 'on'
    }

    try {
      if (editingBankConfig) {
        // If setting to active, deactivate others first
        if (bankData.is_active) {
          await supabase
            .from('bank_configs')
            .update({ is_active: false })
            .neq('id', editingBankConfig.id)
        }

        const { error } = await supabase
          .from('bank_configs')
          .update(bankData)
          .eq('id', editingBankConfig.id)
        if (error) throw error
      } else {
        // If setting to active, deactivate others first
        if (bankData.is_active) {
          await supabase
            .from('bank_configs')
            .update({ is_active: false })
            .neq('id', '00000000-0000-0000-0000-000000000000') // Dummy check to update all
        }

        const { error } = await supabase
          .from('bank_configs')
          .insert([bankData])
        if (error) throw error
      }

      setShowBankModal(false)
      setEditingBankConfig(null)
      fetchBankConfigs()
    } catch (error) {
      console.error('Error saving bank config:', error)
      alert('Có lỗi xảy ra khi lưu thông tin ngân hàng')
    }
  }

  const handleDeleteBankConfig = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông tin ngân hàng này?')) return

    try {
      const { error } = await supabase
        .from('bank_configs')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchBankConfigs()
    } catch (error) {
      console.error('Error deleting bank config:', error)
      alert('Có lỗi xảy ra khi xóa thông tin ngân hàng')
    }
  }

  const handleActivateBankConfig = async (id: string) => {
    try {
      // Deactivate all first
      await supabase
        .from('bank_configs')
        .update({ is_active: false })
        .neq('id', id)

      // Activate selected
      const { error } = await supabase
        .from('bank_configs')
        .update({ is_active: true })
        .eq('id', id)

      if (error) throw error
      fetchBankConfigs()
    } catch (error) {
      console.error('Error activating bank config:', error)
      alert('Có lỗi xảy ra khi kích hoạt thông tin ngân hàng')
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

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          users(email, full_name, balance),
          product_variants(name, products(name))
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const handleApproveTransaction = async (transaction: any) => {
    const amount = Number(transaction.amount)
    if (!confirm(`Phê duyệt nạp ${amount.toLocaleString('vi-VN')}đ cho ${transaction.users?.email}?`)) return

    try {
      // 1. Get the LATEST user balance to avoid race conditions
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', transaction.user_id)
        .single()

      if (fetchError) throw fetchError
      const currentBalance = Number(userData?.balance || 0)

      // 2. Update transaction status
      const { error: txError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id)

      if (txError) throw txError

      // 3. Update user balance using the latest balance
      const { error: userError } = await supabase
        .from('users')
        .update({ balance: currentBalance + amount })
        .eq('id', transaction.user_id)

      if (userError) throw userError

      alert('Đã duyệt và cộng tiền thành công!')
      // Realtime subscription will handle the UI update, but we call these just in case
      fetchTransactions()
      fetchUsers()
    } catch (error) {
      console.error('Error approving transaction:', error)
      alert('Có lỗi xảy ra khi duyệt giao dịch: ' + (error as any).message)
    }
  }

  const handleRejectTransaction = async (transaction: any) => {
    if (!confirm(`Từ chối giao dịch của ${transaction.users?.email}?`)) return

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id)

      if (error) throw error

      alert('Đã từ chối giao dịch')
      fetchTransactions()
    } catch (error) {
      console.error('Error rejecting transaction:', error)
      alert('Có lỗi xảy ra')
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này? Tất cả các biến thể và khóa liên quan sẽ bị xóa.')) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Lỗi khi xóa sản phẩm')
    }
  }



  const handleAdjustBalance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const amount = parseInt(formData.get('amount') as string)
    const note = formData.get('note') as string

    if (!adjustingUser || isNaN(amount)) return

    try {
      const { error } = await supabase.rpc('admin_adjust_balance', {
        p_user_id: adjustingUser.id,
        p_amount: amount,
        p_note: note
      })

      if (error) throw error

      alert('Đã điều chỉnh số dư thành công')
      setShowAdjustBalanceModal(false)
      setAdjustingUser(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error adjusting balance:', error)
      alert(error.message || 'Lỗi khi điều chỉnh số dư')
    }
  }

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === user?.id) {
      alert('Bạn không thể tự gỡ quyền Admin của chính mình!')
      return
    }

    const action = currentStatus ? 'gỡ' : 'cấp'
    if (!confirm(`Bạn có chắc muốn ${action} quyền Admin cho người dùng này?`)) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      alert(`Đã ${action} quyền Admin thành công`)
      fetchUsers()
    } catch (error: any) {
      console.error('Error toggling admin status:', error)
      alert('Lỗi khi thay đổi quyền Admin: ' + (error.message || ''))
    }
  }

  const handleToggleBan = async (u: User) => {
    try {
      if (u.id === user?.id) {
        alert('Bạn không thể khóa tài khoản của chính mình')
        return
      }
      if (!confirm(`Bạn có chắc muốn ${u.is_banned ? 'MỞ KHÓA' : 'KHÓA'} tài khoản ${u.email}?`)) return
      const { error } = await supabase.rpc('admin_toggle_ban_user', {
        p_user_id: u.id,
        p_status: !u.is_banned
      })
      if (error) throw error
      alert(`Đã ${u.is_banned ? 'mở khóa' : 'khóa'} tài khoản thành công`)
      fetchUsers()
    } catch (error: any) {
      console.error('Error toggling ban:', error)
      alert('Có lỗi xảy ra: ' + error.message)
    }
  }

  const handleDeleteUser = async (u: User) => {
    try {
      if (u.id === user?.id) {
        alert('Bạn không thể xóa tài khoản của chính mình')
        return
      }
      const confirmMessage = `CẢNH BÁO QUAN TRỌNG:\n\nBạn đang sắp XÓA VĨNH VIỄN tài khoản ${u.email}.\n\nHành động này sẽ xóa toàn bộ dữ liệu liên quan bao gồm lịch sử giao dịch, tin nhắn chat, hoa hồng giới thiệu, v.v.\n\nHÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!\n\nBạn có chắc chắn muốn tiếp tục?`
      if (!confirm(confirmMessage)) return

      // Double confirm
      const confirmEmail = prompt(`Để xác nhận xóa, vui lòng nhập lại email của user (${u.email}):`)
      if (confirmEmail !== u.email) {
        alert('Email xác nhận không khớp. Hủy thao tác xóa.')
        return
      }

      const { error } = await supabase.rpc('admin_delete_user', {
        p_user_id: u.id
      })
      if (error) throw error
      alert('Đã xóa tài khoản vĩnh viễn')
      fetchUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert('Có lỗi xảy ra khi xóa tài khoản: ' + error.message)
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

      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'products'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <Package className="inline h-5 w-5 mr-2" />
              Sản phẩm
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <Users className="inline h-5 w-5 mr-2" />
              Người dùng
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'chat'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <MessageCircle className="inline h-5 w-5 mr-2" />
              Chat hỗ trợ
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <CreditCard className="inline h-5 w-5 mr-2" />
              Giao dịch
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'bank'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex items-center space-x-2`}
            >
              <Landmark className="h-4 w-4" />
              <span>Ngân hàng</span>
            </button>
            <button
              onClick={() => setActiveTab('ranks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'ranks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex items-center space-x-2`}
            >
              <Award className="h-4 w-4" />
              <span>Hạng</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Products Tab */}
      {
        activeTab === 'products' && (
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
                      <h4 className="font-semibold text-gray-700">Biến thể</h4>
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
        )
      }

      {/* Users Tab */}
      {
        activeTab === 'users' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số dư</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setAdjustingUser(u)
                            setShowAdjustBalanceModal(true)
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Điều chỉnh số dư"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleAdmin(u.id, u.is_admin)}
                          className={`p-1 rounded ${u.is_admin ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={u.is_admin ? "Gỡ quyền Admin" : "Cấp quyền Admin"}
                        >
                          {u.is_admin ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleToggleBan(u)}
                          className={`p-1 rounded ${u.is_banned ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-100'}`}
                          title={u.is_banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                        >
                          {u.is_banned ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Transactions Tab */}
      {
        activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tổng tiền nạp thành công</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {transactions
                        .filter((tx: any) => tx.type === 'top_up' && tx.status === 'completed')
                        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0)
                        .toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-full">
                    <CreditCard className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-2 h-fit">
                <button
                  onClick={() => {
                    fetchTransactions()
                    fetchUsers()
                  }}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-2"
                  title="Làm mới dữ liệu"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Làm mới</span>
                </button>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'purchase', label: 'Mua hàng' },
                  { id: 'pending', label: 'Chờ duyệt' },
                  { id: 'completed', label: 'Thành công' },
                  { id: 'expired', label: 'Hết hạn' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setTransactionFilter(filter.id as any)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${transactionFilter === filter.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions
                    .filter((tx) => {
                      if (transactionFilter === 'all') return true
                      if (transactionFilter === 'purchase') return tx.type === 'purchase'

                      const createdAt = new Date(tx.created_at).getTime()
                      const now = new Date().getTime()
                      const isExpired = tx.status === 'pending' && (now - createdAt > 15 * 60 * 1000)

                      if (transactionFilter === 'pending') return tx.status === 'pending' && !isExpired
                      if (transactionFilter === 'completed') return tx.status === 'completed'
                      if (transactionFilter === 'expired') return isExpired
                      return true
                    })
                    .map((tx) => {
                      const createdAt = new Date(tx.created_at).getTime()
                      const now = new Date().getTime()
                      const isExpired = tx.status === 'pending' && (now - createdAt > 15 * 60 * 1000)
                      const isPurchase = tx.type === 'purchase'
                      const isExpanded = expandedOrders.has(tx.id)
                      const guideUrl = tx.metadata?.guide_url || tx.product_variants?.guide_url || tx.product_variants?.products?.guide_url

                      const toggleExpand = () => {
                        setExpandedOrders(prev => {
                          const next = new Set(prev)
                          if (next.has(tx.id)) {
                            next.delete(tx.id)
                          } else {
                            next.add(tx.id)
                          }
                          return next
                        })
                      }

                      return (
                        <React.Fragment key={tx.id}>
                          <tr className={`${isPurchase ? 'cursor-pointer hover:bg-gray-50' : ''} ${isExpanded ? 'bg-blue-50' : ''}`}
                            onClick={isPurchase ? toggleExpand : undefined}>
                            <td className="px-3 py-4 whitespace-nowrap">
                              {isPurchase && (
                                <button className="text-gray-400 hover:text-gray-600 p-1">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{tx.users?.full_name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{tx.users?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {tx.amount.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {tx.type === 'top_up' ? (
                                'Nạp tiền'
                              ) : (
                                <div>
                                  <span className="block font-medium text-purple-600">Mua hàng</span>
                                  <span className="text-xs text-gray-400">
                                    {tx.product_variants?.products?.name} - {tx.product_variants?.name}
                                  </span>
                                  {tx.metadata?.quantity_in_order > 1 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                      #{tx.metadata?.order_index}/{tx.metadata?.quantity_in_order}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                                isExpired ? 'bg-gray-100 text-gray-400' :
                                  tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {tx.status === 'completed' ? 'Thành công' :
                                  isExpired ? 'Hết hạn' :
                                    tx.status === 'pending' ? 'Chờ duyệt' :
                                      'Thất bại'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(tx.created_at).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                              {tx.status === 'pending' && !isExpired && tx.type === 'top_up' && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleApproveTransaction(tx)}
                                    className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-full"
                                    title="Duyệt"
                                  >
                                    <Check className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectTransaction(tx)}
                                    className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-full"
                                    title="Từ chối"
                                  >
                                    <CloseIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Order Details */}
                          {isPurchase && isExpanded && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50">
                                <div className="ml-8 space-y-3">
                                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-purple-600" />
                                    Chi tiết đơn hàng
                                  </h4>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Product Info */}
                                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                                      <p className="text-xs text-gray-500 mb-1">Sản phẩm</p>
                                      <p className="font-semibold text-gray-900">{tx.product_variants?.products?.name || 'N/A'}</p>
                                    </div>

                                    {/* Variant Info */}
                                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                                      <p className="text-xs text-gray-500 mb-1">Gói sản phẩm</p>
                                      <p className="font-semibold text-gray-900">{tx.product_variants?.name || 'N/A'}</p>
                                    </div>

                                    {/* Key Info */}
                                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                                      <p className="text-xs text-gray-500 mb-1">Key đã bán</p>
                                      <div className="flex items-center gap-2">
                                        <Key className="h-4 w-4 text-purple-500" />
                                        <code className="font-mono text-sm text-gray-800 truncate flex-1">
                                          {tx.product_keys?.key_value || 'N/A'}
                                        </code>
                                        {tx.product_keys?.key_value && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              navigator.clipboard.writeText(tx.product_keys?.key_value)
                                              alert('Đã copy key!')
                                            }}
                                            className="text-gray-400 hover:text-blue-600 p-1"
                                            title="Copy Key"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Pricing Info */}
                                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                                      <p className="text-xs text-gray-500 mb-1">Thông tin thanh toán</p>
                                      <div className="space-y-1">
                                        <p className="text-sm">
                                          <span className="text-gray-500">Số tiền:</span>{' '}
                                          <span className="font-bold text-red-600">{Math.abs(tx.amount).toLocaleString('vi-VN')}đ</span>
                                        </p>
                                        {tx.metadata?.original_price && tx.metadata.original_price !== Math.abs(tx.amount) && (
                                          <p className="text-sm">
                                            <span className="text-gray-500">Giá gốc:</span>{' '}
                                            <span className="text-gray-400 line-through">{tx.metadata.original_price.toLocaleString('vi-VN')}đ</span>
                                          </p>
                                        )}
                                        {tx.metadata?.referral_discount_applied && (
                                          <p className="text-sm flex items-center gap-1">
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                              Giảm giá giới thiệu đã áp dụng
                                            </span>
                                          </p>
                                        )}
                                        {tx.metadata?.quantity_in_order > 1 && (
                                          <p className="text-sm">
                                            <span className="text-gray-500">Trong đơn hàng:</span>{' '}
                                            <span className="font-medium">{tx.metadata.order_index} / {tx.metadata.quantity_in_order} sản phẩm</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Guide URL */}
                                    {guideUrl && (
                                      <div className="bg-white rounded-lg p-4 shadow-sm border">
                                        <p className="text-xs text-gray-500 mb-1">Hướng dẫn sử dụng</p>
                                        <a
                                          href={guideUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                          <span className="truncate">{guideUrl}</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Settings Tab */}
      {activeTab === 'ranks' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-6">Quản lý hạng người dùng</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* User Ranks Overview */}
            <div className="border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Các hạng hiện tại</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-600">Đồng</span>
                    <p className="text-sm text-gray-500">Giảm giá: 0%</p>
                  </div>
                  <span className="text-sm text-gray-500">0 - 4 người giới thiệu</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-600">Bạc</span>
                    <p className="text-sm text-gray-500">Giảm giá: 2%</p>
                  </div>
                  <span className="text-sm text-gray-500">5 - 9 người giới thiệu</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-600">Vàng</span>
                    <p className="text-sm text-gray-500">Giảm giá: 4%</p>
                  </div>
                  <span className="text-sm text-gray-500">10 - 19 người giới thiệu</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-600">Platinum</span>
                    <p className="text-sm text-gray-500">Giảm giá: 6%</p>
                  </div>
                  <span className="text-sm text-gray-500">20 - 49 người giới thiệu</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-600">Kim cương</span>
                    <p className="text-sm text-gray-500">Giảm giá: 8%</p>
                  </div>
                  <span className="text-sm text-gray-500">50+ người giới thiệu</span>
                </div>
              </div>
            </div>

            {/* Referral Commission Settings */}
            <div className="border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg">Cài đặt hoa hồng</h3>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Hoa hồng giới thiệu: 1%</p>
                  <p className="text-xs text-blue-600 mt-1">Mỗi người giới thiệu sẽ nhận 1% hoa hồng từ giao dịch của họ</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Giảm giá người được giới thiệu: 5%</p>
                  <p className="text-xs text-green-600 mt-1">Người được giới thiệu sẽ được giảm 5% khi mua hàng</p>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Lưu ý:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Hoa hồng tối đa: 10%</li>
                    <li>• Giảm giá hạng tối đa: 8%</li>
                    <li>• Các loại giảm giá được cộng dồn</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* User Rank Management */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Quản lý hạng người dùng
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người giới thiệu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạng hiện tại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảm giá</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => {
                    const referralCount = user.referral_count || 0
                    const currentRank = user.rank || 'bronze'
                    const rankDiscount = currentRank === 'silver' ? 2 :
                      currentRank === 'gold' ? 4 :
                        currentRank === 'platinum' ? 6 :
                          currentRank === 'diamond' ? 8 : 0

                    return (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{user.username || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{referralCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentRank === 'bronze' ? 'bg-orange-100 text-orange-800' :
                            currentRank === 'silver' ? 'bg-gray-100 text-gray-800' :
                              currentRank === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                currentRank === 'platinum' ? 'bg-blue-100 text-blue-800' :
                                  'bg-purple-100 text-purple-800'
                            }`}>
                            {currentRank === 'bronze' ? 'Đồng' :
                              currentRank === 'silver' ? 'Bạc' :
                                currentRank === 'gold' ? 'Vàng' :
                                  currentRank === 'platinum' ? 'Platinum' : 'Kim cương'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rankDiscount}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <select
                            value={currentRank}
                            onChange={(e) => updateUserRank(user.id, e.target.value as User['rank'])}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="bronze">Đồng</option>
                            <option value="silver">Bạc</option>
                            <option value="gold">Vàng</option>
                            <option value="platinum">Platinum</option>
                            <option value="diamond">Kim cương</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {
        activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Cuộc trò chuyện</h3>
              <div className="space-y-2">
                {chatUsers.map((chatUser) => (
                  <button
                    key={chatUser.id}
                    onClick={() => setSelectedUser(chatUser)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedUser?.id === chatUser.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                      }`}
                  >
                    <div className="font-medium">{chatUser.full_name || 'Người dùng'}</div>
                    <div className="text-xs opacity-70">{chatUser.username || chatUser.email}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col h-96">
              {selectedUser ? (
                <>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">{selectedUser.full_name || 'Người dùng'}</h3>
                    <p className="text-xs text-gray-500">{selectedUser.username || selectedUser.email}</p>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg ${message.is_admin ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
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
        )
      }

      {/* Bank Config Tab */}
      {
        activeTab === 'bank' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Cấu hình Ngân hàng</h2>
              <button
                onClick={() => {
                  setEditingBankConfig(null)
                  setShowBankModal(true)
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm Ngân hàng</span>
              </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngân hàng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tài khoản</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chủ tài khoản</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bankConfigs.map((config) => (
                    <tr key={config.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{config.bank_id}</div>
                        <div className="text-sm text-gray-500">{config.bank_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {config.account_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {config.account_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleActivateBankConfig(config.id)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${config.is_active
                            ? 'bg-green-100 text-green-800 border-green-200 cursor-default'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                            }`}
                          disabled={config.is_active}
                        >
                          {config.is_active ? 'Đang dùng' : 'Kích hoạt'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingBankConfig(config)
                              setShowBankModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBankConfig(config.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bankConfigs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Chưa có thông tin ngân hàng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <form onSubmit={handleSaveBankConfig} className="p-6">
              <h3 className="text-lg font-semibold mb-4">{editingBankConfig ? 'Sửa' : 'Thêm'} thông tin ngân hàng</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mã Ngân hàng (Bank ID)</label>
                  <select
                    name="bank_id"
                    defaultValue={editingBankConfig?.bank_id}
                    onChange={(e) => {
                      const bank = VIETNAM_BANKS.find(b => b.id === e.target.value)
                      if (bank) {
                        const nameInput = (e.target.form as HTMLFormElement).elements.namedItem('bank_name') as HTMLInputElement
                        const codeInput = (e.target.form as HTMLFormElement).elements.namedItem('napas_code') as HTMLInputElement
                        if (nameInput) nameInput.value = bank.name
                        if (codeInput) codeInput.value = bank.code
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">Chọn ngân hàng</option>
                    {VIETNAM_BANKS.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.id} - {bank.name}</option>
                    ))}
                  </select>
                  <input type="hidden" name="napas_code" defaultValue={editingBankConfig?.napas_code} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tên Ngân hàng</label>
                  <input
                    name="bank_name"
                    type="text"
                    defaultValue={editingBankConfig?.bank_name}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                    placeholder="VD: MB Bank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số tài khoản</label>
                  <input
                    name="account_number"
                    type="text"
                    defaultValue={editingBankConfig?.account_number}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tên chủ tài khoản</label>
                  <input
                    name="account_name"
                    type="text"
                    defaultValue={editingBankConfig?.account_name}
                    onChange={(e) => {
                      const input = e.target;
                      const start = input.selectionStart;
                      const end = input.selectionEnd;
                      input.value = removeVietnameseTones(input.value);
                      input.setSelectionRange(start, end);
                    }}
                    className="w-full px-3 py-2 border rounded-md font-mono"
                    required
                    placeholder="VIET HOA KHONG DAU"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    name="is_active"
                    type="checkbox"
                    id="is_active"
                    defaultChecked={editingBankConfig?.is_active}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Đặt làm mặc định
                  </label>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBankModal(false)
                    setEditingBankConfig(null)
                  }}
                  className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            </form>
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

      {/* Adjust Balance Modal */}
      {showAdjustBalanceModal && adjustingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h3 className="text-xl font-bold">Điều chỉnh số dư</h3>
              </div>
              <button
                onClick={() => {
                  setShowAdjustBalanceModal(false)
                  setAdjustingUser(null)
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Đóng"
              >
                <CloseIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Người dùng</p>
                  <p className="font-bold text-gray-900 truncate max-w-[250px]">{adjustingUser.email}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="text-sm font-medium text-blue-800">Số dư hiện tại</span>
                <span className="text-lg font-black text-blue-700">{adjustingUser.balance?.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <form onSubmit={handleAdjustBalance} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số tiền điều chỉnh (VNĐ)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="amount"
                    required
                    step="1000"
                    placeholder="VD: 50000 hoặc -50000"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl font-bold transition-all outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold">đ</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium flex items-center gap-1">
                  💡 Sử dụng dấu trừ (-) để trừ tiền khỏi tài khoản
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú điều chỉnh</label>
                <input
                  type="text"
                  name="note"
                  placeholder="VD: Khuyến mãi, Hoàn tiền đơn hàng..."
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl transition-all outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustBalanceModal(false)
                    setAdjustingUser(null)
                  }}
                  className="flex-1 px-4 py-4 border-2 border-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    </div >
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
    category: 'software',
    guide_url: ''
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
        category: product.category || 'software',
        guide_url: product.guide_url || ''
      })
    } else {
      setFormData({
        name: '',
        mechanism: '',
        recommended_model: '',
        strengths: '',
        weaknesses: '',
        image_url: '',
        category: 'software',
        guide_url: ''
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
      alert('Đã lưu sản phẩm thành công!')
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert('Có lỗi xảy ra khi lưu sản phẩm: ' + (error.message || 'Lỗi không xác định'))
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
                placeholder="https://example.com/image.jpg"
              />
              {formData.image_url && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Xem trước:</p>
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="h-32 w-auto object-contain rounded-md border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
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
            <div>
              <label className="block text-sm font-medium mb-1">Link hướng dẫn cài đặt (Google Doc)</label>
              <input
                type="text"
                value={formData.guide_url}
                onChange={(e) => setFormData({ ...formData, guide_url: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://docs.google.com/document/d/..."
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

function VariantModal({ isOpen, onClose, product, variant, onSave }: any) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    discount_percent: 0,
    duration_days: 0,
    description: '',
    guide_url: ''
  })

  useEffect(() => {
    if (variant) {
      setFormData({
        name: variant.name || '',
        price: variant.price || 0,
        discount_percent: variant.discount_percent || 0,
        duration_days: variant.duration_days || 0,
        description: variant.description || '',
        guide_url: variant.guide_url || ''
      })
    } else {
      setFormData({
        name: '',
        price: 0,
        discount_percent: 0,
        duration_days: 0,
        description: '',
        guide_url: ''
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
      alert('Đã lưu biến thể thành công!')
    } catch (error: any) {
      console.error('Error saving variant:', error)
      alert('Có lỗi xảy ra khi lưu biến thể: ' + (error.message || 'Lỗi không xác định'))
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
                step="1000"
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
            <div>
              <label className="block text-sm font-medium mb-1">Link hướng dẫn riêng cho gói này (tùy chọn)</label>
              <input
                type="text"
                value={formData.guide_url}
                onChange={(e) => setFormData({ ...formData, guide_url: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://docs.google.com/document/d/..."
              />
              <p className="text-xs text-gray-500 mt-1 italic">Để trống nếu dùng chung hướng dẫn của sản phẩm</p>
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

  const [isManualDelivery, setIsManualDelivery] = useState(false)
  const [manualStock, setManualStock] = useState(0)

  useEffect(() => {
    if (variant && isOpen) {
      fetchKeys()
      setIsManualDelivery(variant.is_manual_delivery || false)
      setManualStock(variant.manual_stock || 0)
    }
  }, [variant, isOpen])

  const handleUpdateManualStock = async () => {
    if (!variant) return
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ manual_stock: manualStock })
        .eq('id', variant.id)

      if (error) throw error
      alert('Đã cập nhật số lượng tồn kho!')
      onSave()
    } catch (error: any) {
      alert('Lỗi cập nhật: ' + error.message)
    }
  }

  const handleToggleManualDelivery = async () => {
    if (!variant) return
    const newValue = !isManualDelivery
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ is_manual_delivery: newValue })
        .eq('id', variant.id)

      if (error) throw error
      setIsManualDelivery(newValue)
      onSave()
    } catch (error: any) {
      alert('Lỗi cập nhật: ' + error.message)
    }
  }

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
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <h4 className="font-semibold text-orange-900">Giao hàng bằng Mã đơn</h4>
                <p className="text-sm text-orange-800 mt-1">
                  Hệ thống sẽ gửi Mã đơn hàng cho khách. Bạn cần gửi key thủ công qua tin nhắn sau khi kiểm tra.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isManualDelivery}
                  onChange={handleToggleManualDelivery}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>

          {isManualDelivery ? (
            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng tồn kho (Manual Stock)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={manualStock}
                  onChange={(e) => setManualStock(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                  min="0"
                  placeholder="Nhập số lượng..."
                />
                <button
                  onClick={handleUpdateManualStock}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium whitespace-nowrap"
                >
                  Cập nhật Stock
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Số lượng này sẽ tự động giảm khi có người mua. Khi về 0, sản phẩm sẽ báo hết hàng.
              </p>
            </div>
          ) : (
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
          )}

          {loading ? (
            <div className="text-center py-4">Đang tải...</div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-2">Tổng: {keys.length} keys ({keys.filter(k => !k.is_used).length} chưa dùng)</p>
              {keys.map((key) => (
                <div key={key.id} className={`flex justify-between items-center p-3 border rounded ${key.is_used ? 'bg-gray-50' : 'bg-white'
                  }`}>
                  <div className="flex-1">
                    <code className="text-sm font-mono">{key.key_value}</code>
                    <span className={`ml-3 text-xs px-2 py-1 rounded ${key.is_used ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
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
