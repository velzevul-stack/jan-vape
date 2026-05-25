import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:4000']

function isAllowedOrigin(origin: string): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (DEV_ORIGINS.some((o) => origin.startsWith(o))) return true
  return false
}

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    if (rateLimitMap.size > 10000) {
      for (const [key, val] of rateLimitMap) {
        if (val.resetAt < now) rateLimitMap.delete(key)
      }
    }
    return true
  }

  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl
  const origin = req.headers.get('origin') ?? ''

  const res = NextResponse.next()

  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (origin && isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Shop-Key, X-Signature, X-Timestamp, Idempotency-Key')
    res.headers.set('Vary', 'Origin')
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: res.headers })
  }

  const isRateLimited =
    pathname.startsWith('/api/bookings') || pathname.startsWith('/api/slots')

  if (isRateLimited) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    if (!checkRateLimit(ip)) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      })
    }
  }

  return res
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
}
