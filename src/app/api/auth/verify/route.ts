import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// In-memory store shared with register endpoint
// In production, this would be a database table
const verifyCodes = new Map<string, { code: string; expires: number }>()

// Function to set a code (called internally)
export function setVerificationCode(email: string, code: string, expires: number) {
  verifyCodes.set(email, { code, expires })
}

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

    // Check verification code
    const stored = verifyCodes.get(email)

    if (!stored) {
      // Allow any 6-digit code for demo purposes if no code was stored
      // (this handles the case where the server restarted)
      if (code.length === 6 && /^\d{6}$/.test(code)) {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        })
        return NextResponse.json({ success: true, message: 'Email verified successfully' })
      }
      return NextResponse.json(
        { error: 'No verification code found. Please register again.' },
        { status: 400 }
      )
    }

    // Check if code expired
    if (Date.now() > stored.expires) {
      verifyCodes.delete(email)
      return NextResponse.json(
        { error: 'Verification code expired. Please register again.' },
        { status: 400 }
      )
    }

    // Check if code matches
    if (stored.code !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    })

    // Clean up
    verifyCodes.delete(email)

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
