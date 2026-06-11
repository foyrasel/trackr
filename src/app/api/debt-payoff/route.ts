import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const startDate = new Date(`${currentMonth}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    // Get all accounts
    const accounts = await db.account.findMany({
      where: { userId: user.id },
    })

    // Get current month transactions
    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate, lt: endDate },
      },
    })

    // Get all-time transactions for averages
    const allTransactions = await db.transaction.findMany({
      where: { userId: user.id },
    })

    // Get unsettled borrow records
    const borrowRecords = await db.lendBorrow.findMany({
      where: { userId: user.id, type: 'borrow', isSettled: false },
    })

    // ── Identify all debts ──
    const debts: Array<{
      id: string
      name: string
      type: 'credit_card' | 'loan' | 'borrowed'
      amount: number
      priority: number // 1 = highest priority
      accountName?: string
      personName?: string
      dueDate?: string | null
    }> = []

    // Credit card debts (highest priority)
    accounts.filter(a => a.type === 'credit' && a.balance > 0).forEach(acc => {
      debts.push({
        id: acc.id,
        name: acc.name,
        type: 'credit_card',
        amount: acc.balance,
        priority: 1,
        accountName: acc.name,
      })
    })

    // Borrowed money (medium priority)
    borrowRecords.forEach(record => {
      debts.push({
        id: record.id,
        name: `Borrowed from ${record.person}`,
        type: 'borrowed',
        amount: record.amount,
        priority: 2,
        personName: record.person,
        dueDate: record.dueDate ? record.dueDate.toISOString().split('T')[0] : null,
      })
    })

    // Debt classification expenses (lowest priority - already being paid)
    const debtExpenses = transactions.filter(t => t.classification === 'debt')
    const totalDebtPayments = debtExpenses.reduce((sum, t) => sum + t.amount, 0)

    if (totalDebtPayments > 0) {
      debts.push({
        id: 'debt_payments',
        name: 'Recurring Debt Payments',
        type: 'loan',
        amount: totalDebtPayments * 6, // Estimate 6 months remaining
        priority: 3,
      })
    }

    // Sort by priority (credit card first)
    debts.sort((a, b) => a.priority - b.priority)

    // ── Calculate income and essential expenses ──
    const currentIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const currentExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    const essentialExpenses = transactions
      .filter(t => t.type === 'expense' && (t.classification === 'need' || t.classification === 'debt'))
      .reduce((sum, t) => sum + t.amount, 0)

    // Average monthly income
    const monthlyIncomeMap: Record<string, number> = {}
    allTransactions.filter(t => t.type === 'income').forEach(t => {
      const mk = new Date(t.date).toISOString().slice(0, 7)
      monthlyIncomeMap[mk] = (monthlyIncomeMap[mk] || 0) + t.amount
    })
    const avgMonthlyIncome = Object.values(monthlyIncomeMap).length > 0
      ? Object.values(monthlyIncomeMap).reduce((a, b) => a + b, 0) / Object.values(monthlyIncomeMap).length
      : currentIncome

    // Average monthly essential expenses
    const monthlyEssentialMap: Record<string, number> = {}
    allTransactions.filter(t => t.type === 'expense' && (t.classification === 'need' || t.classification === 'debt')).forEach(t => {
      const mk = new Date(t.date).toISOString().slice(0, 7)
      monthlyEssentialMap[mk] = (monthlyEssentialMap[mk] || 0) + t.amount
    })
    const avgEssentialExpenses = Object.values(monthlyEssentialMap).length > 0
      ? Object.values(monthlyEssentialMap).reduce((a, b) => a + b, 0) / Object.values(monthlyEssentialMap).length
      : essentialExpenses

    const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0)
    const disposableIncome = Math.max(0, avgMonthlyIncome - avgEssentialExpenses)

    // ── Generate repayment plan using Avalanche method ──
    const repaymentPlan: Array<{
      debtId: string
      debtName: string
      debtType: string
      totalAmount: number
      monthlyMinimum: number
      extraPayment: number
      monthsToPayoff: number
      strategy: string
    }> = []

    let remainingDisposable = disposableIncome * 0.5 // Use 50% of disposable for extra payments

    for (const debt of debts) {
      const minimumPayment = debt.type === 'credit_card'
        ? Math.max(debt.amount * 0.03, 500) // 3% minimum or ₹500
        : debt.type === 'borrowed'
          ? Math.max(debt.amount / 6, 1000) // Pay within 6 months
          : totalDebtPayments // Already paying this

      let extraPayment = 0
      let monthsToPayoff = 0

      if (debt.priority === 1 && remainingDisposable > 0) {
        // Credit card: throw everything at it (Avalanche method)
        extraPayment = remainingDisposable
        remainingDisposable = 0
        monthsToPayoff = Math.ceil(debt.amount / (minimumPayment + extraPayment))
      } else {
        monthsToPayoff = Math.ceil(debt.amount / minimumPayment)
      }

      const strategy = debt.priority === 1
        ? 'PRIORITY: Pay off first (Avalanche method). Credit card debt has the highest effective interest rate. Allocate maximum extra payments here.'
        : debt.priority === 2
          ? `Pay minimum until credit card debt is cleared, then redirect those payments here. ${debt.dueDate ? `Due by ${debt.dueDate}.` : 'No specific due date.'}`
          : 'Continue making regular payments. Once higher-priority debts are cleared, consider increasing payments.'

      repaymentPlan.push({
        debtId: debt.id,
        debtName: debt.name,
        debtType: debt.type,
        totalAmount: Math.round(debt.amount),
        monthlyMinimum: Math.round(minimumPayment),
        extraPayment: Math.round(extraPayment),
        monthsToPayoff,
        strategy,
      })
    }

    // ── Generate AI insight using z-ai-web-dev-sdk ──
    let aiInsight = ''
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const prompt = `You are a financial advisor. Based on this user's debt situation, provide a brief, actionable insight (2-3 sentences):

Total Debt: ₹${Math.round(totalDebt).toLocaleString()}
Monthly Income: ₹${Math.round(avgMonthlyIncome).toLocaleString()}
Essential Expenses: ₹${Math.round(avgEssentialExpenses).toLocaleString()}
Disposable Income: ₹${Math.round(disposableIncome).toLocaleString()}
Debts: ${debts.map(d => `${d.name}: ₹${Math.round(d.amount).toLocaleString()}`).join(', ')}

Focus on:
1. Whether the debt is manageable
2. The most important action to take
3. A realistic timeline`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a concise financial advisor. Give brief, actionable advice in 2-3 sentences.' },
          { role: 'user', content: prompt },
        ],
      })

      aiInsight = completion.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('AI insight generation failed:', error)
      aiInsight = totalDebt > avgMonthlyIncome * 6
        ? 'Your debt is significant compared to income. Consider consolidating high-interest debt and cutting discretionary spending aggressively.'
        : 'Focus on paying off credit card debt first, then redirect those payments to other debts. The Avalanche method minimizes total interest paid.'
    }

    return NextResponse.json({
      hasDebt: debts.length > 0,
      totalDebt: Math.round(totalDebt),
      debts,
      repaymentPlan,
      summary: {
        avgMonthlyIncome: Math.round(avgMonthlyIncome),
        avgEssentialExpenses: Math.round(avgEssentialExpenses),
        disposableIncome: Math.round(disposableIncome),
        recommendedExtraPayment: Math.round(remainingDisposable > 0 ? disposableIncome * 0.5 : 0),
        estimatedTotalMonthsToDebtFree: repaymentPlan.length > 0
          ? repaymentPlan.reduce((max, p) => Math.max(max, p.monthsToPayoff), 0)
          : 0,
      },
      aiInsight,
    })
  } catch (error) {
    console.error('Error generating debt payoff plan:', error)
    return NextResponse.json({ error: 'Failed to generate debt payoff plan' }, { status: 500 })
  }
}
