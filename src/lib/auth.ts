import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'

/**
 * Get the current user from the session.
 * Works with both next-auth OAuth sessions and demo/credentials sessions.
 * Priority: x-user-id > x-user-email > x-user-name > session
 * No longer falls back to creating/finding a random user to prevent data mixing.
 */
export async function getCurrentUser(request?: Request): Promise<{
  id: string
  name: string | null
  email: string | null
  provider: string
} | null> {
  // 1. Try custom headers FIRST (fast, no session overhead)
  if (request) {
    // x-user-id is the most reliable header-based lookup
    const userId = request.headers.get('x-user-id')
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId } })
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          provider: user.provider,
        }
      }
    }

    // x-user-email is unique and reliable for email/OAuth users
    const userEmail = request.headers.get('x-user-email')
    if (userEmail) {
      const user = await db.user.findUnique({ where: { email: userEmail } })
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          provider: user.provider,
        }
      }
    }

    // x-user-name is the least reliable (names can be duplicated) but needed for demo mode
    const userName = request.headers.get('x-user-name')
    if (userName) {
      // For demo mode, find or create user by name
      let user = await db.user.findFirst({ where: { name: userName, provider: 'demo' } })
      if (!user) {
        // Also try any user with this name (for non-demo providers)
        user = await db.user.findFirst({ where: { name: userName } })
      }
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

  // 2. Fall back to next-auth session (slower, needed for OAuth redirects without headers)
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
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

  // No longer auto-create or fall back to oldest user — return null instead
  // This prevents data mixing between users
  return null
}

/**
 * Add auth headers to fetch requests for demo mode / client-side auth
 * Includes x-user-id, x-user-email, and x-user-name for reliable user lookup
 */
export function getAuthHeaders(userName?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (userName) {
    headers['x-user-name'] = userName
  }
  // Also include user email and id from localStorage if available
  if (typeof window !== 'undefined') {
    const userEmail = localStorage.getItem('trackr_user_email')
    const userId = localStorage.getItem('trackr_user_id')
    if (userEmail) headers['x-user-email'] = userEmail
    if (userId) headers['x-user-id'] = userId
  }
  return headers
}
