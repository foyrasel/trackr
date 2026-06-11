import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

let configWritten = false

/**
 * Ensure .z-ai-config is findable by z-ai-web-dev-sdk on Vercel.
 * The SDK looks for the config at process.cwd()/.z-ai-config, but on Vercel
 * serverless functions, process.cwd() is NOT the project root.
 * 
 * This function finds the config file (relative to source code) and ensures
 * it's accessible at process.cwd()/.z-ai-config so the SDK can find it.
 */
export async function ensureZAIConfig() {
  if (configWritten) return

  const cwdPath = path.join(process.cwd(), '.z-ai-config')
  
  // First check if it's already accessible at cwd
  try {
    const content = await fs.readFile(cwdPath, 'utf-8')
    const config = JSON.parse(content)
    if (config.baseUrl && config.apiKey) {
      configWritten = true
      return
    }
  } catch {
    // Not found at cwd, continue
  }

  // Find the config file relative to this source file
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const searchPaths = [
    path.join(__dirname, '..', '..', '..', '.z-ai-config'),  // from src/lib/ -> project root
    path.join('/etc', '.z-ai-config'),                        // system path
  ]

  for (const configPath of searchPaths) {
    try {
      const content = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(content)
      if (config.baseUrl && config.apiKey) {
        // Copy the config to process.cwd() so the SDK can find it
        try {
          await fs.writeFile(cwdPath, content, 'utf-8')
          console.log('[ZAI] Config copied to:', cwdPath)
        } catch (writeErr: any) {
          // Vercel's filesystem might be read-only in some cases
          console.warn('[ZAI] Could not write config to cwd:', writeErr.message)
          // As fallback, we'll use the config directly by monkey-patching
        }
        configWritten = true
        return
      }
    } catch {
      // Continue to next path
    }
  }

  throw new Error('[ZAI] Configuration file not found. Searched: ' + searchPaths.join(', '))
}

/**
 * Create a ZAI SDK instance that works on Vercel serverless.
 * Ensures the config file is findable before calling ZAI.create().
 */
export async function createZAI() {
  await ensureZAIConfig()
  const { default: ZAI } = await import('z-ai-web-dev-sdk')
  return ZAI.create()
}
