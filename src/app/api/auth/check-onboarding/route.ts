import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null

    // 1. Try next-auth session (most reliable for OAuth users)
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        userId = session.user.id
      }
    } catch {
      // Session might not be available
    }

    // 2. Try x-user-id header (most reliable client-side lookup)
    if (!userId) {
      const headerUserId = request.headers.get('x-user-id')
      if (headerUserId) {
        const user = await db.user.findUnique({ where: { id: headerUserId } })
        if (user) {
          userId = user.id
        }
      }
    }

    // 3. Try x-user-email header (unique and reliable)
    if (!userId) {
      const userEmail = request.headers.get('x-user-email')
      if (userEmail) {
        const user = await db.user.findUnique({ where: { email: userEmail } })
        if (user) {
          userId = user.id
        }
      }
    }

    // 4. Try x-user-name header (least reliable, needed for demo mode)
    if (!userId) {
      const userName = request.headers.get('x-user-name')
      if (userName) {
        const user = await db.user.findFirst({ where: { name: userName } })
        if (user) {
          userId = user.id
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ hasAccounts: false, onboardingDone: false })
    }

    // Check if the user has accounts (meaning onboarding was completed before)
    const accountCount = await db.account.count({
      where: { userId },
    })

    // Also check the onboardingDone field in the User table (persistent across sessions/devices)
    const user = await db.user.findUnique({ where: { id: userId } })
    const onboardingDone = user?.onboardingDone || accountCount > 0

    return NextResponse.json({ hasAccounts: accountCount > 0, onboardingDone, userId })
  } catch (error) {
    console.error('Error checking onboarding:', error)
    return NextResponse.json({ hasAccounts: false, onboardingDone: false })
  }
}
