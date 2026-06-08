import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/accounts - Get all accounts for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default'

    // Find or create default user
    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: { name: 'User', provider: 'demo' },
      })
      await db.account.createMany({
        data: [
          { userId: user.id, name: 'Cash', type: 'cash', balance: 0, color: '#10b981', icon: '💵', isDefault: true },
          { userId: user.id, name: 'Debit Card', type: 'debit', balance: 0, color: '#3b82f6', icon: '💳', isDefault: false },
          { userId: user.id, name: 'Credit Card', type: 'credit', balance: 0, color: '#8b5cf6', icon: '💳', isDefault: false },
        ],
      })
    }

    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: { isDefault: 'desc' },
    })

    return NextResponse.json({ accounts, userId: user.id })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

// POST /api/accounts - Create or update account balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, balance, name, color, icon } = body

    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if account type already exists
    const existing = await db.account.findFirst({
      where: { userId: user.id, type },
    })

    if (existing) {
      const updated = await db.account.update({
        where: { id: existing.id },
        data: { balance, name: name || existing.name, color: color || existing.color, icon: icon || existing.icon },
      })
      return NextResponse.json({ account: updated })
    }

    const account = await db.account.create({
      data: {
        userId: user.id,
        name: name || type,
        type,
        balance: balance || 0,
        color: color || '#10b981',
        icon: icon || '💵',
        isDefault: type === 'cash',
      },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

// PUT /api/accounts - Update balance (add/subtract)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, amount, operation } = body // operation: 'add' or 'subtract'

    const account = await db.account.findUnique({ where: { id: accountId } })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const newBalance = operation === 'add'
      ? account.balance + amount
      : account.balance - amount

    const updated = await db.account.update({
      where: { id: accountId },
      data: { balance: newBalance },
    })

    return NextResponse.json({ account: updated })
  } catch (error) {
    console.error('Error updating account balance:', error)
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
  }
}
