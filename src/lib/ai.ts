/**
 * AI SDK Wrapper for z-ai-web-dev-sdk
 *
 * The SDK reads config from a .z-ai-config file, which doesn't exist on
 * Vercel's serverless functions. This wrapper:
 * 1. Writes a .z-ai-config file from embedded credentials (or env vars if set)
 * 2. Calls ZAI.create() which reads the config file
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
 * Get ZAI config — from env vars first, then from hardcoded defaults.
 * This ensures AI works on Vercel even without env vars configured.
 */
function getZAIConfig(): Record<string, string> {
  return {
    baseUrl: process.env.ZAI_BASE_URL || 'https://internal-api.z.ai/v1',
    apiKey: process.env.ZAI_API_KEY || 'Z.ai',
    chatId: process.env.ZAI_CHAT_ID || 'chat-bc95edbc-f046-472e-941f-3596e90019b1',
    token: process.env.ZAI_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZWVlY2E5ZDUtNWY4Ny00YmYyLTlmNTQtNDNkOGM3ZmZhYTExIiwiY2hhdF9pZCI6ImNoYXQtYmM5NWVkYmMtZjA0Ni00NzJlLTk0MWYtMzU5NmU5MDAxOWIxIiwicGxhdGZvcm0iOiJ6YWkifQ.ArtAJkRtPlzgbFAbygVPSu75Vdq_fTrLEdLkU1Mf6ME',
    userId: process.env.ZAI_USER_ID || 'eeeca9d5-5f87-4bf2-9f54-43d8c7ffaa11',
  }
}

/**
 * Write .z-ai-config files so ZAI.create() can find them.
 * Tries all three paths the SDK checks.
 */
function writeConfigFile(): boolean {
  const config = getZAIConfig()
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
 * Strategy:
 * 1. Write the config file (from embedded credentials or env vars)
 * 2. Call ZAI.create() which will find the config file
 * 3. Cache the instance for reuse
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAI(): Promise<any> {
  // Return cached instance if available
  if (zaiInstance) return zaiInstance

  // If initialization is already in progress, wait for it
  if (zaiInitPromise) return zaiInitPromise

  zaiInitPromise = (async () => {
    // Always write the config file first — ensures it exists on Vercel
    const written = writeConfigFile()
    if (!written) {
      console.warn('[AI] Could not write config file to any path, trying ZAI.create() anyway...')
    }

    // Now create the SDK instance — it will read the config file we just wrote
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const instance = await ZAI.create()
    zaiInstance = instance
    console.log('[AI] SDK initialized successfully')
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
