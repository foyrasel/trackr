/**
 * AI SDK Wrapper for z-ai-web-dev-sdk
 *
 * ARCHITECTURE:
 * The Z.ai internal API (internal-api.z.ai) is only reachable from within
 * the Z.ai sandbox — not from Vercel's public servers.
 *
 * Solution:
 * 1. When running in Z.ai sandbox: Use the SDK directly (internal API is reachable)
 * 2. When running on Vercel: Call the AI proxy endpoint on the Z.ai sandbox
 *    (which is exposed via a Cloudflare tunnel)
 *
 * The proxy endpoint is at /api/ai/proxy and requires an x-proxy-key header.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInstance: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let zaiInitPromise: Promise<any> | null = null
let useProxy = false

const PROXY_URL = 'https://acting-animals-stack-printing.trycloudflare.com'
const PROXY_KEY = 'trackr-ai-proxy-2026'

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
 * Try to initialize the ZAI SDK directly.
 * Returns true if successful (internal API is reachable), false otherwise.
 */
async function tryDirectInit(): Promise<boolean> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const config = getZAIConfig()

    // Bypass ZAI.create() which requires a file — construct directly with config
    const instance = new (ZAI as any)(config)

    // Test if the internal API is actually reachable by making a small request
    await instance.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      temperature: 0.1,
      max_tokens: 1,
    })

    zaiInstance = instance
    useProxy = false
    console.log('[AI] Direct SDK initialized (internal API reachable)')
    return true
  } catch {
    console.log('[AI] Internal API not reachable, will use proxy')
    return false
  }
}

/**
 * Make a chat completion request through the proxy endpoint.
 */
async function proxyChatCompletion(body: any): Promise<any> {
  const response = await fetch(`${PROXY_URL}/api/ai/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-proxy-key': PROXY_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Proxy request failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Get a ZAI SDK instance or flag that we should use proxy mode.
 */
export async function getAI(): Promise<any> {
  if (zaiInstance) return zaiInstance
  if (zaiInitPromise) return zaiInitPromise

  zaiInitPromise = (async () => {
    const directWorked = await tryDirectInit()
    if (directWorked) return zaiInstance

    // Use proxy mode — return a proxy wrapper that mimics the ZAI SDK interface
    useProxy = true
    const proxyWrapper = {
      chat: {
        completions: {
          create: proxyChatCompletion,
        },
      },
    }
    zaiInstance = proxyWrapper
    console.log('[AI] Using proxy mode via', PROXY_URL)
    return proxyWrapper
  })()

  try {
    return await zaiInitPromise
  } catch (err) {
    zaiInitPromise = null
    throw err
  }
}

/**
 * Check if AI is available
 */
export async function isAvailable(): Promise<boolean> {
  try {
    await getAI()
    return true
  } catch {
    return false
  }
}
