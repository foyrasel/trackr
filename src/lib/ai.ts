/**
 * AI SDK Wrapper for z-ai-web-dev-sdk
 *
 * The SDK reads config from a .z-ai-config file, which doesn't exist on
 * Vercel's serverless functions. This wrapper:
 * 1. Tries the normal ZAI.create() (reads config file — works locally)
 * 2. Falls back to writing a config file from env vars, then calling ZAI.create()
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInstance: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInitPromise: Promise<any> | null = null

/**
 * Write a .z-ai-config file from environment variables so ZAI.create() can find it
 */
function writeConfigFromEnv(): boolean {
  const baseUrl = process.env.ZAI_BASE_URL
  const apiKey = process.env.ZAI_API_KEY

  if (!baseUrl || !apiKey) return false

  const config: Record<string, string> = { baseUrl, apiKey }
  if (process.env.ZAI_CHAT_ID) config.chatId = process.env.ZAI_CHAT_ID
  if (process.env.ZAI_TOKEN) config.token = process.env.ZAI_TOKEN
  if (process.env.ZAI_USER_ID) config.userId = process.env.ZAI_USER_ID

  try {
    // Write to /tmp which is writable on Vercel serverless functions
    const tmpConfigPath = path.join(os.tmpdir(), '.z-ai-config')
    fs.writeFileSync(tmpConfigPath, JSON.stringify(config), 'utf-8')

    // Also try the CWD which is the first place the SDK looks
    const cwdConfigPath = path.join(process.cwd(), '.z-ai-config')
    try {
      fs.writeFileSync(cwdConfigPath, JSON.stringify(config), 'utf-8')
    } catch {
      // CWD might not be writable, that's OK — we have /tmp
    }

    // Also try home dir
    const homeConfigPath = path.join(os.homedir(), '.z-ai-config')
    try {
      fs.writeFileSync(homeConfigPath, JSON.stringify(config), 'utf-8')
    } catch {
      // Home dir might not be writable either
    }

    console.log('[AI] Config file written from env vars to', tmpConfigPath)
    return true
  } catch (err) {
    console.error('[AI] Failed to write config file:', (err as Error).message)
    return false
  }
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
          'Set these environment variables on Vercel: ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID (optional), ZAI_TOKEN (optional), ZAI_USER_ID (optional)'
        )
      }

      // Now retry ZAI.create() — it should find the config file we just wrote
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        const instance = await ZAI.create()
        zaiInstance = instance

        // Quick test to verify connection works
        try {
          await instance.chat.completions.create({
            messages: [{ role: 'user', content: 'ping' }],
            temperature: 0,
            max_tokens: 1,
          })
          console.log('[AI] SDK initialized from env vars — connection verified')
        } catch (testErr: any) {
          zaiInstance = null
          throw new Error(`AI connection test failed: ${testErr.message}`)
        }

        return instance
      } catch (retryError) {
        throw new Error(
          `AI unavailable: Failed to initialize even with env vars. ${(retryError as Error).message}`
        )
      }
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
