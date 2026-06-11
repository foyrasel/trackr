import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.NEXTAUTH_SECRET || 'trackr-secret'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

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

    const hashedInput = await hashPassword(password)
    if (dbUser.password === hashedInput) {
      return NextResponse.json({ verified: true })
    }

    return NextResponse.json({ verified: false })
  } catch (error) {
    console.error('Error verifying password:', error)
    return NextResponse.json({ error: 'Failed to verify password' }, { status: 500 })
  }
}
