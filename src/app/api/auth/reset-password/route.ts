import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.NEXTAUTH_SECRET || 'trackr-secret'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code, newPassword } = body

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      )
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset code' },
        { status: 400 }
      )
    }

    // Check reset code in database
    const storedToken = await db.verificationToken.findFirst({
      where: {
        email,
        token: code,
        used: false,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!storedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset code. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update user's password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // Mark token as used
    await db.verificationToken.update({
      where: { id: storedToken.id },
      data: { used: true },
    })

    // Clean up old tokens for this email
    await db.verificationToken.deleteMany({
      where: {
        email,
        used: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
