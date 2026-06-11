import { db, ensureDbReady } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, isBcryptHash } from '@/lib/password'

const TEST_USERS = [
  {
    email: 'corporate@test.com',
    name: 'Corporate Employee',
    password: 'password123',
    accounts: [
      { name: 'Cash', type: 'cash', balance: 5000, color: '#10b981', icon: '💵', isDefault: true },
      { name: 'DBBL Debit', type: 'debit', balance: 45000, color: '#3b82f6', icon: '💳', isDefault: false },
      { name: 'City Bank Credit', type: 'credit', balance: 12000, color: '#8b5cf6', icon: '💳', isDefault: false },
      { name: 'bKash', type: 'mobile', balance: 8000, color: '#e91e63', icon: '📱', isDefault: false },
      { name: 'Nagad', type: 'mobile', balance: 3000, color: '#f97316', icon: '📱', isDefault: false },
    ],
  },
  {
    email: 'govt@test.com',
    name: 'Government Employee',
    password: 'password123',
    accounts: [
      { name: 'Cash', type: 'cash', balance: 5000, color: '#10b981', icon: '💵', isDefault: true },
      { name: 'DBBL Debit', type: 'debit', balance: 45000, color: '#3b82f6', icon: '💳', isDefault: false },
      { name: 'City Bank Credit', type: 'credit', balance: 12000, color: '#8b5cf6', icon: '💳', isDefault: false },
      { name: 'bKash', type: 'mobile', balance: 8000, color: '#e91e63', icon: '📱', isDefault: false },
      { name: 'Nagad', type: 'mobile', balance: 3000, color: '#f97316', icon: '📱', isDefault: false },
    ],
  },
]

/**
 * Idempotent seed endpoint — ensures test users exist with correct data.
 * Safe to call on every app start. Uses upsert logic:
 * - If user exists: update password and ensure verified
 * - If user doesn't exist: create with default accounts
 */
export async function POST(request: NextRequest) {
  try {
    // Wait for the Turso schema to be created before the first query on a
    // freshly provisioned database.
    await ensureDbReady()

    // Skip re-seeding only once the test user exists, is verified, AND its
    // password is already stored as a modern bcrypt hash. This guarantees that
    // test users seeded under the old SHA-256 scheme get their passwords
    // refreshed to bcrypt exactly once, so login works reliably afterward.
    const existingCorporate = await db.user.findUnique({ where: { email: 'corporate@test.com' } })
    if (existingCorporate?.emailVerified && existingCorporate.password && isBcryptHash(existingCorporate.password)) {
      return NextResponse.json({ success: true, message: 'Users already seeded, skipping', skipped: true })
    }

    const results: { email: string; status: string; password?: string }[] = []

    for (const userData of TEST_USERS) {
      const hashedPassword = await hashPassword(userData.password)
      const existing = await db.user.findUnique({ where: { email: userData.email } })

      if (existing) {
        // Update password and ensure verified
        await db.user.update({
          where: { id: existing.id },
          data: { password: hashedPassword, emailVerified: new Date() },
        })

        // Ensure accounts exist (add missing ones, don't duplicate)
        const existingAccounts = await db.account.findMany({ where: { userId: existing.id } })
        const existingNames = new Set(existingAccounts.map(a => a.name))
        for (const account of userData.accounts) {
          if (!existingNames.has(account.name)) {
            await db.account.create({
              data: { userId: existing.id, ...account },
            })
          }
        }

        results.push({ email: userData.email, status: 'updated' })
        continue
      }

      // Create new user with accounts
      const user = await db.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          provider: 'email',
          emailVerified: new Date(),
        },
      })

      await db.account.createMany({
        data: userData.accounts.map(a => ({ userId: user.id, ...a })),
      })

      results.push({ email: userData.email, status: 'created', password: userData.password })
    }

    return NextResponse.json({ success: true, users: results })
  } catch (error) {
    console.error('Error seeding data:', error)
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 })
  }
}

// Also support GET for easy browser testing
export async function GET(request: NextRequest) {
  return POST(request)
}
