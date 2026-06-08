import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_URL || process.env.DATABASE_URL || ''
  const isTurso = tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('http://') || tursoUrl.startsWith('https://')

  if (isTurso) {
    const authToken = process.env.DATABASE_AUTH_TOKEN || undefined
    const libsql = createClient({ url: tursoUrl, authToken })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter, log: ['error'] })
  }

  return new PrismaClient({ log: ['query', 'error'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db