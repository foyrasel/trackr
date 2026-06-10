import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Response-Time', Date.now().toString())
  
  // Rate limiting awareness - add timestamp for client-side throttling
  response.headers.set('X-Request-Id', crypto.randomUUID())

  // Block common attack paths
  const pathname = request.nextUrl.pathname
  const blockedPaths = ['/wp-admin', '/wp-login', '/xmlrpc.php', '/.env', '/admin/config']
  
  if (blockedPaths.some(path => pathname.startsWith(path))) {
    return new NextResponse(null, { status: 404 })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|logo.svg|manifest.json|sw.js|robots.txt).*)',
  ],
}
