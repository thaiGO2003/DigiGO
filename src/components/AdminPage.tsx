import React, { useState, useEffect } from 'react'
import { Package, Users, MessageCircle, CreditCard, Landmark, Award } from 'lucide-react'
import { supabase, Product, ProductVariant, User, ChatMessage, BankConfig } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Import admin components
import {
  ProductsTab,
  UsersTab,
  TransactionsTab,
  RanksTab,
  ChatTab,
  BankTab,
  ProductModal,
  VariantModal,
  KeyModal,
  BankModal,
  AdjustBalanceModal,
  AdminTabType,
  TransactionFilter,
  removeVietnameseTones
} from './admin'

export default function AdminPage() {
  const { user } = useAuth()
  const isAdmin = user?.email?.toLowerCase() === 'luongquocthai.thaigo.2003@gmail.com' || user?.is_admin

  // Tab state
  const [activeTab, setActiveTab] = useState<AdminTabType>('products')

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [chatUsers, setChatUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all')
  const [bankConfigs, setBankConfigs] = useState<BankConfig[]>([])

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showBankModal, setShowBankModal] = useState(false)
  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState(false)

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [editingBankConfig, setEditingBankConfig] = useState<BankConfig | null>(null)
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  // ============= Data Fetching =============
  useEffect(() => {
    if (isAdmin) {
      fetchProducts()
      fetchUsers()
      fetchChatUsers()
      fetchTransactions()
      fetchBankConfigs()

      const channel = supabase
        .channel('admin-transactions-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          fetchTransactions()
          fetchUsers()
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
  }, [user, isAdmin])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id)
      const unsubscribe = subscribeToMessages(selectedUser.id)
      return unsubscribe
    }
  }, [selectedUser])

  useEffect(() => {
    if (activeTab === 'chat') {
      const interval = setInterval(() => {
        fetchChatUsers()
        if (selectedUser) fetchMessages(selectedUser.id)
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [activeTab, selectedUser])

  const fetchProducts = async () => {
    const { data } = await supabase.rpc('get_products_with_variants')
    setProducts(data || [])
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
  }

  const fetchChatUsers = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('user_id, users!chat_messages_user_id_fkey(id, email, full_name, username)')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })

    const uniqueUsers = data?.reduce((acc: any[], msg: any) => {
      const userData = msg.users
      if (!acc.find((u: any) => u.id === msg.user_id) && userData) acc.push(userData)
      return acc
    }, []) || []
    setChatUsers(uniqueUsers)
  }

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const subscribeToMessages = (userId: string) => {
    const channel = supabase
      .channel(`admin-chat:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${userId}` },
        (payload) => setMessages(prev => [...prev, payload.new as ChatMessage])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, users(email, full_name, balance), product_variants(name, products(name))')
      .order('created_at', { ascending: false })
    setTransactions(data || [])
  }

  const fetchBankConfigs = async () => {
    const { data } = await supabase.from('bank_configs').select('*').order('created_at', { ascending: false })
    setBankConfigs(data || [])
  }

  // ============= Handlers =============
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  const handleDeleteVariant = async (id: string) => {
    if (!confirm('Xóa gói này?')) return
    await supabase.from('product_variants').delete().eq('id', id)
    fetchProducts()
  }

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === user?.id) { alert('Bạn không thể tự gỡ quyền Admin!'); return }
    if (!confirm(`${currentStatus ? 'Gỡ' : 'Cấp'} quyền Admin?`)) return
    await supabase.from('users').update({ is_admin: !currentStatus }).eq('id', userId)
    fetchUsers()
  }

  const handleToggleBan = async (u: User) => {
    if (u.id === user?.id) { alert('Không thể khóa tài khoản của mình'); return }
    if (!confirm(`${u.is_banned ? 'Mở khóa' : 'Khóa'} tài khoản ${u.email}?`)) return
    await supabase.rpc('admin_toggle_ban_user', { p_user_id: u.id, p_status: !u.is_banned })
    fetchUsers()
  }

  const handleDeleteUser = async (u: User) => {
    if (u.id === user?.id) { alert('Không thể xóa tài khoản của mình'); return }
    if (!confirm(`XÓA VĨNH VIỄN ${u.email}?`)) return
    const confirmEmail = prompt(`Nhập lại email (${u.email}) để xác nhận:`)
    if (confirmEmail !== u.email) { alert('Email không khớp'); return }
    await supabase.rpc('admin_delete_user', { p_user_id: u.id })
    fetchUsers()
  }

  const handleUpdateRank = async (userId: string, rank: User['rank']) => {
    await supabase.from('users').update({ rank }).eq('id', userId)
    fetchUsers()
  }

  const handleApproveTransaction = async (tx: any) => {
    if (!confirm(`Duyệt nạp ${tx.amount.toLocaleString()}đ?`)) return
    const { data: userData } = await supabase.from('users').select('balance').eq('id', tx.user_id).single()
    await supabase.from('transactions').update({ status: 'completed' }).eq('id', tx.id)
    await supabase.from('users').update({ balance: (userData?.balance || 0) + tx.amount }).eq('id', tx.user_id)
    fetchTransactions()
    fetchUsers()
  }

  const handleRejectTransaction = async (tx: any) => {
    if (!confirm('Từ chối giao dịch?')) return
    await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx.id)
    fetchTransactions()
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser || !user) return
    await supabase.from('chat_messages').insert({
      user_id: selectedUser.id, admin_id: user.id, message: newMessage.trim(), is_admin: true
    })
    setNewMessage('')
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

    if (bankData.is_active) {
      await supabase.from('bank_configs').update({ is_active: false }).neq('id', editingBankConfig?.id || '')
    }

    if (editingBankConfig) {
      await supabase.from('bank_configs').update(bankData).eq('id', editingBankConfig.id)
    } else {
      await supabase.from('bank_configs').insert([bankData])
    }

    setShowBankModal(false)
    setEditingBankConfig(null)
    fetchBankConfigs()
  }

  const handleDeleteBankConfig = async (id: string) => {
    if (!confirm('Xóa ngân hàng này?')) return
    await supabase.from('bank_configs').delete().eq('id', id)
    fetchBankConfigs()
  }

  const handleActivateBankConfig = async (id: string) => {
    await supabase.from('bank_configs').update({ is_active: false }).neq('id', id)
    await supabase.from('bank_configs').update({ is_active: true }).eq('id', id)
    fetchBankConfigs()
  }

  const handleAdjustBalance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const amount = parseInt(formData.get('amount') as string)
    const note = formData.get('note') as string
    if (!adjustingUser || isNaN(amount)) return

    await supabase.rpc('admin_adjust_balance', { p_user_id: adjustingUser.id, p_amount: amount, p_note: note })
    setShowAdjustBalanceModal(false)
    setAdjustingUser(null)
    fetchUsers()
  }

  const handleToggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ============= Render =============
  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'products', label: 'Sản phẩm', icon: Package },
    { id: 'users', label: 'Người dùng', icon: Users },
    { id: 'chat', label: 'Chat hỗ trợ', icon: MessageCircle },
    { id: 'transactions', label: 'Giao dịch', icon: CreditCard },
    { id: 'bank', label: 'Ngân hàng', icon: Landmark },
    { id: 'ranks', label: 'Hạng', icon: Award },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển Admin</h1>
        <div className="text-sm text-gray-600">
          Xin chào, <span className="font-semibold">{user?.full_name || user?.email}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTabType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' && (
        <ProductsTab
          products={products}
          onAddProduct={() => { setEditingProduct(null); setShowProductModal(true) }}
          onEditProduct={(p) => { setEditingProduct(p); setShowProductModal(true) }}
          onDeleteProduct={handleDeleteProduct}
          onAddVariant={(p) => { setSelectedProduct(p); setSelectedVariant(null); setShowVariantModal(true) }}
          onEditVariant={(p, v) => { setSelectedProduct(p); setSelectedVariant(v); setShowVariantModal(true) }}
          onDeleteVariant={handleDeleteVariant}
          onManageKeys={(p, v) => { setSelectedProduct(p); setSelectedVariant(v); setShowKeyModal(true) }}
        />
      )}

      {activeTab === 'users' && (
        <UsersTab
          users={users}
          currentUserId={user?.id}
          onAdjustBalance={(u) => { setAdjustingUser(u); setShowAdjustBalanceModal(true) }}
          onToggleAdmin={handleToggleAdmin}
          onToggleBan={handleToggleBan}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionsTab
          transactions={transactions}
          transactionFilter={transactionFilter}
          onFilterChange={setTransactionFilter}
          onRefresh={() => { fetchTransactions(); fetchUsers() }}
          onApprove={handleApproveTransaction}
          onReject={handleRejectTransaction}
          expandedOrders={expandedOrders}
          onToggleExpand={handleToggleExpand}
        />
      )}

      {activeTab === 'ranks' && (
        <RanksTab users={users} onUpdateRank={handleUpdateRank} />
      )}

      {activeTab === 'chat' && (
        <ChatTab
          chatUsers={chatUsers}
          selectedUser={selectedUser}
          messages={messages}
          newMessage={newMessage}
          onSelectUser={setSelectedUser}
          onMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
        />
      )}

      {activeTab === 'bank' && (
        <BankTab
          bankConfigs={bankConfigs}
          onAddBank={() => { setEditingBankConfig(null); setShowBankModal(true) }}
          onEditBank={(c) => { setEditingBankConfig(c); setShowBankModal(true) }}
          onDeleteBank={handleDeleteBankConfig}
          onActivateBank={handleActivateBankConfig}
        />
      )}

      {/* Modals */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => { setShowProductModal(false); setEditingProduct(null) }}
        product={editingProduct}
        onSave={fetchProducts}
      />

      <VariantModal
        isOpen={showVariantModal}
        onClose={() => { setShowVariantModal(false); setSelectedProduct(null); setSelectedVariant(null) }}
        product={selectedProduct}
        variant={selectedVariant}
        onSave={fetchProducts}
      />

      <KeyModal
        isOpen={showKeyModal}
        onClose={() => { setShowKeyModal(false); setSelectedVariant(null) }}
        variant={selectedVariant}
        onSave={fetchProducts}
      />

      <BankModal
        isOpen={showBankModal}
        onClose={() => { setShowBankModal(false); setEditingBankConfig(null) }}
        bankConfig={editingBankConfig}
        onSave={handleSaveBankConfig}
      />

      <AdjustBalanceModal
        isOpen={showAdjustBalanceModal}
        onClose={() => { setShowAdjustBalanceModal(false); setAdjustingUser(null) }}
        user={adjustingUser}
        onSubmit={handleAdjustBalance}
      />
    </div>
  )
}
