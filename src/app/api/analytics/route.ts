import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    const now = new Date()
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    const startDate = new Date(`${currentMonth}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    // Get all transactions for the current month
    const transactions = await db.transaction.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: 'desc' },
    })

    const expenses = transactions.filter(t => t.type === 'expense')
    const income = transactions.filter(t => t.type === 'income')

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)

    const needTotal = expenses.filter(t => t.classification === 'need').reduce((sum, t) => sum + t.amount, 0)
    const wantTotal = expenses.filter(t => t.classification === 'want').reduce((sum, t) => sum + t.amount, 0)
    const egoTotal = expenses.filter(t => t.classification === 'ego').reduce((sum, t) => sum + t.amount, 0)
    const savingsTotal = expenses.filter(t => t.classification === 'savings').reduce((sum, t) => sum + t.amount, 0)
    const debtTotal = expenses.filter(t => t.classification === 'debt').reduce((sum, t) => sum + t.amount, 0)

    const categoryBreakdown: Record<string, number> = {}
    expenses.forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount
    })

    const incomeBreakdown: Record<string, number> = {}
    income.forEach(t => {
      incomeBreakdown[t.category] = (incomeBreakdown[t.category] || 0) + t.amount
    })

    const spendingTypeBreakdown: Record<string, number> = {}
    expenses.forEach(t => {
      spendingTypeBreakdown[t.spendingType] = (spendingTypeBreakdown[t.spendingType] || 0) + t.amount
    })

    const dailySpending: Record<string, number> = {}
    expenses.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0]
      dailySpending[day] = (dailySpending[day] || 0) + t.amount
    })

    // Alerts
    const alerts: string[] = []
    
    if (totalIncome > 0) {
      const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100
      if (savingsRate < 20) {
        alerts.push(`Your savings rate is only ${savingsRate.toFixed(1)}% this month. Aim for at least 20%.`)
      }
    }

    if (totalExpense > 0 && egoTotal / totalExpense > 0.30) {
      alerts.push(`Your ego spending is ${((egoTotal / totalExpense) * 100).toFixed(1)}% this month — focus here to reach 30%.`)
    }

    if (totalExpense > 0 && wantTotal / totalExpense > 0.30) {
      alerts.push(`Your want spending is ${((wantTotal / totalExpense) * 100).toFixed(1)}% — consider cutting back to stay under 30%.`)
    }

    if (totalIncome > 0 && totalExpense / totalIncome > 0.9) {
      alerts.push(`You're spending ${(totalExpense / totalIncome * 100).toFixed(1)}% of your income. Danger zone!`)
    }

    if (debtTotal > 0 && totalIncome > 0 && debtTotal / totalIncome > 0.3) {
      alerts.push(`Debt repayment is ${((debtTotal / totalIncome) * 100).toFixed(1)}% of income. Prioritize debt reduction.`)
    }

    // Get last 6 months trend data
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const allRecentTransactions = await db.transaction.findMany({
      where: {
        date: { gte: sixMonthsAgo },
      },
      orderBy: { date: 'asc' },
    })

    // Monthly trend
    const monthlyTrend: Record<string, { income: number; expense: number }> = {}
    allRecentTransactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = { income: 0, expense: 0 }
      if (t.type === 'income') monthlyTrend[monthKey].income += t.amount
      else monthlyTrend[monthKey].expense += t.amount
    })

    // Calculate average monthly expense (excluding current month)
    const pastMonths = Object.entries(monthlyTrend)
      .filter(([monthKey]) => monthKey !== currentMonth)
    
    const averageMonthlyExpense = pastMonths.length > 0
      ? pastMonths.reduce((sum, [_, v]) => sum + v.expense, 0) / pastMonths.length
      : 0

    // Category comparison: current month vs average
    // Get past months' category breakdown
    const pastExpenses = allRecentTransactions.filter(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      return t.type === 'expense' && monthKey !== currentMonth
    })

    const pastCategoryBreakdown: Record<string, number> = {}
    pastExpenses.forEach(t => {
      pastCategoryBreakdown[t.category] = (pastCategoryBreakdown[t.category] || 0) + t.amount
    })

    // Average category breakdown (per month)
    const avgCategoryBreakdown: Record<string, number> = {}
    if (pastMonths.length > 0) {
      Object.entries(pastCategoryBreakdown).forEach(([cat, total]) => {
        avgCategoryBreakdown[cat] = total / pastMonths.length
      })
    }

    // Classification comparison: current vs average
    const pastNeed = pastExpenses.filter(t => t.classification === 'need').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths.length, 1)
    const pastWant = pastExpenses.filter(t => t.classification === 'want').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths.length, 1)
    const pastEgo = pastExpenses.filter(t => t.classification === 'ego').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths.length, 1)
    const pastSavings = pastExpenses.filter(t => t.classification === 'savings').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths.length, 1)
    const pastDebt = pastExpenses.filter(t => t.classification === 'debt').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths.length, 1)

    return NextResponse.json({
      currentMonth,
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
      classificationBreakdown: {
        need: needTotal,
        want: wantTotal,
        ego: egoTotal,
        savings: savingsTotal,
        debt: debtTotal,
      },
      categoryBreakdown,
      incomeBreakdown,
      spendingTypeBreakdown,
      dailySpending,
      monthlyTrend,
      averageMonthlyExpense,
      avgCategoryBreakdown,
      avgClassificationBreakdown: {
        need: pastNeed,
        want: pastWant,
        ego: pastEgo,
        savings: pastSavings,
        debt: pastDebt,
      },
      alerts,
      transactionCount: transactions.length,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
