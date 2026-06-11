import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {},
    db: null,
    ai: null,
  }

  // Check environment variables (mask sensitive values)
  const envVars = ['TURSO_URL', 'DATABASE_URL', 'DATABASE_AUTH_TOKEN', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
  for (const v of envVars) {
    const val = process.env[v]
    if (val) {
      results.env[v] = val.length > 10 ? val.slice(0, 6) + '***' : '***'
    } else {
      results.env[v] = 'NOT SET'
    }
  }

  // Test database connection
  try {
    const { db } = await import('@/lib/db')
    const userCount = await db.user.count()
    results.db = { status: 'connected', userCount }
  } catch (dbError: any) {
    results.db = { status: 'error', message: dbError.message?.slice(0, 200) || 'Unknown error' }
  }

  // Test AI SDK
  try {
    const { createZAI } = await import('@/lib/zai')
    const zai = await createZAI()
    results.ai = { status: 'ready', created: !!zai }
  } catch (aiError: any) {
    results.ai = { status: 'error', message: aiError.message?.slice(0, 200) || 'Unknown error' }
  }

  return NextResponse.json(results, { status: 200 })
}
