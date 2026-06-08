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
    const format = searchParams.get('format') || 'csv' // 'csv' or 'pdf'
    const month = searchParams.get('month') // format: '2026-06'
    const type = searchParams.get('type') // 'expense' or 'income'

    // Build where clause
    const where: Record<string, unknown> = { userId: user.id }

    if (type) where.type = type
    if (month) {
      const startDate = new Date(`${month}-01`)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      where.date = { gte: startDate, lt: endDate }
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    if (format === 'pdf') {
      return exportAsPdf(transactions, month, type)
    }

    return exportAsCsv(transactions, month, type)
  } catch (error) {
    console.error('Error exporting transactions:', error)
    return NextResponse.json({ error: 'Failed to export transactions' }, { status: 500 })
  }
}

function exportAsCsv(
  transactions: {
    date: Date
    type: string
    amount: number
    description: string
    category: string
    spendingType: string
    classification: string
  }[],
  month: string | null,
  type: string | null
) {
  const headers = ['Date', 'Type', 'Amount(৳)', 'Description', 'Category', 'Payment', 'Classification']

  const rows = transactions.map((t) => {
    const dateStr = new Date(t.date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    // Escape fields that might contain commas by wrapping in quotes
    const desc = `"${t.description.replace(/"/g, '""')}"`
    const category = `"${t.category.replace(/"/g, '""')}"`
    return `${dateStr},${t.type},${t.amount.toFixed(2)},${desc},${category},${t.spendingType},${t.classification}`
  })

  const csvContent = [headers.join(','), ...rows].join('\n')

  const filename = buildFilename('csv', month, type)

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function exportAsPdf(
  transactions: {
    date: Date
    type: string
    amount: number
    description: string
    category: string
    spendingType: string
    classification: string
  }[],
  month: string | null,
  type: string | null
) {
  // Compute summary stats
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpense

  // Category breakdown
  const categoryMap: Record<string, { income: number; expense: number }> = {}
  for (const t of transactions) {
    if (!categoryMap[t.category]) {
      categoryMap[t.category] = { income: 0, expense: 0 }
    }
    if (t.type === 'income') {
      categoryMap[t.category].income += t.amount
    } else {
      categoryMap[t.category].expense += t.amount
    }
  }

  // Build structured text report
  const lines: string[] = []

  const periodLabel = month || 'All Time'
  const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'All'

  lines.push('╔══════════════════════════════════════════════════════════════╗')
  lines.push('║              EXPENSE TRACKER - TRANSACTION REPORT            ║')
  lines.push('╚══════════════════════════════════════════════════════════════╝')
  lines.push('')
  lines.push(`Period: ${periodLabel}`)
  lines.push(`Type:   ${typeLabel}`)
  lines.push(`Generated: ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('                        SUMMARY                               ')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`  Total Income:   ৳${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  lines.push(`  Total Expense:  ৳${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  lines.push(`  Balance:        ৳${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  lines.push('')

  // Category breakdown
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('                    CATEGORY BREAKDOWN                         ')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`  ${'Category'.padEnd(20)} ${'Income'.padStart(12)} ${'Expense'.padStart(12)}`)
  lines.push(`  ${'─'.repeat(20)} ${'─'.repeat(12)} ${'─'.repeat(12)}`)

  const categories = Object.entries(categoryMap).sort((a, b) => {
    const aTotal = a[1].expense + a[1].income
    const bTotal = b[1].expense + b[1].income
    return bTotal - aTotal
  })

  for (const [cat, amounts] of categories) {
    const incomeStr = amounts.income > 0 ? `৳${amounts.income.toFixed(2)}` : '-'
    const expenseStr = amounts.expense > 0 ? `৳${amounts.expense.toFixed(2)}` : '-'
    lines.push(`  ${cat.padEnd(20)} ${incomeStr.padStart(12)} ${expenseStr.padStart(12)}`)
  }
  lines.push('')

  // Transaction list
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('                    TRANSACTION LIST                           ')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('')

  if (transactions.length === 0) {
    lines.push('  No transactions found for the selected period.')
  } else {
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i]
      const dateStr = new Date(t.date).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      const sign = t.type === 'income' ? '+' : '-'
      const amountStr = `${sign}৳${t.amount.toFixed(2)}`
      lines.push(`  ${String(i + 1).padStart(3)}. [${dateStr}] ${t.description}`)
      lines.push(`       ${amountStr.padStart(12)} | ${t.category} | ${t.spendingType} | ${t.classification}`)
    }
  }

  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`  Total Transactions: ${transactions.length}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const reportContent = lines.join('\n')
  const filename = buildFilename('txt', month, type)

  return new NextResponse(reportContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function buildFilename(extension: string, month: string | null, type: string | null): string {
  const parts = ['transactions']
  if (month) parts.push(month)
  if (type) parts.push(type)
  const dateSuffix = new Date().toISOString().slice(0, 10)
  return `${parts.join('_')}_${dateSuffix}.${extension}`
}
