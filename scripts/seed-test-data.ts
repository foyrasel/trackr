import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

const CLASSIFICATIONS = ['need', 'want', 'ego', 'savings', 'debt']

const SPENDING_TYPES = ['cash', 'debit', 'credit', 'mobile']

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Bonus', 'Rental Income']

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('🌱 Seeding test data...')

  // Create test user
  const hashedPassword = await hashPassword('Trackr@2026')
  
  // Check if user exists
  let user = await prisma.user.findUnique({ where: { email: 'demo@trackr.app' } })
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Demo User',
        email: 'demo@trackr.app',
        password: hashedPassword,
        provider: 'email',
        emailVerified: new Date(),
      },
    })
    console.log(`✅ Created user: ${user.email}`)
  } else {
    console.log(`ℹ️ User already exists: ${user.email}`)
  }

  // Create accounts if they don't exist
  const existingAccounts = await prisma.account.findMany({ where: { userId: user.id } })
  if (existingAccounts.length === 0) {
    await prisma.account.createMany({
      data: [
        { userId: user.id, name: 'Cash', type: 'cash', balance: 15000, color: '#10b981', icon: '💵', isDefault: true },
        { userId: user.id, name: 'Debit Card', type: 'debit', balance: 45000, color: '#3b82f6', icon: '💳', isDefault: false },
        { userId: user.id, name: 'Credit Card', type: 'credit', balance: 12000, color: '#8b5cf6', icon: '💳', isDefault: false },
        { userId: user.id, name: 'Mobile Wallet', type: 'mobile', balance: 8000, color: '#a855f7', icon: '📱', isDefault: false },
      ],
    })
    console.log('✅ Created accounts')
  }

  // Check existing transactions count
  const existingTxCount = await prisma.transaction.count({ where: { userId: user.id } })
  if (existingTxCount > 0) {
    console.log(`ℹ️ User already has ${existingTxCount} transactions. Skipping transaction seed.`)
  }

  // Generate 5 months of data (500 transactions per month = 2500 total)
  const now = new Date()
  if (existingTxCount === 0) {
    const transactions: any[] = []

    for (let monthOffset = 4; monthOffset >= 0; monthOffset--) {
    const year = now.getFullYear()
    const month = now.getMonth() - monthOffset
    const date = new Date(year, month, 1)
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

    // Generate income transactions (2-4 per month)
    const incomeCount = randomBetween(2, 4)
    for (let i = 0; i < incomeCount; i++) {
      const day = randomBetween(1, Math.min(daysInMonth, monthOffset === 0 ? now.getDate() : daysInMonth))
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
        createdAt: txDate,
        updatedAt: txDate,
      })
    }

    // Generate expense transactions (~496-498 per month)
    const expenseCount = 500 - incomeCount
    for (let i = 0; i < expenseCount; i++) {
      const day = randomBetween(1, Math.min(daysInMonth, monthOffset === 0 ? now.getDate() : daysInMonth))
      const txDate = new Date(date.getFullYear(), date.getMonth(), day)
      const category = randomChoice(CATEGORIES)
      
      // Vary amounts by category
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

      // Assign classification based on category
      let classification: string
      switch (category) {
        case 'Rent': case 'Groceries': case 'Utilities': case 'Health': case 'Insurance': case 'Education':
          classification = 'need'; break
        case 'Dining': case 'Entertainment': case 'Shopping': case 'Clothing': case 'Subscriptions': case 'Travel':
          classification = 'want'; break
        case 'Electronics': case 'Fuel':
          classification = randomChoice(['want', 'ego']); break
        default:
          classification = randomChoice(CLASSIFICATIONS.slice(0, 3)); break
      }

      const spendingType = randomChoice(SPENDING_TYPES)
      const descriptions: Record<string, string[]> = {
        'Groceries': ['Weekly groceries', 'Vegetables and fruits', 'Supermarket run', 'Kitchen supplies'],
        'Transport': ['Uber ride', 'Auto rickshaw', 'Bus pass', 'Metro top-up', 'Rickshaw fare'],
        'Dining': ['Lunch out', 'Dinner with friends', 'Coffee shop', 'Street food', 'Pizza night'],
        'Entertainment': ['Movie tickets', 'Concert', 'Gaming', 'Sports event'],
        'Shopping': ['Amazon order', 'Mall shopping', 'Online purchase', 'Home decor'],
        'Health': ['Pharmacy', 'Doctor visit', 'Lab tests', 'Medicine'],
        'Education': ['Online course', 'Books', 'Coaching fee', 'Workshop'],
        'Utilities': ['Electricity bill', 'Water bill', 'Internet bill', 'Phone recharge'],
        'Rent': ['Monthly rent', 'House rent payment'],
        'Subscriptions': ['Netflix', 'Spotify', 'YouTube Premium', 'Cloud storage'],
        'Fuel': ['Petrol', 'Diesel fill-up', 'CNG refuel'],
        'Clothing': ['New shirt', 'Shoes', 'Seasonal shopping'],
        'Personal Care': ['Salon', 'Grooming', 'Skincare'],
        'Home Maintenance': ['Plumber', 'Cleaning supplies', 'Appliance repair'],
        'Insurance': ['Health insurance', 'Car insurance', 'Life insurance premium'],
        'Gifts': ['Birthday gift', 'Wedding gift', 'Festival gift'],
        'Travel': ['Flight ticket', 'Hotel booking', 'Train ticket'],
        'Electronics': ['Headphones', 'Phone case', 'Charger', 'USB drive'],
        'Charity': ['Donation', 'NGO contribution'],
        'Office Supplies': ['Stationery', 'Printer ink', 'Notebooks'],
      }

      const desc = randomChoice(descriptions[category] || [category])

      transactions.push({
        userId: user.id,
        type: 'expense',
        amount,
        category,
        classification,
        spendingType,
        description: desc,
        date: txDate,
        createdAt: txDate,
        updatedAt: txDate,
      })
    }
  }

  // Insert all transactions in batches of 100
  console.log(`📝 Creating ${transactions.length} transactions...`)
  for (let i = 0; i < transactions.length; i += 100) {
    const batch = transactions.slice(i, i + 100)
    await prisma.transaction.createMany({ data: batch })
    process.stdout.write(`   ${Math.min(i + 100, transactions.length)}/${transactions.length}\r`)
  }
  console.log(`\n✅ Created ${transactions.length} transactions`)
  } // end if (existingTxCount === 0)

  // Create some budgets
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const budgetCategories = ['Groceries', 'Transport', 'Dining', 'Entertainment', 'Shopping', 'Utilities']
  for (const cat of budgetCategories) {
    await prisma.budget.upsert({
      where: { userId_month_category: { userId: user.id, month: currentMonth, category: cat } },
      create: { userId: user.id, category: cat, amount: randomBetween(2000, 10000), month: currentMonth },
      update: {},
    })
  }
  console.log('✅ Created budgets')

  // Create some goals
  const goals = [
    { name: 'Emergency Fund', target: 100000, saved: 35000, deadline: new Date(now.getFullYear() + 1, 0, 1) },
    { name: 'Vacation Trip', target: 50000, saved: 12000, deadline: new Date(now.getFullYear(), 11, 31) },
    { name: 'New Laptop', target: 80000, saved: 45000, deadline: new Date(now.getFullYear() + 1, 5, 1) },
  ]
  for (const goal of goals) {
    const existing = await prisma.goal.findFirst({ where: { userId: user.id, name: goal.name } })
    if (!existing) {
      await prisma.goal.create({
        data: { userId: user.id, name: goal.name, targetAmount: goal.target, savedAmount: goal.saved, deadline: goal.deadline },
      })
    }
  }
  console.log('✅ Created goals')

  // Create some lend/borrow records
  const lendBorrow = [
    { person: 'Rahim', amount: 5000, type: 'lend', description: 'Lent for rent', dueDate: new Date(now.getFullYear(), now.getMonth() + 2, 15), isSettled: false },
    { person: 'Priya', amount: 3000, type: 'borrow', description: 'Borrowed for groceries', dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 20), isSettled: false },
    { person: 'Ahmed', amount: 2000, type: 'lend', description: 'Lent for medical', dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 10), isSettled: true },
  ]
  for (const lb of lendBorrow) {
    await prisma.lendBorrow.create({
      data: {
        userId: user.id,
        person: lb.person,
        amount: lb.amount,
        type: lb.type,
        description: lb.description,
        date: new Date(),
        dueDate: lb.dueDate,
        isSettled: lb.isSettled,
        ...(lb.isSettled ? { settledDate: new Date() } : {}),
      },
    })
  }
  console.log('✅ Created lend/borrow records')

  // Create some reminders
  const reminders = [
    { title: 'Electricity Bill', amount: 2500, category: 'Utilities', dueDate: new Date(now.getFullYear(), now.getMonth(), 25), remindDays: 3 },
    { title: 'Internet Bill', amount: 1200, category: 'Utilities', dueDate: new Date(now.getFullYear(), now.getMonth(), 28), remindDays: 3 },
    { title: 'Rent Payment', amount: 12000, category: 'Rent', dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), remindDays: 5 },
  ]
  for (const r of reminders) {
    await prisma.reminder.create({
      data: {
        userId: user.id,
        title: r.title,
        amount: r.amount,
        category: r.category,
        dueDate: r.dueDate,
        remindDays: r.remindDays,
        isPaid: false,
        isDismissed: false,
      },
    })
  }
  console.log('✅ Created reminders')

  console.log('\n🎉 Seed complete!')
  console.log('\n📋 Login credentials:')
  console.log('   Email: demo@trackr.app')
  console.log('   Password: Trackr@2026')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
