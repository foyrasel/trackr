import { db, ensureDbReady } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const CATEGORIES = ['bug', 'feature', 'general', 'praise']

// POST /api/feedback — submit user feedback
export async function POST(request: NextRequest) {
  try {
    await ensureDbReady()

    const body = await request.json()
    const { category, rating, message } = body

    const text = typeof message === 'string' ? message.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'Feedback message is required' }, { status: 400 })
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: 'Feedback is too long (max 2000 characters)' }, { status: 400 })
    }

    // Attach the signed-in user if available (feedback can still be anonymous)
    let userId: string | null = null
    let email: string | null = null
    try {
      const user = await getCurrentUser(request)
      if (user) {
        userId = user.id
        email = user.email ?? null
      }
    } catch {}

    const safeCategory = CATEGORIES.includes(category) ? category : 'general'
    const safeRating =
      typeof rating === 'number' && rating >= 1 && rating <= 5 ? Math.round(rating) : null

    await db.feedback.create({
      data: {
        userId,
        email,
        category: safeCategory,
        rating: safeRating,
        message: text,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}
