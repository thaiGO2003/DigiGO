import { useState, useEffect } from 'react'
import { ShoppingBag, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function RecentPurchasesNotification() {
  const [isVisible, setIsVisible] = useState(false)
  const [notification, setNotification] = useState<{ name: string; product: string; time: string } | null>(null)
  const [progress, setProgress] = useState(100)
  const [isDesktop, setIsDesktop] = useState(false)
  const [pool, setPool] = useState<{ users: string[], products: string[] }>({ users: [], products: [] })

  // Only run on desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024) // lg breakpoint
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Fetch real data pool
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.rpc('get_notification_entities')
        if (!error && data) {
          // data is { users: string[], products: string[] }
          // If RPC returns null/empty for some reason, fallback to empty arrays
          setPool({
            users: (data as any).users || [],
            products: (data as any).products || []
          })
        }
      } catch (err) {
        console.error('Failed to fetch notification entities:', err)
      }
    }

    if (isDesktop) {
        fetchData()
    }
  }, [isDesktop])

  // Progress bar logic
  useEffect(() => {
    if (isVisible && isDesktop) {
      const duration = 3000 // 3 seconds
      const intervalTime = 30
      const steps = duration / intervalTime
      const decrement = 100 / steps

      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(timer)
            return 0
          }
          return prev - decrement
        })
      }, intervalTime)

      return () => clearInterval(timer)
    }
  }, [isVisible, isDesktop])

  useEffect(() => {
    if (!isDesktop) return
    // Only start cycle if we have data
    if (pool.users.length === 0 || pool.products.length === 0) return

    let showTimeoutId: number | undefined
    let hideTimeoutId: number | undefined

    const cycle = () => {
      const randomDelay = 5000 + Math.random() * 10000
      showTimeoutId = window.setTimeout(() => {
        const name = pool.users[Math.floor(Math.random() * pool.users.length)]
        const product = pool.products[Math.floor(Math.random() * pool.products.length)]
        
        // Random time text
        const times = ['vừa xong', '1 phút trước', '2 phút trước', '5 phút trước', 'vừa mua']
        const time = times[Math.floor(Math.random() * times.length)]

        setNotification({ name, product, time })
        setIsVisible(true)
        setProgress(100)

        hideTimeoutId = window.setTimeout(() => {
          setIsVisible(false)
          cycle()
        }, 3000)
      }, randomDelay)
    }

    cycle()

    return () => {
      if (showTimeoutId !== undefined) window.clearTimeout(showTimeoutId)
      if (hideTimeoutId !== undefined) window.clearTimeout(hideTimeoutId)
    }
  }, [isDesktop, pool])


  if (!isDesktop || !isVisible || !notification) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-fade-in-up">
      <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden w-80 relative">
        <div className="p-3 flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium truncate">
                    <span className="font-bold">{notification.name}</span> vừa mua
                </p>
                <p className="text-sm text-blue-600 font-bold truncate">{notification.product}</p>
                <p className="text-xs text-gray-400 mt-0.5">{notification.time}</p>
            </div>
            <button 
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100 absolute bottom-0 left-0">
            <div 
                className="h-full bg-blue-500 transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
            />
        </div>
      </div>
    </div>
  )
}
