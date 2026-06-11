import bcrypt from 'bcryptjs'

/**
 * Password hashing utilities.
 *
 * We use bcrypt — a proper, salted, slow password hashing algorithm. Each hash
 * embeds its own random salt, so verification does NOT depend on any external
 * secret (unlike the old SHA-256 + NEXTAUTH_SECRET scheme, which permanently
 * broke every login whenever NEXTAUTH_SECRET changed).
 *
 * A legacy verifier is kept so users whose passwords were stored with the old
 * SHA-256 scheme can still log in once, after which the caller re-hashes their
 * password with bcrypt (transparent upgrade-on-login).
 */

const BCRYPT_ROUNDS = 10

/** Hash a plaintext password with bcrypt (includes a random salt). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/** A bcrypt hash always starts with $2a$, $2b$, or $2y$. */
export function isBcryptHash(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored)
}

/**
 * Legacy SHA-256 hash used by older versions of the app:
 *   SHA-256(password + secret)
 * The secret was process.env.NEXTAUTH_SECRET, falling back to 'trackr-secret'.
 * We try the current secret AND the historical fallback so passwords created
 * under either still validate.
 */
async function legacySha256(password: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + secret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify a plaintext password against a stored hash.
 *
 * Returns:
 *  - matched:  whether the password is correct
 *  - needsRehash: true when the stored hash used the legacy scheme, signalling
 *    the caller to re-store the password using hashPassword() for future logins.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ matched: boolean; needsRehash: boolean }> {
  if (!stored) return { matched: false, needsRehash: false }

  // Modern bcrypt hashes
  if (isBcryptHash(stored)) {
    const matched = await bcrypt.compare(password, stored)
    return { matched, needsRehash: false }
  }

  // Legacy SHA-256 hashes — try current secret then the historical fallback
  const secrets = [process.env.NEXTAUTH_SECRET || 'trackr-secret', 'trackr-secret']
  for (const secret of secrets) {
    const legacy = await legacySha256(password, secret)
    if (legacy === stored) {
      return { matched: true, needsRehash: true }
    }
  }

  return { matched: false, needsRehash: false }
}
