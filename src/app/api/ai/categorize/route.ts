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

// Bangla speech recognition often produces these common misrecognitions
const BANGLA_CORRECTIONS: Record<string, string> = {
  'টাকা': 'টাকা',
  'টাকার': 'টাকা',
  'টাকাে': 'টাকা',
  'খরচ': 'খরচ',
  'খরচা': 'খরচ',
  'খরোচ': 'খরচ',
  'বাজার': 'বাজার',
  'বাজাৰ': 'বাজার',
  'ভাড়া': 'ভাড়া',
  'ভাড়ায়': 'ভাড়া',
  'বেতন': 'বেতন',
  'ব্যতন': 'বেতন',
  'সেভ': 'সেভ',
  'সঞ্চয়': 'সঞ্চয়',
  'রিকশা': 'রিকশা',
  'রিক্সা': 'রিকশা',
  'লোন': 'লোন',
  'কিস্তি': 'কিস্তি',
  'ক্রেডিট': 'ক্রেডিট',
  'ডেবিট': 'ডেবিট',
}

function preprocessBanglaText(text: string): string {
  let processed = text
  
  // Apply common correction map
  for (const [wrong, correct] of Object.entries(BANGLA_CORRECTIONS)) {
    if (wrong !== correct) {
      processed = processed.replace(new RegExp(wrong, 'g'), correct)
    }
  }
  
  // Normalize common Bangla speech recognition artifacts
  // Sometimes "৫০০ টাকা" gets recognized as "500 টাকা" or vice versa
  // Normalize Bangla digits to English for consistent parsing
  const banglaDigitMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  }
  
  // Convert Bangla digits in the context of numbers/amounts
  processed = processed.replace(/[০-৯]+/g, (match) => {
    return match.replace(/[০-৯]/g, (d) => banglaDigitMap[d] || d)
  })
  
  return processed
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 })
    }

    // Preprocess Bangla text to fix common recognition errors
    const preprocessed = preprocessBanglaText(text)

    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a financial transaction parser for a Bangladesh-focused expense tracker (currency: BDT/Taka). 

You support BOTH English and Bangla (Bengali) input. Users may speak in either language or a mix of both (Banglish).

IMPORTANT: Voice recognition for Bangla is imperfect. The input may contain:
- Misspelled or misrecognized Bangla words (e.g., "খরোচ" instead of "খরচ", "ব্যতন" instead of "বেতন")
- Mixed Bangla-English text (e.g., "bazar e 500 taka")
- Bangla numbers written as English digits after preprocessing
- Extra words or filler words from speech recognition
- Words split incorrectly (e.g., "বাজারে" might be "বাজার এ")

Your job is to UNDERSTAND the INTENT even from imperfect input and extract the correct transaction.

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

Comprehensive Bangla keyword mapping (include common misrecognitions):
- টাকা/টাকার/টাকাে/takar/taka = currency (BDT)
- খরচ/খরচা/খরোচ/খর্চ/khoroche/khoroch = expense/spent
- আয়/aay = income
- বেতন/ব্যতন/betton/salary/সালারি = salary
- পেয়েছি/পাইছি/peyechi = received/got
- বাজার/বাজাৰ/bazar/মুদি/গ্রোসারি = groceries/market
- ভাড়া/ভাড়ায়/bhara/বাসা ভাড়া/বাসা ভাড়ায় = rent
- পরিবহন/রিকশা/রিক্সা/বাস/সিএনজি/মেট্রো/transport = transport
- বিদ্যুৎ/গ্যাস/পানি/ইউটিলিটি/বিল = utilities/bills
- চিকিৎসা/ডাক্তার/ওষুধ/medicine/healthcare = healthcare
- শিক্ষা/পড়াশোনা/education/স্কুল/কলেজ = education
- বিনোদন/মুভি/entertainment/সিনেমা = entertainment
- কেনাকাটা/শপিং/shopping = shopping
- নগদ/ক্যাশ/cash = cash
- ডেবিট/ডেবিট কার্ড/debit = debit card
- ক্রেডিট/ক্রেডিট কার্ড/credit = credit card
- ঋণ/লোন/কর্জ/loan/EMI = debt/loan
- সঞ্চয়/সেভ/savings/সঞ্চয়ী = savings
- প্রয়োজন/দরকার = need
- বিলাস/জাঁকালি = ego/luxury
- কিনলাম/কিনেছি/কিনলাম/কেনা = bought/purchased
- দিলাম/দিয়েছি = gave/paid
- লাখ/lokho = 100,000

English examples:
- "Spent 500 taka on groceries from cash" → {"type":"expense","amount":500,"description":"Groceries","category":"Groceries","spendingType":"cash","classification":"need"}
- "Income: 50000 salary from job" → {"type":"income","amount":50000,"description":"Monthly salary","category":"Salary","spendingType":"cash","classification":"income"}
- "Paid 2000 for Netflix subscription" → {"type":"expense","amount":2000,"description":"Netflix subscription","category":"Subscriptions","spendingType":"cash","classification":"want"}

Bangla examples (including imperfect recognition):
- "বাজারে 500 টাকা খরচ" → {"type":"expense","amount":500,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need"}
- "বাজারে 5 শ টাকা খরচ" → {"type":"expense","amount":500,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need"}
- "বাসা ভাড়া 15000 টাকা ডেবিট কার্ডে" → {"type":"expense","amount":15000,"description":"বাসা ভাড়া","category":"Rent","spendingType":"debit","classification":"need"}
- "বেতন পেয়েছি 50000 টাকা" → {"type":"income","amount":50000,"description":"বেতন","category":"Salary","spendingType":"cash","classification":"income"}
- "রিকশায় 100 টাকা" → {"type":"expense","amount":100,"description":"রিকশা ভাড়া","category":"Transport","spendingType":"cash","classification":"need"}
- "5000 টাকা সেভ করেছি" → {"type":"expense","amount":5000,"description":"সঞ্চয়","category":"Savings","spendingType":"cash","classification":"savings"}
- "লোনের কিস্তি 5000 টাকা" → {"type":"expense","amount":5000,"description":"লোনের কিস্তি","category":"Debt","spendingType":"cash","classification":"debt"}
- "মুভিতে 500 টাকা খরচ" → {"type":"expense","amount":500,"description":"মুভিতে খরচ","category":"Entertainment","spendingType":"cash","classification":"want"}
- "আইফোন কিনলাম 1 লাখ টাকায় ক্রেডিটে" → {"type":"expense","amount":100000,"description":"আইফোন","category":"Shopping","spendingType":"credit","classification":"ego"}
- "খরোচ 500 টাকা বাজারে" → {"type":"expense","amount":500,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need"}
- "5 হাজার টাকা খরচ" → {"type":"expense","amount":5000,"description":"খরচ","category":"Other","spendingType":"cash","classification":"need"}
- "2 লাখ টাকা ব্যতন পেলাম" → {"type":"income","amount":200000,"description":"বেতন","category":"Salary","spendingType":"cash","classification":"income"}

Banglish (mixed) examples:
- "bazar e 500 taka khoroche" → {"type":"expense","amount":500,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need"}
- "basha bhara 15000 debit e" → {"type":"expense","amount":15000,"description":"বাসা ভাড়া","category":"Rent","spendingType":"debit","classification":"need"}
- "rickshaw e 50 taka" → {"type":"expense","amount":50,"description":"রিকশা ভাড়া","category":"Transport","spendingType":"cash","classification":"need"}

IMPORTANT RULES:
1. For Bangla numbers written as words: "5 শ" = 500, "5 হাজার" = 5000, "1 লাখ" = 100000, "2 লাখ" = 200000
2. If the text seems like garbled/misrecognized Bangla, try your best to find any amount and reasonable category
3. Default spendingType to "cash" if not specified (most Bangladesh transactions are cash)
4. When in doubt about classification, use "need" for essential-sounding items`
        },
        {
          role: 'user',
          content: preprocessed
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
    })

    const content = completion.choices[0]?.message?.content || ''
    
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
  const preprocessed = preprocessBanglaText(text)
  const isIncome = /income|salary|earned|received|got paid|আয়|বেতন|ব্যতন|পেয়েছি|পাইছি|সালারি|peyechi/i.test(preprocessed)
  
  let amount = 0
  
  // Try English digits first
  const englishMatch = preprocessed.match(/(\d[\d,]*\.?\d*)/)
  if (englishMatch) {
    amount = parseFloat(englishMatch[1].replace(/,/g, ''))
  }
  
  // Check for Bangla number words
  if (amount > 0) {
    // "5 শ" = 500, "5 শত" = 500
    if (/শ(?:ত)?$/.test(preprocessed.replace(/\d+/g, '').trim()) || /শ\b/.test(preprocessed)) {
      const shMatch = preprocessed.match(/(\d+)\s*শ/)
      if (shMatch) amount = parseFloat(shMatch[1]) * 100
    }
    // "5 হাজার" = 5000, "5 হাজার" = 5000
    if (/হাজার/i.test(preprocessed)) {
      const hazarMatch = preprocessed.match(/(\d+)\s*হাজার/)
      if (hazarMatch) amount = parseFloat(hazarMatch[1]) * 1000
    }
    // "লাখ" = 100,000
    if (/লাখ|lakh/i.test(preprocessed)) {
      const lakhMatch = preprocessed.match(/(\d+(?:\.\d+)?)\s*লাখ/)
      if (lakhMatch) amount = parseFloat(lakhMatch[1]) * 100000
      else if (amount < 100) amount = amount * 100000
    }
  }
  
  // Simple Bangla category detection
  let category = 'Other'
  if (/বাজার|মুদি|গ্রোসারি|bazar|grocerie/i.test(preprocessed)) category = 'Groceries'
  else if (/ভাড়া|bhara|rent|বাসা/i.test(preprocessed)) category = 'Rent'
  else if (/রিকশা|রিক্সা|বাস|সিএনজি|পরিবহন|transport|rickshaw|মেট্রো/i.test(preprocessed)) category = 'Transport'
  else if (/বিদ্যুৎ|গ্যাস|পানি|utilities|bill|বিল/i.test(preprocessed)) category = 'Utilities'
  else if (/ডাক্তার|ওষুধ|চিকিৎসা|doctor|health|medicine/i.test(preprocessed)) category = 'Healthcare'
  else if (/শিক্ষা|পড়াশোনা|স্কুল|কলেজ|education|school/i.test(preprocessed)) category = 'Education'
  else if (/বেতন|ব্যতন|salary|salar/i.test(preprocessed)) category = 'Salary'
  else if (/মুভি|সিনেমা|বিনোদন|movie|entertainment/i.test(preprocessed)) category = 'Entertainment'
  else if (/সেভ|সঞ্চয়|saving/i.test(preprocessed)) category = 'Savings'
  else if (/লোন|কিস্তি|loan|ঋণ|কর্জ|EMI/i.test(preprocessed)) category = 'Debt'
  
  return {
    type: isIncome ? 'income' : 'expense',
    amount,
    description: text,
    category,
    spendingType: /debit|ডেবিট/i.test(preprocessed) ? 'debit' : /credit|ক্রেডিট/i.test(preprocessed) ? 'credit' : 'cash',
    classification: isIncome ? 'income' : 'need',
  }
}
