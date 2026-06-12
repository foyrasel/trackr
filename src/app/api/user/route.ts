import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/user - Get current user settings (currency, dark mode, etc.)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      image: dbUser.image,
      provider: dbUser.provider,
      darkMode: dbUser.darkMode,
      currency: dbUser.currency,
      currencySymbol: dbUser.currencySymbol,
      language: dbUser.language,
      hasGeminiKey: !!dbUser.geminiApiKey,
      hasTelegramToken: !!dbUser.telegramToken,
      monthlyReportEnabled: dbUser.monthlyReportEnabled,
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 })
  }
}

// PUT /api/user - Update user settings (currency, dark mode, etc.)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { darkMode, currency, currencySymbol, language, onboardingDone, geminiApiKey, telegramToken, monthlyReportEnabled } = body

    const updateData: Record<string, unknown> = {}
    if (darkMode !== undefined) updateData.darkMode = darkMode
    if (currency !== undefined) updateData.currency = currency
    if (currencySymbol !== undefined) updateData.currencySymbol = currencySymbol
    if (language !== undefined) updateData.language = language
    if (onboardingDone !== undefined) updateData.onboardingDone = onboardingDone
    if (geminiApiKey !== undefined) updateData.geminiApiKey = geminiApiKey || null
    if (telegramToken !== undefined) updateData.telegramToken = telegramToken || null
    if (monthlyReportEnabled !== undefined) updateData.monthlyReportEnabled = monthlyReportEnabled

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: updateData,
    })

    // Auto-register Telegram webhook when token is saved
    if (telegramToken) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
      if (baseUrl) {
        const webhookUrl = `${baseUrl}/api/telegram/webhook/${user.id}`
        fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
        }).catch(() => {})
      }
    }
    // Delete webhook when token is cleared
    if (telegramToken === null || telegramToken === '') {
      const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { telegramToken: true } })
      if (dbUser?.telegramToken) {
        fetch(`https://api.telegram.org/bot${dbUser.telegramToken}/deleteWebhook`).catch(() => {})
      }
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      darkMode: updated.darkMode,
      currency: updated.currency,
      currencySymbol: updated.currencySymbol,
      language: updated.language,
      onboardingDone: updated.onboardingDone,
    })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
