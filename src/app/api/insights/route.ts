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
    const month = searchParams.get('month')
    const category = searchParams.get('category') || undefined

    const now = new Date()
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const startDate = new Date(`${currentMonth}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    const currentYear = startDate.getFullYear()
    const currentMonthNum = startDate.getMonth() + 1
    const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate()

    // ── Fetch current month transactions ──
    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate, lt: endDate },
        ...(category ? { category } : {}),
      },
      orderBy: { date: 'desc' },
    })

    const expenses = transactions.filter(t => t.type === 'expense')
    const income = transactions.filter(t => t.type === 'income')

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)

    const wantTotal = expenses.filter(t => t.classification === 'want').reduce((sum, t) => sum + t.amount, 0)
    const egoTotal = expenses.filter(t => t.classification === 'ego').reduce((sum, t) => sum + t.amount, 0)
    const debtTotal = expenses.filter(t => t.classification === 'debt').reduce((sum, t) => sum + t.amount, 0)
    const savingsClassTotal = expenses.filter(t => t.classification === 'savings').reduce((sum, t) => sum + t.amount, 0)

    // Category breakdown for current month
    const categoryBreakdown: Record<string, number> = {}
    expenses.forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount
    })

    // ── Fetch ALL transactions for historical data ──
    const allTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...(category ? { category } : {}),
      },
      orderBy: { date: 'asc' },
    })

    // Monthly trend data
    const monthlyTrend: Record<string, { income: number; expense: number }> = {}
    allTransactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = { income: 0, expense: 0 }
      if (t.type === 'income') monthlyTrend[monthKey].income += t.amount
      else monthlyTrend[monthKey].expense += t.amount
    })

    // Past months (excluding current)
    const pastMonthKeys = Object.keys(monthlyTrend).filter(mk => mk !== currentMonth)
    const pastMonthsCount = pastMonthKeys.length

    // Average monthly expense
    const averageMonthlyExpense = pastMonthsCount > 0
      ? pastMonthKeys.reduce((sum, mk) => sum + monthlyTrend[mk].expense, 0) / pastMonthsCount
      : 0

    // Average monthly income
    const averageMonthlyIncome = pastMonthsCount > 0
      ? pastMonthKeys.reduce((sum, mk) => sum + monthlyTrend[mk].income, 0) / pastMonthsCount
      : 0

    // Past category averages
    const pastExpenses = allTransactions.filter(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      return t.type === 'expense' && monthKey !== currentMonth
    })
    const pastCategoryBreakdown: Record<string, number> = {}
    pastExpenses.forEach(t => {
      pastCategoryBreakdown[t.category] = (pastCategoryBreakdown[t.category] || 0) + t.amount
    })
    const avgCategoryBreakdown: Record<string, number> = {}
    if (pastMonthsCount > 0) {
      Object.entries(pastCategoryBreakdown).forEach(([cat, total]) => {
        avgCategoryBreakdown[cat] = total / pastMonthsCount
      })
    }

    // ── Fetch budgets ──
    const budgets = await db.budget.findMany({
      where: {
        userId: user.id,
        month: currentMonth,
        isIgnored: false,
      },
    })

    // ── Fetch goals ──
    const goals = await db.goal.findMany({
      where: {
        userId: user.id,
        isCompleted: false,
      },
    })

    // ═══════════════════════════════════════════════════════════
    // 1. FINANCIAL HEALTH SCORE
    // ═══════════════════════════════════════════════════════════

    // Savings rate score (30%)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
    let savingsRateScore: number
    if (savingsRate >= 20) savingsRateScore = 100
    else if (savingsRate >= 10) savingsRateScore = 60
    else if (savingsRate >= 0) savingsRateScore = 30
    else savingsRateScore = 0

    // Spending consistency (20%) - based on std dev of monthly expenses
    let consistencyScore: number
    if (pastMonthsCount >= 2) {
      const monthlyExpenseValues = pastMonthKeys.map(mk => monthlyTrend[mk].expense)
      const avgExp = monthlyExpenseValues.reduce((a, b) => a + b, 0) / monthlyExpenseValues.length
      const variance = monthlyExpenseValues.reduce((sum, v) => sum + Math.pow(v - avgExp, 2), 0) / monthlyExpenseValues.length
      const stdDev = Math.sqrt(variance)
      const coeffOfVariation = avgExp > 0 ? (stdDev / avgExp) * 100 : 0

      if (coeffOfVariation < 20) consistencyScore = 100
      else if (coeffOfVariation < 40) consistencyScore = 70
      else if (coeffOfVariation < 60) consistencyScore = 40
      else consistencyScore = 20
    } else {
      consistencyScore = 50 // neutral for new users
    }

    // Budget adherence (20%)
    let budgetAdherenceScore: number
    if (budgets.length > 0) {
      const adherenceRates = budgets.map(b => {
        const spent = categoryBreakdown[b.category] || 0
        if (b.amount === 0) return 1 // 100% adherence if budget is 0 and spent 0
        return spent <= b.amount ? 1 : b.amount / spent
      })
      budgetAdherenceScore = Math.round((adherenceRates.reduce((a, b) => a + b, 0) / adherenceRates.length) * 100)
    } else {
      budgetAdherenceScore = 50 // neutral
    }

    // Goal progress (15%)
    let goalProgressScore: number
    const allGoals = await db.goal.findMany({ where: { userId: user.id } })
    if (allGoals.length > 0) {
      const progressRates = allGoals.map(g => g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0)
      const avgProgress = progressRates.reduce((a, b) => a + b, 0) / progressRates.length
      goalProgressScore = Math.round(Math.min(avgProgress * 100, 100))
    } else {
      goalProgressScore = 50 // neutral
    }

    // Debt ratio (15%)
    const debtRatio = totalIncome > 0 ? (debtTotal / totalIncome) * 100 : 0
    let debtRatioScore: number
    if (debtRatio === 0) debtRatioScore = 100
    else if (debtRatio < 10) debtRatioScore = 80
    else if (debtRatio < 30) debtRatioScore = 50
    else debtRatioScore = 20

    const healthScore = Math.round(
      savingsRateScore * 0.30 +
      consistencyScore * 0.20 +
      budgetAdherenceScore * 0.20 +
      goalProgressScore * 0.15 +
      debtRatioScore * 0.15
    )

    let healthLabel: string
    let healthColor: string
    if (healthScore >= 80) { healthLabel = 'Excellent'; healthColor = '#10b981' }
    else if (healthScore >= 60) { healthLabel = 'Good'; healthColor = '#3b82f6' }
    else if (healthScore >= 40) { healthLabel = 'Fair'; healthColor = '#f59e0b' }
    else if (healthScore >= 20) { healthLabel = 'Needs Work'; healthColor = '#ef4444' }
    else { healthLabel = 'Critical'; healthColor = '#dc2626' }

    const financialHealthScore = {
      score: healthScore,
      label: healthLabel,
      color: healthColor,
      breakdown: {
        savingsRate: savingsRateScore,
        consistency: consistencyScore,
        budgetAdherence: budgetAdherenceScore,
        goalProgress: goalProgressScore,
        debtRatio: debtRatioScore,
      },
    }

    // ═══════════════════════════════════════════════════════════
    // 2. SPENDING PERSONALITY
    // ═══════════════════════════════════════════════════════════

    const discretionaryTotal = wantTotal + egoTotal
    let weekdayDiscretionary = 0
    let weekendDiscretionary = 0
    let weekdayTotal = 0
    let weekendTotal = 0

    expenses.forEach(t => {
      const dayOfWeek = new Date(t.date).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      if (isWeekend) {
        weekendTotal += t.amount
        if (t.classification === 'want' || t.classification === 'ego') {
          weekendDiscretionary += t.amount
        }
      } else {
        weekdayTotal += t.amount
        if (t.classification === 'want' || t.classification === 'ego') {
          weekdayDiscretionary += t.amount
        }
      }
    })

    const weekendDiscretionaryPct = discretionaryTotal > 0 ? (weekendDiscretionary / discretionaryTotal) * 100 : 0
    const discretionaryPct = totalExpense > 0 ? (discretionaryTotal / totalExpense) * 100 : 0

    // Spending consistency for personality
    let spendingConsistency = 0
    if (pastMonthsCount >= 2) {
      const monthlyExpenseValues = pastMonthKeys.map(mk => monthlyTrend[mk].expense)
      const avgExp = monthlyExpenseValues.reduce((a, b) => a + b, 0) / monthlyExpenseValues.length
      const variance = monthlyExpenseValues.reduce((sum, v) => sum + Math.pow(v - avgExp, 2), 0) / monthlyExpenseValues.length
      const stdDev = Math.sqrt(variance)
      spendingConsistency = avgExp > 0 ? Math.max(0, 100 - (stdDev / avgExp) * 100) : 0
    }

    // Average transaction amount
    const avgTxnAmount = expenses.length > 0 ? totalExpense / expenses.length : 0
    const smallTxns = expenses.filter(t => t.amount < avgTxnAmount * 0.5).length
    const largeTxns = expenses.filter(t => t.amount > avgTxnAmount * 2).length

    let personalityType: string
    let personalityIcon: string
    let personalityDescription: string

    if (weekendDiscretionaryPct > 40) {
      personalityType = 'Weekend Warrior'
      personalityIcon = '🎉'
      personalityDescription = 'You tend to splurge on weekends, spending a significant portion of your discretionary budget on Saturdays and Sundays. Consider setting a weekend spending limit.'
    } else if (discretionaryPct > 50) {
      personalityType = 'Comfort Spender'
      personalityIcon = '🛋️'
      personalityDescription = 'Over half your spending goes to wants and ego purchases. You enjoy comfort and lifestyle spending. Try the 50/30/20 rule to balance your budget.'
    } else if (spendingConsistency > 80 && savingsRate > 15) {
      personalityType = 'Consistent Planner'
      personalityIcon = '📋'
      personalityDescription = 'Your spending is remarkably consistent month-to-month and you maintain a healthy savings rate. You\'re disciplined with your finances.'
    } else if (expenses.length > 0 && smallTxns > expenses.length * 0.6 && spendingConsistency < 50) {
      personalityType = 'Impulse Buyer'
      personalityIcon = ' impuls'
      personalityDescription = 'You make many small purchases with high spending variance, suggesting impulsive buying habits. Try the 24-hour rule before non-essential purchases.'
    } else if (expenses.length > 0 && largeTxns >= 1 && largeTxns / expenses.length > 0.1) {
      personalityType = 'Big Ticket Spender'
      personalityIcon = '💎'
      personalityDescription = 'Your spending is concentrated in a few large purchases. Plan major expenses in advance and look for payment plans to ease the impact.'
    } else {
      personalityType = 'Balanced Spender'
      personalityIcon = '⚖️'
      personalityDescription = 'Your spending patterns are well-balanced across categories and time. You maintain a reasonable mix of needs and wants.'
    }

    const totalWeekdayWeekend = weekdayTotal + weekendTotal
    const spendingPersonality = {
      type: personalityType,
      icon: personalityIcon,
      description: personalityDescription,
      percentageBreakdown: {
        weekday: totalWeekdayWeekend > 0 ? Math.round((weekdayTotal / totalWeekdayWeekend) * 100) : 50,
        weekend: totalWeekdayWeekend > 0 ? Math.round((weekendTotal / totalWeekdayWeekend) * 100) : 50,
      },
    }

    // ═══════════════════════════════════════════════════════════
    // 3. STRENGTHS & WEAKNESSES
    // ═══════════════════════════════════════════════════════════

    const strengths: Array<{ category: string; current: number; average: number; savedAmount: number; percentDiff: number }> = []
    const weaknesses: Array<{ category: string; current: number; average: number; extraAmount: number; percentDiff: number }> = []

    // Only compare categories that appear in both current and average data
    const allCategories = new Set([...Object.keys(categoryBreakdown), ...Object.keys(avgCategoryBreakdown)])
    for (const cat of allCategories) {
      const current = categoryBreakdown[cat] || 0
      const average = avgCategoryBreakdown[cat] || 0

      if (average === 0 && current === 0) continue
      if (average === 0) {
        // New category with no history - skip comparison
        continue
      }

      const percentDiff = ((current - average) / average) * 100

      if (current < average * 0.85) {
        // Strength: spending 15%+ less than average
        strengths.push({
          category: cat,
          current: Math.round(current),
          average: Math.round(average),
          savedAmount: Math.round(average - current),
          percentDiff: Math.round(percentDiff),
        })
      } else if (current > average * 1.15) {
        // Weakness: spending 15%+ more than average
        weaknesses.push({
          category: cat,
          current: Math.round(current),
          average: Math.round(average),
          extraAmount: Math.round(current - average),
          percentDiff: Math.round(percentDiff),
        })
      }
    }

    // Sort by absolute impact
    strengths.sort((a, b) => b.savedAmount - a.savedAmount)
    weaknesses.sort((a, b) => b.extraAmount - a.extraAmount)

    const strengthsAndWeaknesses = { strengths, weaknesses }

    // ═══════════════════════════════════════════════════════════
    // 4. POTENTIAL SAVINGS THIS YEAR
    // ═══════════════════════════════════════════════════════════

    const actions: Array<{ category: string; monthlySaving: number; yearlySaving: number; action: string }> = []

    for (const cat of Object.keys(avgCategoryBreakdown)) {
      const current = categoryBreakdown[cat] || 0
      const average = avgCategoryBreakdown[cat]

      if (current > average && average > 0) {
        const monthlySaving = current - average
        const nowDate = new Date()
        const remainingMonths = 12 - nowDate.getMonth() - 1
        const yearlySaving = monthlySaving * remainingMonths

        const pctOver = Math.round(((current - average) / average) * 100)
        actions.push({
          category: cat,
          monthlySaving: Math.round(monthlySaving),
          yearlySaving: Math.round(yearlySaving),
          action: `Reduce ${cat} spending by ${pctOver}% to match your average and save $${Math.round(monthlySaving)}/month`,
        })
      }
    }

    // Look for recurring subscriptions (same amount, same description appearing monthly)
    const subscriptionMap: Record<string, { description: string; amount: number; count: number; category: string }> = {}
    allTransactions.filter(t => t.type === 'expense').forEach(t => {
      const key = `${t.description.toLowerCase().trim()}-${t.amount}`
      if (!subscriptionMap[key]) {
        subscriptionMap[key] = { description: t.description, amount: t.amount, count: 0, category: t.category }
      }
      subscriptionMap[key].count++
    })

    // Find subscriptions that appear at least 2 different months
    const subscriptions = Object.values(subscriptionMap).filter(sub => {
      if (sub.count < 2) return false
      // Check they span multiple months
      const matchingTxns = allTransactions.filter(t =>
        t.type === 'expense' &&
        t.description.toLowerCase().trim() === sub.description.toLowerCase().trim() &&
        t.amount === sub.amount
      )
      const months = new Set(matchingTxns.map(t => new Date(t.date).toISOString().slice(0, 7)))
      return months.size >= 2
    })

    for (const sub of subscriptions) {
      const categoryLabel = sub.category || 'Subscriptions'
      actions.push({
        category: categoryLabel,
        monthlySaving: Math.round(sub.amount),
        yearlySaving: Math.round(sub.amount * 12),
        action: `Review recurring charge "${sub.description}" ($${sub.amount}/month) — cancel if unused`,
      })
    }

    actions.sort((a, b) => b.yearlySaving - a.yearlySaving)

    const totalPotentialSavings = actions.reduce((sum, a) => sum + a.yearlySaving, 0)

    const potentialSavings = {
      totalPotentialSavings: Math.round(totalPotentialSavings),
      actions,
    }

    // ═══════════════════════════════════════════════════════════
    // 5. GOAL ANALYSIS
    // ═══════════════════════════════════════════════════════════

    const goalAnalysis = {
      goals: goals.map(goal => {
        const remaining = goal.targetAmount - goal.savedAmount
        let monthsRemaining: number

        if (goal.deadline) {
          const deadlineDate = new Date(goal.deadline)
          const diffMs = deadlineDate.getTime() - now.getTime()
          monthsRemaining = Math.max(1, Math.ceil(diffMs / (30.44 * 24 * 60 * 60 * 1000)))
        } else {
          // Default to 12 months if no deadline
          monthsRemaining = 12
        }

        const monthlyNeeded = remaining > 0 ? remaining / monthsRemaining : 0

        // Calculate actual monthly savings rate based on recent months
        // Look at savings-classified transactions for this goal via linked budgets
        const goalBudgets = budgets.filter(b => b.goalId === goal.id)
        let monthlyActual = 0

        if (goalBudgets.length > 0) {
          // Sum budget allocations for this goal
          monthlyActual = goalBudgets.reduce((sum, b) => sum + b.amount, 0)
        } else {
          // Estimate from savings classification transactions
          const savingsExpenses = expenses.filter(t => t.classification === 'savings')
          const savingsTotal = savingsExpenses.reduce((sum, t) => sum + t.amount, 0)
          // Proportional estimate if multiple goals
          if (goals.length > 0 && savingsClassTotal > 0) {
            monthlyActual = savingsTotal / goals.length
          }
        }

        // Determine trajectory
        let trajectory: 'on_track' | 'behind' | 'at_risk'
        if (monthlyActual >= monthlyNeeded * 0.9) {
          trajectory = 'on_track'
        } else if (monthlyActual >= monthlyNeeded * 0.5) {
          trajectory = 'behind'
        } else {
          trajectory = 'at_risk'
        }

        // Months to complete at current rate
        const monthsToComplete = monthlyActual > 0 ? Math.ceil(remaining / monthlyActual) : monthsRemaining * 3

        // Identify blocking categories (categories consuming most above average) for behind/at_risk goals
        const blockingCategories: Array<{ category: string; excessAmount: number }> = []
        if (trajectory !== 'on_track') {
          for (const cat of Object.keys(categoryBreakdown)) {
            const current = categoryBreakdown[cat]
            const average = avgCategoryBreakdown[cat] || 0
            if (average > 0 && current > average * 1.15) {
              blockingCategories.push({
                category: cat,
                excessAmount: Math.round(current - average),
              })
            }
          }
          blockingCategories.sort((a, b) => b.excessAmount - a.excessAmount)
          // Top 3 blocking categories
          blockingCategories.splice(3)
        }

        return {
          id: goal.id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          savedAmount: goal.savedAmount,
          monthlyNeeded: Math.round(monthlyNeeded),
          monthlyActual: Math.round(monthlyActual),
          trajectory,
          monthsToComplete,
          blockingCategories,
        }
      }),
    }

    // ═══════════════════════════════════════════════════════════
    // 6. SPENDING ANOMALIES
    // ═══════════════════════════════════════════════════════════

    const anomalies: Array<{ category: string; current: number; average: number; percentChange: number; type: 'spike' | 'drop' }> = []

    for (const cat of Object.keys(avgCategoryBreakdown)) {
      const current = categoryBreakdown[cat] || 0
      const average = avgCategoryBreakdown[cat]

      if (average === 0) continue

      const percentChange = ((current - average) / average) * 100

      if (percentChange > 50) {
        anomalies.push({
          category: cat,
          current: Math.round(current),
          average: Math.round(average),
          percentChange: Math.round(percentChange),
          type: 'spike',
        })
      } else if (percentChange < -50) {
        anomalies.push({
          category: cat,
          current: Math.round(current),
          average: Math.round(average),
          percentChange: Math.round(percentChange),
          type: 'drop',
        })
      }
    }

    // Also check categories in current month that might not be in average
    for (const cat of Object.keys(categoryBreakdown)) {
      if (!avgCategoryBreakdown[cat] && categoryBreakdown[cat] > 0) {
        anomalies.push({
          category: cat,
          current: Math.round(categoryBreakdown[cat]),
          average: 0,
          percentChange: 100,
          type: 'spike',
        })
      }
    }

    anomalies.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))

    const spendingAnomalies = { anomalies }

    // ═══════════════════════════════════════════════════════════
    // 7. SAFE-TO-SPEND
    // ═══════════════════════════════════════════════════════════

    // Fixed expenses: Rent, Utilities, Insurance, Subscriptions for current month
    const fixedCategories = new Set(['Rent', 'Utilities', 'Insurance', 'Subscriptions', 'Subscription', 'EMI', 'Loan'])
    const fixedExpenses = expenses
      .filter(t => fixedCategories.has(t.category))
      .reduce((sum, t) => sum + t.amount, 0)

    // Also include any isRecurring expenses as fixed
    const recurringExpenses = expenses
      .filter(t => t.isRecurring && !fixedCategories.has(t.category))
      .reduce((sum, t) => sum + t.amount, 0)

    const totalFixedExpenses = fixedExpenses + recurringExpenses

    // Goal contributions: total monthly needed for all active goals
    const goalContributions = goalAnalysis.goals.reduce((sum, g) => sum + g.monthlyNeeded, 0)

    const safeToSpend = Math.max(0, totalIncome - totalFixedExpenses - goalContributions)

    // Days remaining in current month
    const today = now.getDate()
    const daysRemaining = Math.max(1, daysInCurrentMonth - today)
    const perDay = Math.round(safeToSpend / daysRemaining)

    const safeToSpendData = {
      safeToSpend: Math.round(safeToSpend),
      fixedExpenses: Math.round(totalFixedExpenses),
      goalContributions: Math.round(goalContributions),
      daysRemaining,
      perDay,
    }

    // ═══════════════════════════════════════════════════════════
    // 8. CASH FLOW FORECAST
    // ═══════════════════════════════════════════════════════════

    const daysElapsed = today
    const dailyBurnRate = daysElapsed > 0 ? totalExpense / daysElapsed : 0
    const projectedExpense = dailyBurnRate * daysInCurrentMonth
    const projectedBalance = totalIncome - projectedExpense
    const isDeficit = projectedBalance < 0

    const cashFlowForecast = {
      projectedExpense: Math.round(projectedExpense),
      projectedBalance: Math.round(projectedBalance),
      isDeficit,
      dailyBurnRate: Math.round(dailyBurnRate),
    }

    // ═══════════════════════════════════════════════════════════
    // RETURN ALL INSIGHTS
    // ═══════════════════════════════════════════════════════════

    return NextResponse.json({
      currentMonth,
      financialHealthScore,
      spendingPersonality,
      strengthsAndWeaknesses,
      potentialSavings,
      goalAnalysis,
      spendingAnomalies,
      safeToSpend: safeToSpendData,
      cashFlowForecast,
    })
  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
  }
}
