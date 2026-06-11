/**
 * AI SDK Wrapper for z-ai-web-dev-sdk
 *
 * The Z.ai internal API (internal-api.z.ai) is only reachable from within
 * the Z.ai sandbox, not from Vercel's public servers.
 *
 * This module tries to use the Z.ai SDK directly. If it fails (e.g., on Vercel),
 * it returns null and the caller falls back to Anthropic Claude API or regex-based categorization.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInstance: any = null
let zaiAvailable: boolean | null = null

function getZAIConfig() {
  return {
    baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
    apiKey: process.env.ZAI_API_KEY || 'Z.ai',
    chatId: process.env.ZAI_CHAT_ID || 'chat-bc95edbc-f046-472e-941f-3596e90019b1',
    token: process.env.ZAI_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZWVlY2E5ZDUtNWY4Ny00YmYyLTlmNTQtNDNkOGM3ZmZhYTExIiwiY2hhdF9pZCI6ImNoYXQtYmM5NWVkYmMtZjA0Ni00NzJlLTk0MWYtMzU5NmU5MDAxOWIxIiwicGxhdGZvcm0iOiJ6YWkifQ.ArtAJkRtPlzgbFAbygVPSu75Vdq_fTrLEdLkU1Mf6ME',
    userId: process.env.ZAI_USER_ID || 'eeeca9d5-5f87-4bf2-9f54-43d8c7ffaa11',
  }
}

/**
 * Try to get a ZAI SDK instance.
 * Returns null if the internal API is not reachable (e.g., on Vercel).
 * On Vercel, skips the test immediately to avoid 5-second timeout.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAI(): Promise<any | null> {
  if (zaiAvailable === false) return null
  if (zaiInstance) return zaiInstance

  // ZAI internal API is only reachable inside the Z.ai sandbox.
  // Skip the expensive connectivity test on Vercel and similar hosts.
  if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL) {
    zaiAvailable = false
    return null
  }

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const config = getZAIConfig()
    const instance = new (ZAI as any)(config)

    await instance.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      temperature: 0.1,
      max_tokens: 1,
    })

    zaiInstance = instance
    zaiAvailable = true
    console.log('[AI] ZAI SDK initialized')
    return instance
  } catch {
    zaiAvailable = false
    console.log('[AI] ZAI not reachable, using fallback categorization')
    return null
  }
}

/**
 * Check if AI is available
 */
export async function isAvailable(): Promise<boolean> {
  const ai = await getAI()
  return ai !== null
}
