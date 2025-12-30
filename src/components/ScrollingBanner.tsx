import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

type BannerSettings = {
  enabled: boolean
  text: string
  speed: number
  position: 'top' | 'bottom'
  height: number
  opacity: number
  closable: boolean
  autoHide: boolean
  autoHideDelay: number
}

const DEFAULT_SETTINGS: BannerSettings = {
  enabled: true,
  text: '',
  speed: 12,
  position: 'top',
  height: 40,
  opacity: 1,
  closable: true,
  autoHide: false,
  autoHideDelay: 10,
}

export default function ScrollingBanner() {
  const [config, setConfig] = useState<BannerSettings | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('global_settings')
          .select('value')
          .eq('key', 'marquee_banner')
          .maybeSingle()
        const value = (data as any)?.value as BannerSettings | undefined
        if (mounted) {
          if (value && typeof value === 'object') {
            setConfig({
              enabled: value.enabled ?? DEFAULT_SETTINGS.enabled,
              text: value.text || '',
              speed: Number(value.speed) || DEFAULT_SETTINGS.speed,
              position: value.position === 'bottom' ? 'bottom' : 'top',
              height: Number(value.height) || DEFAULT_SETTINGS.height,
              opacity: Number(value.opacity) >= 0 ? Number(value.opacity) : DEFAULT_SETTINGS.opacity,
              closable: value.closable ?? DEFAULT_SETTINGS.closable,
              autoHide: value.autoHide ?? DEFAULT_SETTINGS.autoHide,
              autoHideDelay: Number(value.autoHideDelay) || DEFAULT_SETTINGS.autoHideDelay,
            })
          } else {
            setConfig(null)
          }
          setLoaded(true)
        }
      } catch {
        if (mounted) { setConfig(null); setLoaded(true) }
      }
    }
    fetchConfig()
    
    // Subscribe to changes
    const channel = supabase
      .channel('public:global_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'global_settings', filter: "key=eq.marquee_banner" }, (payload) => {
        const newValue = payload.new.value as BannerSettings
        if (newValue) {
            setConfig({
              enabled: newValue.enabled ?? DEFAULT_SETTINGS.enabled,
              text: newValue.text || '',
              speed: Number(newValue.speed) || DEFAULT_SETTINGS.speed,
              position: newValue.position === 'bottom' ? 'bottom' : 'top',
              height: Number(newValue.height) || DEFAULT_SETTINGS.height,
              opacity: Number(newValue.opacity) >= 0 ? Number(newValue.opacity) : DEFAULT_SETTINGS.opacity,
              closable: newValue.closable ?? DEFAULT_SETTINGS.closable,
              autoHide: newValue.autoHide ?? DEFAULT_SETTINGS.autoHide,
              autoHideDelay: Number(newValue.autoHideDelay) || DEFAULT_SETTINGS.autoHideDelay,
            })
            setIsVisible(true) // Re-show on update
        }
      })
      .subscribe()

    return () => { 
        mounted = false 
        supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (config?.autoHide && isVisible && config.autoHideDelay > 0) {
        const timer = setTimeout(() => {
            setIsVisible(false)
        }, config.autoHideDelay * 1000)
        return () => clearTimeout(timer)
    }
  }, [config, isVisible])

  if (!loaded) return null
  if (!config || !config.enabled || !config.text) return null
  if (!isVisible) return null

  const isTop = config.position !== 'bottom'
  
  // Style for fixed positioning if bottom, or just normal flow/sticky handling if top?
  // The user requirement says "Tùy chọn vị trí hiển thị (trên cùng/dưới cùng)"
  // Usually bottom banner is fixed. Top banner can be fixed or static.
  // Since it's replacing a static banner in Header, let's make it sticky or static at top, 
  // OR fixed if user wants it always visible.
  // Given "banner thông báo", fixed is common.
  
  const positionClasses = isTop 
    ? 'sticky top-[64px] z-40 shadow-sm' // Header is sticky top-0 h-16 (64px). So this sits below header.
    : 'fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]'

  return (
    <div 
        className={`w-full bg-yellow-300 text-black transition-all duration-500 ease-in-out overflow-hidden ${positionClasses}`}
        style={{ 
            height: `${config.height}px`,
            opacity: config.opacity,
            display: isVisible ? 'flex' : 'none'
        }}
    >
      <div className="w-full relative h-full flex items-center">
        <div className="flex-1 overflow-hidden h-full flex items-center">
            <div 
                className="whitespace-nowrap animate-marquee"
                style={{ 
                    animationDuration: `${config.speed}s`,
                    paddingLeft: '100%'
                }}
            >
                {config.text}
            </div>
        </div>
        
        {config.closable && (
            <button 
                onClick={() => setIsVisible(false)}
                className="absolute right-4 z-10 p-1 bg-yellow-300/80 hover:bg-yellow-400 rounded-full transition-colors shadow-sm"
                title="Đóng thông báo"
            >
                <X className="h-5 w-5" />
            </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee linear infinite;
        }
      `}} />
    </div>
  )
}

