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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Block common attack paths
  const blockedPaths = ['/wp-admin', '/wp-login', '/xmlrpc.php', '/.env', '/admin/config']
  if (blockedPaths.some(path => pathname.startsWith(path))) {
    return new NextResponse(null, { status: 404 })
  }

  // Enforce auth on protected API routes
  if (pathname.startsWith('/api/')) {
    const isPublic = PUBLIC_API_PATHS.some(p => pathname.startsWith(p))

    if (!isPublic) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })

      if (!token) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  const response = NextResponse.next()
  response.headers.set('X-Response-Time', Date.now().toString())
  response.headers.set('X-Request-Id', crypto.randomUUID())

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|logo.svg|manifest.json|sw.js|robots.txt).*)',
  ],
}
