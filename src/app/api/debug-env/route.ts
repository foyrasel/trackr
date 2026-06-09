import { NextResponse } from 'next/server'
import { isAvailable } from '@/lib/ai'

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    AI_AVAILABLE: await isAvailable(),
  })
}
