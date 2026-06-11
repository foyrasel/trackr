import { createClient } from '@libsql/client'

const TURSO_URL = process.env.TURSO_URL || ''
// Accept either name so it matches the runtime app (DATABASE_AUTH_TOKEN).
// TURSO_TOKEN is kept as a fallback for backwards compatibility.
const TURSO_TOKEN = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_TOKEN || ''

async function pushSchema() {
  if (!TURSO_URL || !TURSO_TOKEN) {
    console.log('ℹ️  TURSO_URL / DATABASE_AUTH_TOKEN not set — skipping Turso schema push (local SQLite build)')
    process.exit(0)
  }

  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  })

  const statements = [
    // User
    `CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      email TEXT UNIQUE,
      image TEXT,
      provider TEXT NOT NULL DEFAULT 'demo',
      darkMode BOOLEAN NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      currencySymbol TEXT NOT NULL DEFAULT '$',
      emailVerified DATETIME,
      password TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    // Account
    `CREATE TABLE IF NOT EXISTS Account (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#10b981',
      icon TEXT NOT NULL DEFAULT '💵',
      isDefault BOOLEAN NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );`,

    // Budget
    `CREATE TABLE IF NOT EXISTS Budget (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      month TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      isIgnored BOOLEAN NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      UNIQUE(userId, month, category)
    );`,

    // Transaction (quoted because TRANSACTION is a SQL keyword)
    `CREATE TABLE IF NOT EXISTS "Transaction" (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      spendingType TEXT NOT NULL DEFAULT 'cash',
      accountId TEXT,
      classification TEXT NOT NULL DEFAULT 'need',
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      isRecurring BOOLEAN NOT NULL DEFAULT 0,
      receiptUrl TEXT,
      recurringId TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );`,

    // RecurringTransaction
    `CREATE TABLE IF NOT EXISTS RecurringTransaction (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      spendingType TEXT NOT NULL DEFAULT 'cash',
      classification TEXT NOT NULL DEFAULT 'need',
      frequency TEXT NOT NULL,
      dayOfMonth INTEGER NOT NULL DEFAULT 1,
      dayOfWeek INTEGER,
      startDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      endDate DATETIME,
      lastExecuted DATETIME,
      isActive BOOLEAN NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );`,

    // Goal
    `CREATE TABLE IF NOT EXISTS Goal (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      targetAmount REAL NOT NULL,
      savedAmount REAL NOT NULL DEFAULT 0,
      deadline DATETIME,
      icon TEXT NOT NULL DEFAULT '🎯',
      color TEXT NOT NULL DEFAULT '#10b981',
      isCompleted BOOLEAN NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );`,

    // Reminder
    `CREATE TABLE IF NOT EXISTS Reminder (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL,
      category TEXT NOT NULL DEFAULT 'Utilities',
      dueDate DATETIME NOT NULL,
      remindDays INTEGER NOT NULL DEFAULT 3,
      isRecurring BOOLEAN NOT NULL DEFAULT 0,
      frequency TEXT,
      isPaid BOOLEAN NOT NULL DEFAULT 0,
      isDismissed BOOLEAN NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );`,

    // LendBorrow
    `CREATE TABLE IF NOT EXISTS LendBorrow (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      person TEXT NOT NULL,
      description TEXT NOT NULL,
      date DATETIME NOT NULL,
      dueDate DATETIME,
      isSettled BOOLEAN NOT NULL DEFAULT 0,
      settledDate DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );`,

    // Transfer
    `CREATE TABLE IF NOT EXISTS Transfer (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      fromAccountId TEXT NOT NULL,
      toAccountId TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL DEFAULT 'Transfer',
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (fromAccountId) REFERENCES Account(id) ON DELETE CASCADE,
      FOREIGN KEY (toAccountId) REFERENCES Account(id) ON DELETE CASCADE
    );`,

    // VerificationToken
    `CREATE TABLE IF NOT EXISTS VerificationToken (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires DATETIME NOT NULL,
      used BOOLEAN NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    // Add new columns to User table (for existing databases)
    `ALTER TABLE User ADD COLUMN emailVerified DATETIME;`,
    `ALTER TABLE User ADD COLUMN password TEXT;`,
    `ALTER TABLE User ADD COLUMN language TEXT NOT NULL DEFAULT 'en';`,
    `ALTER TABLE User ADD COLUMN onboardingDone BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE User ADD COLUMN geminiApiKey TEXT;`,

    // Indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_account_userId ON Account(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_budget_userId ON Budget(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_transaction_userId ON "Transaction"(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_transaction_date ON "Transaction"(date);`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_userId ON RecurringTransaction(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_goal_userId ON Goal(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_reminder_userId ON Reminder(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_lendborrow_userId ON LendBorrow(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_lendborrow_isSettled ON LendBorrow(isSettled);`,
    `CREATE INDEX IF NOT EXISTS idx_reminder_isPaid ON Reminder(isPaid);`,
    `CREATE INDEX IF NOT EXISTS idx_transfer_userId ON Transfer(userId);`,
    `CREATE INDEX IF NOT EXISTS idx_transfer_fromAccountId ON Transfer(fromAccountId);`,
    `CREATE INDEX IF NOT EXISTS idx_transfer_toAccountId ON Transfer(toAccountId);`,
    `CREATE INDEX IF NOT EXISTS idx_verificationtoken_email ON VerificationToken(email);`,
    `CREATE INDEX IF NOT EXISTS idx_verificationtoken_token ON VerificationToken(token);`,
  ]

  console.log('Pushing schema to Turso...\n')

  for (const stmt of statements) {
    try {
      await client.execute(stmt)
      const tableMatch = stmt.match(/CREATE\s+(TABLE|INDEX)\s+IF NOT EXISTS\s+(\S+)/i)
      if (tableMatch) {
        console.log(`✅ ${tableMatch[1]} ${tableMatch[2]}`)
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`)
      console.error(`   SQL: ${stmt.substring(0, 80)}...`)
    }
  }

  // Verify tables
  console.log('\n📋 Verifying tables...')
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  for (const row of result.rows) {
    console.log(`   ✓ ${row.name}`)
  }

  console.log('\n✅ Schema push complete!')
  client.close()
}

pushSchema().catch(console.error)
