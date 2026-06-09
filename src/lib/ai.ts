/**
 * AI SDK Wrapper for z-ai-web-dev-sdk
 *
 * PROBLEM: The SDK's ZAI.create() only reads config from a file (.z-ai-config).
 * On Vercel serverless, the filesystem is read-only — writing the config file fails.
 *
 * SOLUTION: Bypass ZAI.create() entirely and instantiate ZAI directly with
 * embedded credentials. The SDK constructor accepts a config object but is
 * marked "private" in TypeScript — we bypass that with a type assertion.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInstance: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInitPromise: Promise<any> | null = null

/**
 * Get ZAI config — from env vars first, then from hardcoded defaults.
 */
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
 * Get a ZAI SDK instance, creating one if needed.
 *
 * We bypass ZAI.create() (which requires a file) and directly construct
 * a ZAI instance with the config object. This works on Vercel's read-only
 * filesystem because no file I/O is needed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAI(): Promise<any> {
  // Return cached instance if available
  if (zaiInstance) return zaiInstance

  // If initialization is already in progress, wait for it
  if (zaiInitPromise) return zaiInitPromise

  zaiInitPromise = (async () => {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const config = getZAIConfig()

    // Bypass ZAI.create() which requires a file — construct directly with config
    // The constructor is "private" in TS but fully functional in JS
    const instance = new (ZAI as any)(config)
    zaiInstance = instance
    console.log('[AI] SDK initialized with direct config (no file I/O)')
    return instance
  })()

  try {
    return await zaiInitPromise
  } catch (err) {
    // Clear the promise so we can retry next time
    zaiInitPromise = null
    throw err
  }
}

/**
 * Check if AI is available without making a full request
 */
export async function isAvailable(): Promise<boolean> {
  try {
    await getAI()
    return true
  } catch {
    return false
  }
}
