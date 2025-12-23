import { ShoppingBag, CreditCard, Gift } from 'lucide-react'

interface ProfileTabsProps {
  activeTab: 'purchases' | 'topups' | 'referral'
  onTabChange: (tabId: 'purchases' | 'topups' | 'referral') => void
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabs = [
    { id: 'purchases', label: 'Lịch sử mua hàng', icon: ShoppingBag },
    { id: 'topups', label: 'Lịch sử nạp tiền', icon: CreditCard },
    { id: 'referral', label: 'Chương trình giới thiệu', icon: Gift },
  ]

  return (
    <div className="border-b overflow-x-auto scrollbar-hide">
      <nav className="flex -mb-px min-w-max sm:min-w-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={`py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium border-b-2 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
