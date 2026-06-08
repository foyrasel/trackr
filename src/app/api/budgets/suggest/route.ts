import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

// GET /api/budgets/suggest - AI-suggested budgets based on past spending
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    // Get last 3 months of spending data
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const pastExpenses = await db.transaction.findMany({
      where: {
        userId: user.id,
        type: 'expense',
        date: { gte: threeMonthsAgo },
      },
      orderBy: { date: 'desc' },
    })

    if (pastExpenses.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: 'Add some transactions first to get AI budget suggestions.',
      })
    }

    // Calculate average monthly spending per category
    const monthSet = new Set<string>()
    pastExpenses.forEach(t => {
      const m = new Date(t.date).toISOString().slice(0, 7)
      monthSet.add(m)
    })
    const monthCount = monthSet.size

    const categoryTotals: Record<string, number> = {}
    const classificationTotals: Record<string, number> = {}
    pastExpenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
      classificationTotals[t.classification] = (classificationTotals[t.classification] || 0) + t.amount
    })

    const avgCategorySpending: Record<string, number> = {}
    Object.entries(categoryTotals).forEach(([cat, total]) => {
      avgCategorySpending[cat] = Math.round(total / monthCount)
    })

    const totalAvgExpense = Math.round(Object.values(categoryTotals).reduce((a, b) => a + b, 0) / monthCount)

    // Try AI-powered budget suggestion
    try {
      // Get user's currency symbol for the prompt
      const dbUser = await db.user.findUnique({ where: { id: user.id } })
      const currencySymbol = dbUser?.currencySymbol || '$'

      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a personal finance advisor for an expense tracker (${currencySymbol} currency).
Given the user's average monthly spending by category, suggest a reasonable monthly budget for each category.
Apply the 50/30/20 rule: 50% needs, 30% wants, 20% savings/debt.

Respond with ONLY a valid JSON array of objects with:
- "category": string (category name)
- "suggestedBudget": number (monthly budget)
- "reason": string (short reason for the suggestion, 1 line)

Categories to budget for: ${Object.keys(avgCategorySpending).join(', ')}
Average monthly total expense: ${currencySymbol}${totalAvgExpense.toLocaleString()}
Average spending by category: ${Object.entries(avgCategorySpending).map(([c, a]) => `${c}: ${currencySymbol}${a.toLocaleString()}`).join(', ')}
Classification breakdown: ${Object.entries(classificationTotals).map(([c, t]) => `${c}: ${currencySymbol}${Math.round(t / monthCount).toLocaleString()}/month`).join(', ')}`,
          },
          {
            role: 'user',
            content: `Suggest a monthly budget for ${currentMonth} based on my past spending patterns. My average monthly expense is ${currencySymbol}${totalAvgExpense.toLocaleString()}.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      })

      const content = completion.choices[0]?.message?.content || '[]'
      let cleaned = content.trim()
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
      cleaned = cleaned.trim()

      const aiSuggestions = JSON.parse(cleaned)
      return NextResponse.json({
        suggestions: aiSuggestions,
        avgMonthlyExpense: totalAvgExpense,
        avgCategorySpending,
        source: 'ai',
      })
    } catch (aiError) {
      console.error('AI budget suggestion failed, using rule-based fallback:', aiError)
    }

    // Fallback: Rule-based budget suggestion
    const suggestions = Object.entries(avgCategorySpending).map(([category, avgAmount]) => {
      const classification = pastExpenses.find(t => t.category === category)?.classification || 'need'
      let suggestedBudget = Math.round(avgAmount * 1.1) // 10% buffer
      let reason = ''

      if (classification === 'need') {
        suggestedBudget = Math.round(avgAmount * 1.05) // 5% buffer for needs
        reason = 'Essential expense - small buffer recommended'
      } else if (classification === 'want') {
        suggestedBudget = Math.round(avgAmount * 0.9) // 10% cut for wants
        reason = 'Nice-to-have - try reducing by 10%'
      } else if (classification === 'ego') {
        suggestedBudget = Math.round(avgAmount * 0.7) // 30% cut for ego
        reason = 'Luxury spending - aim to cut by 30%'
      } else if (classification === 'savings') {
        suggestedBudget = Math.round(avgAmount * 1.2) // Increase savings
        reason = 'Increase savings allocation by 20%'
      } else if (classification === 'debt') {
        suggestedBudget = avgAmount // Keep debt payments
        reason = 'Maintain debt repayment schedule'
      } else {
        reason = 'Based on your average spending'
      }

      return {
        category,
        suggestedBudget,
        reason,
        avgSpending: avgAmount,
      }
    })

    return NextResponse.json({
      suggestions,
      avgMonthlyExpense: totalAvgExpense,
      avgCategorySpending,
      source: 'rule-based',
    })
  } catch (error) {
    console.error('Error generating budget suggestions:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
