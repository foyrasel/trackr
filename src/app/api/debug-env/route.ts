import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    TURSO_URL: process.env.TURSO_URL ? 'SET (' + process.env.TURSO_URL.substring(0, 30) + '...)' : 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL || 'NOT SET',
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? 'SET (' + process.env.DATABASE_AUTH_TOKEN.substring(0, 10) + '...)' : 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
  })
}
