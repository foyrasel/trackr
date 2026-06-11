import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'expense' or 'income'
    const category = searchParams.get('category')
    const month = searchParams.get('month') // format: '2026-01'
    const search = searchParams.get('search') // search by description or person name
    const fromDate = searchParams.get('fromDate') // format: '2026-01-01'
    const toDate = searchParams.get('toDate') // format: '2026-01-31'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { userId: user.id }

    if (type) where.type = type
    if (category) where.category = category
    if (search) {
      where.description = { contains: search, mode: 'insensitive' }
    }

    // Date range filtering
    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) {
        // Include the entire end day
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      // If both month and date range are specified, date range takes precedence
      where.date = dateFilter
    } else if (month) {
      const startDate = new Date(`${month}-01`)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      where.date = { gte: startDate, lt: endDate }
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({ transactions, total })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, amount, description, category, spendingType, classification, date, isRecurring, receiptUrl, accountId } = body

    if (!type || !amount || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: type, amount, description, category' },
        { status: 400 }
      )
    }

    // Resolve the target account. Prefer the explicit accountId (so a specific
    // account like bKash vs Nagad is debited); fall back to the first account
    // matching the spendingType for older clients that don't send accountId.
    let account: Awaited<ReturnType<typeof db.account.findFirst>> = null
    if (accountId) {
      account = await db.account.findFirst({ where: { id: accountId, userId: user.id } })
    }
    if (!account) {
      account = await db.account.findFirst({
        where: { userId: user.id, type: spendingType || 'cash' },
      })
    }

    // Keep spendingType consistent with the chosen account's type so analytics
    // (payment-method breakdown) stays accurate.
    const resolvedSpendingType = account?.type || spendingType || 'cash'

    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type,
        amount: parseFloat(amount),
        description,
        category,
        spendingType: resolvedSpendingType,
        accountId: account?.id || null,
        classification: classification || (type === 'income' ? 'income' : 'need'),
        date: date ? new Date(date) : new Date(),
        isRecurring: isRecurring || false,
        ...(receiptUrl ? { receiptUrl } : {}),
      },
    })

    // Update account balance
    if (account) {
      const accountType = account.type
      if (type === 'expense') {
        const newBalance = accountType === 'credit'
          ? account.balance + parseFloat(amount) // Credit card: increase balance = more debt
          : account.balance - parseFloat(amount) // Cash/Debit: decrease balance
        await db.account.update({
          where: { id: account.id },
          data: { balance: newBalance },
        })
      } else if (type === 'income') {
        await db.account.update({
          where: { id: account.id },
          data: { balance: account.balance + parseFloat(amount) },
        })
      }
    }

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
