import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/password'
import { sendVerificationEmail, isEmailEnabled } from '@/lib/email'

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({ where: { email } })

    if (existingUser) {
      if (!existingUser.emailVerified) {
        // Allow re-registration of unverified accounts
        const hashedPassword = await hashPassword(password)

        if (!isEmailEnabled()) {
          // No email provider — verify immediately
          await db.user.update({
            where: { id: existingUser.id },
            data: { name, password: hashedPassword, emailVerified: new Date() },
          })
          return NextResponse.json({ userId: existingUser.id, email, autoVerified: true })
        }

        const verificationCode = generateVerificationCode()
        await db.user.update({
          where: { id: existingUser.id },
          data: { name, password: hashedPassword },
        })
        await db.verificationToken.deleteMany({ where: { email, expires: { lt: new Date() } } })
        await db.verificationToken.create({
          data: { email, token: verificationCode, expires: new Date(Date.now() + 10 * 60 * 1000) },
        })
        try { await sendVerificationEmail(email, name, verificationCode) } catch {}
        return NextResponse.json({ userId: existingUser.id, email, message: 'Verification email sent.' }, { status: 201 })
      }

      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    if (!isEmailEnabled()) {
      // No email provider — create user and verify immediately, no code dance
      const user = await db.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          provider: 'email',
          emailVerified: new Date(),
        },
      })
      await db.account.createMany({
        data: [
          { userId: user.id, name: 'Cash', type: 'cash', balance: 0, color: '#10b981', icon: '💵', isDefault: true },
          { userId: user.id, name: 'Debit Card', type: 'debit', balance: 0, color: '#3b82f6', icon: '💳', isDefault: false },
          { userId: user.id, name: 'Credit Card', type: 'credit', balance: 0, color: '#8b5cf6', icon: '💳', isDefault: false },
          { userId: user.id, name: 'Mobile Wallet', type: 'mobile', balance: 0, color: '#a855f7', icon: '📱', isDefault: false },
        ],
      })
      return NextResponse.json({ userId: user.id, email, autoVerified: true }, { status: 201 })
    }

    // Email provider configured — send verification code
    const verificationCode = generateVerificationCode()
    const user = await db.user.create({
      data: { name, email, password: hashedPassword, provider: 'email' },
    })
    await db.account.createMany({
      data: [
        { userId: user.id, name: 'Cash', type: 'cash', balance: 0, color: '#10b981', icon: '💵', isDefault: true },
        { userId: user.id, name: 'Debit Card', type: 'debit', balance: 0, color: '#3b82f6', icon: '💳', isDefault: false },
        { userId: user.id, name: 'Credit Card', type: 'credit', balance: 0, color: '#8b5cf6', icon: '💳', isDefault: false },
        { userId: user.id, name: 'Mobile Wallet', type: 'mobile', balance: 0, color: '#a855f7', icon: '📱', isDefault: false },
      ],
    })
    await db.verificationToken.deleteMany({ where: { email, expires: { lt: new Date() } } })
    await db.verificationToken.create({
      data: { email, token: verificationCode, expires: new Date(Date.now() + 10 * 60 * 1000) },
    })
    try { await sendVerificationEmail(email, name, verificationCode) } catch (emailErr) {
      console.error('[register] Email send failed:', emailErr)
    }
    return NextResponse.json({ userId: user.id, email, message: 'Verification email sent.' }, { status: 201 })
  } catch (error) {
    console.error('Error registering user:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

