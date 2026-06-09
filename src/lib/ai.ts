/**
 * AI SDK Wrapper for z-ai-web-dev-sdk
 *
 * The SDK reads config from a .z-ai-config file, which doesn't exist on
 * Vercel's serverless functions. This wrapper:
 * 1. Tries the normal ZAI.create() (reads config file — works locally)
 * 2. Falls back to writing a config file from env vars, then calling ZAI.create()
 *
 * The SDK checks these paths in order:
 *   1. process.cwd()/.z-ai-config
 *   2. os.homedir()/.z-ai-config
 *   3. /etc/.z-ai-config
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInstance: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInitPromise: Promise<any> | null = null

/**
 * Write .z-ai-config files from environment variables so ZAI.create() can find them.
 * Tries all three paths the SDK checks.
 */
function writeConfigFromEnv(): boolean {
  const baseUrl = process.env.ZAI_BASE_URL
  const apiKey = process.env.ZAI_API_KEY

  if (!baseUrl || !apiKey) return false

  const config: Record<string, string> = { baseUrl, apiKey }
  if (process.env.ZAI_CHAT_ID) config.chatId = process.env.ZAI_CHAT_ID
  if (process.env.ZAI_TOKEN) config.token = process.env.ZAI_TOKEN
  if (process.env.ZAI_USER_ID) config.userId = process.env.ZAI_USER_ID

  const configStr = JSON.stringify(config)
  let wroteAny = false

  // Try all three paths the SDK checks
  const paths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ]

  for (const filePath of paths) {
    try {
      fs.writeFileSync(filePath, configStr, 'utf-8')
      console.log('[AI] Config written to', filePath)
      wroteAny = true
    } catch {
      // Path may not be writable — that's OK as long as at least one works
    }
  }

  return wroteAny
}

/**
 * Get a ZAI SDK instance, creating one if needed.
 *
 * Priority:
 * 1. Try the normal ZAI.create() (reads .z-ai-config file — works locally)
 * 2. Write config from env vars and retry ZAI.create() (works on Vercel)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAI(): Promise<any> {
  // Return cached instance if available
  if (zaiInstance) return zaiInstance

  // If initialization is already in progress, wait for it
  if (zaiInitPromise) return zaiInitPromise

  zaiInitPromise = (async () => {
    // Try the normal SDK init first (reads config file — works locally where file exists)
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const instance = await ZAI.create()
      zaiInstance = instance
      return instance
    } catch (fileError) {
      console.log('[AI] Config file not found, trying environment variables...')

      // Write config file from env vars and retry
      const written = writeConfigFromEnv()
      if (!written) {
        throw new Error(
          'AI unavailable: No .z-ai-config file and missing ZAI_BASE_URL/ZAI_API_KEY env vars. ' +
          'Add these in Vercel Dashboard > Settings > Environment Variables:\n' +
          '  ZAI_BASE_URL = https://internal-api.z.ai/v1\n' +
          '  ZAI_API_KEY = Z.ai\n' +
          '  ZAI_CHAT_ID = (from /etc/.z-ai-config)\n' +
          '  ZAI_TOKEN = (from /etc/.z-ai-config)\n' +
          '  ZAI_USER_ID = (from /etc/.z-ai-config)'
        )
      }

      // Now retry ZAI.create() — it should find the config file we just wrote
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const instance = await ZAI.create()
      zaiInstance = instance
      console.log('[AI] SDK initialized from env vars config')
      return instance
    }
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
