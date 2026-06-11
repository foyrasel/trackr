import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If user has no password (demo/OAuth user), skip verification
    const dbUser = await db.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!dbUser.password) {
      return NextResponse.json({ verified: true })
    }

    // User has a password, verify it
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ verified: false, error: 'Password required' }, { status: 400 })
    }

    const { matched } = await verifyPassword(password, dbUser.password)
    return NextResponse.json({ verified: matched })
  } catch (error) {
    console.error('Error verifying password:', error)
    return NextResponse.json({ error: 'Failed to verify password' }, { status: 500 })
  }
}
