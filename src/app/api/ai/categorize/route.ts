import { NextRequest, NextResponse } from 'next/server'
import { getAI } from '@/lib/ai'

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

// Try to extract date from text input
function extractDateFromText(text: string): string | null {
  const today = new Date()
  const lower = text.toLowerCase()
  const preprocessed = preprocessBanglaText(text)
  
  // "yesterday" / "কাল" / "গতকাল"
  if (/\byesterday\b/i.test(lower) || /গতকাল|কালকের/i.test(preprocessed)) {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }
  
  // "day before yesterday" / "আগামীকালের আগের দিন" / "তিন দিন আগে"
  if (/\bday before yesterday\b/i.test(lower)) {
    const d = new Date(today)
    d.setDate(d.getDate() - 2)
    return d.toISOString().split('T')[0]
  }
  
  // "গত" (last/previous) + day name
  const banglaDayMap: Record<string, number> = {
    'রবিবার': 0, 'সোমবার': 1, 'মঙ্গলবার': 2, 'বুধবার': 3,
    'বৃহস্পতিবার': 4, 'শুক্রবার': 5, 'শনিবার': 6,
    'শুক্র': 5, 'শনি': 6, 'রবি': 0, 'সোম': 1, 'মঙ্গল': 2, 'বুধ': 3, 'বৃহস্পতি': 4,
  }
  
  for (const [dayName, dayNum] of Object.entries(banglaDayMap)) {
    const gatRegex = new RegExp(`গত\\s*${dayName}`, 'i')
    if (gatRegex.test(preprocessed)) {
      const d = new Date(today)
      const currentDay = d.getDay()
      let diff = currentDay - dayNum
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() - diff)
      return d.toISOString().split('T')[0]
    }
  }
  
  // "last Monday/Tuesday..." in English
  const englishDayMap: Record<string, number> = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6,
  }
  const lastDayMatch = lower.match(/last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i)
  if (lastDayMatch) {
    const dayNum = englishDayMap[lastDayMatch[1].toLowerCase()]
    if (dayNum !== undefined) {
      const d = new Date(today)
      const currentDay = d.getDay()
      let diff = currentDay - dayNum
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() - diff)
      return d.toISOString().split('T')[0]
    }
  }
  
  // "N days ago" / "N দিন আগে"
  const daysAgoMatch = lower.match(/(\d+)\s+days?\s+ago/i) || preprocessed.match(/(\d+)\s*দিন\s*আগে/)
  if (daysAgoMatch) {
    const d = new Date(today)
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1]))
    return d.toISOString().split('T')[0]
  }
  
  // Specific date: "5th June" / "June 5" / "5 জুন" / "জুন ৫"
  const months: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
    'জানুয়ারি': 0, 'ফেব্রুয়ারি': 1, 'মার্চ': 2, 'এপ্রিল': 3, 'মে': 4, 'জুন': 5,
    'জুলাই': 6, 'আগস্ট': 7, 'সেপ্টেম্বর': 8, 'অক্টোবর': 9, 'নভেম্বর': 10, 'ডিসেম্বর': 11,
    'জানু': 0, 'ফেব': 1, 'মার্চ্': 2, 'এপ্': 3, 'জুন্': 5, 'জুল্': 6, 'আগ': 7, 'সেপ্ট': 8, 'অক্টো': 9, 'নভে': 10, 'ডিসে': 11,
  }
  
  // "5 June" or "June 5" pattern
  for (const [monthName, monthNum] of Object.entries(months)) {
    // "5 June" or "5th June"
    const dayMonthPattern = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthName}`, 'i')
    const dayMonthMatch = preprocessed.match(dayMonthPattern) || lower.match(dayMonthPattern)
    if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1])
      const year = monthNum <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1
      const d = new Date(year, monthNum, day)
      if (d <= today) {
        return d.toISOString().split('T')[0]
      }
    }
    
    // "June 5" pattern
    const monthDayPattern = new RegExp(`${monthName}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i')
    const monthDayMatch = preprocessed.match(monthDayPattern) || lower.match(monthDayPattern)
    if (monthDayMatch) {
      const day = parseInt(monthDayMatch[1])
      const year = monthNum <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1
      const d = new Date(year, monthNum, day)
      if (d <= today) {
        return d.toISOString().split('T')[0]
      }
    }
  }
  
  // "last week" / "গত সপ্তাহ"
  if (/\blast\s*week\b/i.test(lower) || /গত\s*সপ্তাহ/i.test(preprocessed)) {
    const d = new Date(today)
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  }
  
  // "last month" / "গত মাস"
  if (/\blast\s*month\b/i.test(lower) || /গত\s*মাস/i.test(preprocessed)) {
    const d = new Date(today)
    d.setMonth(d.getMonth() - 1)
    d.setDate(Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
    return d.toISOString().split('T')[0]
  }
  
  // DD/MM/YYYY or DD-MM-YYYY format
  const dateSlashMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (dateSlashMatch) {
    const day = parseInt(dateSlashMatch[1])
    const month = parseInt(dateSlashMatch[2]) - 1
    let year = parseInt(dateSlashMatch[3])
    if (year < 100) year += 2000
    const d = new Date(year, month, day)
    if (!isNaN(d.getTime()) && d <= today) {
      return d.toISOString().split('T')[0]
    }
  }
  
  return null
}

export async function POST(request: NextRequest) {
  let text = ''
  try {
    const body = await request.json()
    text = body.text || ''

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 })
    }

    // Preprocess Bangla text to fix common recognition errors
    const preprocessed = preprocessBanglaText(text)
    
    // Try to extract date from the input
    const extractedDate = extractDateFromText(text)

    // Try AI categorization (only works when internal API is reachable)
    const zai = await getAI()

    if (!zai) {
      // AI not available — use enhanced regex categorization
      const smartResult = extractBasicInfo(text)
      return NextResponse.json({ result: smartResult })
    }

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
- DATE references like "yesterday", "last Friday", "3 days ago", "গতকাল", "গত শুক্রবার", "3 দিন আগে"

Your job is to UNDERSTAND the INTENT even from imperfect input and extract the correct transaction.

Given a user's voice or text input about a spending or income, extract and categorize the transaction.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with these fields:
- "type": "expense" or "income"
- "amount": number (the monetary amount, just the number)
- "description": string (a clean description in the SAME language the user used, WITHOUT date references)
- "category": string (must be one of: ${[...CATEGORIES.expense, ...CATEGORIES.income].join(', ')})
- "spendingType": string (must be one of: ${SPENDING_TYPES.join(', ')}) - default "cash" if not mentioned
- "classification": string (for expenses, must be one of: ${CLASSIFICATIONS.join(', ')}; for income, use "income")
- "date": string or null (if the user mentions a specific date like "yesterday", "last Friday", "গতকাল", "3 days ago", etc., return the date in YYYY-MM-DD format. If no date is mentioned, return null)

Classification guide:
- "need": Essential expenses (rent, groceries, utilities, healthcare, education, transport to work)
- "want": Nice-to-have but not essential (dining out, entertainment, subscriptions, shopping beyond basics)
- "ego": Status/luxury spending (designer brands, premium gadgets, luxury dining, show-off purchases)
- "savings": Money saved or invested (savings account, investments, emergency fund contributions)
- "debt": Debt repayment (loan EMI, credit card payments, borrowed money repayment)

Date extraction guide:
- "yesterday" = yesterday's date in YYYY-MM-DD format
- "day before yesterday" / "2 days ago" = 2 days ago
- "N days ago" / "N দিন আগে" = N days ago
- "last Friday/Monday/etc." = the most recent past Friday/Monday
- "গতকাল" = yesterday
- "গত শুক্রবার/সোমবার/etc." = last Friday/Monday
- "last week" = 7 days ago
- "last month" = same date last month
- Specific dates like "5 June", "June 5th", "5 জুন" = that date in YYYY-MM-DD
- If no date is mentioned, return null

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
- গতকাল/কালকে/yesterday = yesterday
- গত/last = last/previous

English examples:
- "Spent 500 taka on groceries from cash" → {"type":"expense","amount":500,"description":"Groceries","category":"Groceries","spendingType":"cash","classification":"need","date":null}
- "Income: 50000 salary from job" → {"type":"income","amount":50000,"description":"Monthly salary","category":"Salary","spendingType":"cash","classification":"income","date":null}
- "Paid 2000 for Netflix subscription yesterday" → {"type":"expense","amount":2000,"description":"Netflix subscription","category":"Subscriptions","spendingType":"cash","classification":"want","date":"${new Date(Date.now() - 86400000).toISOString().split('T')[0]}"}
- "Bought groceries for 800 taka last Friday" → {"type":"expense","amount":800,"description":"Groceries","category":"Groceries","spendingType":"cash","classification":"need","date":"2026-06-05"}

Bangla examples (including imperfect recognition):
- "বাজারে 500 টাকা খরচ" → {"type":"expense","amount":500,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need","date":null}
- "বাজারে 5 শ টাকা খরচ" → {"type":"expense","amount":500,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need","date":null}
- "বাসা ভাড়া 15000 টাকা ডেবিট কার্ডে" → {"type":"expense","amount":15000,"description":"বাসা ভাড়া","category":"Rent","spendingType":"debit","classification":"need","date":null}
- "বেতন পেয়েছি 50000 টাকা" → {"type":"income","amount":50000,"description":"বেতন","category":"Salary","spendingType":"cash","classification":"income","date":null}
- "রিকশায় 100 টাকা গতকাল" → {"type":"expense","amount":100,"description":"রিকশা ভাড়া","category":"Transport","spendingType":"cash","classification":"need","date":"${new Date(Date.now() - 86400000).toISOString().split('T')[0]}"}
- "গত শুক্রবার বাজারে 2000 টাকা খরচ" → {"type":"expense","amount":2000,"description":"বাজারে খরচ","category":"Groceries","spendingType":"cash","classification":"need","date":"2026-06-05"}
- "3 দিন আগে ডাক্তার দেখানো 1500 টাকা" → {"type":"expense","amount":1500,"description":"ডাক্তার দেখানো","category":"Healthcare","spendingType":"cash","classification":"need","date":"${new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]}"}

IMPORTANT RULES:
1. For Bangla numbers written as words: "5 শ" = 500, "5 হাজার" = 5000, "1 লাখ" = 100000, "2 লাখ" = 200000
2. If the text seems like garbled/misrecognized Bangla, try your best to find any amount and reasonable category
3. Default spendingType to "cash" if not specified (most Bangladesh transactions are cash)
4. When in doubt about classification, use "need" for essential-sounding items
5. Remove date references from the description (e.g., "yesterday's groceries" → description: "Groceries")
6. If a date is mentioned, always extract it and return in YYYY-MM-DD format
7. Never return a future date - if parsed date is in the future, return null`
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

    // Use the AI-extracted date, or fall back to the regex-extracted date, or default to today
    let finalDate = parsed.date || extractedDate || new Date().toISOString().split('T')[0]
    
    // Validate the date is not in the future
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const parsedDate = new Date(finalDate)
    parsedDate.setHours(0, 0, 0, 0)
    if (parsedDate > today) {
      finalDate = new Date().toISOString().split('T')[0]
    }

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
      date: finalDate,
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error categorizing transaction:', error)
    const fallbackResult = extractBasicInfo(text || 'expense 0 other')
    return NextResponse.json({ result: fallbackResult })
  }
}

function extractBasicInfo(text: string): {
  type: string
  amount: number
  description: string
  category: string
  spendingType: string
  classification: string
  date: string
} {
  const preprocessed = preprocessBanglaText(text)
  const lower = preprocessed.toLowerCase()
  
  const isIncome = /income|salary|earned|received|got paid|আয়|বেতন|ব্যতন|পেয়েছি|পাইছি|সালারি|peyechi|freelance|ব্যবসা|business|investment|rental/i.test(preprocessed)
  
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
    // "5 হাজার" = 5000
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
  
  // Enhanced category detection with priority ordering
  let category = 'Other'
  
  // Income categories
  if (isIncome) {
    if (/বেতন|ব্যতন|salary|salar|সালারি|paycheck|wage/i.test(preprocessed)) category = 'Salary'
    else if (/freelance|ফ্রিল্যান্স|contract|কন্ট্রাক্ট/i.test(preprocessed)) category = 'Freelance'
    else if (/ব্যবসা|business|প্রফিট|profit|বিক্রি|sale/i.test(preprocessed)) category = 'Business'
    else if (/investment|ইনভেস্টমেন্ট|ইনভেস্ট|dividend|লভ্যাংশ|stock|শেয়ার/i.test(preprocessed)) category = 'Investment'
    else if (/rental|ভাড়া আয়|ভাড়া পাওনা/i.test(preprocessed)) category = 'Rental'
    else if (/side.hustle|সাইড|part.time|পার্ট টাইম/i.test(preprocessed)) category = 'Side Hustle'
    else if (/gift|উপহার|gift received/i.test(preprocessed)) category = 'Gift Received'
    else if (/refund|রিফান্ড|return|রিটার্ন|cashback|ক্যাশব্যাক/i.test(preprocessed)) category = 'Refund'
  } else {
    // Expense categories (ordered by specificity)
    if (/বাজার|মুদি|গ্রোসারি|bazar|grocerie|মাছ|মাংস|সবজি|ফল|চাল|ডাল|তেল|পেঁয়াজ|আলু|market/i.test(preprocessed)) category = 'Groceries'
    else if (/রেস্তোরাঁ|রেস্টুরেন্ট|ডাইনিং|খাবার|খেলাম|খেতে|lunch|dinner|breakfast|cafe|ক্যাফে|pizza|burger|চা|coffee|কফি|ফাস্টফুড|fast.food|eat|food|dining|মিষ্টি|বিরিয়ানি|চিকেন|রান্না|catering/i.test(preprocessed)) category = 'Food & Dining'
    else if (/ভাড়া|bhara|rent|বাসা|flat|ফ্ল্যাট|apartment|হোস্টেল|hostel/i.test(preprocessed)) category = 'Rent'
    else if (/রিকশা|রিক্সা|বাস|সিএনজি|পরিবহন|transport|rickshaw|মেট্রো|metro|ট্রেন|train|ক্যাব|cab|uber|পাঠাও|উবার|গাড়ি|car|পেট্রোল|petrol|ফিলিং|fuel|জ্বালানি|cng|auto|অটো|pick.up|ড্রপ/i.test(preprocessed)) category = 'Transport'
    else if (/বিদ্যুৎ|গ্যাস|পানি|utilities|বিল|bill|electric|ইলেকট্রিক|water|ওয়াসা|wasa|wifi|ইন্টারনেট|internet|recharge|রিচার্জ|mobile|মোবাইল/i.test(preprocessed)) category = 'Utilities'
    else if (/ডাক্তার|ওষুধ|চিকিৎসা|doctor|health|medicine|হাসপাতাল|hospital|ফার্মেসি|pharmacy|ডেন্টাল|dental|চশমা|চক্ষু|eye|tests|পরীক্ষা|vaccine|ভ্যাকসিন|থেরাপি|therapy/i.test(preprocessed)) category = 'Healthcare'
    else if (/শিক্ষা|পড়াশোনা|স্কুল|কলেজ|education|school|university|বিশ্ববিদ্যালয়|কোর্স|course|টিউশন|tuition|বই|book|exam|পরীক্ষা|coaching|কোচিং|training|প্রশিক্ষণ/i.test(preprocessed)) category = 'Education'
    else if (/মুভি|সিনেমা|বিনোদন|movie|entertainment|নেটফ্লিক্স|netflix|spotify|স্পটিফাই|গেম|game|concert|কনসার্ট|পার্টি|party|club|ক্লাব|show|শো|theater|থিয়েটার/i.test(preprocessed)) category = 'Entertainment'
    else if (/কেনাকাটা|শপিং|shopping|কিনলাম|কিনেছি|bought|purchased|কেনা|buy|জামা|কাপড়|clothes|জুতা|shoes|ব্যাগ|bag|ফ্যাশন|fashion|অনলাইন|online|ডেলিভারি|delivery|amaz|flipkart|daraz|দারাজ/i.test(preprocessed)) category = 'Shopping'
    else if (/সেলুন|salon|পার্লার|parlor|beauty|বিউটি|হেয়ার|hair|স্কিন|skin|মেকআপ|makeup|cosmetic|প্রসাধন|spa|স্পা|নেইল|nail|গ্রুমিং|grooming|personal.care/i.test(preprocessed)) category = 'Personal Care'
    else if (/ইনস্যুরেন্স|insurance|বীমা|প্রিমিয়াম|premium|life.insurance|health.insurance/i.test(preprocessed)) category = 'Insurance'
    else if (/সাবস্ক্রিপশন|subscription|সাবস্ক্রাইব|subscribe|membership|মেম্বারশিপ|netflix|spotify|youtube|premium|pro.plan|আনলিমিটেড/i.test(preprocessed)) category = 'Subscriptions'
    else if (/ভ্রমণ|travel|ট্যুর|tour|ভ্যাকেশন|vacation|হোটেল|hotel|ফ্লাইট|flight|টিকেট|ticket|ভিসা|visa|পাসপোর্ট|passport|holiday|ছুটি|tripping/i.test(preprocessed)) category = 'Travel'
    else if (/উপহার|gift|জন্মদিন|birthday|বিয়ে|wedding|অনুষ্ঠান|occasion|celebration|celebrate/i.test(preprocessed)) category = 'Gifts'
    else if (/দান|charity|জাকাত|zakat|দাতব্য|donation|অনুদান|fundraise/i.test(preprocessed)) category = 'Charity'
    else if (/সেভ|সঞ্চয়|saving|ডিপোজিট|deposit|এফডি|fd|rd|পিজিএস|pgs|emergency.fund|জরুরি তহবিল/i.test(preprocessed)) category = 'Savings'
    else if (/লোন|কিস্তি|loan|ঋণ|কর্জ|EMI|emi|ক্রেডিট কার্ড বিল|credit.card.bill|mortgage|হোম লোন|কার লোন|পার্সোনাল লোন/i.test(preprocessed)) category = 'Debt'
  }

  // Smart classification
  let classification = 'need'
  if (isIncome) {
    classification = 'income'
  } else {
    const needKeywords = /ভাড়া|rent|বাজার|grocerie|বিদ্যুৎ|গ্যাস|পানি|utilities|ডাক্তার|ওষুধ|চিকিৎসা|health|medicine|শিক্ষা|education|রিকশা|transport|ইনস্যুরেন্স|insurance|লোন|loan|কিস্তি|emi|সেভ|saving/i
    const wantKeywords = /মুভি|সিনেমা|movie|entertainment|সাবস্ক্রিপশন|subscription|রেস্টুরেন্ট|dining|কেনাকাটা|shopping|ভ্রমণ|travel|পার্টি|party/i
    const egoKeywords = /বিলাস|luxury|designer|প্রিমিয়াম|premium|ব্রান্ডেড|branded|designer|সেলুন|salon|spa/i
    
    if (egoKeywords.test(preprocessed)) classification = 'ego'
    else if (wantKeywords.test(preprocessed)) classification = 'want'
    else if (needKeywords.test(preprocessed)) classification = 'need'
    else classification = 'need' // default to need for unknown categories
  }

  // Clean up description - remove amount, date refs, and common filler words
  let description = text
    .replace(/\b(spent|paid|bought|purchased|spent|cost|costs)\b/gi, '')
    .replace(/\b(yesterday|today|last\s+\w+|ago|\d+\s+days?\s+ago)\b/gi, '')
    .replace(/\b(cash|debit|credit|from|on|for|of|the|a|an|taka|টাকা|টাকার)\b/gi, '')
    .replace(/\d+[\d,]*\.?\d*/g, '') // Remove numbers
    .replace(/গতকাল|কালকে|গত\s*\S+|দিন\s*আগে/g, '') // Remove Bangla date refs
    .replace(/খরচ|খরচা|খরোচ/g, '') // Remove "expense" words
    .replace(/\s+/g, ' ')
    .trim()
  
  // If description is empty or too short, use the original text
  if (description.length < 3) {
    description = text.replace(/\b(spent|paid|bought)\b/gi, '').replace(/\d+[\d,]*\.?\d*/g, '').replace(/টাকা|টাকার/g, '').trim()
  }
  if (description.length < 3) {
    description = category
  }
  
  // Capitalize first letter
  description = description.charAt(0).toUpperCase() + description.slice(1)
  
  // Try to extract date
  const extractedDate = extractDateFromText(text)
  
  return {
    type: isIncome ? 'income' : 'expense',
    amount,
    description,
    category,
    spendingType: /debit|ডেবিট/i.test(preprocessed) ? 'debit' : /credit|ক্রেডিট/i.test(preprocessed) ? 'credit' : 'cash',
    classification,
    date: extractedDate || new Date().toISOString().split('T')[0],
  }
}
