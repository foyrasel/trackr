import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const INTERNAL_KEY = process.env.NEXTAUTH_SECRET ?? ''

// POST — called by middleware (fire-and-forget) with the internal key header
export async function POST(request: NextRequest) {
  const key = request.headers.get('x-internal-key')
  if (!key || key !== INTERNAL_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { type?: string; ip?: string; path?: string; ua?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { type, ip, path, ua } = body
  if (!type || !ip || !path) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    await db.securityLog.create({ data: { type, ip, path, ua: ua ?? null } })
    // Trim old rows — keep last 1000 events
    const count = await db.securityLog.count()
    if (count > 1000) {
      const oldest = await db.securityLog.findMany({
        orderBy: { createdAt: 'asc' },
        take: count - 1000,
        select: { id: true },
      })
      await db.securityLog.deleteMany({ where: { id: { in: oldest.map(r => r.id) } } })
    }
  } catch {
    // Best-effort — never block the block response
  }

  return NextResponse.json({ ok: true })
}

// GET — used by the Settings panel to view recent events (requires JWT auth)
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const events = await db.securityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const summary = {
    total: await db.securityLog.count(),
    rateLimits: await db.securityLog.count({ where: { type: 'rate_limit' } }),
    botBlocks: await db.securityLog.count({ where: { type: 'bot_ua' } }),
    honeypots: await db.securityLog.count({ where: { type: 'honeypot' } }),
  }

  return NextResponse.json({ events, summary })
}
