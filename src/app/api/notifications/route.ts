import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/notifications - Generate spending summary notification
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'weekly' // 'weekly' or 'monthly'

    const now = new Date()
    let startDate: Date

    if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
    }

    // Fetch transactions for the period
    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate, lt: now },
      },
      orderBy: { date: 'desc' },
    })

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    // Category breakdown for expenses
    const categoryMap: Record<string, number> = {}
    for (const t of transactions.filter(t => t.type === 'expense')) {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
    }

    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Get upcoming reminders
    const reminders = await db.reminder.findMany({
      where: {
        userId: user.id,
        isPaid: false,
        isDismissed: false,
        dueDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    })

    // Get active lend/borrow records with upcoming due dates
    const lendBorrows = await db.lendBorrow.findMany({
      where: {
        userId: user.id,
        isSettled: false,
        dueDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    })

    // Classification breakdown
    const classificationMap: Record<string, number> = {}
    for (const t of transactions.filter(t => t.type === 'expense')) {
      classificationMap[t.classification] = (classificationMap[t.classification] || 0) + t.amount
    }

    // Savings rate
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0

    // Day with most spending
    const dayMap: Record<string, number> = {}
    for (const t of transactions.filter(t => t.type === 'expense')) {
      const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' })
      dayMap[day] = (dayMap[day] || 0) + t.amount
    }
    const biggestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]

    const periodLabel = period === 'weekly' ? 'This Week' : 'This Month'
    const dayCount = period === 'weekly' ? 7 : now.getDate()

    return NextResponse.json({
      period,
      periodLabel,
      dayCount,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        savingsRate,
        transactionCount: transactions.length,
        avgDailySpending: totalExpense / Math.max(dayCount, 1),
      },
      topCategories,
      classificationBreakdown: classificationMap,
      biggestSpendingDay: biggestDay || null,
      upcomingReminders: reminders,
      upcomingLendBorrows: lendBorrows,
    })
  } catch (error) {
    console.error('Error generating notification summary:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
