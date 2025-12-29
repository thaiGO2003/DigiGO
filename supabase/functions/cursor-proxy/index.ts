import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
const UPSTREAM_BASE = Deno.env.get('UPSTREAM_BASE') ?? 'https://tokencursor.io.vn'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-requested-with, x-client-session-id, x-proxy-cookie',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'x-proxy-set-cookie',
}

type Action = 'login' | 'me' | 'token' | 'logout'
const pathMap: Record<string, string> = {
  login: '/api/login',
  me: '/api/me',
  token: '/api/token',
  logout: '/api/logout',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let action: Action | null = null
    let data: any = {}

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      action = body?.action ?? null
      data = body?.data ?? {}
    } else {
      const url = new URL(req.url)
      action = (url.searchParams.get('action') as Action) ?? null
    }

    if (!action || !pathMap[action]) {
      return new Response(JSON.stringify({ error: 'invalid_action' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    // Build upstream headers (server-side; no CORS here)
    const fwdHeaders: HeadersInit = {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-requested-with': 'XMLHttpRequest',
    }

    // Optional cookie pass-through from client memory to upstream
    const proxyCookie = req.headers.get('x-proxy-cookie')
    if (proxyCookie) {
      (fwdHeaders as any).cookie = proxyCookie
    }

    const upstreamResp = await fetch(UPSTREAM_BASE + pathMap[action], {
      method: req.method,
      headers: fwdHeaders,
      body: req.method === 'POST' ? JSON.stringify(data ?? {}) : undefined,
    })

    const text = await upstreamResp.text()
    const resHeaders: Record<string, string> = {
      ...corsHeaders,
      'content-type': upstreamResp.headers.get('content-type') ?? 'application/json',
    }

    // Try to expose Set-Cookie back to client (to hold in memory)
    const setCookie = upstreamResp.headers.get('set-cookie')
    if (setCookie) {
      resHeaders['x-proxy-set-cookie'] = setCookie
    }

    return new Response(text, { status: upstreamResp.status, headers: resHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(e) }), {
      status: 502,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
