import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const CATEGORIES = {
  expense: [
    'Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Rent',
    'Healthcare', 'Education', 'Entertainment', 'Shopping', 'Personal Care',
    'Insurance', 'Subscriptions', 'Travel', 'Gifts', 'Charity', 'Other'
  ],
  income: [
    'Salary', 'Freelance', 'Business', 'Investment', 'Rental',
    'Side Hustle', 'Gift Received', 'Refund', 'Other'
  ]
}

const SPENDING_TYPES = ['cash', 'debit', 'credit']
const CLASSIFICATIONS = ['need', 'want', 'ego', 'savings', 'debt']

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 })
    }

    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a financial transaction parser for a Bangladesh-focused expense tracker (currency: BDT/Taka). 
          
Given a user's voice or text input about a spending or income, extract and categorize the transaction.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with these fields:
- "type": "expense" or "income"
- "amount": number (the monetary amount, just the number)
- "description": string (a clean description of the transaction)
- "category": string (must be one of: ${[...CATEGORIES.expense, ...CATEGORIES.income].join(', ')})
- "spendingType": string (must be one of: ${SPENDING_TYPES.join(', ')}) - default "cash" if not mentioned
- "classification": string (for expenses, must be one of: ${CLASSIFICATIONS.join(', ')}; for income, use "income")

Classification guide:
- "need": Essential expenses (rent, groceries, utilities, healthcare, education, transport to work)
- "want": Nice-to-have but not essential (dining out, entertainment, subscriptions, shopping beyond basics)
- "ego": Status/luxury spending (designer brands, premium gadgets, luxury dining, show-off purchases)
- "savings": Money saved or invested (savings account, investments, emergency fund contributions)
- "debt": Debt repayment (loan EMI, credit card payments, borrowed money repayment)

If the user says "taka" or "৳", that's BDT currency.
If the user says "from cash", spendingType should be "cash".
If the user says "from debit/card", spendingType should be "debit" or "credit".
If spending method is not mentioned, default to "cash".

Examples:
- "Spent 500 taka on groceries from cash" → {"type":"expense","amount":500,"description":"Groceries","category":"Groceries","spendingType":"cash","classification":"need"}
- "Income: 50000 salary from job" → {"type":"income","amount":50000,"description":"Monthly salary","category":"Salary","spendingType":"cash","classification":"income"}
- "Paid 2000 for Netflix subscription" → {"type":"expense","amount":2000,"description":"Netflix subscription","category":"Subscriptions","spendingType":"cash","classification":"want"}
- "Bought iPhone 15 Pro Max for 180000 on credit" → {"type":"expense","amount":180000,"description":"iPhone 15 Pro Max","category":"Shopping","spendingType":"credit","classification":"ego"}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
    })

    const content = completion.choices[0]?.message?.content || ''
    
    // Clean up the response - remove markdown code blocks if present
    let cleaned = content.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3)
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }
    cleaned = cleaned.trim()

    const parsed = JSON.parse(cleaned)

    // Validate the parsed result
    const result = {
      type: parsed.type === 'income' ? 'income' : 'expense',
      amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0,
      description: parsed.description || text,
      category: parsed.category || 'Other',
      spendingType: SPENDING_TYPES.includes(parsed.spendingType) ? parsed.spendingType : 'cash',
      classification: parsed.type === 'income' 
        ? 'income' 
        : CLASSIFICATIONS.includes(parsed.classification) 
          ? parsed.classification 
          : 'need',
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error categorizing transaction:', error)
    
    // Fallback: try to extract basic info from text
    const fallbackResult = extractBasicInfo(text || '')
    return NextResponse.json({ result: fallbackResult, fallback: true })
  }
}

function extractBasicInfo(text: string): {
  type: string
  amount: number
  description: string
  category: string
  spendingType: string
  classification: string
} {
  const isIncome = /income|salary|earned|received|got paid/i.test(text)
  
  // Try to extract amount
  const amountMatch = text.match(/(\d[\d,]*\.?\d*)/)
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0
  
  return {
    type: isIncome ? 'income' : 'expense',
    amount,
    description: text,
    category: isIncome ? 'Other' : 'Other',
    spendingType: /debit/i.test(text) ? 'debit' : /credit/i.test(text) ? 'credit' : 'cash',
    classification: isIncome ? 'income' : 'need',
  }
}
