import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/password'

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── User 1: Corporate Employee ───
async function seedCorporateUser(userId: string) {
  const now = new Date()

  // Create accounts only if none exist yet
  const existingAccounts = await db.account.count({ where: { userId } })
  if (existingAccounts === 0) {
    await db.account.createMany({
      data: [
        { userId, name: 'HDFC Salary Account', type: 'debit', balance: 45000, color: '#004B87', icon: '🏦', isDefault: true },
        { userId, name: 'SBI Savings', type: 'debit', balance: 120000, color: '#1a237e', icon: '🏦', isDefault: false },
        { userId, name: 'HDFC Credit Card', type: 'credit', balance: 35000, color: '#004B87', icon: '💳', isDefault: false },
        { userId, name: 'Cash', type: 'cash', balance: 5000, color: '#10b981', icon: '💵', isDefault: false },
        { userId, name: 'GPay', type: 'mobile', balance: 8000, color: '#4285f4', icon: '📱', isDefault: false },
      ],
    })
  }

  const transactions: any[] = []
  const SPENDING_TYPES = ['debit', 'credit', 'mobile', 'cash']
  
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const baseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
    const date = baseDate
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const maxDay = monthOffset === 0 ? now.getDate() : daysInMonth
    const monthName = date.toLocaleString('default', { month: 'long' })

    // ── Day 1: Salary ──
    transactions.push({
      userId, type: 'income', amount: 95000, category: 'Salary',
      classification: 'savings', spendingType: 'debit',
      description: `HDFC Salary - ${monthName}`,
      date: new Date(date.getFullYear(), date.getMonth(), 1),
    })

    // ── Day 1-5: Heavy spending ──
    // Rent
    transactions.push({
      userId, type: 'expense', amount: 25000, category: 'Rent',
      classification: 'need', spendingType: 'debit',
      description: 'Apartment Rent - Bandra',
      date: new Date(date.getFullYear(), date.getMonth(), 1),
    })

    // Subscriptions
    const subs = [
      { name: 'Netflix', amount: 649, cat: 'Subscriptions' },
      { name: 'Spotify Premium', amount: 119, cat: 'Subscriptions' },
      { name: 'Amazon Prime', amount: 299, cat: 'Subscriptions' },
      { name: 'Gym Membership', amount: 3500, cat: 'Health' },
    ]
    subs.forEach(sub => {
      transactions.push({
        userId, type: 'expense', amount: sub.amount, category: sub.cat,
        classification: 'want', spendingType: 'credit',
        description: sub.name,
        date: new Date(date.getFullYear(), date.getMonth(), randomBetween(1, 3)),
      })
    })

    // Weekend dining/clubs (Day 3-5, 10-12, 17-19, 24-26)
    const weekendDays = [3, 4, 5, 10, 11, 12, 17, 18, 19, 24, 25, 26].filter(d => d <= maxDay)
    weekendDays.forEach(day => {
      const isClubNight = [5, 12, 19, 26].includes(day)
      transactions.push({
        userId, type: 'expense',
        amount: isClubNight ? randomBetween(3000, 8000) : randomBetween(800, 2500),
        category: isClubNight ? 'Entertainment' : 'Dining',
        classification: isClubNight ? 'ego' : 'want',
        spendingType: isClubNight ? 'credit' : randomChoice(['debit', 'mobile']),
        description: isClubNight ? 'Club night with friends' : randomChoice(['Zomato delivery', 'Swiggy order', 'Dinner at restaurant', 'Brunch']),
        date: new Date(date.getFullYear(), date.getMonth(), day),
      })
    })

    // ── Day 5-15: Regular spending ──
    for (let day = 5; day <= 15; day++) {
      if (Math.random() > 0.5) {
        const expense = randomChoice([
          { amount: randomBetween(200, 500), category: 'Transport', description: 'Uber/Ola ride', classification: 'need', spendingType: 'mobile' },
          { amount: randomBetween(300, 800), category: 'Groceries', description: 'BigBasket order', classification: 'need', spendingType: 'debit' },
          { amount: randomBetween(100, 300), category: 'Personal Care', description: randomChoice(['Sugar salon', 'The Man Company', 'Nykaa order']), classification: 'want', spendingType: 'mobile' },
          { amount: randomBetween(200, 600), category: 'Transport', description: 'Petrol fill-up', classification: 'need', spendingType: 'debit' },
        ])
        transactions.push({
          userId, type: 'expense', ...expense,
          date: new Date(date.getFullYear(), date.getMonth(), day),
        })
      }
    }

    // ── Day 15-20: Mid-month impulse ──
    for (let day = 15; day <= 20; day++) {
      if (Math.random() > 0.4) {
        const isShopping = Math.random() > 0.5
        transactions.push({
          userId, type: 'expense',
          amount: isShopping ? randomBetween(2000, 8000) : randomBetween(300, 1500),
          category: isShopping ? 'Shopping' : 'Dining',
          classification: isShopping ? 'ego' : 'want',
          spendingType: isShopping ? 'credit' : 'mobile',
          description: isShopping
            ? randomChoice(['Myntra order', 'Amazon impulse buy', 'Zara shopping', 'Flipkart deal'])
            : randomChoice(['Zomato - Swiggy', 'Foodpanda order', 'Late night pizza']),
          date: new Date(date.getFullYear(), date.getMonth(), day),
        })
      }
    }

    // ── Day 20-28: Struggling/low balance, credit card usage ──
    for (let day = 20; day <= Math.min(28, maxDay); day++) {
      if (Math.random() > 0.3) {
        transactions.push({
          userId, type: 'expense',
          amount: randomBetween(100, 2000),
          category: randomChoice(['Groceries', 'Transport', 'Dining', 'Personal Care']),
          classification: randomChoice(['need', 'want']),
          spendingType: 'credit', // Using credit card because running low
          description: randomChoice(['Quick grocery run', 'Auto rickshaw', 'Coffee shop', 'Pharmacy']),
          date: new Date(date.getFullYear(), date.getMonth(), day),
        })
      }
    }

    // Utilities
    transactions.push(
      { userId, type: 'expense', amount: randomBetween(2500, 4000), category: 'Utilities', classification: 'need', spendingType: 'debit', description: 'Electricity bill', date: new Date(date.getFullYear(), date.getMonth(), 10) },
      { userId, type: 'expense', amount: 999, category: 'Utilities', classification: 'need', spendingType: 'debit', description: 'Internet bill - JioFiber', date: new Date(date.getFullYear(), date.getMonth(), 12) },
      { userId, type: 'expense', amount: randomBetween(500, 800), category: 'Utilities', classification: 'need', spendingType: 'debit', description: 'Phone recharge - Jio', date: new Date(date.getFullYear(), date.getMonth(), 5) },
    )
  }

  // Drop anything dated past today (mid-month loops can overshoot in the current month), then insert in batches
  const pastOnly = transactions.filter(t => t.date <= now)
  for (let i = 0; i < pastOnly.length; i += 50) {
    const batch = pastOnly.slice(i, i + 50)
    await db.transaction.createMany({ data: batch })
  }

  return pastOnly.length
}

// ─── User 2: Government Employee ───
async function seedGovtUser(userId: string) {
  const now = new Date()

  const existingAccounts = await db.account.count({ where: { userId } })
  if (existingAccounts === 0) {
    await db.account.createMany({
      data: [
        { userId, name: 'SBI Salary Account', type: 'debit', balance: 85000, color: '#1a237e', icon: '🏦', isDefault: true },
        { userId, name: 'Post Office Savings', type: 'debit', balance: 200000, color: '#f59e0b', icon: '🏦', isDefault: false },
        { userId, name: 'Cash', type: 'cash', balance: 3000, color: '#10b981', icon: '💵', isDefault: false },
        { userId, name: 'PhonePe', type: 'mobile', balance: 5000, color: '#5f259f', icon: '📱', isDefault: false },
      ],
    })
  }

  const transactions: any[] = []
  
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const baseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
    const date = baseDate
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const maxDay = monthOffset === 0 ? now.getDate() : daysInMonth
    const monthName = date.toLocaleString('default', { month: 'long' })

    // ── Day 1: Government salary ──
    transactions.push({
      userId, type: 'income', amount: 62000, category: 'Salary',
      classification: 'savings', spendingType: 'debit',
      description: `SBI Salary Credit - ${monthName}`,
      date: new Date(date.getFullYear(), date.getMonth(), 1),
    })

    // ── Day 1-5: Disciplined spending ──
    // Government quarters rent
    transactions.push({
      userId, type: 'expense', amount: 5500, category: 'Rent',
      classification: 'need', spendingType: 'debit',
      description: 'Government quarters rent',
      date: new Date(date.getFullYear(), date.getMonth(), 1),
    })

    // Standard utilities
    transactions.push(
      { userId, type: 'expense', amount: randomBetween(800, 1500), category: 'Utilities', classification: 'need', spendingType: 'debit', description: 'Electricity bill', date: new Date(date.getFullYear(), date.getMonth(), 3) },
      { userId, type: 'expense', amount: 799, category: 'Utilities', classification: 'need', spendingType: 'debit', description: 'BSNL broadband', date: new Date(date.getFullYear(), date.getMonth(), 3) },
      { userId, type: 'expense', amount: randomBetween(200, 400), category: 'Utilities', classification: 'need', spendingType: 'mobile', description: 'Phone recharge - BSNL', date: new Date(date.getFullYear(), date.getMonth(), 2) },
    )

    // Groceries - planned, weekly
    for (const day of [2, 9, 16, 23].filter(d => d <= maxDay)) {
      transactions.push({
        userId, type: 'expense', amount: randomBetween(1500, 3000), category: 'Groceries',
        classification: 'need', spendingType: 'debit',
        description: 'Weekly groceries - local market',
        date: new Date(date.getFullYear(), date.getMonth(), day),
      })
    }

    // ── Day 5-15: Minimal spending ──
    for (let day = 5; day <= 15; day++) {
      if (Math.random() > 0.7) { // Only 30% chance per day
        const expense = randomChoice([
          { amount: randomBetween(50, 150), category: 'Transport', description: 'Bus pass / Auto', classification: 'need', spendingType: 'cash' },
          { amount: randomBetween(80, 200), category: 'Transport', description: 'Petrol for scooter', classification: 'need', spendingType: 'debit' },
          { amount: randomBetween(200, 500), category: 'Healthcare', description: 'Medicine / Pharmacy', classification: 'need', spendingType: 'debit' },
        ])
        transactions.push({
          userId, type: 'expense', ...expense,
          date: new Date(date.getFullYear(), date.getMonth(), day),
        })
      }
    }

    // ── Day 15: SIP/MF investment ──
    transactions.push({
      userId, type: 'expense', amount: 10000, category: 'Investment',
      classification: 'savings', spendingType: 'debit',
      description: 'SIP - HDFC Mutual Fund',
      date: new Date(date.getFullYear(), date.getMonth(), 15),
    })

    // ── Day 20-25: Transfer to Post Office Savings ──
    transactions.push({
      userId, type: 'expense', amount: randomBetween(8000, 15000), category: 'Transfer',
      classification: 'savings', spendingType: 'debit',
      description: 'Transfer to Post Office Savings',
      date: new Date(date.getFullYear(), date.getMonth(), randomBetween(20, 25)),
    })

    // ── Day 25-28: Minimal end-of-month ──
    for (let day = 25; day <= Math.min(28, maxDay); day++) {
      if (Math.random() > 0.8) { // Only 20% chance
        transactions.push({
          userId, type: 'expense',
          amount: randomBetween(50, 300),
          category: randomChoice(['Transport', 'Personal Care']),
          classification: 'need',
          spendingType: 'cash',
          description: randomChoice(['Bus fare', 'Tea/snacks', 'Stationery']),
          date: new Date(date.getFullYear(), date.getMonth(), day),
        })
      }
    }

    // Occasional disciplined treats (1-2 per month)
    if (Math.random() > 0.4) {
      transactions.push({
        userId, type: 'expense', amount: randomBetween(200, 500),
        category: 'Dining', classification: 'want', spendingType: 'mobile',
        description: 'Family dinner at hotel',
        date: new Date(date.getFullYear(), date.getMonth(), randomBetween(10, 20)),
      })
    }
    if (Math.random() > 0.6) {
      transactions.push({
        userId, type: 'expense', amount: randomBetween(300, 800),
        category: 'Entertainment', classification: 'want', spendingType: 'mobile',
        description: 'Movie with family',
        date: new Date(date.getFullYear(), date.getMonth(), randomBetween(8, 22)),
      })
    }
  }

  const pastOnly = transactions.filter(t => t.date <= now)
  for (let i = 0; i < pastOnly.length; i += 50) {
    const batch = pastOnly.slice(i, i + 50)
    await db.transaction.createMany({ data: batch })
  }

  return pastOnly.length
}

// ─── Seed Goals, Reminders, LendBorrow, Recurring for a user ───
async function seedExtras(userId: string) {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, 1)

  const existingGoals = await db.goal.count({ where: { userId } })
  if (existingGoals === 0) {
    await db.goal.createMany({
      data: [
        { userId, name: 'Emergency Fund', targetAmount: 300000, savedAmount: 85000, icon: '🛡️', color: '#10b981', deadline: threeMonths },
        { userId, name: 'New Laptop', targetAmount: 150000, savedAmount: 60000, icon: '💻', color: '#3b82f6', deadline: new Date(now.getFullYear(), now.getMonth() + 5, 1) },
        { userId, name: 'Goa Trip', targetAmount: 50000, savedAmount: 22000, icon: '✈️', color: '#f59e0b', deadline: new Date(now.getFullYear(), now.getMonth() + 2, 1) },
      ],
    })
  }

  const existingReminders = await db.reminder.count({ where: { userId } })
  if (existingReminders === 0) {
    await db.reminder.createMany({
      data: [
        { userId, title: 'Pay Credit Card Bill', amount: 35000, category: 'Utilities', dueDate: new Date(now.getFullYear(), now.getMonth(), 25), remindDays: 5, isRecurring: true, frequency: 'monthly' },
        { userId, title: 'JioFiber Renewal', amount: 999, category: 'Utilities', dueDate: nextMonth, remindDays: 3, isRecurring: true, frequency: 'monthly' },
        { userId, title: 'Car Insurance Premium', amount: 18500, category: 'Insurance', dueDate: new Date(now.getFullYear() + 1, 0, 15), remindDays: 14 },
      ],
    })
  }

  const existingLendBorrow = await db.lendBorrow.count({ where: { userId } })
  if (existingLendBorrow === 0) {
    await db.lendBorrow.createMany({
      data: [
        { userId, type: 'lend', amount: 5000, person: 'Rahul', description: 'Split for dinner + movie', date: new Date(now.getFullYear(), now.getMonth() - 1, 15), dueDate: nextMonth },
        { userId, type: 'borrow', amount: 2000, person: 'Priya', description: 'Borrowed for cab', date: new Date(now.getFullYear(), now.getMonth(), 5) },
        { userId, type: 'lend', amount: 10000, person: 'Amit', description: 'Emergency medical', date: new Date(now.getFullYear(), now.getMonth() - 2, 3), isSettled: true, settledDate: new Date(now.getFullYear(), now.getMonth() - 1, 3) },
      ],
    })
  }

  const existingRecurring = await db.recurringTransaction.count({ where: { userId } })
  if (existingRecurring === 0) {
    await db.recurringTransaction.createMany({
      data: [
        { userId, type: 'income', amount: 95000, description: 'HDFC Monthly Salary', category: 'Salary', classification: 'savings', spendingType: 'debit', frequency: 'monthly', dayOfMonth: 1 },
        { userId, type: 'expense', amount: 25000, description: 'Apartment Rent', category: 'Rent', classification: 'need', spendingType: 'debit', frequency: 'monthly', dayOfMonth: 1 },
        { userId, type: 'expense', amount: 649, description: 'Netflix', category: 'Subscriptions', classification: 'want', spendingType: 'credit', frequency: 'monthly', dayOfMonth: 5 },
        { userId, type: 'expense', amount: 119, description: 'Spotify Premium', category: 'Subscriptions', classification: 'want', spendingType: 'credit', frequency: 'monthly', dayOfMonth: 5 },
        { userId, type: 'expense', amount: 3500, description: 'Gym Membership', category: 'Healthcare', classification: 'want', spendingType: 'credit', frequency: 'monthly', dayOfMonth: 3 },
      ],
    })
  }
}

export async function GET() {
  try {
    const results: Array<{ email: string; password: string; transactionCount: number }> = []

    // ── User 1: Corporate Employee ──
    let corpUser = await db.user.findUnique({ where: { email: 'corporate@test.com' } })
    if (!corpUser) {
      const hashedPassword = await hashPassword('password123')
      corpUser = await db.user.create({
        data: {
          name: 'Corporate Employee',
          email: 'corporate@test.com',
          password: hashedPassword,
          provider: 'email',
          emailVerified: new Date(),
          currency: 'INR',
          currencySymbol: '₹',
          onboardingDone: true,
        },
      })
    }
    {
      const existingTxnCount = await db.transaction.count({ where: { userId: corpUser.id } })
      if (existingTxnCount < 10) {
        const count = await seedCorporateUser(corpUser.id)
        results.push({ email: 'corporate@test.com', password: 'password123', transactionCount: count })
      } else {
        results.push({ email: 'corporate@test.com', password: 'password123', transactionCount: existingTxnCount })
      }
      await seedExtras(corpUser.id)
    }

    // ── User 2: Government Employee ──
    let govtUser = await db.user.findUnique({ where: { email: 'govt@test.com' } })
    if (!govtUser) {
      const hashedPassword = await hashPassword('password123')
      govtUser = await db.user.create({
        data: {
          name: 'Government Employee',
          email: 'govt@test.com',
          password: hashedPassword,
          provider: 'email',
          emailVerified: new Date(),
          currency: 'INR',
          currencySymbol: '₹',
          onboardingDone: true,
        },
      })
    }
    {
      const existingTxnCount = await db.transaction.count({ where: { userId: govtUser.id } })
      if (existingTxnCount < 10) {
        const count = await seedGovtUser(govtUser.id)
        results.push({ email: 'govt@test.com', password: 'password123', transactionCount: count })
      } else {
        results.push({ email: 'govt@test.com', password: 'password123', transactionCount: existingTxnCount })
      }
    }

    return NextResponse.json({
      message: 'Demo users seeded',
      users: results,
    })
  } catch (error: any) {
    console.error('Seed demo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Same logic as GET
    const results: Array<{ email: string; password: string; transactionCount: number }> = []

    // POST handler reuses same logic as GET
    let corpUser = await db.user.findUnique({ where: { email: 'corporate@test.com' } })
    if (!corpUser) {
      const hashedPassword = await hashPassword('password123')
      corpUser = await db.user.create({
        data: { name: 'Corporate Employee', email: 'corporate@test.com', password: hashedPassword, provider: 'email', emailVerified: new Date(), currency: 'INR', currencySymbol: '₹', onboardingDone: true },
      })
    }
    {
      const existingTxnCount = await db.transaction.count({ where: { userId: corpUser.id } })
      if (existingTxnCount < 10) {
        const count = await seedCorporateUser(corpUser.id)
        results.push({ email: 'corporate@test.com', password: 'password123', transactionCount: count })
      } else {
        results.push({ email: 'corporate@test.com', password: 'password123', transactionCount: existingTxnCount })
      }
    }

    let govtUser = await db.user.findUnique({ where: { email: 'govt@test.com' } })
    if (!govtUser) {
      const hashedPassword = await hashPassword('password123')
      govtUser = await db.user.create({
        data: { name: 'Government Employee', email: 'govt@test.com', password: hashedPassword, provider: 'email', emailVerified: new Date(), currency: 'INR', currencySymbol: '₹', onboardingDone: true },
      })
    }
    {
      const existingTxnCount = await db.transaction.count({ where: { userId: govtUser.id } })
      if (existingTxnCount < 10) {
        const count = await seedGovtUser(govtUser.id)
        results.push({ email: 'govt@test.com', password: 'password123', transactionCount: count })
      } else {
        results.push({ email: 'govt@test.com', password: 'password123', transactionCount: existingTxnCount })
      }
    }

    return NextResponse.json({
      message: 'Demo users seeded',
      users: results,
    })
  } catch (error: any) {
    console.error('Seed demo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
