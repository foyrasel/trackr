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

    // Sanitize inputs
    const sanitizedName = typeof name === 'string' ? name.trim().slice(0, 100) : ''
    const sanitizedEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 255) : ''

    if (!sanitizedEmail || !password || !sanitizedName) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitizedEmail)) {
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
      where: { email: sanitizedEmail },
    })

    if (existingUser) {
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
        name: sanitizedName,
        email: sanitizedEmail,
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
        email: sanitizedEmail,
        token: verificationCode,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    // Clean up old expired tokens for this email
    await db.verificationToken.deleteMany({
      where: {
        email: sanitizedEmail,
        expires: { lt: new Date() },
      },
    })

    // In production, you'd send an email here. For demo, store code server-side only.
    // The client displays the code from the server response for testing purposes only.
    return NextResponse.json({
      userId: user.id,
      email: sanitizedEmail,
      verificationCode,
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
