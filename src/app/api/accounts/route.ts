import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, balance, name, color, icon } = body

    // Check if account type already exists for this user
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
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { accountId, amount, operation } = body // operation: 'add' or 'subtract'

    const account = await db.account.findUnique({ where: { id: accountId } })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify the account belongs to the current user
    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
