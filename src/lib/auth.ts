import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

/**
 * Get the current user from the session.
 * Works with both next-auth OAuth sessions and demo/credentials sessions.
 * Falls back to finding/creating user by localStorage name if no session exists.
 */
export async function getCurrentUser(request?: Request): Promise<{
  id: string
  name: string | null
  email: string | null
  provider: string
} | null> {
  // Try to get the next-auth session first
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      // Verify user exists in DB
      const dbUser = await db.user.findUnique({ where: { id: session.user.id } })
      if (dbUser) {
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          provider: dbUser.provider,
        }
      }
    }
  } catch {
    // Session might not be available (e.g., during build or if auth not configured)
  }

  // Fallback: try to get user from custom header (set by client for demo mode)
  if (request) {
    const userName = request.headers.get('x-user-name')
    if (userName) {
      const user = await db.user.findFirst({ where: { name: userName } })
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          provider: user.provider,
        }
      }
    }
  }

  // Ultimate fallback: find or create default user
  let user = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!user) {
    user = await db.user.create({
      data: { name: 'User', provider: 'demo' },
    })
    await db.account.createMany({
      data: [
        { userId: user.id, name: 'Cash', type: 'cash', balance: 0, color: '#10b981', icon: '💵', isDefault: true },
        { userId: user.id, name: 'Debit Card', type: 'debit', balance: 0, color: '#3b82f6', icon: '💳', isDefault: false },
        { userId: user.id, name: 'Credit Card', type: 'credit', balance: 0, color: '#8b5cf6', icon: '💳', isDefault: false },
      ],
    })
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
  }
}

/**
 * Add user-name header to fetch requests for demo mode auth
 */
export function getAuthHeaders(userName?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (userName) {
    headers['x-user-name'] = userName
  }
  return headers
}
