# Tổng Quan Giải Pháp
Dùng Supabase Edge Function (Deno) làm proxy bảo mật để gọi API bên thứ ba (tokencursor.io.vn), giải quyết triệt để CORS theo luồng: Frontend → Edge Function → API bên thứ ba. Edge Function tự cấu hình CORS, quản lý cookie/phiên nếu cần, và trả response về frontend.

## 1. Tạo Edge Function (Deno)
### Tên function
- `cursor-proxy`

### Cấu trúc
- `functions/cursor-proxy/index.ts`
- Biến môi trường: 
  - `ALLOWED_ORIGIN=https://digigo.website`
  - `UPSTREAM_BASE=https://tokencursor.io.vn`
  - `SUPABASE_URL`, `SERVICE_ROLE_KEY` (nếu cần lưu cookie/phiên)

### CORS Headers
- `Access-Control-Allow-Origin: ${ALLOWED_ORIGIN}`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: content-type, authorization, x-requested-with, x-client-session-id`
- `Access-Control-Allow-Credentials: true`

### Mã mẫu (Deno)
```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
const UPSTREAM_BASE = Deno.env.get('UPSTREAM_BASE') ?? 'https://tokencursor.io.vn'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-requested-with, x-client-session-id',
  'Access-Control-Allow-Credentials': 'true',
}

const pathMap: Record<string, string> = {
  login: '/api/login',
  me: '/api/me',
  token: '/api/token',
  logout: '/api/logout',
}

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') // login|me|token|logout
    if (!action || !pathMap[action]) {
      return new Response(JSON.stringify({ error: 'invalid_action' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }

    // Đọc body JSON an toàn
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : undefined

    // Forward headers tối thiểu, KHÔNG forward các header bị khóa (user-agent, sec-ch-ua...)
    const fwdHeaders: HeadersInit = {
      'content-type': 'application/json',
      'accept': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      // Cookie/phiên: nếu bạn triển khai lưu cookie theo session-id, nạp cookie ở đây
      // 'cookie': await loadCookieBySession(req.headers.get('x-client-session-id')), // optional
    }

    const upstreamResp = await fetch(UPSTREAM_BASE + pathMap[action], {
      method: req.method,
      headers: fwdHeaders,
      body: req.method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    })

    const text = await upstreamResp.text() // trả nguyên văn, có thể là JSON
    const resHeaders = { ...corsHeaders, 'content-type': upstreamResp.headers.get('content-type') ?? 'application/json' }

    // Nếu cần quản lý cookie: đọc Set-Cookie từ upstreamResp.headers và lưu server-side (DB/KV) theo session-id

    return new Response(text, { status: upstreamResp.status, headers: resHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(e) }), { status: 502, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }
})
```

## 2. Bảo mật & Quản lý Phiên (tùy chọn)
- Nếu API bên thứ ba yêu cầu cookie/phiên:
  - Tạo bảng `cursor_sessions (id uuid, cookie text, expires_at timestamptz)`.
  - Khi login: đọc `Set-Cookie` từ upstream, lưu vào DB theo `session_id`; trả `session_id` cho frontend.
  - Frontend gửi `x-client-session-id` cho các lần gọi tiếp theo; Edge Function nạp cookie và forward.
- Tất cả secrets nằm trong biến môi trường Supabase; không đặt API keys trong frontend.

## 3. Frontend Tích Hợp
- Thay các gọi trực tiếp `fetch('https://tokencursor.io.vn/...')` bằng gọi Edge Function.
- Ví dụ dùng supabase-js:
```ts
const { data, error } = await supabase.functions.invoke('cursor-proxy', {
  // login
  body: { key },
  headers: { 'content-type': 'application/json' },
  query: { action: 'login' }, // hoặc append ?action=login vào URL nếu dùng fetch thuần
})
```
- Hoặc fetch thuần:
```ts
await fetch(`${SUPABASE_FUNCTIONS_URL}/cursor-proxy?action=token`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-client-session-id': sessionId },
  body: JSON.stringify({}),
})
```

## 4. Xử lý Lỗi & Tooltip/UX
- Edge Function trả mã lỗi phù hợp (400 invalid_action, 502 upstream_error).
- Frontend hiển thị thông báo tiếng Việt, retry/backoff nếu cần.

## 5. Kiểm thử
- Preflight: kiểm tra OPTIONS trả CORS đúng với domain `https://digigo.website`.
- Case thành công: login → token → logout qua Edge Function.
- Case thất bại: token quá hạn, rate limit; đảm bảo message rõ ràng.
- Hiệu năng: đo `TTFB` của function; nếu >300ms, cân nhắc giảm log, bật keepalive.

## 6. Triển khai Production
- `supabase functions deploy cursor-proxy`
- `supabase secrets set ALLOWED_ORIGIN=... UPSTREAM_BASE=... SERVICE_ROLE_KEY=...`
- Logging: sử dụng edge logs mặc định, hoặc thêm console.log có nhãn (action, status, latency).
- Monitoring: thiết lập cảnh báo qua Supabase/uptime.
- Rate limiting: simple token bucket theo IP/session (lưu state tạm thời trong Postgres/KV).

## 7. Ghi chú Quan Trọng
- CORS là vấn đề phía server; việc thêm headers ở frontend không thể vượt qua CORS. Proxy qua Edge Function là cách đúng.
- Nếu API dùng cookie, **luôn** đi qua Edge Function và quản lý cookie server-side; frontend không chạm vào cookie của bên thứ ba.

Bạn xác nhận để tôi tạo function `cursor-proxy`, thêm secrets và cập nhật frontend gọi qua function nhé?