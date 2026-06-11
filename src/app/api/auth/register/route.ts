import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.NEXTAUTH_SECRET || 'trackr-secret'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
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

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // If user exists but hasn't verified their email, allow re-registration
      // by updating their data instead of rejecting
      if (!existingUser.emailVerified) {
        const hashedPassword = await hashPassword(password)
        const verificationCode = generateVerificationCode()

        // Update existing unverified user with new data
        await db.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            password: hashedPassword,
          },
        })

        // Clean up old expired tokens for this email
        await db.verificationToken.deleteMany({
          where: {
            email,
            expires: { lt: new Date() },
          },
        })

        // Store new verification code
        await db.verificationToken.create({
          data: {
            email,
            token: verificationCode,
            expires: new Date(Date.now() + 10 * 60 * 1000),
          },
        })

        return NextResponse.json({
          userId: existingUser.id,
          email,
          verificationCode,
          message: 'Account updated! Please verify your email.',
        }, { status: 201 })
      }

      // User exists and is verified — cannot re-register
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate verification code
    const verificationCode = generateVerificationCode()

    // Create user (unverified)
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        provider: 'email',
      },
    })

    // Create default accounts for new user
    await db.account.createMany({
      data: [
        { userId: user.id, name: 'Cash', type: 'cash', balance: 0, color: '#10b981', icon: '💵', isDefault: true },
        { userId: user.id, name: 'Debit Card', type: 'debit', balance: 0, color: '#3b82f6', icon: '💳', isDefault: false },
        { userId: user.id, name: 'Credit Card', type: 'credit', balance: 0, color: '#8b5cf6', icon: '💳', isDefault: false },
        { userId: user.id, name: 'Mobile Wallet', type: 'mobile', balance: 0, color: '#a855f7', icon: '📱', isDefault: false },
      ],
    })

    // Store verification code in database (expires in 10 minutes)
    await db.verificationToken.create({
      data: {
        email,
        token: verificationCode,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    // Clean up old expired tokens for this email
    await db.verificationToken.deleteMany({
      where: {
        email,
        expires: { lt: new Date() },
      },
    })

    // In production, you'd send an email here. For this demo, return the code on screen.
    return NextResponse.json({
      userId: user.id,
      email,
      verificationCode, // In production, this would be sent via email, not returned in the response
      message: 'Account created! Please verify your email.',
    }, { status: 201 })
  } catch (error) {
    console.error('Error registering user:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
