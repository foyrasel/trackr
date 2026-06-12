import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import PDFDocument from 'pdfkit'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's currency symbol
    const dbUser = await db.user.findUnique({ where: { id: user.id } })
    const currencySymbol = dbUser?.currencySymbol || '$'

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv' // 'csv' or 'pdf'
    const month = searchParams.get('month') // format: '2026-06'
    const type = searchParams.get('type') // 'expense' or 'income'
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    // Build where clause
    const where: Record<string, unknown> = { userId: user.id }

    if (type) where.type = type
    if (category) where.category = category
    if (search) where.description = { contains: search } // no `mode` — unsupported on SQLite

    // Date range filtering
    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      where.date = dateFilter
    } else if (month) {
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
      return exportAsPdf(transactions, month, type, currencySymbol)
    }

    return exportAsCsv(transactions, month, type, currencySymbol)
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
  type: string | null,
  currencySymbol: string
) {
  const headers = ['Date', 'Type', `Amount(${currencySymbol})`, 'Description', 'Category', 'Payment', 'Classification']

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
  type: string | null,
  currencySymbol: string
) {
  // Compute summary stats
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpense

  const periodLabel = month || 'All Time'
  const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'All'

  return new Promise<NextResponse>((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: 'Trackr - Transaction Report',
          Author: 'Trackr Expense Tracker',
          Subject: `Transaction Report - ${periodLabel}`,
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        const filename = buildFilename('pdf', month, type)

        resolve(new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        }))
      })
      doc.on('error', (err: Error) => {
        reject(err)
      })

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

      // Helper: draw a horizontal line
      const drawLine = (y: number) => {
        doc
          .strokeColor('#d1d5db')
          .lineWidth(0.5)
          .moveTo(doc.page.margins.left, y)
          .lineTo(doc.page.width - doc.page.margins.right, y)
          .stroke()
      }

      // ---- TITLE ----
      doc
        .fontSize(22)
        .fillColor('#111827')
        .text('Trackr', { align: 'center' })

      doc
        .fontSize(12)
        .fillColor('#6b7280')
        .text('Transaction Report', { align: 'center' })

      doc.moveDown(0.5)

      // ---- META INFO ----
      doc.fontSize(9).fillColor('#6b7280')
      doc.text(`Period: ${periodLabel}    |    Type: ${typeLabel}    |    Generated: ${new Date().toLocaleString()}`, { align: 'center' })

      doc.moveDown(1)
      drawLine(doc.y)
      doc.moveDown(0.75)

      // ---- SUMMARY SECTION ----
      doc.fontSize(13).fillColor('#111827').text('Summary', { underline: false })
      doc.moveDown(0.4)

      const summaryY = doc.y
      const col1X = doc.page.margins.left
      const col2X = doc.page.margins.left + pageWidth * 0.33
      const col3X = doc.page.margins.left + pageWidth * 0.66

      doc.fontSize(10).fillColor('#6b7280')
      doc.text('Total Income', col1X, summaryY)
      doc.text('Total Expense', col2X, summaryY)
      doc.text('Balance', col3X, summaryY)

      const valsY = summaryY + 14
      doc.fontSize(14)
      doc.fillColor('#059669').text(`${currencySymbol}${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col1X, valsY)
      doc.fillColor('#dc2626').text(`${currencySymbol}${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col2X, valsY)
      doc.fillColor(balance >= 0 ? '#059669' : '#dc2626').text(`${currencySymbol}${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col3X, valsY)

      doc.y = valsY + 24
      drawLine(doc.y)
      doc.moveDown(0.75)

      // ---- CATEGORY BREAKDOWN ----
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

      const sortedCategories = Object.entries(categoryMap).sort((a, b) => {
        const aTotal = a[1].expense + a[1].income
        const bTotal = b[1].expense + b[1].income
        return bTotal - aTotal
      })

      if (sortedCategories.length > 0) {
        doc.fontSize(13).fillColor('#111827').text('Category Breakdown')
        doc.moveDown(0.4)

        const catHeaderY = doc.y
        doc.fontSize(9).fillColor('#9ca3af')
        doc.text('Category', col1X, catHeaderY, { width: pageWidth * 0.4 })
        doc.text('Income', col2X + 20, catHeaderY, { width: pageWidth * 0.25, align: 'right' })
        doc.text('Expense', col3X + 10, catHeaderY, { width: pageWidth * 0.25, align: 'right' })

        doc.y = catHeaderY + 14
        drawLine(doc.y)
        doc.moveDown(0.3)

        for (const [cat, amounts] of sortedCategories) {
          if (doc.y > doc.page.height - 80) {
            doc.addPage()
          }
          const rowY = doc.y
          doc.fontSize(9).fillColor('#374151')
          doc.text(cat, col1X, rowY, { width: pageWidth * 0.4 })
          doc.text(
            amounts.income > 0 ? `${currencySymbol}${amounts.income.toFixed(2)}` : '-',
            col2X + 20, rowY, { width: pageWidth * 0.25, align: 'right' }
          )
          doc.text(
            amounts.expense > 0 ? `${currencySymbol}${amounts.expense.toFixed(2)}` : '-',
            col3X + 10, rowY, { width: pageWidth * 0.25, align: 'right' }
          )
          doc.y = rowY + 14
        }

        doc.moveDown(0.5)
        drawLine(doc.y)
        doc.moveDown(0.75)
      }

      // ---- TRANSACTION TABLE ----
      doc.fontSize(13).fillColor('#111827').text('Transactions')
      doc.moveDown(0.4)

      if (transactions.length === 0) {
        doc.fontSize(10).fillColor('#6b7280').text('No transactions found for the selected period.')
      } else {
        const tableHeaderY = doc.y
        const dateColW = pageWidth * 0.13
        const typeColW = pageWidth * 0.10
        const amountColW = pageWidth * 0.15
        const descColW = pageWidth * 0.27
        const catColW = pageWidth * 0.20
        const classColW = pageWidth * 0.15

        let xPos = doc.page.margins.left

        doc.fontSize(8).fillColor('#9ca3af')
        doc.text('Date', xPos, tableHeaderY, { width: dateColW })
        xPos += dateColW
        doc.text('Type', xPos, tableHeaderY, { width: typeColW })
        xPos += typeColW
        doc.text('Amount', xPos, tableHeaderY, { width: amountColW, align: 'right' })
        xPos += amountColW
        doc.text('Description', xPos, tableHeaderY, { width: descColW })
        xPos += descColW
        doc.text('Category', xPos, tableHeaderY, { width: catColW })
        xPos += catColW
        doc.text('Class.', xPos, tableHeaderY, { width: classColW })

        doc.y = tableHeaderY + 14
        drawLine(doc.y)
        doc.moveDown(0.3)

        for (let i = 0; i < transactions.length; i++) {
          const t = transactions[i]

          if (doc.y > doc.page.height - 70) {
            doc.addPage()
            const newHeaderY = doc.y
            let newXPos = doc.page.margins.left
            doc.fontSize(8).fillColor('#9ca3af')
            doc.text('Date', newXPos, newHeaderY, { width: dateColW })
            newXPos += dateColW
            doc.text('Type', newXPos, newHeaderY, { width: typeColW })
            newXPos += typeColW
            doc.text('Amount', newXPos, newHeaderY, { width: amountColW, align: 'right' })
            newXPos += amountColW
            doc.text('Description', newXPos, newHeaderY, { width: descColW })
            newXPos += descColW
            doc.text('Category', newXPos, newHeaderY, { width: catColW })
            newXPos += catColW
            doc.text('Class.', newXPos, newHeaderY, { width: classColW })
            doc.y = newHeaderY + 14
            drawLine(doc.y)
            doc.moveDown(0.3)
          }

          const dateStr = new Date(t.date).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          const sign = t.type === 'income' ? '+' : '-'
          const amountStr = `${sign}${currencySymbol}${t.amount.toFixed(2)}`

          const rowY = doc.y
          xPos = doc.page.margins.left

          doc.fontSize(8).fillColor('#374151')
          doc.text(dateStr, xPos, rowY, { width: dateColW })
          xPos += dateColW
          doc.text(t.type, xPos, rowY, { width: typeColW })
          xPos += typeColW
          doc.fillColor(t.type === 'income' ? '#059669' : '#dc2626')
            .text(amountStr, xPos, rowY, { width: amountColW, align: 'right' })
          xPos += amountColW
          doc.fillColor('#374151')
            .text(t.description.length > 28 ? t.description.slice(0, 25) + '...' : t.description, xPos, rowY, { width: descColW })
          xPos += descColW
          doc.text(t.category, xPos, rowY, { width: catColW })
          xPos += catColW
          doc.text(t.classification, xPos, rowY, { width: classColW })

          doc.y = rowY + 13

          if (i < transactions.length - 1) {
            doc.strokeColor('#f3f4f6').lineWidth(0.3)
              .moveTo(doc.page.margins.left, doc.y - 2)
              .lineTo(doc.page.width - doc.page.margins.right, doc.y - 2)
              .stroke()
          }
        }
      }

      // ---- FOOTER ----
      doc.moveDown(1)
      drawLine(doc.y)
      doc.moveDown(0.3)
      doc.fontSize(8).fillColor('#9ca3af')
        .text(`Total Transactions: ${transactions.length}`, { align: 'center' })

      // Finalize - this triggers the 'end' event
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

function buildFilename(extension: string, month: string | null, type: string | null): string {
  const parts = ['transactions']
  if (month) parts.push(month)
  if (type) parts.push(type)
  const dateSuffix = new Date().toISOString().slice(0, 10)
  return `${parts.join('_')}_${dateSuffix}.${extension}`
}
