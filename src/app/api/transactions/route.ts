import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'expense' or 'income'
    const category = searchParams.get('category')
    const month = searchParams.get('month') // format: '2026-01'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}

    if (type) where.type = type
    if (category) where.category = category
    if (month) {
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
    const body = await request.json()
    const { type, amount, description, category, spendingType, classification, date, isRecurring } = body

    if (!type || !amount || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: type, amount, description, category' },
        { status: 400 }
      )
    }

    const transaction = await db.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        category,
        spendingType: spendingType || 'cash',
        classification: classification || (type === 'income' ? 'income' : 'need'),
        date: date ? new Date(date) : new Date(),
        isRecurring: isRecurring || false,
      },
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
