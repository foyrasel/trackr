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

You support BOTH English and Bangla (Bengali) input. Users may speak in either language or a mix of both (Banglish).

Given a user's voice or text input about a spending or income, extract and categorize the transaction.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with these fields:
- "type": "expense" or "income"
- "amount": number (the monetary amount, just the number)
- "description": string (a clean description in the SAME language the user used)
- "category": string (must be one of: ${[...CATEGORIES.expense, ...CATEGORIES.income].join(', ')})
- "spendingType": string (must be one of: ${SPENDING_TYPES.join(', ')}) - default "cash" if not mentioned
- "classification": string (for expenses, must be one of: ${CLASSIFICATIONS.join(', ')}; for income, use "income")

Classification guide:
- "need": Essential expenses (rent, groceries, utilities, healthcare, education, transport to work)
- "want": Nice-to-have but not essential (dining out, entertainment, subscriptions, shopping beyond basics)
- "ego": Status/luxury spending (designer brands, premium gadgets, luxury dining, show-off purchases)
- "savings": Money saved or invested (savings account, investments, emergency fund contributions)
- "debt": Debt repayment (loan EMI, credit card payments, borrowed money repayment)

Bangla keyword mapping:
- টাকা/টাকার = taka/currency (BDT)
- খরচ/খরচা = expense/spent
- আয়/বেতন/সালারি = income/salary
- বাজার/মুদি/গ্রোসারি = groceries
- ভাড়া/বাসা ভাড়া = rent
- পরিবহন/রিকশা/বাস/সিএনজি = transport
- বিদ্যুৎ/গ্যাস/পানি/ইউটিলিটি = utilities
- চিকিৎসা/ডাক্তার/ওষুধ = healthcare
- শিক্ষা/পড়াশোনা = education
- বিনোদন/মুভি = entertainment
- কেনাকাটা/শপিং = shopping
- নগদ/ক্যাশ = cash
- ডেবিট কার্ড = debit
- ক্রেডিট কার্ড = credit
- ঋণ/লোন/কর্জ = debt/loan
- সঞ্চয়/সেভিংস = savings
- প্রয়োজন = need
- বিলাস = want/ego

English examples:
- "Spent 500 taka on groceries from cash" → {"type":"expense","amount":500,"description":"Groceries","category":"Groceries","spendingType":"cash","classification":"need"}
- "Income: 50000 salary from job" → {"type":"income","amount":50000,"description":"Monthly salary","category":"Salary","spendingType":"cash","classification":"income"}
- "Paid 2000 for Netflix subscription" → {"type":"expense","amount":2000,"description":"Netflix subscription","category":"Subscriptions","spendingType":"cash","classification":"want"}
- "Bought iPhone 15 Pro Max for 180000 on credit" → {"type":"expense","amount":180000,"description":"iPhone 15 Pro Max","category":"Shopping","spendingType":"credit","classification":"ego"}

Bangla examples:
- "বাজারে ৫০০ টাকা খরচ" → {"type":"expense","amount":500,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need"}
- "বাসা ভাড়া ১৫০০০ টাকা ডেবিট কার্ডে" → {"type":"expense","amount":15000,"description":"বাসা ভাড়া","category":"Rent","spendingType":"debit","classification":"need"}
- "বেতন পেয়েছি ৫০০০০ টাকা" → {"type":"income","amount":50000,"description":"বেতন","category":"Salary","spendingType":"cash","classification":"income"}
- "রিকশায় ১০০ টাকা" → {"type":"expense","amount":100,"description":"রিকশা ভাড়া","category":"Transport","spendingType":"cash","classification":"need"}
- "৫০০০ টাকা সেভ করেছি" → {"type":"expense","amount":5000,"description":"সঞ্চয়","category":"Savings","spendingType":"cash","classification":"savings"}
- "লোনের কিস্তি ৫০০০ টাকা" → {"type":"expense","amount":5000,"description":"লোনের কিস্তি","category":"Debt","spendingType":"cash","classification":"debt"}
- "মুভিতে ৫০০ টাকা খরচ" → {"type":"expense","amount":500,"description":"মুভিতে খরচ","category":"Entertainment","spendingType":"cash","classification":"want"}
- "আইফোন কিনলাম ১ লাখ টাকায় ক্রেডিটে" → {"type":"expense","amount":100000,"description":"আইফোন","category":"Shopping","spendingType":"credit","classification":"ego"}

Banglish (mixed) examples:
- "bazar e 500 taka khoroche" → {"type":"expense","amount":500,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need"}
- "basha bhara 15000 debit e" → {"type":"expense","amount":15000,"description":"বাসা ভাড়া","category":"Rent","spendingType":"debit","classification":"need"}

IMPORTANT: For Bangla numbers (১, ২, ৩...), convert to standard digits (1, 2, 3...). For "লাখ" multiply by 100000.`
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
  // Check for income keywords in both English and Bangla
  const isIncome = /income|salary|earned|received|got paid|আয়|বেতন|পেয়েছি|সালারি/i.test(text)
  
  // Try to extract amount - support both English and Bangla digits
  let amount = 0
  
  // First try English digits
  const englishMatch = text.match(/(\d[\d,]*\.?\d*)/)
  if (englishMatch) {
    amount = parseFloat(englishMatch[1].replace(/,/g, ''))
  }
  
  // If no English digits, try Bangla digits
  if (amount === 0) {
    const banglaDigitMap: Record<string, string> = {
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
    }
    const banglaText = text.replace(/[০-৯]/g, (d) => banglaDigitMap[d] || d)
    const banglaMatch = banglaText.match(/(\d[\d,]*\.?\d*)/)
    if (banglaMatch) {
      amount = parseFloat(banglaMatch[1].replace(/,/g, ''))
    }
  }
  
  // Check for "লাখ" (lakh = 100,000)
  if (/লাখ|lakh/i.test(text) && amount > 0 && amount < 100) {
    amount = amount * 100000
  }

  // Simple Bangla category detection
  let category = 'Other'
  if (/বাজার|মুদি|গ্রোসারি|bazar|grocerie/i.test(text)) category = 'Groceries'
  else if (/ভাড়া|bhara|rent/i.test(text)) category = 'Rent'
  else if (/রিকশা|বাস|সিএনজি|পরিবহন|transport|rickshaw/i.test(text)) category = 'Transport'
  else if (/বিদ্যুৎ|গ্যাস|পানি|utilities|bill/i.test(text)) category = 'Utilities'
  else if (/ডাক্তার|ওষুধ|চিকিৎসা|doctor|health/i.test(text)) category = 'Healthcare'
  else if (/বেতন|salary|salar/i.test(text)) category = 'Salary'
  
  return {
    type: isIncome ? 'income' : 'expense',
    amount,
    description: text,
    category,
    spendingType: /debit|ডেবিট/i.test(text) ? 'debit' : /credit|ক্রেডিট/i.test(text) ? 'credit' : 'cash',
    classification: isIncome ? 'income' : 'need',
  }
}
