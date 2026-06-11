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

    // Run migrations using libsql client directly
    runMigrations(tursoUrl, authToken).catch(err => console.error('[DB] Migration warning:', err.message))

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

  const migrations = [
    { name: 'add_password_column', sql: 'ALTER TABLE User ADD COLUMN password TEXT' },
    { name: 'add_emailVerified_column', sql: 'ALTER TABLE User ADD COLUMN emailVerified DATETIME' },
    { name: 'add_language_column', sql: 'ALTER TABLE User ADD COLUMN language TEXT DEFAULT \'en\'' },
    { name: 'add_onboardingDone_column', sql: 'ALTER TABLE User ADD COLUMN onboardingDone BOOLEAN DEFAULT 0' },
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
