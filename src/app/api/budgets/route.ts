import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/budgets - Get budgets for a month
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // "2026-06"

    const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    let budgets: any[]
    try {
      budgets = await db.budget.findMany({
        where: { userId: user.id, month: currentMonth },
        orderBy: { category: 'asc' },
        include: { goal: { select: { id: true, name: true, icon: true } } },
      })
    } catch {
      // Fallback if goalId column doesn't exist yet
      budgets = await db.budget.findMany({
        where: { userId: user.id, month: currentMonth },
        orderBy: { category: 'asc' },
      })
    }

    // Get current month spending per category
    const startDate = new Date(`${currentMonth}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    const expenses = await db.transaction.findMany({
      where: {
        userId: user.id,
        type: 'expense',
        date: { gte: startDate, lt: endDate },
      },
    })

    const categorySpending: Record<string, number> = {}
    expenses.forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount
    })

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)

    // Enrich budgets with spending data
    const enrichedBudgets = budgets.map(b => ({
      ...b,
      spent: categorySpending[b.category] || 0,
      remaining: b.amount - (categorySpending[b.category] || 0),
      percentUsed: b.amount > 0 ? Math.round(((categorySpending[b.category] || 0) / b.amount) * 100) : 0,
    }))

    const totalBudget = budgets.filter(b => !b.isIgnored).reduce((sum, b) => sum + b.amount, 0)

    return NextResponse.json({
      budgets: enrichedBudgets,
      totalBudget,
      totalSpent: totalExpense,
      categorySpending,
      month: currentMonth,
    })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

// POST /api/budgets - Create or update a budget
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { month, category, amount, isIgnored, goalId } = body

    // Upsert budget
    const existing = await db.budget.findFirst({
      where: { userId: user.id, month, category },
    })

    let budget
    if (existing) {
      budget = await db.budget.update({
        where: { id: existing.id },
        data: {
          amount,
          isIgnored: isIgnored ?? existing.isIgnored,
          ...(goalId !== undefined && { goalId: goalId || null }),
        },
        include: { goal: { select: { id: true, name: true, icon: true } } },
      })
    } else {
      budget = await db.budget.create({
        data: {
          userId: user.id,
          month,
          category,
          amount,
          isIgnored: isIgnored || false,
          ...(goalId && goalId !== 'none' && { goalId }),
        },
        include: { goal: { select: { id: true, name: true, icon: true } } },
      })
    }

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}

// PUT /api/budgets - Update budget (ignore/unignore)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { budgetId, isIgnored, amount, goalId } = body

    // Verify budget belongs to user
    const existing = await db.budget.findUnique({ where: { id: budgetId } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const budget = await db.budget.update({
      where: { id: budgetId },
      data: {
        ...(isIgnored !== undefined && { isIgnored }),
        ...(amount !== undefined && { amount }),
        ...(goalId !== undefined && { goalId: goalId || null }),
      },
      include: { goal: { select: { id: true, name: true, icon: true } } },
    })

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
  }
}

// DELETE /api/budgets - Delete a budget
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get('id')

    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID required' }, { status: 400 })
    }

    // Verify budget belongs to user
    const existing = await db.budget.findUnique({ where: { id: budgetId } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    await db.budget.delete({ where: { id: budgetId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
  }
}
