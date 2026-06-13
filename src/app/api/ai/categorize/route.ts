import { NextRequest, NextResponse } from 'next/server'
import { getAI } from '@/lib/ai'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

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

// ─────────────────────────────────────────────────────────────
// Offline category identification (used when no AI key is set).
// A priority-ordered keyword lexicon + a fuzzy (edit-distance) matcher
// so that even misspelled product names are categorised correctly.
// ─────────────────────────────────────────────────────────────
type LexEntry = { category: string; en: string[]; bn?: string[] }

const EXPENSE_LEXICON: LexEntry[] = [
  {
    category: 'Groceries',
    en: [
      'grocery', 'groceries', 'supermarket', 'market', 'kirana',
      // fruits
      'mango', 'banana', 'apple', 'orange', 'grape', 'watermelon', 'melon', 'guava', 'papaya', 'pineapple', 'strawberry', 'berry', 'lemon', 'lime', 'coconut', 'fruit', 'pomegranate', 'cherry', 'peach',
      // vegetables
      'vegetable', 'vegitable', 'veggie', 'potato', 'onion', 'tomato', 'carrot', 'cabbage', 'cauliflower', 'brinjal', 'eggplant', 'spinach', 'cucumber', 'pumpkin', 'garlic', 'ginger', 'chili', 'chilli', 'pepper', 'lettuce', 'broccoli', 'bean', 'okra', 'radish', 'mushroom', 'coriander',
      // staples & pantry
      'rice', 'flour', 'atta', 'maida', 'wheat', 'lentil', 'dal', 'pulse', 'sugar', 'salt', 'oil', 'ghee', 'spice', 'turmeric', 'semolina', 'oats', 'noodle', 'pasta', 'cereal', 'vermicelli', 'bread', 'biscuit', 'jam', 'honey', 'tea', 'snack', 'chips', 'sauce', 'ketchup', 'pickle', 'chocolate', 'candy', 'juice',
      // proteins
      'fish', 'meat', 'chicken', 'beef', 'mutton', 'pork', 'egg', 'prawn', 'shrimp', 'hilsa',
      // dairy
      'milk', 'yogurt', 'yoghurt', 'curd', 'cheese', 'butter', 'paneer', 'cream',
      // household / cleaning consumables
      'detergent', 'dishwash', 'dishwasher', 'cleaner', 'cleaning', 'bleach', 'phenyl', 'harpic', 'surf', 'disinfectant', 'dettol', 'toiletpaper', 'napkin', 'broom', 'mop', 'freshener', 'repellent', 'matchbox', 'handwash', 'softener',
    ],
    bn: ['বাজার', 'মুদি', 'মাছ', 'মাংস', 'সবজি', 'শাক', 'তরকারি', 'চাল', 'ডাল', 'আলু', 'পেঁয়াজ', 'ডিম', 'দুধ', 'চিনি', 'তেল', 'আটা', 'মুরগি', 'রসুন', 'আদা', 'টমেটো', 'সাবান', 'ডিটারজেন্ট'],
  },
  {
    category: 'Food & Dining',
    en: ['restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'brunch', 'food', 'dining', 'pizza', 'burger', 'kebab', 'biryani', 'biriyani', 'sandwich', 'momo', 'shawarma', 'fries', 'dessert', 'icecream', 'ice cream', 'cake', 'pastry', 'zomato', 'swiggy', 'foodpanda', 'ubereats', 'takeout', 'takeaway', 'meal', 'buffet', 'barbeque'],
    bn: ['রেস্তোরাঁ', 'রেস্টুরেন্ট', 'খাবার', 'বিরিয়ানি'],
  },
  {
    category: 'Rent',
    en: ['rent', 'flat', 'apartment', 'mortgage', 'lease', 'hostel'],
    bn: ['ভাড়া', 'বাসা', 'ফ্ল্যাট'],
  },
  {
    category: 'Transport',
    en: ['transport', 'rickshaw', 'metro', 'uber', 'ola', 'pathao', 'petrol', 'diesel', 'fuel', 'taxi', 'cab', 'train', 'bus', 'fare', 'toll', 'parking', 'cng', 'tram', 'ferry', 'scooter', 'auto', 'ride'],
    bn: ['রিকশা', 'বাস', 'সিএনজি', 'পাঠাও'],
  },
  {
    category: 'Utilities',
    en: ['bill', 'electricity', 'electric', 'water', 'wifi', 'internet', 'recharge', 'gas', 'broadband', 'utility', 'postpaid', 'prepaid', 'dth'],
    bn: ['বিদ্যুৎ', 'গ্যাস', 'পানি'],
  },
  {
    category: 'Healthcare',
    en: ['doctor', 'health', 'medicine', 'medical', 'hospital', 'pharmacy', 'dental', 'dentist', 'clinic', 'pill', 'syrup', 'capsule', 'ointment', 'bandage', 'vaccine', 'injection', 'checkup', 'mask', 'surgery', 'therapy', 'prescription'],
    bn: ['ডাক্তার', 'ওষুধ', 'চিকিৎসা'],
  },
  {
    category: 'Education',
    en: ['education', 'school', 'university', 'college', 'course', 'tuition', 'book', 'notebook', 'pencil', 'stationery', 'exam', 'coaching', 'seminar', 'workshop', 'admission', 'semester', 'textbook', 'fees'],
    bn: ['শিক্ষা', 'স্কুল', 'কলেজ'],
  },
  {
    category: 'Subscriptions',
    en: ['subscription', 'netflix', 'spotify', 'youtube', 'membership', 'prime', 'hotstar', 'disney', 'patreon', 'icloud', 'chatgpt'],
    bn: ['সাবস্ক্রিপশন'],
  },
  {
    category: 'Entertainment',
    en: ['movie', 'cinema', 'entertainment', 'game', 'gaming', 'party', 'concert', 'show', 'theatre', 'theater', 'amusement', 'arcade', 'bowling', 'nightclub', 'playstation', 'xbox'],
    bn: ['মুভি', 'সিনেমা'],
  },
  {
    category: 'Gadgets & Electronics',
    en: ['gadget', 'phone', 'smartphone', 'laptop', 'tablet', 'computer', 'headphone', 'earphone', 'earbud', 'charger', 'camera', 'smartwatch', 'iphone', 'android', 'samsung', 'xiaomi', 'battery', 'cable', 'adapter', 'powerbank', 'power bank', 'bulb', 'light', 'mouse', 'keyboard', 'monitor', 'speaker', 'router', 'ssd', 'hdd', 'usb', 'pendrive', 'television', 'fridge', 'refrigerator', 'microwave', 'oven', 'appliance', 'electronic', 'printer', 'console'],
  },
  {
    category: 'Shopping',
    en: ['shopping', 'clothes', 'clothing', 'shoe', 'bag', 'shirt', 'tshirt', 't-shirt', 'pant', 'trouser', 'jean', 'dress', 'skirt', 'jacket', 'coat', 'sweater', 'hoodie', 'saree', 'sari', 'kurta', 'panjabi', 'punjabi', 'salwar', 'kameez', 'lehenga', 'watch', 'jewelry', 'jewellery', 'ring', 'necklace', 'bracelet', 'earring', 'sunglass', 'belt', 'wallet', 'purse', 'sandal', 'slipper', 'sneaker', 'toy', 'furniture', 'sofa', 'chair', 'table', 'mattress', 'pillow', 'curtain', 'utensil', 'bedsheet', 'blanket'],
    bn: ['কেনাকাটা', 'শপিং', 'কাপড়', 'ব্যাগ'],
  },
  {
    category: 'Personal Care',
    en: ['salon', 'parlor', 'parlour', 'beauty', 'hair', 'haircut', 'makeup', 'spa', 'grooming', 'soap', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'razor', 'blade', 'shave', 'deodorant', 'perfume', 'lotion', 'moisturizer', 'cosmetic', 'lipstick', 'nail', 'sanitary', 'diaper', 'tissue', 'facewash', 'sunscreen', 'comb', 'towel', 'manicure', 'pedicure', 'wax'],
  },
  {
    category: 'Insurance',
    en: ['insurance', 'premium', 'policy', 'lic'],
    bn: ['বীমা'],
  },
  {
    category: 'Travel',
    en: ['travel', 'hotel', 'flight', 'airfare', 'visa', 'tour', 'vacation', 'trip', 'airbnb', 'booking', 'resort', 'holiday', 'passport', 'airline', 'cruise'],
  },
  {
    category: 'Gifts',
    en: ['gift', 'birthday', 'wedding', 'anniversary'],
    bn: ['উপহার'],
  },
  {
    category: 'Charity',
    en: ['charity', 'donation', 'zakat', 'sadaqah', 'relief'],
    bn: ['দান', 'জাকাত'],
  },
]

const INCOME_LEXICON: LexEntry[] = [
  { category: 'Salary', en: ['salary', 'paycheck', 'payroll', 'wage', 'stipend'], bn: ['বেতন', 'ব্যতন'] },
  { category: 'Freelance', en: ['freelance', 'freelancing', 'upwork', 'fiverr', 'gig'], bn: ['ফ্রিল্যান্স'] },
  { category: 'Business', en: ['business', 'profit', 'sales', 'revenue'], bn: ['ব্যবসা', 'বিক্রি'] },
  { category: 'Investment', en: ['investment', 'dividend', 'stock', 'shares', 'interest', 'crypto'], bn: ['শেয়ার'] },
  { category: 'Rental', en: ['rental', 'tenant'], bn: [] },
  { category: 'Side Hustle', en: ['hustle', 'commission', 'bonus', 'tips', 'parttime'], bn: [] },
  { category: 'Gift Received', en: ['eidi', 'salami'], bn: ['সালামি'] },
  { category: 'Refund', en: ['refund', 'cashback', 'reimbursement'], bn: ['রিফান্ড'] },
]

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Exact match: word boundaries with optional plural for English; substring for Bangla.
function exactCategory(text: string, lexicon: LexEntry[]): string | null {
  for (const entry of lexicon) {
    if (entry.bn && entry.bn.some(w => w && text.includes(w))) return entry.category
    if (entry.en.length) {
      const pattern = new RegExp(`\\b(?:${entry.en.map(escapeReg).join('|')})(?:e?s)?\\b`, 'i')
      if (pattern.test(text)) return entry.category
    }
  }
  return null
}

// Bounded Levenshtein edit distance — returns max+1 as soon as it exceeds max.
function editDistance(a: string, b: string, max: number): number {
  const al = a.length, bl = b.length
  if (Math.abs(al - bl) > max) return max + 1
  let prev = Array.from({ length: bl + 1 }, (_, j) => j)
  for (let i = 1; i <= al; i++) {
    const cur = new Array(bl + 1)
    cur[0] = i
    let rowMin = cur[0]
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[bl]
}

// Fuzzy match: tokenise the input and find the closest keyword within an
// edit-distance threshold, so misspelled items ("vegitables", "detergant",
// "battary") still resolve. Ties break toward higher lexicon priority.
function fuzzyCategory(text: string, lexicon: LexEntry[]): string | null {
  const tokens = (text.toLowerCase().match(/[a-z]{4,}/g) || [])
  if (!tokens.length) return null
  let bestCat: string | null = null
  let bestDist = Infinity
  let bestPrio = Infinity
  lexicon.forEach((entry, prio) => {
    for (const kw of entry.en) {
      if (/[^a-z]/.test(kw) || kw.length < 4) continue // skip phrases/short words
      const maxd = kw.length <= 5 ? 1 : 2
      for (const tok of tokens) {
        if (Math.abs(tok.length - kw.length) > maxd) continue
        if (tok === kw) continue // exact would have matched already
        const d = editDistance(tok, kw, maxd)
        if (d <= maxd && (d < bestDist || (d === bestDist && prio < bestPrio))) {
          bestCat = entry.category
          bestDist = d
          bestPrio = prio
        }
      }
    }
  })
  return bestCat
}

function detectCategory(text: string, lexicon: LexEntry[]): string {
  return exactCategory(text, lexicon) ?? fuzzyCategory(text, lexicon) ?? 'Other'
}

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

Category guide (always pick the closest; use "Other" only as a last resort):
- Groceries: food & kitchen items AND household consumables — fruits, vegetables, rice, fish, meat, egg, milk, oil, spices, snacks, AND cleaning/household supplies (detergent, dishwash, soap for home, tissue, broom)
- Food & Dining: prepared/restaurant food, cafe, coffee, takeout (Zomato/Swiggy/foodpanda)
- Transport: rickshaw, bus, uber/pathao, taxi, fuel/petrol, parking, train fare
- Utilities: electricity, water, gas, internet/wifi, mobile recharge, bills
- Healthcare: doctor, medicine, pharmacy, hospital, dental, lab tests
- Education: school/college fees, tuition, courses, books, stationery
- Entertainment: movies, games, concerts, parties, shows
- Shopping: clothes, shoes, accessories, furniture, toys, household goods (non-consumable)
- Personal Care: salon, haircut, cosmetics, shampoo, skincare, toiletries for the body
- Gadgets & Electronics: phone, laptop, chargers, batteries, cables, appliances
- Subscriptions: Netflix, Spotify, memberships, recurring digital services
- Insurance / Travel / Rent / Gifts / Charity: as named

IMPORTANT: Users often misspell item names (e.g. "vegitables"=vegetables, "detergant"=detergent, "battary"=battery, "tomato"="tometo"). Infer the intended product and categorise it correctly — never fall back to "Other" just because of a typo.

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

// Call Google Gemini API for AI categorization (free tier: 1,500 req/day)
async function categorizeWithGemini(preprocessed: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: CATEGORIZE_SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: preprocessed }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null
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

    // Look up user's Gemini API key from DB
    let geminiApiKey: string | null = null
    try {
      const user = await getCurrentUser(request)
      if (user) {
        const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { geminiApiKey: true } })
        geminiApiKey = dbUser?.geminiApiKey || null
      }
    } catch {}
    // Fall back to app-level key if user hasn't set their own
    if (!geminiApiKey) geminiApiKey = process.env.GEMINI_API_KEY || null

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

    // Try Gemini (user key or app GEMINI_API_KEY) — free 1,500 req/day
    if (!parsed && geminiApiKey) {
      const geminiResponse = await categorizeWithGemini(preprocessed, geminiApiKey)
      if (geminiResponse) {
        try {
          parsed = parseAIResponse(geminiResponse)
        } catch {
          parsed = null
        }
      }
    }

    // Try Anthropic Claude if ANTHROPIC_API_KEY is set (paid fallback)
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

  // Identify the category from the keyword lexicon (exact + fuzzy/typo-tolerant).
  // Debt/savings keywords map to "Other" since they aren't standalone categories.
  let category: string
  if (/loan|লোন|কিস্তি|emi|ঋণ|কর্জ|saving|সঞ্চয়|deposit/i.test(preprocessed)) {
    category = 'Other'
  } else {
    category = detectCategory(preprocessed, isIncome ? INCOME_LEXICON : EXPENSE_LEXICON)
  }

  // Classification derived from category, with explicit luxury keywords winning
  let classification = 'need'
  if (isIncome) {
    classification = 'income'
  } else if (/luxury|designer|premium|branded/i.test(preprocessed)) {
    classification = 'ego'
  } else {
    const WANT_CATS = ['Food & Dining', 'Entertainment', 'Shopping', 'Subscriptions', 'Travel', 'Personal Care', 'Gifts', 'Gadgets & Electronics']
    classification = WANT_CATS.includes(category) ? 'want' : 'need'
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
