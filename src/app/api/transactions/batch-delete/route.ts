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
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Transaction IDs are required' }, { status: 400 })
    }

    // Fetch all transactions to verify ownership and reverse balance effects
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: ids },
      },
    })

    // Verify all transactions belong to this user
    const ownedTransactions = transactions.filter(tx => tx.userId === user.id)
    const unownedCount = transactions.length - ownedTransactions.length

    if (ownedTransactions.length === 0) {
      return NextResponse.json({ error: 'No valid transactions found' }, { status: 404 })
    }

    // Reverse balance effects for each transaction
    for (const transaction of ownedTransactions) {
      const account = await db.account.findFirst({
        where: { userId: user.id, type: transaction.spendingType },
      })

      if (account) {
        if (transaction.type === 'expense') {
          const newBalance = transaction.spendingType === 'credit'
            ? account.balance - transaction.amount // Credit card: reduce debt
            : account.balance + transaction.amount // Cash/Debit: add back
          await db.account.update({
            where: { id: account.id },
            data: { balance: newBalance },
          })
        } else if (transaction.type === 'income') {
          await db.account.update({
            where: { id: account.id },
            data: { balance: account.balance - transaction.amount },
          })
        }
      }
    }

    // Delete all owned transactions
    const result = await db.transaction.deleteMany({
      where: {
        id: { in: ownedTransactions.map(tx => tx.id) },
      },
    })

    return NextResponse.json({
      deleted: result.count,
      skipped: unownedCount,
    })
  } catch (error) {
    console.error('Error batch deleting transactions:', error)
    return NextResponse.json({ error: 'Failed to delete transactions' }, { status: 500 })
  }
}
