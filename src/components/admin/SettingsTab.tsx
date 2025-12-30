import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, RefreshCw, X } from 'lucide-react'
import React from 'react'

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

export default function SettingsTab() {
  const [settings, setSettings] = useState<BannerSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'marquee_banner')
        .maybeSingle()
      if (error) throw error
      const value = (data as any)?.value as BannerSettings | undefined
      if (value && typeof value === 'object') {
        setSettings({
          enabled: value.enabled ?? DEFAULT_SETTINGS.enabled,
          text: value.text || '',
          speed: Number(value.speed) > 0 ? Number(value.speed) : DEFAULT_SETTINGS.speed,
          position: value.position === 'bottom' ? 'bottom' : 'top',
          height: Number(value.height) || DEFAULT_SETTINGS.height,
          opacity: Number(value.opacity) >= 0 ? Number(value.opacity) : DEFAULT_SETTINGS.opacity,
          closable: value.closable ?? DEFAULT_SETTINGS.closable,
          autoHide: value.autoHide ?? DEFAULT_SETTINGS.autoHide,
          autoHideDelay: Number(value.autoHideDelay) || DEFAULT_SETTINGS.autoHideDelay,
        })
      } else {
        setSettings(DEFAULT_SETTINGS)
      }
    } catch (e) {
      setMessage('Không tải được cài đặt, dùng mặc định.')
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const payload: BannerSettings = {
        enabled: settings.enabled,
        text: (settings.text || '').trim(),
        speed: settings.speed, // Keep for backward compat
        position: settings.position,
        height: settings.height,
        opacity: settings.opacity,
        closable: settings.closable,
        autoHide: settings.autoHide,
        autoHideDelay: settings.autoHideDelay,
      }
      const { error } = await supabase
        .from('global_settings')
        .upsert({
          key: 'marquee_banner',
          value: payload,
          updated_at: new Date().toISOString(),
        })
      if (error) throw error
      setMessage('Đã lưu cài đặt thông báo.')
    } catch (e) {
      setMessage('Lưu thất bại, vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Cài đặt thông báo nền vàng</h2>
          <button
            type="button"
            onClick={fetchSettings}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Tải lại
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-2">
            <input
              id="enabled"
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-gray-800">
              Bật thông báo
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung thông báo</label>
            <input
              type="text"
              value={settings.text}
              onChange={(e) => setSettings((s) => ({ ...s, text: e.target.value }))}
              placeholder="Ví dụ: Khuyến mãi Tết giảm 20% cho mọi đơn!"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Để trống để ẩn nội dung.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí hiển thị</label>
              <select
                value={settings.position}
                onChange={(e) => setSettings((s) => ({ ...s, position: e.target.value as 'top' | 'bottom' }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="top">Trên cùng (Top)</option>
                <option value="bottom">Dưới cùng (Bottom)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chiều cao (px)</label>
              <input
                type="number"
                min={20}
                max={200}
                value={settings.height}
                onChange={(e) => setSettings((s) => ({ ...s, height: Number(e.target.value) }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Độ trong suốt (Opacity: {settings.opacity})</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.opacity}
                onChange={(e) => setSettings((s) => ({ ...s, opacity: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-2">
                    <input
                    id="closable"
                    type="checkbox"
                    checked={settings.closable}
                    onChange={(e) => setSettings((s) => ({ ...s, closable: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="closable" className="text-sm text-gray-700">Cho phép đóng</label>
                </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-2">
                <input
                id="autoHide"
                type="checkbox"
                checked={settings.autoHide}
                onChange={(e) => setSettings((s) => ({ ...s, autoHide: e.target.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="autoHide" className="text-sm font-medium text-gray-700">Tự động ẩn sau một khoảng thời gian</label>
            </div>
            
            {settings.autoHide && (
                <div className="ml-6">
                    <label className="block text-sm text-gray-600 mb-1">Thời gian hiển thị (giây)</label>
                    <input
                        type="number"
                        min={1}
                        value={settings.autoHideDelay}
                        onChange={(e) => setSettings((s) => ({ ...s, autoHideDelay: Number(e.target.value) }))}
                        className="w-32 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            )}
          </div>

          {message && (
            <div className="text-sm text-gray-700">{message}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Lưu cài đặt
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="font-semibold mb-4 text-gray-900">Xem thử (Preview)</div>
        <div className="relative border border-dashed border-gray-300 bg-gray-50 h-32 rounded flex flex-col justify-center overflow-hidden">
            <div className="text-center text-xs text-gray-400 absolute top-2 w-full">Khu vực giả lập trang web</div>
            
            {/* Simulated Banner */}
            <div 
                className={`absolute w-full bg-yellow-300 text-black flex items-center overflow-hidden transition-all duration-300 ${settings.position === 'top' ? 'top-0' : 'bottom-0'}`}
                style={{ 
                    height: `${settings.height}px`,
                    opacity: settings.opacity
                }}
            >
                <div className="flex-1 overflow-hidden flex items-center h-full">
                    <div 
                        className="whitespace-nowrap inline-block animate-[marquee_linear_infinite]"
                        style={{ 
                            animationDuration: `${settings.speed}s`,
                            paddingLeft: '100%'
                        }}
                    >
                        {settings.text || 'Nội dung thông báo mẫu...'}
                    </div>
                </div>
                {settings.closable && (
                    <button className="absolute right-2 p-1 bg-yellow-300/80 rounded-full shadow-sm z-10">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
            `}} />
        </div>
      </div>
    </div>
  )
}

