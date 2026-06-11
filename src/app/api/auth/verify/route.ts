import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Check verification code in database
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
        { error: 'Invalid or expired verification code. Please register again.' },
        { status: 400 }
      )
    }

    // Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
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

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
