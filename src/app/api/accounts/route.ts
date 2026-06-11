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

    // Auto-migrate: Add Mobile Wallet account for existing users who don't have one
    const hasMobile = accounts.some(a => a.type === 'mobile')
    if (!hasMobile) {
      await db.account.create({
        data: {
          userId: user.id,
          name: 'Mobile Wallet',
          type: 'mobile',
          balance: 0,
          color: '#a855f7',
          icon: '📱',
          isDefault: false,
        },
      })
      // Re-fetch to include the new account
      const updatedAccounts = await db.account.findMany({
        where: { userId: user.id },
        orderBy: { isDefault: 'desc' },
      })
      return NextResponse.json({ accounts: updatedAccounts, userId: user.id })
    }

    return NextResponse.json({ accounts, userId: user.id })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

// POST /api/accounts - Create a new account (always creates, never upserts)
// If `updateExistingId` is provided, updates that account instead (used by AccountSetup wizard)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, balance, name, color, icon, updateExistingId } = body

    // If updateExistingId is provided, update that specific account (for AccountSetup wizard)
    if (updateExistingId) {
      const existing = await db.account.findUnique({ where: { id: updateExistingId } })
      if (!existing || existing.userId !== user.id) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }
      const updated = await db.account.update({
        where: { id: updateExistingId },
        data: {
          balance: balance !== undefined ? balance : existing.balance,
          name: name || existing.name,
          color: color || existing.color,
          icon: icon || existing.icon,
          type: type || existing.type,
        },
      })
      return NextResponse.json({ account: updated })
    }

    // Always create a new account - allow multiple accounts of the same type
    const account = await db.account.create({
      data: {
        userId: user.id,
        name: name || type,
        type,
        balance: balance || 0,
        color: color || '#10b981',
        icon: icon || '💵',
        isDefault: false, // New accounts are never default
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

// DELETE /api/accounts - Delete a custom account
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400 })
    }

    const account = await db.account.findUnique({ where: { id } })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify ownership
    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Don't allow deleting default accounts
    if (account.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default accounts' },
        { status: 400 }
      )
    }

    // Transfer remaining balance to cash account if balance > 0
    if (account.balance > 0) {
      const cashAccount = await db.account.findFirst({
        where: { userId: user.id, type: 'cash' },
      })

      if (cashAccount) {
        await db.account.update({
          where: { id: cashAccount.id },
          data: { balance: cashAccount.balance + account.balance },
        })
      }
    }

    await db.account.delete({ where: { id } })

    return NextResponse.json({ success: true, deletedId: id })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}

// PATCH /api/accounts - Update account details (name, icon, color)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, icon, color } = body

    if (!id) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400 })
    }

    const account = await db.account.findUnique({ where: { id } })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify ownership
    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update. Provide name, icon, or color.' },
        { status: 400 }
      )
    }

    const updated = await db.account.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ account: updated })
  } catch (error) {
    console.error('Error updating account details:', error)
    return NextResponse.json({ error: 'Failed to update account details' }, { status: 500 })
  }
}
