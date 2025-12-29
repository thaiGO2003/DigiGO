import { useState, useEffect, useMemo, useRef } from 'react'
import { KeyRound, LogOut, Copy, ShieldCheck, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type CursorMeResponse = {
  ok: true
  data: {
    keyId: string
    keyMask: string
    isActive: boolean
    expiresAt: string
    lastTokenAt: string | null
    assignedCount: number
    nextAvailableAt: string | null
  }
}

type CursorTokenOkResponse = {
  ok: true
  data: {
    token: string
    createdAt: string
    nextAvailableAt: string | null
  }
}

type CursorApiErrorResponse = {
  error: string
  message?: string
  details?: {
    blockedUntil?: string
  }
}

function formatViDateTime(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function getWaitMs(nextIso?: string | null) {
  if (!nextIso) return 0
  const t = new Date(nextIso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, t - Date.now())
}

export default function CursorTab() {
  const [key, setKey] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isFetchingMe, setIsFetchingMe] = useState(false)
  const [isGettingToken, setIsGettingToken] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [me, setMe] = useState<CursorMeResponse['data'] | null>(null)
  const [token, setToken] = useState<string>('')
  const [proxyCookie, setProxyCookie] = useState<string>('')

  const [error, setError] = useState<string>('')
  const [warning, setWarning] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const tickRef = useRef<number | null>(null)
  const [, forceTick] = useState(0)

  const waitMs = useMemo(() => getWaitMs(me?.nextAvailableAt), [me?.nextAvailableAt])

  useEffect(() => {
    // On mount: try restore session
    void fetchMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (waitMs > 0) {
      tickRef.current = window.setInterval(() => forceTick((x) => x + 1), 1000)
    }
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [waitMs])

  const fetchMe = async () => {
    setError('')
    setWarning('')
    setSuccess('')
    setIsFetchingMe(true)
    try {
      const { data, error } = await supabase.functions.invoke('cursor-proxy', {
        body: { action: 'me' },
        headers: proxyCookie ? { 'x-proxy-cookie': proxyCookie } : undefined
      })
      if (error) {
        setMe(null)
        return
      }
      const json = data as CursorMeResponse | CursorApiErrorResponse
      if ('ok' in json && json.ok) {
        setMe(json.data)
      } else {
        setMe(null)
      }
    } catch (e) {
      setMe(null)
    } finally {
      setIsFetchingMe(false)
    }
  }

  const handleLogin = async () => {
    setError('')
    setWarning('')
    setSuccess('')

    if (!key.trim()) {
      setError('Vui lòng nhập key đăng nhập.')
      return
    }

    setIsLoggingIn(true)
    try {
      const { data, error, response } = await supabase.functions.invoke('cursor-proxy', {
        body: { action: 'login', data: { key: key.trim() } },
      })
      if (error) {
        setError('Đăng nhập thất bại. Vui lòng kiểm tra lại key.')
        return
      }
      const json = data as { ok?: boolean; data?: { ok?: boolean } } | CursorApiErrorResponse
      if (!('ok' in json) || !json.ok || !json.data?.ok) {
        setError('Đăng nhập thất bại. Vui lòng kiểm tra lại key.')
        return
      }

      const setCookie = response?.headers?.get('x-proxy-set-cookie') || ''
      if (setCookie) setProxyCookie(setCookie)

      setSuccess('Đăng nhập thành công.')
      setKey('')
      await fetchMe()
    } catch (e) {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleGetToken = async () => {
    setError('')
    setWarning('')
    setSuccess('')
    setIsGettingToken(true)

    try {
      const { data, error } = await supabase.functions.invoke('cursor-proxy', {
        body: { action: 'token' },
        headers: proxyCookie ? { 'x-proxy-cookie': proxyCookie } : undefined
      })
      if (error) {
        const json = data as CursorApiErrorResponse | undefined
        if (json?.error === 'RATE_LIMITED') {
          const blockedUntil = (json as CursorApiErrorResponse).details?.blockedUntil
          setWarning(
            `Bạn cần chờ đến ${formatViDateTime(blockedUntil)} mới có thể lấy token tiếp theo.`
          )
          await fetchMe()
          return
        }

        setError((json as CursorApiErrorResponse)?.message || 'Lấy token thất bại.')
        await fetchMe()
        return
      }

      const json = data as CursorTokenOkResponse | CursorApiErrorResponse
      if ('ok' in json && json.ok) {
        setToken(json.data.token)
        setSuccess('Lấy token thành công.')
        await fetchMe()
      } else {
        setError('Lấy token thất bại.')
      }
    } catch (e) {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại.')
    } finally {
      setIsGettingToken(false)
    }
  }

  const handleCopy = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setSuccess('Đã copy token.')
    } catch {
      setError('Không thể copy. Vui lòng copy thủ công.')
    }
  }

  const handleLogout = async () => {
    setError('')
    setWarning('')
    setSuccess('')
    setIsLoggingOut(true)
    try {
      await supabase.functions.invoke('cursor-proxy', {
        body: { action: 'logout' },
        headers: proxyCookie ? { 'x-proxy-cookie': proxyCookie } : undefined
      })
    } catch {
      // ignore
    } finally {
      setMe(null)
      setToken('')
      setProxyCookie('')
      setIsLoggingOut(false)
    }
  }

  const canGetToken = !!me && getWaitMs(me.nextAvailableAt) <= 0
  const remaining = waitMs

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-3xl">
        {!me ? (
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-10 shadow-xl border border-white/10">
            <div className="flex items-start gap-4">
              <div className="shrink-0 p-3 rounded-xl bg-white/10 border border-white/10">
                <KeyRound className="h-6 w-6 text-indigo-200" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Đăng nhập hệ thống</h2>
                <p className="mt-2 text-slate-300">Nhập key để truy cập vào hệ thống lấy token Cursor.</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <label className="block text-sm font-semibold text-slate-200">Key đăng nhập</label>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Nhập key của bạn (VD: KEY-XXXX...)"
                className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              />
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
              >
                <ShieldCheck className="h-5 w-5" />
                {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <div className="text-xs text-slate-400">Hệ thống sẽ lưu phiên đăng nhập bằng cookie/session.</div>
            </div>

            {(error || warning || success) && (
              <div className="mt-6 space-y-3">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-100">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 mt-0.5 text-red-300" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}
                {warning && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100">
                    <div className="flex items-start gap-2">
                      <Clock className="h-5 w-5 mt-0.5 text-amber-300" />
                      <span>{warning}</span>
                    </div>
                  </div>
                )}
                {success && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-100">{success}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-cyan-600">
                <h2 className="text-xl font-extrabold text-white">Thông tin tài khoản</h2>
                <p className="text-white/80 text-sm mt-1">Xác thực từ /api/me</p>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500">Key ID</div>
                  <div className="font-mono text-sm text-gray-900">{me.keyMask}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500">Trạng thái</div>
                  <div className={`text-sm font-semibold ${me.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {me.isActive ? `Key còn hạn đến ${formatViDateTime(me.expiresAt)}` : 'Key không hoạt động'}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500">Số token đã nhận</div>
                  <div className="text-sm font-bold text-gray-900">{me.assignedCount}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500">Lần lấy token cuối</div>
                  <div className="text-sm text-gray-900">{formatViDateTime(me.lastTokenAt)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">Lấy Token</h3>
                    <p className="text-sm text-gray-500 mt-1">POST /api/token</p>
                  </div>
                  <button
                    onClick={handleGetToken}
                    disabled={!canGetToken || isGettingToken}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGettingToken ? 'Đang lấy...' : 'Lấy token'}
                  </button>
                </div>

                <div className="mt-5">
                  <div className="h-10 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                    <div
                      className={`h-full transition-all duration-500 ${canGetToken ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{
                        width: canGetToken ? '100%' : '100%',
                        opacity: canGetToken ? 0.18 : 0.25,
                      }}
                    />
                    <div className="-mt-10 h-10 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {canGetToken ? 'Sẵn sàng lấy token' : `Chờ ${formatCountdown(remaining)} nữa`}
                    </div>
                  </div>

                  {!canGetToken && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                      Bạn cần chờ <b>{formatCountdown(remaining)}</b> nữa mới có thể lấy token tiếp theo.
                    </div>
                  )}

                  {(error || warning || success) && (
                    <div className="mt-4 space-y-3">
                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 mt-0.5" />
                            <span>{error}</span>
                          </div>
                        </div>
                      )}
                      {warning && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                          <div className="flex items-start gap-2">
                            <Clock className="h-5 w-5 mt-0.5" />
                            <span>{warning}</span>
                          </div>
                        </div>
                      )}
                      {success && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                          {success}
                        </div>
                      )}
                    </div>
                  )}

                  {token && (
                    <div className="mt-6">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Token của bạn:</div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs text-gray-800 whitespace-pre-wrap break-words">
                        {token}
                      </div>
                      <button
                        onClick={handleCopy}
                        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-white bg-gray-900 hover:bg-black"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Token
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </button>
            </div>

            <div className="text-xs text-gray-400">
              {isFetchingMe ? 'Đang xác thực...' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
