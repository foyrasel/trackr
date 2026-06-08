import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    // Verify the transaction belongs to this user
    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const body = await request.json()
    const { type, amount, description, category, spendingType, classification, date, isRecurring, receiptUrl } = body

    // If amount or spendingType changed, we need to reverse the old balance effect and apply the new one
    if (amount !== undefined || spendingType !== undefined || type !== undefined) {
      // Reverse old transaction effect
      const oldAccount = await db.account.findFirst({
        where: { userId: user.id, type: existing.spendingType },
      })
      if (oldAccount) {
        if (existing.type === 'expense') {
          const reversal = existing.spendingType === 'credit'
            ? oldAccount.balance - existing.amount
            : oldAccount.balance + existing.amount
          await db.account.update({
            where: { id: oldAccount.id },
            data: { balance: reversal },
          })
        } else if (existing.type === 'income') {
          await db.account.update({
            where: { id: oldAccount.id },
            data: { balance: oldAccount.balance - existing.amount },
          })
        }
      }

      // Apply new transaction effect
      const newType = type || existing.type
      const newAmount = amount !== undefined ? parseFloat(amount) : existing.amount
      const newSpendingType = spendingType || existing.spendingType

      const newAccount = await db.account.findFirst({
        where: { userId: user.id, type: newSpendingType },
      })
      if (newAccount) {
        if (newType === 'expense') {
          const newBalance = newSpendingType === 'credit'
            ? newAccount.balance + newAmount
            : newAccount.balance - newAmount
          await db.account.update({
            where: { id: newAccount.id },
            data: { balance: newBalance },
          })
        } else if (newType === 'income') {
          await db.account.update({
            where: { id: newAccount.id },
            data: { balance: newAccount.balance + newAmount },
          })
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (type !== undefined) updateData.type = type
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (spendingType !== undefined) updateData.spendingType = spendingType
    if (classification !== undefined) updateData.classification = classification
    if (date !== undefined) updateData.date = new Date(date)
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl || null

    const transaction = await db.transaction.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the transaction first to reverse its effect on account balance
    const transaction = await db.transaction.findUnique({ where: { id } })

    if (!transaction || transaction.userId !== user.id) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Reverse the balance effect
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

    await db.transaction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
