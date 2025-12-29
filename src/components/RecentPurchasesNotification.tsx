import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type RecentPurchase = {
  customer_name: string
  product_name: string
  purchase_time: string
  price: number
}

function getRelativeTime(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} ngày trước`
  if (hours > 0) return `${hours} giờ trước`
  if (minutes > 0) return `${minutes} phút trước`
  return 'Vừa xong'
}

export default function RecentPurchasesNotification() {
  const [purchases, setPurchases] = useState<RecentPurchase[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    fetchPurchases()
    
    // Refresh data every 30 minutes
    const interval = setInterval(fetchPurchases, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (purchases.length === 0) return

    // Show notification cycle
    const showNext = () => {
      setIsVisible(true)
      // Hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false)
        // Move to next item after hidden
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % purchases.length)
          // Wait random time before showing next (e.g., 10-20 seconds)
          const randomDelay = Math.floor(Math.random() * 10000) + 10000
          timeoutId = setTimeout(showNext, randomDelay)
        }, 500) // Wait for fade out animation
      }, 5000)
    }

    // Start the cycle
    let timeoutId = setTimeout(showNext, 2000)

    return () => clearTimeout(timeoutId)
  }, [purchases])

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('recent-purchases')
      if (error) throw error
      if (Array.isArray(data) && data.length > 0) {
        setPurchases(data)
      }
    } catch (err) {
      console.error('Failed to fetch recent purchases:', err)
    }
  }

  if (purchases.length === 0) return null

  const current = purchases[currentIndex]

  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 transition-all duration-500 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
    >
      <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-4 max-w-sm flex items-start gap-3 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        
        <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {current.customer_name.charAt(0)}
            </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            <span className="text-blue-600">{current.customer_name}</span> vừa mua
          </p>
          <p className="text-sm text-gray-600 truncate font-medium">
            {current.product_name}
          </p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <span>{getRelativeTime(current.purchase_time)}</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">Đã xác nhận</span>
          </p>
        </div>
      </div>
    </div>
  )
}
