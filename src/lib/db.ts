import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// CRITICAL: Prisma's SQLite provider CANNOT parse libsql:// URLs.
// We must override DATABASE_URL to a local file path before PrismaClient creation.
const originalDbUrl = process.env.DATABASE_URL
if (!originalDbUrl || originalDbUrl.startsWith('libsql://') || originalDbUrl.startsWith('http://') || originalDbUrl.startsWith('https://')) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbReady: Promise<void> | undefined
}

/**
 * Resolves once the Turso schema migration has finished (or immediately for
 * local SQLite). Routes that perform the very first writes — like /api/seed —
 * can await this so a freshly created Turso database has its tables ready
 * before any query runs.
 */
export function ensureDbReady(): Promise<void> {
  // Touch the proxy so the client (and its migration) is created if it hasn't been.
  void getDb()
  return globalForPrisma.dbReady ?? Promise.resolve()
}

function createPrismaClient(): PrismaClient {
  // Turso connection uses TURSO_URL (separate from Prisma's DATABASE_URL)
  const tursoUrl = process.env.TURSO_URL || ''
  const isTurso = tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('http://') || tursoUrl.startsWith('https://')

  if (isTurso) {
    const authToken = process.env.DATABASE_AUTH_TOKEN || undefined

    if (!authToken) {
      console.error('[DB] DATABASE_AUTH_TOKEN is missing for Turso connection')
    }

    // In Prisma v6 adapter-libsql, pass Config object { url, authToken } directly
    // NOT a libsql Client instance
    const adapter = new PrismaLibSql({ url: tursoUrl, authToken })

    // Run migrations using libsql client directly. Store the promise so
    // ensureDbReady() can await schema creation before the first query.
    globalForPrisma.dbReady = runMigrations(tursoUrl, authToken).catch(err =>
      console.error('[DB] Migration warning:', err.message)
    )

    return new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    })
  }

  // Local SQLite (development)
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

async function runMigrations(url: string, authToken?: string) {
  const { createClient } = await import('@libsql/client')
  const libsql = createClient({ url, authToken })

  // Creates all tables on first connect (idempotent — IF NOT EXISTS), then
  // adds any columns that older databases might be missing. This means a fresh
  // Turso database self-initializes on the first request, with no manual
  // schema-push script required.
  const migrations: { name: string; sql: string }[] = [
    {
      name: 'create_User',
      sql: `CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        email TEXT UNIQUE,
        image TEXT,
        provider TEXT NOT NULL DEFAULT 'demo',
        darkMode BOOLEAN NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        currencySymbol TEXT NOT NULL DEFAULT '$',
        language TEXT NOT NULL DEFAULT 'en',
        onboardingDone BOOLEAN NOT NULL DEFAULT 0,
        emailVerified DATETIME,
        password TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: 'create_Account',
      sql: `CREATE TABLE IF NOT EXISTS Account (
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
      )`,
    },
    {
      name: 'create_Budget',
      sql: `CREATE TABLE IF NOT EXISTS Budget (
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
      )`,
    },
    {
      name: 'create_Transaction',
      sql: `CREATE TABLE IF NOT EXISTS "Transaction" (
        id TEXT PRIMARY KEY NOT NULL,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        spendingType TEXT NOT NULL DEFAULT 'cash',
        classification TEXT NOT NULL DEFAULT 'need',
        date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        isRecurring BOOLEAN NOT NULL DEFAULT 0,
        receiptUrl TEXT,
        recurringId TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
      )`,
    },
    {
      name: 'create_RecurringTransaction',
      sql: `CREATE TABLE IF NOT EXISTS RecurringTransaction (
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
      )`,
    },
    {
      name: 'create_Goal',
      sql: `CREATE TABLE IF NOT EXISTS Goal (
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
      )`,
    },
    {
      name: 'create_Reminder',
      sql: `CREATE TABLE IF NOT EXISTS Reminder (
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
      )`,
    },
    {
      name: 'create_LendBorrow',
      sql: `CREATE TABLE IF NOT EXISTS LendBorrow (
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
      )`,
    },
    {
      name: 'create_Transfer',
      sql: `CREATE TABLE IF NOT EXISTS Transfer (
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
      )`,
    },
    {
      name: 'create_VerificationToken',
      sql: `CREATE TABLE IF NOT EXISTS VerificationToken (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL,
        token TEXT NOT NULL,
        expires DATETIME NOT NULL,
        used BOOLEAN NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: 'create_Feedback',
      sql: `CREATE TABLE IF NOT EXISTS Feedback (
        id TEXT PRIMARY KEY NOT NULL,
        userId TEXT,
        email TEXT,
        category TEXT NOT NULL DEFAULT 'general',
        rating INTEGER,
        message TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    // Column additions for older databases created before these fields existed
    { name: 'add_password_column', sql: 'ALTER TABLE User ADD COLUMN password TEXT' },
    { name: 'add_emailVerified_column', sql: 'ALTER TABLE User ADD COLUMN emailVerified DATETIME' },
    { name: 'add_language_column', sql: 'ALTER TABLE User ADD COLUMN language TEXT DEFAULT \'en\'' },
    { name: 'add_onboardingDone_column', sql: 'ALTER TABLE User ADD COLUMN onboardingDone BOOLEAN DEFAULT 0' },
    { name: 'add_transaction_accountId_column', sql: 'ALTER TABLE "Transaction" ADD COLUMN accountId TEXT' },
    // Indexes for performance
    { name: 'idx_account_userId', sql: 'CREATE INDEX IF NOT EXISTS idx_account_userId ON Account(userId)' },
    { name: 'idx_budget_userId', sql: 'CREATE INDEX IF NOT EXISTS idx_budget_userId ON Budget(userId)' },
    { name: 'idx_transaction_userId', sql: 'CREATE INDEX IF NOT EXISTS idx_transaction_userId ON "Transaction"(userId)' },
    { name: 'idx_transaction_date', sql: 'CREATE INDEX IF NOT EXISTS idx_transaction_date ON "Transaction"(date)' },
    { name: 'idx_recurring_userId', sql: 'CREATE INDEX IF NOT EXISTS idx_recurring_userId ON RecurringTransaction(userId)' },
    { name: 'idx_goal_userId', sql: 'CREATE INDEX IF NOT EXISTS idx_goal_userId ON Goal(userId)' },
    { name: 'idx_reminder_userId', sql: 'CREATE INDEX IF NOT EXISTS idx_reminder_userId ON Reminder(userId)' },
    { name: 'idx_lendborrow_userId', sql: 'CREATE INDEX IF NOT EXISTS idx_lendborrow_userId ON LendBorrow(userId)' },
    { name: 'idx_transfer_userId', sql: 'CREATE INDEX IF NOT EXISTS idx_transfer_userId ON Transfer(userId)' },
    { name: 'idx_verificationtoken_email', sql: 'CREATE INDEX IF NOT EXISTS idx_verificationtoken_email ON VerificationToken(email)' },
  ]

  for (const migration of migrations) {
    try {
      await libsql.execute(migration.sql)
    } catch (err: any) {
      if (!err.message?.includes('duplicate column') && !err.message?.includes('already exists')) {
        console.error('[DB] Migration', migration.name, 'warning:', err.message)
      }
    }
  }

  libsql.close()
}

function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

// Lazy proxy — only creates PrismaClient when first property is accessed
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const realDb = getDb()
    const value = Reflect.get(realDb, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(realDb)
    }
    return value
  },
})
