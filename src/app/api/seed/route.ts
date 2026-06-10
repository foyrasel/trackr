import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.NEXTAUTH_SECRET || 'trackr-secret'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const CATEGORIES = [
  'Groceries', 'Transport', 'Dining', 'Entertainment', 'Shopping',
  'Health', 'Education', 'Utilities', 'Rent', 'Subscriptions',
  'Fuel', 'Clothing', 'Personal Care', 'Home Maintenance', 'Insurance',
  'Gifts', 'Travel', 'Electronics', 'Charity', 'Office Supplies'
]

const CLASSIFICATIONS = ['need', 'want', 'ego']
const SPENDING_TYPES = ['cash', 'debit', 'credit', 'mobile']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Bonus', 'Rental Income']

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Shared seed logic - can be called from GET or POST
async function runSeed() {
  // Check if already seeded
  const existingUser = await db.user.findUnique({ where: { email: 'demo@trackr.app' } })
  if (existingUser) {
    const txCount = await db.transaction.count({ where: { userId: existingUser.id } })
    return NextResponse.json({
      message: 'Already seeded',
      email: 'demo@trackr.app',
      password: 'Trackr@2026',
      transactionCount: txCount
    })
  }

  // Create test user
  const hashedPassword = await hashPassword('Trackr@2026')
  const user = await db.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@trackr.app',
      password: hashedPassword,
      provider: 'email',
      emailVerified: new Date(),
    },
  })

  // Create accounts
  await db.account.createMany({
    data: [
      { userId: user.id, name: 'Cash', type: 'cash', balance: 15000, color: '#10b981', icon: '💵', isDefault: true },
      { userId: user.id, name: 'Debit Card', type: 'debit', balance: 45000, color: '#3b82f6', icon: '💳', isDefault: false },
      { userId: user.id, name: 'Credit Card', type: 'credit', balance: 12000, color: '#8b5cf6', icon: '💳', isDefault: false },
      { userId: user.id, name: 'Mobile Wallet', type: 'mobile', balance: 8000, color: '#a855f7', icon: '📱', isDefault: false },
    ],
  })

  // Generate 5 months of data - 500 transactions per month
  const now = new Date()
  const transactions: any[] = []

  for (let monthOffset = 4; monthOffset >= 0; monthOffset--) {
    const year = now.getFullYear()
    const month = now.getMonth() - monthOffset
    const date = new Date(year, month, 1)
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const maxDay = monthOffset === 0 ? now.getDate() : daysInMonth

    // Income (2-4 per month)
    const incomeCount = randomBetween(2, 4)
    for (let i = 0; i < incomeCount; i++) {
      const day = randomBetween(1, maxDay)
      const txDate = new Date(date.getFullYear(), date.getMonth(), day)
      const category = randomChoice(INCOME_CATEGORIES)
      const amount = category === 'Salary' ? randomBetween(40000, 65000) : randomBetween(5000, 25000)

      transactions.push({
        userId: user.id,
        type: 'income',
        amount,
        category,
        classification: 'savings',
        spendingType: category === 'Salary' ? 'debit' : randomChoice(SPENDING_TYPES),
        description: `${category} - ${date.toLocaleString('default', { month: 'long' })}`,
        date: txDate,
      })
    }

    // Expenses - fill up to 500 for this month
    const expenseCount = 500 - incomeCount
    for (let i = 0; i < expenseCount; i++) {
      const day = randomBetween(1, maxDay)
      const txDate = new Date(date.getFullYear(), date.getMonth(), day)
      const category = randomChoice(CATEGORIES)

      let amount: number
      switch (category) {
        case 'Rent': amount = randomBetween(8000, 15000); break
        case 'Groceries': amount = randomBetween(200, 2500); break
        case 'Transport': amount = randomBetween(50, 800); break
        case 'Dining': amount = randomBetween(150, 2000); break
        case 'Entertainment': amount = randomBetween(100, 3000); break
        case 'Shopping': amount = randomBetween(300, 8000); break
        case 'Health': amount = randomBetween(200, 5000); break
        case 'Education': amount = randomBetween(500, 10000); break
        case 'Utilities': amount = randomBetween(500, 3000); break
        case 'Subscriptions': amount = randomBetween(100, 1500); break
        case 'Fuel': amount = randomBetween(200, 2000); break
        case 'Clothing': amount = randomBetween(300, 5000); break
        case 'Insurance': amount = randomBetween(1000, 5000); break
        case 'Travel': amount = randomBetween(2000, 15000); break
        case 'Electronics': amount = randomBetween(1000, 20000); break
        default: amount = randomBetween(100, 3000); break
      }

      let classification: string
      switch (category) {
        case 'Rent': case 'Groceries': case 'Utilities': case 'Health': case 'Insurance': case 'Education':
          classification = 'need'; break
        case 'Dining': case 'Entertainment': case 'Shopping': case 'Clothing': case 'Subscriptions': case 'Travel':
          classification = 'want'; break
        default:
          classification = randomChoice(CLASSIFICATIONS); break
      }

      const descriptions: Record<string, string[]> = {
        'Groceries': ['Weekly groceries', 'Vegetables and fruits', 'Supermarket run'],
        'Transport': ['Uber ride', 'Auto rickshaw', 'Bus pass', 'Metro top-up'],
        'Dining': ['Lunch out', 'Dinner with friends', 'Coffee shop', 'Street food'],
        'Entertainment': ['Movie tickets', 'Concert', 'Gaming'],
        'Shopping': ['Amazon order', 'Mall shopping', 'Online purchase'],
        'Health': ['Pharmacy', 'Doctor visit', 'Lab tests', 'Medicine'],
        'Education': ['Online course', 'Books', 'Coaching fee'],
        'Utilities': ['Electricity bill', 'Water bill', 'Internet bill', 'Phone recharge'],
        'Rent': ['Monthly rent', 'House rent payment'],
        'Subscriptions': ['Netflix', 'Spotify', 'YouTube Premium'],
        'Fuel': ['Petrol', 'Diesel fill-up', 'CNG refuel'],
        'Clothing': ['New shirt', 'Shoes', 'Seasonal shopping'],
        'Personal Care': ['Salon', 'Grooming', 'Skincare'],
        'Home Maintenance': ['Plumber', 'Cleaning supplies', 'Repair'],
        'Insurance': ['Health insurance', 'Car insurance', 'Life insurance'],
        'Gifts': ['Birthday gift', 'Wedding gift', 'Festival gift'],
        'Travel': ['Flight ticket', 'Hotel booking', 'Train ticket'],
        'Electronics': ['Headphones', 'Phone case', 'Charger'],
        'Charity': ['Donation', 'NGO contribution'],
        'Office Supplies': ['Stationery', 'Printer ink', 'Notebooks'],
      }

      transactions.push({
        userId: user.id,
        type: 'expense',
        amount,
        category,
        classification,
        spendingType: randomChoice(SPENDING_TYPES),
        description: randomChoice(descriptions[category] || [category]),
        date: txDate,
      })
    }
  }

  // Insert in batches of 50 to avoid timeouts
  for (let i = 0; i < transactions.length; i += 50) {
    const batch = transactions.slice(i, i + 50)
    await db.transaction.createMany({ data: batch })
  }

  // Create budgets
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  for (const cat of ['Groceries', 'Transport', 'Dining', 'Entertainment', 'Shopping', 'Utilities']) {
    await db.budget.create({
      data: { userId: user.id, category: cat, amount: randomBetween(2000, 10000), month: currentMonth },
    })
  }

  // Create goals
  await db.goal.createMany({
    data: [
      { userId: user.id, name: 'Emergency Fund', targetAmount: 100000, savedAmount: 35000, deadline: new Date(now.getFullYear() + 1, 0, 1) },
      { userId: user.id, name: 'Vacation Trip', targetAmount: 50000, savedAmount: 12000, deadline: new Date(now.getFullYear(), 11, 31) },
      { userId: user.id, name: 'New Laptop', targetAmount: 80000, savedAmount: 45000, deadline: new Date(now.getFullYear() + 1, 5, 1) },
    ],
  })

  // Create lend/borrow
  await db.lendBorrow.createMany({
    data: [
      { userId: user.id, person: 'Rahim', amount: 5000, type: 'lend', description: 'Personal loan', date: new Date(), dueDate: new Date(now.getFullYear(), now.getMonth() + 2, 15), isSettled: false },
      { userId: user.id, person: 'Priya', amount: 3000, type: 'borrow', description: 'Emergency borrow', date: new Date(), dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 20), isSettled: false },
      { userId: user.id, person: 'Ahmed', amount: 2000, type: 'lend', description: 'Lunch money', date: new Date(), dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 10), isSettled: true, settledDate: new Date() },
    ],
  })

  // Create reminders
  await db.reminder.createMany({
    data: [
      { userId: user.id, title: 'Electricity Bill', amount: 2500, category: 'Utilities', dueDate: new Date(now.getFullYear(), now.getMonth(), 25), remindDays: 3, isPaid: false },
      { userId: user.id, title: 'Internet Bill', amount: 1200, category: 'Utilities', dueDate: new Date(now.getFullYear(), now.getMonth(), 28), remindDays: 3, isPaid: false },
      { userId: user.id, title: 'Rent Payment', amount: 12000, category: 'Rent', dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), remindDays: 5, isPaid: false },
    ],
  })

  return NextResponse.json({
    message: 'Seed complete!',
    email: 'demo@trackr.app',
    password: 'Trackr@2026',
    transactionCount: transactions.length
  })
}

// GET handler - for easy browser access
export async function GET() {
  try {
    return await runSeed()
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST handler - for API calls
export async function POST() {
  try {
    return await runSeed()
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
