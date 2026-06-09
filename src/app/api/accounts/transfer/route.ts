import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fromAccountId, toAccountId, amount } = body

    if (!fromAccountId || !toAccountId || !amount) {
      return NextResponse.json({ error: 'fromAccountId, toAccountId, and amount are required' }, { status: 400 })
    }

    const transferAmount = parseFloat(amount)
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: 'Cannot transfer to the same account' }, { status: 400 })
    }

    // Fetch both accounts
    const fromAccount = await db.account.findUnique({ where: { id: fromAccountId } })
    const toAccount = await db.account.findUnique({ where: { id: toAccountId } })

    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: 'One or both accounts not found' }, { status: 404 })
    }

    // Verify both accounts belong to the user
    if (fromAccount.userId !== user.id || toAccount.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - accounts do not belong to user' }, { status: 403 })
    }

    // Check sufficient balance for non-credit accounts
    if (fromAccount.type !== 'credit' && fromAccount.balance < transferAmount) {
      return NextResponse.json({ error: 'Insufficient balance in source account' }, { status: 400 })
    }

    // Perform atomic balance updates
    // Deduct from source
    const newFromBalance = fromAccount.type === 'credit'
      ? fromAccount.balance + transferAmount // For credit cards, transferring "from" means adding to debt
      : fromAccount.balance - transferAmount

    // Add to destination
    const newToBalance = toAccount.type === 'credit'
      ? toAccount.balance - transferAmount // For credit cards, transferring "to" means reducing debt
      : toAccount.balance + transferAmount

    // Update both accounts
    const [updatedFrom, updatedTo] = await Promise.all([
      db.account.update({
        where: { id: fromAccountId },
        data: { balance: newFromBalance },
      }),
      db.account.update({
        where: { id: toAccountId },
        data: { balance: newToBalance },
      }),
    ])

    return NextResponse.json({
      success: true,
      from: { id: updatedFrom.id, name: updatedFrom.name, balance: updatedFrom.balance },
      to: { id: updatedTo.id, name: updatedTo.name, balance: updatedTo.balance },
    })
  } catch (error) {
    console.error('Error transferring between accounts:', error)
    return NextResponse.json({ error: 'Failed to transfer' }, { status: 500 })
  }
}
