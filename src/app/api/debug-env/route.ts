import { NextResponse } from 'next/server'
import { getAI, isAvailable } from '@/lib/ai'

export async function GET() {
  let aiStatus = 'unknown'
  let aiError = ''
  try {
    const ai = await getAI()
    const result = await ai.chat.completions.create({
      messages: [{ role: 'user', content: 'Say OK' }],
      temperature: 0.1,
      max_tokens: 5,
    })
    aiStatus = result.choices?.[0]?.message?.content ? 'working' : 'response_empty'
  } catch (err: any) {
    aiStatus = 'failed'
    aiError = err?.message || String(err)
  }

  return NextResponse.json({
    TURSO_URL: process.env.TURSO_URL ? 'SET (' + process.env.TURSO_URL.substring(0, 30) + '...)' : 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL || 'NOT SET',
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? 'SET (' + process.env.DATABASE_AUTH_TOKEN.substring(0, 10) + '...)' : 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    AI_STATUS: aiStatus,
    AI_ERROR: aiError || undefined,
    AI_AVAILABLE: await isAvailable(),
  })
}
