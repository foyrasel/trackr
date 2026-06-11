import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current account balances
    const accounts = await db.account.findMany({
      where: { userId: user.id },
    })

    // Current net worth = sum of all balances, subtracting credit card debt
    const currentNetWorth = accounts.reduce((sum, acc) => {
      if (acc.type === 'credit') return sum - acc.balance // Credit balance is debt
      return sum + acc.balance
    }, 0)

    // Get all transactions
    const allTransactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
    })

    // Get all lend/borrow records
    const lendBorrows = await db.lendBorrow.findMany({
      where: { userId: user.id },
    })

    // Calculate monthly cumulative income - expense
    const monthlyData: Record<string, { income: number; expense: number }> = {}

    allTransactions.forEach(t => {
      const monthKey = new Date(t.date).toISOString().slice(0, 7)
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 }
      if (t.type === 'income') monthlyData[monthKey].income += t.amount
      else monthlyData[monthKey].expense += t.amount
    })

    // Add lend/borrow impact
    lendBorrows.forEach(lb => {
      const monthKey = new Date(lb.date).toISOString().slice(0, 7)
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 }
      if (lb.type === 'borrow') {
        monthlyData[monthKey].income += lb.amount // Borrowing adds money
      } else {
        monthlyData[monthKey].expense += lb.amount // Lending removes money
      }
    })

    // Sort months and build cumulative net worth
    const sortedMonths = Object.keys(monthlyData).sort()
    const netWorthOverTime: Array<{ month: string; netWorth: number; income: number; expense: number }> = []

    let cumulativeNetWorth = 0
    for (const month of sortedMonths) {
      const data = monthlyData[month]
      cumulativeNetWorth += (data.income - data.expense)

      netWorthOverTime.push({
        month,
        netWorth: Math.round(cumulativeNetWorth),
        income: Math.round(data.income),
        expense: Math.round(data.expense),
      })
    }

    // Also include current actual net worth from account balances
    // The last data point should reflect actual current balances if they differ

    return NextResponse.json({
      currentNetWorth: Math.round(currentNetWorth),
      netWorthOverTime,
    })
  } catch (error) {
    console.error('Error fetching net worth:', error)
    return NextResponse.json({ error: 'Failed to fetch net worth' }, { status: 500 })
  }
}
