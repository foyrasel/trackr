import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  processDueRecurringTransactions,
  computeNextExecutionDate,
} from '@/lib/recurring-utils'

// GET - List all recurring transactions for the user.
// Also processes any due recurring transactions (auto-creates transactions).
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process any due recurring transactions first
    const createdCount = await processDueRecurringTransactions(user.id)

    // Fetch all recurring transactions for the user
    const recurringTransactions = await db.recurringTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    // Add computed nextExecutionDate to each
    const enriched = recurringTransactions.map((rt) => ({
      ...rt,
      nextExecutionDate: computeNextExecutionDate(rt),
    }))

    return NextResponse.json({
      recurringTransactions: enriched,
      autoCreatedCount: createdCount,
    })
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring transactions' },
      { status: 500 }
    )
  }
}

// POST - Create a new recurring transaction
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      type,
      amount,
      description,
      category,
      spendingType,
      classification,
      frequency,
      dayOfMonth,
      dayOfWeek,
      startDate,
      endDate,
    } = body

    // Validate required fields
    if (!type || !amount || !description || !category || !frequency) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: type, amount, description, category, frequency',
        },
        { status: 400 }
      )
    }

    // Validate type
    if (!['expense', 'income'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "expense" or "income"' },
        { status: 400 }
      )
    }

    // Validate frequency
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Frequency must be "daily", "weekly", "monthly", or "yearly"' },
        { status: 400 }
      )
    }

    const recurring = await db.recurringTransaction.create({
      data: {
        userId: user.id,
        type,
        amount: parseFloat(amount),
        description,
        category,
        spendingType: spendingType || 'cash',
        classification: classification || (type === 'income' ? 'income' : 'need'),
        frequency,
        dayOfMonth: dayOfMonth ?? 1,
        dayOfWeek: dayOfWeek ?? null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        recurringTransaction: {
          ...recurring,
          nextExecutionDate: computeNextExecutionDate(recurring),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating recurring transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create recurring transaction' },
      { status: 500 }
    )
  }
}

// PUT - Update a recurring transaction (toggle isActive, change amount, etc.)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, type, amount, description, category, spendingType, classification, frequency, dayOfMonth, dayOfWeek, startDate, endDate, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await db.recurringTransaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Recurring transaction not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (type !== undefined) {
      if (!['expense', 'income'].includes(type)) {
        return NextResponse.json(
          { error: 'Type must be "expense" or "income"' },
          { status: 400 }
        )
      }
      updateData.type = type
    }
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (spendingType !== undefined) updateData.spendingType = spendingType
    if (classification !== undefined) updateData.classification = classification
    if (frequency !== undefined) {
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
        return NextResponse.json(
          { error: 'Frequency must be "daily", "weekly", "monthly", or "yearly"' },
          { status: 400 }
        )
      }
      updateData.frequency = frequency
    }
    if (dayOfMonth !== undefined) updateData.dayOfMonth = parseInt(dayOfMonth)
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.recurringTransaction.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      recurringTransaction: {
        ...updated,
        nextExecutionDate: computeNextExecutionDate(updated),
      },
    })
  } catch (error) {
    console.error('Error updating recurring transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update recurring transaction' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a recurring transaction
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await db.recurringTransaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Recurring transaction not found' },
        { status: 404 }
      )
    }

    await db.recurringTransaction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recurring transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete recurring transaction' },
      { status: 500 }
    )
  }
}
