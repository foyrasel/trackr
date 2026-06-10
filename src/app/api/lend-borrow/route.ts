import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/lend-borrow - List all lend/borrow records with computed fields
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'lend' or 'borrow'
    const settled = searchParams.get('settled') // 'true' or 'false'

    const where: Record<string, unknown> = { userId: user.id }
    if (type) where.type = type
    if (settled !== null && settled !== undefined) {
      where.isSettled = settled === 'true'
    }

    const records = await db.lendBorrow.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { account: { select: { id: true, name: true, type: true } } },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const enriched = records.map((record) => {
      const dueDate = record.dueDate ? new Date(record.dueDate) : null
      let daysUntilDue: number | null = null
      let isOverdue = false

      if (dueDate && !record.isSettled) {
        dueDate.setHours(0, 0, 0, 0)
        daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
        isOverdue = daysUntilDue < 0
      }

      return {
        ...record,
        daysUntilDue,
        isOverdue,
      }
    })

    // Summary
    const totalLent = records
      .filter((r) => r.type === 'lend' && !r.isSettled)
      .reduce((sum, r) => sum + r.amount, 0)
    const totalBorrowed = records
      .filter((r) => r.type === 'borrow' && !r.isSettled)
      .reduce((sum, r) => sum + r.amount, 0)
    const overdueCount = enriched.filter((r) => r.isOverdue).length

    return NextResponse.json({
      records: enriched,
      summary: { totalLent, totalBorrowed, overdueCount },
    })
  } catch (error) {
    console.error('Error fetching lend/borrow records:', error)
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
  }
}

// POST /api/lend-borrow - Create a new lend/borrow record
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, amount, person, description, date, dueDate, accountId } = body

    if (!type || !amount || !person) {
      return NextResponse.json(
        { error: 'Type, amount, and person name are required' },
        { status: 400 }
      )
    }

    if (!['lend', 'borrow'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "lend" or "borrow"' },
        { status: 400 }
      )
    }

    const record = await db.lendBorrow.create({
      data: {
        userId: user.id,
        type,
        amount: parseFloat(String(amount)),
        person,
        description: description || '',
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        isSettled: false,
        accountId: accountId || null,
      },
      include: { account: { select: { id: true, name: true, type: true } } },
    })

    // Update account balance if accountId provided
    if (accountId) {
      const account = await db.account.findUnique({ where: { id: accountId } })
      if (account && account.userId === user.id) {
        if (type === 'lend') {
          // Lending: deduct from account
          await db.account.update({
            where: { id: accountId },
            data: { balance: account.balance - parseFloat(String(amount)) },
          })
        } else {
          // Borrowing: add to account
          await db.account.update({
            where: { id: accountId },
            data: { balance: account.balance + parseFloat(String(amount)) },
          })
        }
      }
    }

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error('Error creating lend/borrow record:', error)
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }
}

// PUT /api/lend-borrow - Update a lend/borrow record (settle, edit, etc.)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, type, amount, person, description, date, dueDate, isSettled, settledDate, accountId } = body

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.lendBorrow.findUnique({ 
      where: { id },
      include: { account: { select: { id: true, name: true } } },
    })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // When settling: reverse the account balance change
    if (isSettled === true && !existing.isSettled && existing.accountId) {
      const account = await db.account.findUnique({ where: { id: existing.accountId } })
      if (account) {
        if (existing.type === 'lend') {
          // Settling a lend: money comes back to account
          await db.account.update({
            where: { id: existing.accountId },
            data: { balance: account.balance + existing.amount },
          })
        } else {
          // Settling a borrow: money goes out from account
          await db.account.update({
            where: { id: existing.accountId },
            data: { balance: account.balance - existing.amount },
          })
        }
      }
    }

    const record = await db.lendBorrow.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(amount !== undefined && { amount: parseFloat(String(amount)) }),
        ...(person !== undefined && { person }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isSettled !== undefined && { isSettled }),
        ...(settledDate !== undefined && { settledDate: settledDate ? new Date(settledDate) : null }),
        ...(isSettled === true && !existing.isSettled && { settledDate: new Date() }),
        ...(accountId !== undefined && { accountId: accountId || null }),
      },
      include: { account: { select: { id: true, name: true, type: true } } },
    })

    return NextResponse.json({ record })
  } catch (error) {
    console.error('Error updating lend/borrow record:', error)
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}

// DELETE /api/lend-borrow - Delete a lend/borrow record
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.lendBorrow.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // If not settled and has account, reverse the balance change
    if (!existing.isSettled && existing.accountId) {
      const account = await db.account.findUnique({ where: { id: existing.accountId } })
      if (account) {
        if (existing.type === 'lend') {
          // Was lent from account, add back
          await db.account.update({
            where: { id: existing.accountId },
            data: { balance: account.balance + existing.amount },
          })
        } else {
          // Was borrowed to account, remove
          await db.account.update({
            where: { id: existing.accountId },
            data: { balance: account.balance - existing.amount },
          })
        }
      }
    }

    await db.lendBorrow.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lend/borrow record:', error)
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}
