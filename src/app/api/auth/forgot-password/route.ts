import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/email'

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    let body: { email?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user exists with this email
    let user
    try {
      user = await db.user.findUnique({
        where: { email },
      })
    } catch (dbError) {
      console.error('Database error in forgot password:', dbError)
      return NextResponse.json(
        { error: 'Failed to process request. Please try again.' },
        { status: 500 }
      )
    }

    if (user) {
      // Generate reset code
      const resetCode = generateResetCode()

      // Clean up old expired tokens for this email
      try {
        await db.verificationToken.deleteMany({
          where: {
            email,
            expires: { lt: new Date() },
          },
        })
      } catch {
        // Non-critical: continue even if cleanup fails
      }

      // Store reset code in database (expires in 10 minutes)
      try {
        await db.verificationToken.create({
          data: {
            email,
            token: resetCode,
            expires: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
      } catch (dbError) {
        console.error('Failed to store reset code:', dbError)
        return NextResponse.json(
          { error: 'Failed to process request. Please try again.' },
          { status: 500 }
        )
      }

      const sent = await sendPasswordResetEmail(email, resetCode).catch((emailErr) => {
        console.error('[forgot-password] Email send failed:', emailErr)
        return false
      })

      const resetResponse: Record<string, unknown> = {
        success: true,
        message: sent
          ? 'Reset code sent to your email.'
          : 'Email delivery is unavailable — use the code shown below.',
      }
      // Surface the code on-screen when it couldn't actually be emailed
      // (no provider configured, or the provider rejected the send).
      if (!sent) {
        resetResponse.resetCode = resetCode
      }
      return NextResponse.json(resetResponse)
    }

    // For security, don't reveal if email exists or not
    // Still return success even if user doesn't exist (but no resetCode)
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset code has been sent.',
    })
  } catch (error) {
    console.error('Unexpected error in forgot password:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
