import { NextRequest, NextResponse } from 'next/server'
import { getAI } from '@/lib/ai'

const CATEGORIES = {
  expense: [
    'Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Rent',
    'Healthcare', 'Education', 'Entertainment', 'Shopping', 'Personal Care',
    'Gadgets & Electronics', 'Insurance', 'Subscriptions', 'Travel', 'Gifts', 'Charity', 'Other'
  ],
  income: [
    'Salary', 'Freelance', 'Business', 'Investment', 'Rental',
    'Side Hustle', 'Gift Received', 'Refund', 'Other'
  ]
}

const SPENDING_TYPES = ['cash', 'debit', 'credit']
const CLASSIFICATIONS = ['need', 'want', 'ego', 'savings', 'debt']

const BANGLA_CORRECTIONS: Record<string, string> = {
  'টাকার': 'টাকা', 'টাকাে': 'টাকা', 'খরচা': 'খরচ', 'খরোচ': 'খরচ',
  'বাজাৰ': 'বাজার', 'ভাড়ায়': 'ভাড়া', 'ব্যতন': 'বেতন', 'রিক্সা': 'রিকশা',
}

function preprocessBanglaText(text: string): string {
  let processed = text
  for (const [wrong, correct] of Object.entries(BANGLA_CORRECTIONS)) {
    processed = processed.replace(new RegExp(wrong, 'g'), correct)
  }
  const banglaDigitMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  }
  processed = processed.replace(/[০-৯]+/g, (match) =>
    match.replace(/[০-৯]/g, (d) => banglaDigitMap[d] || d)
  )
  return processed
}

function extractDateFromText(text: string): string | null {
  const today = new Date()
  const lower = text.toLowerCase()
  const preprocessed = preprocessBanglaText(text)

  if (/\byesterday\b/i.test(lower) || /গতকাল|কালকের/i.test(preprocessed)) {
    const d = new Date(today); d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }
  if (/\bday before yesterday\b/i.test(lower)) {
    const d = new Date(today); d.setDate(d.getDate() - 2)
    return d.toISOString().split('T')[0]
  }

  const banglaDayMap: Record<string, number> = {
    'রবিবার': 0, 'সোমবার': 1, 'মঙ্গলবার': 2, 'বুধবার': 3,
    'বৃহস্পতিবার': 4, 'শুক্রবার': 5, 'শনিবার': 6,
    'শুক্র': 5, 'শনি': 6, 'রবি': 0, 'সোম': 1, 'মঙ্গল': 2, 'বুধ': 3, 'বৃহস্পতি': 4,
  }
  for (const [dayName, dayNum] of Object.entries(banglaDayMap)) {
    if (new RegExp(`গত\\s*${dayName}`, 'i').test(preprocessed)) {
      const d = new Date(today)
      let diff = d.getDay() - dayNum
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() - diff)
      return d.toISOString().split('T')[0]
    }
  }

  const englishDayMap: Record<string, number> = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6,
  }
  const lastDayMatch = lower.match(/last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i)
  if (lastDayMatch) {
    const dayNum = englishDayMap[lastDayMatch[1].toLowerCase()]
    if (dayNum !== undefined) {
      const d = new Date(today)
      let diff = d.getDay() - dayNum
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() - diff)
      return d.toISOString().split('T')[0]
    }
  }

  const daysAgoMatch = lower.match(/(\d+)\s+days?\s+ago/i) || preprocessed.match(/(\d+)\s*দিন\s*আগে/)
  if (daysAgoMatch) {
    const d = new Date(today); d.setDate(d.getDate() - parseInt(daysAgoMatch[1]))
    return d.toISOString().split('T')[0]
  }

  const months: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7,
    'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
    'জানুয়ারি': 0, 'ফেব্রুয়ারি': 1, 'মার্চ': 2, 'এপ্রিল': 3, 'মে': 4, 'জুন': 5,
    'জুলাই': 6, 'আগস্ট': 7, 'সেপ্টেম্বর': 8, 'অক্টোবর': 9, 'নভেম্বর': 10, 'ডিসেম্বর': 11,
  }
  for (const [monthName, monthNum] of Object.entries(months)) {
    const dayMonthPattern = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthName}`, 'i')
    const dayMonthMatch = preprocessed.match(dayMonthPattern) || lower.match(dayMonthPattern)
    if (dayMonthMatch) {
      const day = parseInt(dayMonthMatch[1])
      const year = monthNum <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1
      const d = new Date(year, monthNum, day)
      if (d <= today) return d.toISOString().split('T')[0]
    }
    const monthDayPattern = new RegExp(`${monthName}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i')
    const monthDayMatch = preprocessed.match(monthDayPattern) || lower.match(monthDayPattern)
    if (monthDayMatch) {
      const day = parseInt(monthDayMatch[1])
      const year = monthNum <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1
      const d = new Date(year, monthNum, day)
      if (d <= today) return d.toISOString().split('T')[0]
    }
  }

  if (/\blast\s*week\b/i.test(lower) || /গত\s*সপ্তাহ/i.test(preprocessed)) {
    const d = new Date(today); d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  }
  if (/\blast\s*month\b/i.test(lower) || /গত\s*মাস/i.test(preprocessed)) {
    const d = new Date(today)
    d.setMonth(d.getMonth() - 1)
    d.setDate(Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
    return d.toISOString().split('T')[0]
  }

  const dateSlashMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (dateSlashMatch) {
    const day = parseInt(dateSlashMatch[1])
    const month = parseInt(dateSlashMatch[2]) - 1
    let year = parseInt(dateSlashMatch[3])
    if (year < 100) year += 2000
    const d = new Date(year, month, day)
    if (!isNaN(d.getTime()) && d <= today) return d.toISOString().split('T')[0]
  }

  return null
}

// Shared system prompt for all AI backends
const CATEGORIZE_SYSTEM_PROMPT = `You are a financial transaction parser for an expense tracker (multi-currency, supports BDT/Taka, USD, EUR, INR, etc).
You support English, Bangla (Bengali), Hindi, and mixed input (Banglish).

Given a user's voice or text input about a spending or income, extract and categorize the transaction.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with these fields:
- "type": "expense" or "income"
- "amount": number (the monetary amount, just the number)
- "description": string (clean description in the SAME language the user used, WITHOUT date references)
- "category": string (must be one of: ${[...CATEGORIES.expense, ...CATEGORIES.income].join(', ')})
- "spendingType": string (must be one of: ${SPENDING_TYPES.join(', ')}) - default "cash" if not mentioned
- "classification": string (for expenses: ${CLASSIFICATIONS.join(', ')}; for income use "income")
- "date": string or null (if user mentions a date like "yesterday"/"গতকাল"/"3 days ago", return YYYY-MM-DD; otherwise null)

Classification guide:
- "need": Essential expenses (rent, groceries, utilities, healthcare, education, transport)
- "want": Nice-to-have (dining out, entertainment, subscriptions, shopping beyond basics)
- "ego": Luxury/status spending (designer brands, premium gadgets, luxury dining)
- "savings": Money saved or invested
- "debt": Loan EMI, credit card payments, debt repayment

Common Bangla keywords: টাকা=money, খরচ=expense, আয়=income, বেতন=salary, বাজার=groceries/market, ভাড়া=rent, রিকশা=transport, গতকাল=yesterday, গত=last/previous

For Bangla numbers: "5 শ"=500, "5 হাজার"=5000, "1 লাখ"=100000
Default spendingType to "cash" if not specified.
Remove date references from description.
Never return a future date.`

// Call Anthropic Claude API for AI categorization
async function categorizeWithClaude(preprocessed: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: CATEGORIZE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: preprocessed }],
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.content?.[0]?.text || null
  } catch {
    return null
  }
}

function parseAIResponse(content: string): Record<string, unknown> {
  let cleaned = content.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return JSON.parse(cleaned.trim())
}

export async function POST(request: NextRequest) {
  let text = ''
  try {
    const body = await request.json()
    text = body.text || ''

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 })
    }

    const preprocessed = preprocessBanglaText(text)
    const extractedDate = extractDateFromText(text)

    // Try ZAI SDK first (only works inside Z.ai sandbox)
    const zai = await getAI()

    let parsed: Record<string, unknown> | null = null

    if (zai) {
      try {
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: CATEGORIZE_SYSTEM_PROMPT },
            { role: 'user', content: preprocessed }
          ],
          temperature: 0.1,
          max_tokens: 300,
        })
        const content = completion.choices[0]?.message?.content || ''
        parsed = parseAIResponse(content)
      } catch {
        parsed = null
      }
    }

    // Try Anthropic Claude if ZAI not available and ANTHROPIC_API_KEY is set
    if (!parsed) {
      const claudeResponse = await categorizeWithClaude(preprocessed)
      if (claudeResponse) {
        try {
          parsed = parseAIResponse(claudeResponse)
        } catch {
          parsed = null
        }
      }
    }

    // If no AI available, use regex-based categorization
    if (!parsed) {
      const smartResult = extractBasicInfo(text)
      return NextResponse.json({ result: smartResult })
    }

    // Validate and normalize the parsed result
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let finalDate = (parsed.date as string) || extractedDate || new Date().toISOString().split('T')[0]
    const parsedDate = new Date(finalDate)
    parsedDate.setHours(0, 0, 0, 0)
    if (parsedDate > today) finalDate = new Date().toISOString().split('T')[0]

    const result = {
      type: parsed.type === 'income' ? 'income' : 'expense',
      amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount as string) || 0,
      description: (parsed.description as string) || text,
      category: (parsed.category as string) || 'Other',
      spendingType: SPENDING_TYPES.includes(parsed.spendingType as string) ? (parsed.spendingType as string) : 'cash',
      classification: parsed.type === 'income'
        ? 'income'
        : CLASSIFICATIONS.includes(parsed.classification as string)
          ? (parsed.classification as string)
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
  type: string; amount: number; description: string; category: string
  spendingType: string; classification: string; date: string
} {
  const preprocessed = preprocessBanglaText(text)

  const isIncome = /income|salary|earned|received|got paid|আয়|বেতন|ব্যতন|পেয়েছি|পাইছি|সালারি|freelance|ব্যবসা|business|investment|rental/i.test(preprocessed)

  let amount = 0
  const englishMatch = preprocessed.match(/(\d[\d,]*\.?\d*)/)
  if (englishMatch) amount = parseFloat(englishMatch[1].replace(/,/g, ''))

  if (amount > 0) {
    const shMatch = preprocessed.match(/(\d+)\s*শ/)
    if (shMatch) amount = parseFloat(shMatch[1]) * 100
    const hazarMatch = preprocessed.match(/(\d+)\s*হাজার/)
    if (hazarMatch) amount = parseFloat(hazarMatch[1]) * 1000
    const lakhMatch = preprocessed.match(/(\d+(?:\.\d+)?)\s*লাখ/)
    if (lakhMatch) amount = parseFloat(lakhMatch[1]) * 100000
    else if (/লাখ|lakh/i.test(preprocessed) && amount < 100) amount = amount * 100000
  }

  let category = 'Other'
  if (isIncome) {
    if (/বেতন|ব্যতন|salary|paycheck|wage/i.test(preprocessed)) category = 'Salary'
    else if (/freelance|ফ্রিল্যান্স/i.test(preprocessed)) category = 'Freelance'
    else if (/ব্যবসা|business|profit|বিক্রি/i.test(preprocessed)) category = 'Business'
    else if (/investment|dividend|stock|শেয়ার/i.test(preprocessed)) category = 'Investment'
    else if (/refund|রিফান্ড|cashback/i.test(preprocessed)) category = 'Refund'
  } else {
    if (/বাজার|মুদি|bazar|grocerie|মাছ|মাংস|সবজি|চাল|ডাল/i.test(preprocessed)) category = 'Groceries'
    else if (/রেস্তোরাঁ|রেস্টুরেন্ট|খাবার|lunch|dinner|breakfast|cafe|coffee|food|dining|বিরিয়ানি/i.test(preprocessed)) category = 'Food & Dining'
    else if (/ভাড়া|rent|বাসা|flat|ফ্ল্যাট|apartment/i.test(preprocessed)) category = 'Rent'
    else if (/রিকশা|বাস|সিএনজি|transport|rickshaw|metro|uber|পাঠাও|petrol|fuel/i.test(preprocessed)) category = 'Transport'
    else if (/বিদ্যুৎ|গ্যাস|পানি|bill|electric|water|wifi|internet|recharge/i.test(preprocessed)) category = 'Utilities'
    else if (/ডাক্তার|ওষুধ|চিকিৎসা|doctor|health|medicine|hospital|pharmacy|dental/i.test(preprocessed)) category = 'Healthcare'
    else if (/শিক্ষা|স্কুল|কলেজ|education|school|university|course|tuition|book/i.test(preprocessed)) category = 'Education'
    else if (/subscription|সাবস্ক্রিপশন|netflix|spotify|youtube|membership/i.test(preprocessed)) category = 'Subscriptions'
    else if (/মুভি|সিনেমা|movie|entertainment|game|party|concert/i.test(preprocessed)) category = 'Entertainment'
    else if (/gadget|phone|laptop|tablet|computer|headphone|charger|camera|smartwatch|earbuds|iphone|samsung|tech/i.test(preprocessed)) category = 'Gadgets & Electronics'
    else if (/কেনাকাটা|শপিং|shopping|bought|কাপড়|clothes|shoes|ব্যাগ|bag/i.test(preprocessed)) category = 'Shopping'
    else if (/salon|parlor|beauty|hair|makeup|spa|grooming/i.test(preprocessed)) category = 'Personal Care'
    else if (/insurance|বীমা|premium/i.test(preprocessed)) category = 'Insurance'
    else if (/travel|hotel|flight|ticket|visa|tour|vacation/i.test(preprocessed)) category = 'Travel'
    else if (/gift|উপহার|birthday|wedding/i.test(preprocessed)) category = 'Gifts'
    else if (/charity|donation|দান|জাকাত/i.test(preprocessed)) category = 'Charity'
    else if (/loan|লোন|কিস্তি|emi|ঋণ|কর্জ/i.test(preprocessed)) category = 'Other'
    else if (/saving|সঞ্চয়|deposit/i.test(preprocessed)) category = 'Other'
  }

  let classification = 'need'
  if (isIncome) {
    classification = 'income'
  } else {
    if (/luxury|designer|premium|branded|spa/i.test(preprocessed)) classification = 'ego'
    else if (/movie|entertainment|subscription|restaurant|dining|shopping|travel|party/i.test(preprocessed)) classification = 'want'
    else if (/rent|grocerie|electric|water|doctor|medicine|education|transport|insurance|loan|emi/i.test(preprocessed)) classification = 'need'
  }

  let description = text
    .replace(/\b(spent|paid|bought|purchased|cost|costs)\b/gi, '')
    .replace(/\b(yesterday|today|last\s+\w+|ago|\d+\s+days?\s+ago)\b/gi, '')
    .replace(/\b(cash|from|on|for|of|the|a|an|taka|টাকা|টাকার)\b/gi, '')
    .replace(/\d+[\d,]*\.?\d*/g, '')
    .replace(/গতকাল|কালকে|গত\s*\S+|দিন\s*আগে/g, '')
    .replace(/খরচ|খরচা|খরোচ/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (description.length < 3) {
    description = text.replace(/\b(spent|paid|bought)\b/gi, '').replace(/\d+[\d,]*\.?\d*/g, '').replace(/টাকা|টাকার/g, '').trim()
  }
  if (description.length < 3) description = category
  description = description.charAt(0).toUpperCase() + description.slice(1)

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
