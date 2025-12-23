import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ShoppingBag, CreditCard, Gift, RotateCcw } from 'lucide-react'
import AuthModal from './AuthModal'
import ProfileSidebar from './profile/ProfileSidebar'
import ProfileUpdateForm from './profile/ProfileUpdateForm'
import TransactionHistory from './profile/TransactionHistory'
import ReferralTab from './profile/ReferralTab'

// Types (can be moved to a shared types file)
type TransactionWithDetails = {
  id: string
  created_at: string
  amount: number
  type: 'top_up' | 'purchase'
  status: 'pending' | 'completed' | 'failed'
  metadata?: {
    guide_url?: string
    quantity_in_order?: number
    order_index?: number
    referral_discount_applied?: boolean
    payment_method?: string
    transfer_content?: string
    is_manual_delivery?: boolean
  }
  product_variants?: {
    name: string
    guide_url?: string
    products?: {
      name: string
      guide_url?: string
    }
  }
  product_keys?: {
    key_value: string
  }
}

interface ReferralStats {
  totalReferrals: number
  monthlyEarnings: number
  totalEarnings: number
}

interface ReferredUser {
  id: string
  email: string
  full_name?: string
  created_at: string
}

export default function ProfilePage() {
  const { user, session, isInitializing, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'purchases' | 'topups' | 'referral'>('purchases')
  const tabs = [
    { id: 'purchases', label: 'Đơn đã mua', icon: ShoppingBag },
    { id: 'topups', label: 'Lịch sử nạp', icon: CreditCard },
    { id: 'referral', label: 'Giới thiệu bạn bè', icon: Gift },
  ]

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && ['purchases', 'topups', 'referral'].includes(hash)) {
      setActiveTab(hash as any)
    }
  }, [])

  const handleTabClick = (tabId: 'purchases' | 'topups' | 'referral') => {
    setActiveTab(tabId)
    window.location.hash = tabId
  }

  const handleRefresh = () => {
    if (activeTab === 'referral') {
      fetchReferralData()
    } else {
      fetchHistory()
    }
  }

  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Referral States
  const [referralStats, setReferralStats] = useState<ReferralStats>({ totalReferrals: 0, monthlyEarnings: 0, totalEarnings: 0 })
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [referralLoading, setReferralLoading] = useState(false)

  useEffect(() => {
    if (isInitializing) return

    if (!session) {
      setShowAuthModal(true)
      setLoading(false)
      return
    }

    setShowAuthModal(false)
    if (user) {
      if (activeTab === 'referral') {
        fetchReferralData()
      } else {
        fetchHistory()
      }
    }
  }, [user, session, activeTab, isInitializing])

  const fetchHistory = async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select(`*, product_variants(name, guide_url, products(*)), product_keys(*)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      query = activeTab === 'purchases' ? query.eq('type', 'purchase') : query.eq('type', 'top_up')

      const { data, error } = await query
      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReferralData = async () => {
    if (!user) return
    setReferralLoading(true)
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false })
      if (usersError) throw usersError
      setReferredUsers(usersData || [])

      const { data: earningsData, error: earningsError } = await supabase
        .from('referral_earnings')
        .select('amount, created_at')
        .eq('referrer_id', user.id)
      if (earningsError) throw earningsError

      const totalEarnings = (earningsData || []).reduce((sum, e) => sum + e.amount, 0)
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyEarnings = (earningsData || [])
        .filter(e => new Date(e.created_at) >= firstDayOfMonth)
        .reduce((sum, e) => sum + e.amount, 0)

      setReferralStats({ totalReferrals: usersData?.length || 0, monthlyEarnings, totalEarnings })
    } catch (error) {
      console.error('Error fetching referral data:', error)
    } finally {
      setReferralLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (!session || !user) {
    return (
      <>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Vui lòng đăng nhập để xem thông tin cá nhân</p>
        </div>
        {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      </>
    )
  }

  if (activeTab !== 'referral' && loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <ProfileSidebar user={user} copiedKey={copiedKey} onCopyToClipboard={copyToClipboard} />
          <ProfileUpdateForm user={user} onRefreshProfile={refreshProfile} />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Tabs */}
            <div className="border-b flex items-center justify-between pr-4 bg-gray-50">
              <div className="overflow-x-auto scrollbar-hide">
                <nav className="flex -mb-px min-w-max sm:min-w-0">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id as any)}
                      className={`py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap cursor-pointer transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-full hover:bg-white border border-transparent hover:border-gray-200 shadow-sm"
                title="Làm mới dữ liệu"
              >
                <RotateCcw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading || referralLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab !== 'referral' ? (
                <TransactionHistory transactions={transactions} />
              ) : (
                <ReferralTab
                  user={user}
                  referralStats={referralStats}
                  referredUsers={referredUsers}
                  loading={referralLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
