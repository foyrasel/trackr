import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
    const user = await db.user.findUnique({
      where: { email },
    })

    if (user) {
      // Generate reset code
      const resetCode = generateResetCode()

      // Clean up old expired tokens for this email
      await db.verificationToken.deleteMany({
        where: {
          email,
          expires: { lt: new Date() },
        },
      })

      // Store reset code in database (expires in 10 minutes)
      await db.verificationToken.create({
        data: {
          email,
          token: resetCode,
          expires: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      // In production, you'd send an email here. For this demo, return the code on screen.
      return NextResponse.json({
        success: true,
        resetCode, // In production, this would be sent via email, not returned in the response
        message: 'Reset code sent to your email.',
      })
    }

    // For security, don't reveal if email exists or not
    // Still return success even if user doesn't exist
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset code has been sent.',
    })
  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
