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

    // Month name for display
    const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const monthShortName = startDate.toLocaleDateString('en-US', { month: 'short' })
    const currentYear = startDate.getFullYear()
    const currentMonthNum = startDate.getMonth() + 1

    // Get all transactions for the current month (filtered by user)
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
    const spendingTypeStats: Record<string, { total: number; count: number; avgPerTxn: number }> = {
      cash: { total: 0, count: 0, avgPerTxn: 0 },
      debit: { total: 0, count: 0, avgPerTxn: 0 },
      credit: { total: 0, count: 0, avgPerTxn: 0 },
      mobile: { total: 0, count: 0, avgPerTxn: 0 },
    }
    expenses.forEach(t => {
      spendingTypeBreakdown[t.spendingType] = (spendingTypeBreakdown[t.spendingType] || 0) + t.amount
      const key = t.spendingType as keyof typeof spendingTypeStats
      if (spendingTypeStats[key]) {
        spendingTypeStats[key].total += t.amount
        spendingTypeStats[key].count += 1
      }
    })
    for (const key of Object.keys(spendingTypeStats) as (keyof typeof spendingTypeStats)[]) {
      if (spendingTypeStats[key].count > 0) {
        spendingTypeStats[key].avgPerTxn = Math.round(spendingTypeStats[key].total / spendingTypeStats[key].count)
      }
    }

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

    // Get ALL transactions for comprehensive analytics (filtered by user)
    const allTransactions = await db.transaction.findMany({
      where: { 
        userId: user.id,
        ...(category ? { category } : {}),
      },
      orderBy: { date: 'asc' },
    })

    // ===== MONTHLY TREND (last 12 months) =====
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    
    const recentTransactions = allTransactions.filter(t => new Date(t.date) >= twelveMonthsAgo)

    const monthlyTrend: Record<string, { income: number; expense: number }> = {}
    recentTransactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = { income: 0, expense: 0 }
      if (t.type === 'income') monthlyTrend[monthKey].income += t.amount
      else monthlyTrend[monthKey].expense += t.amount
    })

    // ===== AVERAGE MONTHLY EXPENSE (1Y - excluding current month) =====
    const pastMonths1Y = Object.entries(monthlyTrend)
      .filter(([monthKey]) => monthKey !== currentMonth)
    
    const averageMonthlyExpense = pastMonths1Y.length > 0
      ? pastMonths1Y.reduce((sum, [_, v]) => sum + v.expense, 0) / pastMonths1Y.length
      : 0

    // ===== PAST MONTHS CATEGORY BREAKDOWN =====
    const pastExpenses = allTransactions.filter(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      return t.type === 'expense' && monthKey !== currentMonth
    })

    const pastCategoryBreakdown: Record<string, number> = {}
    pastExpenses.forEach(t => {
      pastCategoryBreakdown[t.category] = (pastCategoryBreakdown[t.category] || 0) + t.amount
    })

    const avgCategoryBreakdown: Record<string, number> = {}
    if (pastMonths1Y.length > 0) {
      Object.entries(pastCategoryBreakdown).forEach(([cat, total]) => {
        avgCategoryBreakdown[cat] = total / pastMonths1Y.length
      })
    }

    const pastNeed = pastExpenses.filter(t => t.classification === 'need').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths1Y.length, 1)
    const pastWant = pastExpenses.filter(t => t.classification === 'want').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths1Y.length, 1)
    const pastEgo = pastExpenses.filter(t => t.classification === 'ego').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths1Y.length, 1)
    const pastSavings = pastExpenses.filter(t => t.classification === 'savings').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths1Y.length, 1)
    const pastDebt = pastExpenses.filter(t => t.classification === 'debt').reduce((sum, t) => sum + t.amount, 0) / Math.max(pastMonths1Y.length, 1)

    // ===== CUMULATIVE DAILY EXPENSE DATA FOR LINE CHART =====
    const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate()
    const currentMonthDaily: Record<number, number> = {}
    expenses.forEach(t => {
      const day = new Date(t.date).getDate()
      currentMonthDaily[day] = (currentMonthDaily[day] || 0) + t.amount
    })

    const currentCumulative: { day: number; cumulative: number }[] = []
    let runningTotal = 0
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      runningTotal += (currentMonthDaily[d] || 0)
      currentCumulative.push({ day: d, cumulative: runningTotal })
    }

    // Helper: compute cumulative average for a set of past months
    function computeAvgCumulative(pastMonthKeys: string[], pastMonthsDailyData: Record<string, Record<number, number>>, daysInMonth: number) {
      const result: { day: number; average: number }[] = []
      const maxDay = Math.max(daysInMonth, 31)

      if (pastMonthKeys.length === 0) return result

      const avgDailyCumulative: number[] = new Array(maxDay + 1).fill(0)

      for (let d = 1; d <= maxDay; d++) {
        let totalCumulativeAtDay = 0
        let monthsWithData = 0

        for (const mKey of pastMonthKeys) {
          const daysInThisMonth = new Date(
            parseInt(mKey.split('-')[0]),
            parseInt(mKey.split('-')[1]),
            0
          ).getDate()
          if (d > daysInThisMonth) continue

          let cumForMonth = 0
          for (let dd = 1; dd <= d; dd++) {
            cumForMonth += (pastMonthsDailyData[mKey]?.[dd] || 0)
          }
          totalCumulativeAtDay += cumForMonth
          monthsWithData++
        }
        avgDailyCumulative[d] = monthsWithData > 0 ? totalCumulativeAtDay / monthsWithData : 0
      }

      for (let d = 1; d <= daysInMonth; d++) {
        result.push({ day: d, average: Math.round(avgDailyCumulative[d]) })
      }
      return result
    }

    // Build past months daily data for all past months
    const pastAllExpenses = allTransactions.filter(t => {
      const tMonth = new Date(t.date).toISOString().slice(0, 7)
      return t.type === 'expense' && tMonth !== currentMonth
    })

    const pastMonthsDaily: Record<string, Record<number, number>> = {}
    pastAllExpenses.forEach(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      const day = new Date(t.date).getDate()
      if (!pastMonthsDaily[monthKey]) pastMonthsDaily[monthKey] = {}
      pastMonthsDaily[monthKey][day] = (pastMonthsDaily[monthKey][day] || 0) + t.amount
    })

    // 1Y Avg: last 12 months
    const pastMonthKeys1Y = Object.keys(pastMonthsDaily).filter(mk => {
      const d = new Date(mk + '-01')
      return d >= twelveMonthsAgo && mk !== currentMonth
    })
    const avgCumulative1Y = computeAvgCumulative(pastMonthKeys1Y, pastMonthsDaily, daysInCurrentMonth)

    // 2Y Avg: last 24 months
    const twentyFourMonthsAgo = new Date(now)
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24)
    const pastMonthKeys2Y = Object.keys(pastMonthsDaily).filter(mk => {
      const d = new Date(mk + '-01')
      return d >= twentyFourMonthsAgo && mk !== currentMonth
    })
    const avgCumulative2Y = computeAvgCumulative(pastMonthKeys2Y, pastMonthsDaily, daysInCurrentMonth)

    // All Time Avg
    const pastMonthKeysAll = Object.keys(pastMonthsDaily).filter(mk => mk !== currentMonth)
    const avgCumulativeAll = computeAvgCumulative(pastMonthKeysAll, pastMonthsDaily, daysInCurrentMonth)

    const avgVsCurrentLineData = currentCumulative.map((item) => {
      const avgItem = avgCumulative1Y.find(a => a.day === item.day)
      return {
        day: item.day,
        current: item.cumulative,
        average: avgItem ? avgItem.average : 0,
      }
    })

    const avgVsCurrentLineData2Y = avgCumulative2Y.length > 0 ? avgCumulative2Y : undefined
    const avgVsCurrentLineDataAll = avgCumulativeAll.length > 0 ? avgCumulativeAll : undefined

    // Available categories for the chart filter
    const allCategoriesSet = new Set<string>()
    allTransactions.filter(t => t.type === 'expense').forEach(t => allCategoriesSet.add(t.category))
    const availableCategories = Array.from(allCategoriesSet).sort()

    // ===== YEARLY AVERAGES =====
    const yearlyData: Record<number, { expense: number; income: number; months: Set<string> }> = {}
    allTransactions.forEach(t => {
      const year = new Date(t.date).getFullYear()
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      if (!yearlyData[year]) yearlyData[year] = { expense: 0, income: 0, months: new Set() }
      yearlyData[year].months.add(monthKey)
      if (t.type === 'expense') yearlyData[year].expense += t.amount
      else yearlyData[year].income += t.amount
    })

    const yearlyComparison: {
      year: number
      label: string
      totalExpense: number
      totalIncome: number
      avgMonthlyExpense: number
      months: number
    }[] = []

    for (const [year, yData] of Object.entries(yearlyData)) {
      const numMonths = yData.months.size
      yearlyComparison.push({
        year: parseInt(year),
        label: parseInt(year) === currentYear ? `${year} (Current)` : year.toString(),
        totalExpense: Math.round(yData.expense),
        totalIncome: Math.round(yData.income),
        avgMonthlyExpense: numMonths > 0 ? Math.round(yData.expense / numMonths) : 0,
        months: numMonths,
      })
    }

    yearlyComparison.sort((a, b) => b.year - a.year)

    const allTimeMonths = new Set<string>()
    let allTimeExpense = 0
    let allTimeIncome = 0
    allTransactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      allTimeMonths.add(monthKey)
      if (t.type === 'expense') allTimeExpense += t.amount
      else allTimeIncome += t.amount
    })

    const allTimeAvgMonthlyExpense = allTimeMonths.size > 0 ? Math.round(allTimeExpense / allTimeMonths.size) : 0

    return NextResponse.json({
      currentMonth,
      monthName,
      monthShortName,
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
      spendingTypeStats,
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
      avgVsCurrentLineData,
      avgVsCurrentLineData2Y,
      avgVsCurrentLineDataAll,
      availableCategories,
      yearlyComparison,
      allTimeAvgMonthlyExpense,
      allTimeTotalExpense: Math.round(allTimeExpense),
      allTimeTotalIncome: Math.round(allTimeIncome),
      allTimeMonths: allTimeMonths.size,
      alerts,
      transactionCount: transactions.length,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
