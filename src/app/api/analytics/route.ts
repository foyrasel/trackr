import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // format: '2026-01'

    const now = new Date()
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    const startDate = new Date(`${currentMonth}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    // Get all transactions for the month
    const transactions = await db.transaction.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: 'desc' },
    })

    // Separate expenses and income
    const expenses = transactions.filter(t => t.type === 'expense')
    const income = transactions.filter(t => t.type === 'income')

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)

    // 50/30/20 Breakdown (Need/Want+Ego/Savings)
    const needTotal = expenses.filter(t => t.classification === 'need').reduce((sum, t) => sum + t.amount, 0)
    const wantTotal = expenses.filter(t => t.classification === 'want').reduce((sum, t) => sum + t.amount, 0)
    const egoTotal = expenses.filter(t => t.classification === 'ego').reduce((sum, t) => sum + t.amount, 0)
    const savingsTotal = expenses.filter(t => t.classification === 'savings').reduce((sum, t) => sum + t.amount, 0)
    const debtTotal = expenses.filter(t => t.classification === 'debt').reduce((sum, t) => sum + t.amount, 0)

    // Category breakdown for expenses
    const categoryBreakdown: Record<string, number> = {}
    expenses.forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount
    })

    // Income source breakdown
    const incomeBreakdown: Record<string, number> = {}
    income.forEach(t => {
      incomeBreakdown[t.category] = (incomeBreakdown[t.category] || 0) + t.amount
    })

    // Spending type breakdown
    const spendingTypeBreakdown: Record<string, number> = {}
    expenses.forEach(t => {
      spendingTypeBreakdown[t.spendingType] = (spendingTypeBreakdown[t.spendingType] || 0) + t.amount
    })

    // Daily spending trend for the month
    const dailySpending: Record<string, number> = {}
    expenses.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0]
      dailySpending[day] = (dailySpending[day] || 0) + t.amount
    })

    // Alerts / Insights
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
      alerts,
      transactionCount: transactions.length,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
