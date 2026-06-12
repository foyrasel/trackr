import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── Telegram Bot API helper ──────────────────────────────────────────────────

async function sendTelegram(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {})
}

// ── Bangla preprocessing (mirrors /api/ai/categorize) ───────────────────────

const BANGLA_CORRECTIONS: Record<string, string> = {
  'টাকার': 'টাকা', 'টাকাে': 'টাকা', 'খরচা': 'খরচ', 'খরোচ': 'খরচ',
  'বাজাৰ': 'বাজার', 'ভাড়ায়': 'ভাড়া', 'ব্যতন': 'বেতন', 'রিক্সা': 'রিকশা',
}

function preprocessText(text: string): string {
  let p = text
  for (const [w, c] of Object.entries(BANGLA_CORRECTIONS)) p = p.replace(new RegExp(w, 'g'), c)
  const banglaDigitMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  }
  return p.replace(/[০-৯]+/g, m => m.replace(/[০-৯]/g, d => banglaDigitMap[d] || d))
}

function extractDate(text: string): string | null {
  const today = new Date()
  const lower = text.toLowerCase()
  if (/\byesterday\b/i.test(lower) || /গতকাল|কালকের/i.test(text)) {
    const d = new Date(today); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]
  }
  const daysAgo = lower.match(/(\d+)\s+days?\s+ago/)
  if (daysAgo) { const d = new Date(today); d.setDate(d.getDate() - parseInt(daysAgo[1])); return d.toISOString().split('T')[0] }
  if (/\blast\s*week\b/i.test(lower)) { const d = new Date(today); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] }
  return null
}

// ── Regex fallback categorizer ───────────────────────────────────────────────

function regexCategorize(text: string) {
  const lower = text.toLowerCase()
  const amountMatch = text.match(/\d+(\.\d+)?/)
  const amount = amountMatch ? parseFloat(amountMatch[0]) : 0

  const incomeWords = /salary|income|received|got paid|earning|বেতন|আয়|পেলাম/i
  const type = incomeWords.test(lower) ? 'income' : 'expense'

  const categoryMap: [RegExp, string][] = [
    [/groceries|market|vegetable|bazaar|বাজার/i, 'Groceries'],
    [/food|restaurant|lunch|dinner|breakfast|coffee|tea|eat/i, 'Food & Dining'],
    [/transport|bus|rickshaw|uber|taxi|রিকশা|ট্রান্সপোর্ট/i, 'Transport'],
    [/rent|বাসা|ভাড়া/i, 'Rent'],
    [/electricity|internet|bill|utility/i, 'Utilities'],
    [/medicine|doctor|hospital|health/i, 'Healthcare'],
    [/salary|বেতন/i, 'Salary'],
  ]
  const category = categoryMap.find(([r]) => r.test(lower))?.[1] ?? (type === 'income' ? 'Other' : 'Other')

  return {
    type,
    amount,
    description: text.replace(/\d+(\.\d+)?/, '').trim() || text,
    category,
    spendingType: 'cash',
    classification: type === 'income' ? 'income' : 'need',
    date: extractDate(text) || new Date().toISOString().split('T')[0],
  }
}

// ── AI categorizer (Gemini) ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a financial transaction parser. Given a user's text about spending or income, extract the transaction.
Respond ONLY with a valid JSON object with these exact fields:
- "type": "expense" or "income"
- "amount": number
- "description": string (clean, no date refs)
- "category": one of: Groceries, Food & Dining, Transport, Utilities, Rent, Healthcare, Education, Entertainment, Shopping, Personal Care, Gadgets & Electronics, Insurance, Subscriptions, Travel, Gifts, Charity, Salary, Freelance, Business, Investment, Rental, Side Hustle, Gift Received, Refund, Other
- "spendingType": "cash", "debit", or "credit"
- "classification": for expenses: need/want/ego/savings/debt; for income: "income"
- "date": YYYY-MM-DD if mentioned, otherwise null`

async function geminiCategorize(text: string, apiKey: string) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: preprocessText(text) }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 300, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return null
    return JSON.parse(raw.trim())
  } catch { return null }
}

// ── Command handlers ─────────────────────────────────────────────────────────

const HELP_TEXT = `<b>Trackr Bot Commands</b>

Just type any transaction in plain language:
  <code>Coffee 5</code>
  <code>Groceries 120 yesterday</code>
  <code>Salary 3500 income</code>
  <code>বাজারে ৫০০ টাকা খরচ</code>

Commands:
  /stats — this month's summary
  /help — show this message`

// ── Main webhook handler ─────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const update = await request.json()

    const message = update.message || update.edited_message
    if (!message?.text) return NextResponse.json({ ok: true })

    const chatId: number = message.chat.id
    const text: string = message.text.trim()

    // Look up user and their bot token
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, currency: true, currencySymbol: true, geminiApiKey: true, telegramToken: true },
    })

    if (!user || !user.telegramToken) {
      return NextResponse.json({ ok: true })
    }

    const token = user.telegramToken
    const symbol = user.currencySymbol || '$'

    // ── /help ────────────────────────────────────────────────────────────────
    if (text === '/help' || text === '/start') {
      await sendTelegram(token, chatId, HELP_TEXT)
      return NextResponse.json({ ok: true })
    }

    // ── /stats ───────────────────────────────────────────────────────────────
    if (text === '/stats' || text === '/balance') {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const txns = await db.transaction.findMany({
        where: { userId, date: { gte: monthStart } },
        select: { type: true, amount: true },
      })
      const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      await sendTelegram(token, chatId,
        `<b>📊 ${month}</b>\n\n💰 Income: <b>${symbol}${income.toLocaleString()}</b>\n💸 Expenses: <b>${symbol}${expense.toLocaleString()}</b>\n📈 Saved: <b>${symbol}${(income - expense).toLocaleString()}</b>\n\n${txns.length} transactions this month`
      )
      return NextResponse.json({ ok: true })
    }

    // ── Transaction text — categorize and save ───────────────────────────────
    let parsed: Record<string, unknown> | null = null

    // Try Gemini (user key first, then env key)
    const geminiKey = user.geminiApiKey || process.env.GEMINI_API_KEY
    if (geminiKey) {
      parsed = await geminiCategorize(text, geminiKey)
    }

    // Fallback to regex
    if (!parsed || !parsed.amount) {
      parsed = regexCategorize(text)
    }

    if (!parsed || !parsed.amount) {
      await sendTelegram(token, chatId, `❓ Couldn't parse that. Try: <code>Coffee 5</code> or <code>Salary 3000 income</code>`)
      return NextResponse.json({ ok: true })
    }

    const date = (parsed.date as string | null) || extractDate(text) || new Date().toISOString().split('T')[0]
    const amount = parseFloat(String(parsed.amount))

    // Find user's cash account (default fallback)
    const account = await db.account.findFirst({
      where: { userId, type: 'cash' },
    })

    // Save transaction
    const txn = await db.transaction.create({
      data: {
        userId,
        type: String(parsed.type || 'expense'),
        amount,
        description: String(parsed.description || text),
        category: String(parsed.category || 'Other'),
        spendingType: String(parsed.spendingType || 'cash'),
        accountId: account?.id || null,
        classification: String(parsed.classification || (parsed.type === 'income' ? 'income' : 'need')),
        date: new Date(date),
      },
    })

    // Update account balance
    if (account) {
      const delta = txn.type === 'income' ? amount : -amount
      await db.account.update({
        where: { id: account.id },
        data: { balance: { increment: delta } },
      })
    }

    const typeEmoji = txn.type === 'income' ? '💰' : '💸'
    const dateLabel = date === new Date().toISOString().split('T')[0] ? 'Today' : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    await sendTelegram(token, chatId,
      `${typeEmoji} <b>${txn.description}</b> saved!\n\n` +
      `Amount: <b>${symbol}${amount.toLocaleString()}</b>\n` +
      `Category: ${txn.category}\n` +
      `Date: ${dateLabel}\n\n` +
      `Type <code>/stats</code> to see your month summary.`
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Telegram webhook]', err)
    return NextResponse.json({ ok: true }) // Always 200 to Telegram
  }
}
