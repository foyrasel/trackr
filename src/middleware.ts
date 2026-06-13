import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// API routes that are publicly accessible (no auth required)
const PUBLIC_API_PATHS = [
  '/api/auth',
  '/api/seed',
  '/api/seed-demo',
  '/api/health',
  '/api/debug-env',
]

// ---------------------------------------------------------------------------
// In-memory rate limiter (per-IP, resets on cold start)
// For distributed rate limiting across Vercel instances, swap this for
// Vercel KV or Upstash Redis.
// ---------------------------------------------------------------------------
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up stale entries periodically to prevent memory growth
let lastCleanup = Date.now()
function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key)
  }
}

/**
 * Returns true if the request is within the allowed rate.
 * limit: max requests, windowMs: sliding window in ms
 */
function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  cleanupStaleEntries()
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}

function rateLimitResponse(retryAfterSecs: number): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSecs),
      },
    }
  )
}

// ---------------------------------------------------------------------------
// Bot / suspicious UA detection
// ---------------------------------------------------------------------------
const BOT_UA_PATTERNS = [
  /curl\//i,
  /python-requests/i,
  /go-http-client/i,
  /java\/\d/i,
  /wget\//i,
  /libwww-perl/i,
  /scrapy/i,
  /zgrab/i,
  /masscan/i,
  /nmap/i,
  /sqlmap/i,
  /nikto/i,
  /dirbuster/i,
  /nuclei/i,
]

function isSuspiciousUA(ua: string | null): boolean {
  if (!ua || ua.trim() === '') return true
  return BOT_UA_PATTERNS.some(p => p.test(ua))
}

// ---------------------------------------------------------------------------
// Security headers added to every response
// ---------------------------------------------------------------------------
function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

// ---------------------------------------------------------------------------
// Rate-limit rules for sensitive public endpoints
// ---------------------------------------------------------------------------
const RATE_LIMIT_RULES: Array<{ path: string; limit: number; windowMs: number }> = [
  { path: '/api/auth/register',        limit: 5,  windowMs: 15 * 60 * 1000 }, // 5/15 min per IP
  { path: '/api/auth/forgot-password', limit: 5,  windowMs: 15 * 60 * 1000 },
  { path: '/api/auth/verify-email',    limit: 10, windowMs: 15 * 60 * 1000 },
  { path: '/api/auth/reset-password',  limit: 5,  windowMs: 15 * 60 * 1000 },
  // NextAuth sign-in handler
  { path: '/api/auth/callback/credentials', limit: 10, windowMs: 10 * 60 * 1000 },
]

// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const ua = request.headers.get('user-agent')

  // ------------------------------------------------------------------
  // 1. Block common attack / scanner paths
  // ------------------------------------------------------------------
  const blockedPaths = [
    '/wp-admin', '/wp-login', '/xmlrpc.php', '/.env',
    '/admin/config', '/phpmyadmin', '/.git', '/config.json',
    '/web.config', '/shell', '/.well-known/security',
  ]
  if (blockedPaths.some(path => pathname.startsWith(path))) {
    return new NextResponse(null, { status: 404 })
  }

  // ------------------------------------------------------------------
  // 2. Block scanners / headless bots on sensitive public endpoints
  // ------------------------------------------------------------------
  const isSensitivePublic = RATE_LIMIT_RULES.some(r => pathname.startsWith(r.path))
  if (isSensitivePublic && isSuspiciousUA(ua)) {
    return new NextResponse(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ------------------------------------------------------------------
  // 3. Rate-limit sensitive public endpoints
  // ------------------------------------------------------------------
  for (const rule of RATE_LIMIT_RULES) {
    if (pathname.startsWith(rule.path)) {
      const key = `${rule.path}::${ip}`
      if (!checkRateLimit(key, rule.limit, rule.windowMs)) {
        const retryAfterSecs = Math.ceil(rule.windowMs / 1000)
        const res = rateLimitResponse(retryAfterSecs)
        addSecurityHeaders(res)
        return res
      }
      break
    }
  }

  // ------------------------------------------------------------------
  // 4. Enforce auth on protected API routes
  // ------------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    const isPublic = PUBLIC_API_PATHS.some(p => pathname.startsWith(p))

    if (!isPublic) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })

      if (!token) {
        const res = new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
        addSecurityHeaders(res)
        return res
      }

      // Overwrite identity headers with the verified JWT values so a client
      // can't impersonate another user by spoofing x-user-* headers.
      const requestHeaders = new Headers(request.headers)
      if (token.id) requestHeaders.set('x-user-id', String(token.id))
      else requestHeaders.delete('x-user-id')
      if (token.email) requestHeaders.set('x-user-email', token.email)
      else requestHeaders.delete('x-user-email')
      if (token.name) requestHeaders.set('x-user-name', token.name)
      else requestHeaders.delete('x-user-name')

      const response = NextResponse.next({ request: { headers: requestHeaders } })
      response.headers.set('X-Response-Time', Date.now().toString())
      response.headers.set('X-Request-Id', crypto.randomUUID())
      addSecurityHeaders(response)
      return response
    }
  }

  const response = NextResponse.next()
  response.headers.set('X-Response-Time', Date.now().toString())
  response.headers.set('X-Request-Id', crypto.randomUUID())
  addSecurityHeaders(response)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|logo.svg|manifest.json|sw.js|robots.txt).*)',
  ],
}
