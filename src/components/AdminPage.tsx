import React, { useState, useEffect, useRef } from 'react'
import { BarChart2, Package, Users, MessageCircle, CreditCard, Landmark, Wrench, ShoppingCart, Settings } from 'lucide-react'
import { supabase, Product, ProductVariant, User, ChatMessage, BankConfig } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Import admin components
import {
  ProductsTab,
  UsersTab,
  TransactionsTab,
  ChatTab,
  BankTab,
  ProductModal,
  VariantModal,
  KeyModal,
  BankModal,
  AdjustBalanceModal,
  AdminTabType,
  TransactionFilter,
  removeVietnameseTones,
  StatsTab,
  UtilitiesTab,
  ImportTab,
  SettingsTab
} from './admin'
export default function AdminPage() {
  const { user } = useAuth()
  const isAdmin = user?.email?.toLowerCase() === 'luongquocthai.thaigo.2003@gmail.com' || user?.is_admin

  // Tab state
  const [activeTab, setActiveTab] = useState<AdminTabType>('stats')

  const tabs = [
    { id: 'stats', label: 'Thống kê', icon: BarChart2 },
    { id: 'products', label: 'Sản phẩm', icon: Package },
    { id: 'users', label: 'Người dùng', icon: Users },
    { id: 'chat', label: 'Chat hỗ trợ', icon: MessageCircle },
    { id: 'transactions', label: 'Giao dịch', icon: CreditCard },
    { id: 'bank', label: 'Ngân hàng', icon: Landmark },
    { id: 'utilities', label: 'Tiện ích', icon: Wrench },
    { id: 'import', label: 'Nhập hàng', icon: ShoppingCart },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ]

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && tabs.some(t => t.id === hash)) {
      setActiveTab(hash as AdminTabType)
    }
  }, [])

  const handleTabClick = (tabId: AdminTabType) => {
    setActiveTab(tabId)
    window.location.hash = tabId
  }

  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [chatUsers, setChatUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all')
  const [transactionDateFilter, setTransactionDateFilter] = useState<{ start: string, end: string } | null>(null)
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
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.7
  }, [])

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
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [activeTab, selectedUser])

  const fetchProducts = async () => {
    let data: Product[] | null = null
    
    // Try RPC first
    const rpcResponse = await supabase.rpc('get_products_with_variants')
    if (rpcResponse.error) {
      console.warn('RPC get_products_with_variants failed, falling back to standard select:', rpcResponse.error)
      const selectResponse = await supabase
        .from('products')
        .select('*, variants:product_variants(*)')
        .order('created_at', { ascending: false })
      data = selectResponse.data as Product[]
    } else {
      data = rpcResponse.data as Product[]
    }

    const raw = (data || []) as Product[]
    const sorted = [...raw].sort((a, b) => {
      const orderA = a.sort_order ?? 999999
      const orderB = b.sort_order ?? 999999
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const needsBackfill = sorted.some(p => p.sort_order === null || p.sort_order === undefined)
    if (needsBackfill && sorted.length > 0) {
      const withOrder = sorted.map((p, index) => ({ ...p, sort_order: index }))
      setProducts(withOrder)
      // Only attempt to update if we can (if columns exist). 
      // If RPC failed due to missing columns, this update might also fail, but we catch it or ignore.
      // We don't want to crash here.
      try {
        await Promise.all(
          withOrder.map(p => supabase.from('products').update({ sort_order: p.sort_order }).eq('id', p.id))
        )
      } catch (e) {
        console.error('Failed to backfill sort_order:', e)
      }
      return
    }

    // Sort variants for each product
    const productsWithSortedVariants = sorted.map(p => {
        if (!p.variants) return p
        const sortedVariants = [...p.variants].sort((a, b) => {
            const orderA = a.sort_order ?? 999999
            const orderB = b.sort_order ?? 999999
            if (orderA !== orderB) return orderA - orderB
            return a.price - b.price
        })
        return { ...p, variants: sortedVariants }
    })

    setProducts(productsWithSortedVariants)
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

    if (selectedUser && !uniqueUsers.find((u: any) => u.id === selectedUser.id)) {
      uniqueUsers.unshift(selectedUser)
    }
    
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
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages(prev => [...prev, newMsg])
          if (!newMsg.is_admin) {
             audioRef.current?.play().catch((err: any) => console.log('Audio play failed:', err))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, users(email, full_name, username, balance, is_admin), product_variants(name, products(*)), product_keys(*)')
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

  const handleToggleHot = async (product: Product) => {
    const nextValue = !product.is_hot
    setProducts(prev => prev.map(p => (p.id === product.id ? { ...p, is_hot: nextValue } : p)))
    const { error } = await supabase.from('products').update({ is_hot: nextValue }).eq('id', product.id)
    if (error) fetchProducts()
  }

  const handleMoveProduct = async (product: Product, direction: 'up' | 'down') => {
    const currentIndex = products.findIndex(p => p.id === product.id)
    if (currentIndex === -1) return
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === products.length - 1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const targetProduct = products[targetIndex]

    const newProducts = [...products]
    newProducts[currentIndex] = { ...targetProduct, sort_order: currentIndex }
    newProducts[targetIndex] = { ...product, sort_order: targetIndex }
    setProducts(newProducts)

    const { error } = await supabase.from('products').update({ sort_order: targetIndex }).eq('id', product.id)
    const { error: error2 } = await supabase.from('products').update({ sort_order: currentIndex }).eq('id', targetProduct.id)
    if (error || error2) fetchProducts()
  }
  
  const handleReorderProducts = async (dragProductId: string, targetIndex: number) => {
    const currentIndex = products.findIndex(p => p.id === dragProductId)
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= products.length || targetIndex === currentIndex) return
    const reordered = [...products]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    const withOrder = reordered.map((p, idx) => ({ ...p, sort_order: idx }))
    setProducts(withOrder)
    try {
      await Promise.all(withOrder.map(p => supabase.from('products').update({ sort_order: p.sort_order }).eq('id', p.id)))
    } finally {
      fetchProducts()
    }
  }

  const handleMoveVariant = async (product: Product, variant: ProductVariant, direction: 'up' | 'down') => {
    if (!product.variants) return

    // 1. Sort variants exactly how they are displayed in UI to find correct index
    const variants = [...product.variants].sort((a, b) => {
        const orderA = a.sort_order ?? 999999
        const orderB = b.sort_order ?? 999999
        if (orderA !== orderB) return orderA - orderB
        return a.price - b.price
    })

    const currentIndex = variants.findIndex(v => v.id === variant.id)
    
    if (currentIndex === -1) return
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === variants.length - 1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    // 2. Calculate new sort_order for ALL variants (re-index to 0, 1, 2...)
    // This handles the swap AND fixes any missing/null sort_orders
    const updates = variants.map((v, idx) => {
        let newSortOrder = idx
        if (idx === currentIndex) newSortOrder = targetIndex
        else if (idx === targetIndex) newSortOrder = currentIndex
        
        return {
            id: v.id,
            sort_order: newSortOrder
        }
    })

    // 3. Optimistic Update (Update UI immediately)
    const updatedVariants = variants.map(v => {
        const update = updates.find(u => u.id === v.id)
        return update ? { ...v, sort_order: update.sort_order } : v
    }).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, variants: updatedVariants } : p
    ))

    // 4. Execute DB updates in background
    try {
        await Promise.all(updates.map(update => 
            supabase.from('product_variants').update({ sort_order: update.sort_order }).eq('id', update.id)
        ))
    } catch (error) {
        console.error('Error updating variant order:', error)
        fetchProducts() // Revert/Refresh on error
    }
    
    fetchProducts() // Fetch to ensure consistency
  }

  const handleDeleteVariant = async (id: string) => {
    if (!confirm('Xóa gói này?')) return
    await supabase.from('product_variants').delete().eq('id', id)
    fetchProducts()
  }
  
  const handleDuplicateVariant = async (product: Product, variant: ProductVariant) => {
    try {
      const nextOrder =
        (product.variants && product.variants.length > 0)
          ? Math.max(
              ...product.variants.map(v => (v.sort_order ?? 0))
            ) + 1
          : 0
      
      const payload: Partial<ProductVariant> & { product_id: string; name: string; price: number } = {
        product_id: product.id,
        name: `${variant.name} (copy)`,
        price: variant.price,
        cost_price: variant.cost_price,
        discount_percent: variant.discount_percent,
        duration_days: variant.duration_days,
        description: variant.description,
        stock: variant.stock,
        guide_url: variant.guide_url,
        is_manual_delivery: variant.is_manual_delivery,
        manual_stock: variant.manual_stock,
        sort_order: nextOrder
      }
      
      await supabase.from('product_variants').insert([payload])
      fetchProducts()
    } catch (e) {
      console.error('Duplicate variant failed:', e)
      fetchProducts()
    }
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
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleChatWithUser = (user: User) => {
    setSelectedUser(user)
    setActiveTab('chat')
    window.location.hash = 'chat'
  }

  const handleNavigateToUser = (userId: string) => {
    setUserSearchTerm('')
    setActiveTab('users')
    window.location.hash = 'users'
    // Scroll to user after a short delay to allow tab switch
    setTimeout(() => {
      const userElement = document.getElementById(`user-${userId}`)
      if (userElement) {
        userElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        userElement.classList.add('ring-2', 'ring-blue-500')
        setTimeout(() => {
          userElement.classList.remove('ring-2', 'ring-blue-500')
        }, 2000)
      }
    }, 100)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bảng điều khiển Admin</h1>
        <div className="text-xs sm:text-sm text-gray-600">
          Xin chào, <span className="font-semibold">{user?.full_name || user?.email}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 sm:mb-8 border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto scrollbar-hide pb-px">
          <div className="flex space-x-1 sm:space-x-2 min-w-max px-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as AdminTabType)}
                className={`py-2 px-2.5 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 whitespace-nowrap cursor-pointer transition-colors rounded-t-lg ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <StatsTab 
          onNavigateToTransactions={(date) => {
            setTransactionDateFilter({ start: date, end: date })
            setActiveTab('transactions')
            window.location.hash = 'transactions'
          }}
          onNavigateToProducts={(productId) => {
            setHighlightedProductId(productId)
            setActiveTab('products')
            window.location.hash = 'products'
          }}
        />
      )}

      {activeTab === 'products' && (
        <ProductsTab
          products={products}
          highlightedProductId={highlightedProductId}
          onAddProduct={() => { setEditingProduct(null); setShowProductModal(true) }}
          onEditProduct={(p) => { setEditingProduct(p); setShowProductModal(true) }}
          onDeleteProduct={handleDeleteProduct}
          onToggleHot={handleToggleHot}
          onMoveProduct={handleMoveProduct}
          onAddVariant={(p) => { setSelectedProduct(p); setSelectedVariant(null); setShowVariantModal(true) }}
          onEditVariant={(p, v) => { setSelectedProduct(p); setSelectedVariant(v); setShowVariantModal(true) }}
          onDeleteVariant={handleDeleteVariant}
          onDuplicateVariant={handleDuplicateVariant}
          onMoveVariant={handleMoveVariant}
          onManageKeys={(p, v) => { setSelectedProduct(p); setSelectedVariant(v); setShowKeyModal(true) }}
          onReorderProducts={handleReorderProducts}
        />
      )}

      {activeTab === 'users' && (
        <UsersTab
          users={users}
          currentUserId={user?.id}
          searchTerm={userSearchTerm}
          onSearchChange={setUserSearchTerm}
          onRefresh={fetchUsers}
          onAdjustBalance={(u) => { setAdjustingUser(u); setShowAdjustBalanceModal(true) }}
          onToggleAdmin={handleToggleAdmin}
          onToggleBan={handleToggleBan}
          onDeleteUser={handleDeleteUser}
          onUpdateRank={handleUpdateRank}
          onChat={handleChatWithUser}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionsTab
          transactions={transactions}
          transactionFilter={transactionFilter}
          dateFilter={transactionDateFilter}
          onFilterChange={setTransactionFilter}
          onDateFilterChange={setTransactionDateFilter}
          onRefresh={() => { fetchTransactions(); fetchUsers() }}
          onApprove={handleApproveTransaction}
          onReject={handleRejectTransaction}
          expandedOrders={expandedOrders}
          onToggleExpand={handleToggleExpand}
          onNavigateToUser={handleNavigateToUser}
        />
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

      {activeTab === 'utilities' && <UtilitiesTab />}
      {activeTab === 'import' && <ImportTab />}
      {activeTab === 'settings' && <SettingsTab />}

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
