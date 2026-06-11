/**
 * Email sending via Resend (https://resend.com).
 *
 * Graceful degradation:
 *   - RESEND_API_KEY set → real email is sent, code is NOT returned in the
 *     API response (production behaviour).
 *   - RESEND_API_KEY absent → email is skipped, code IS returned in the API
 *     response so the on-screen "Demo Mode" box still works in development.
 *
 * FROM_EMAIL defaults to Resend's sandbox address which works on the free
 * plan without a verified domain. Point it at a verified domain address for
 * production ("Trackr <noreply@yourdomain.com>").
 */

import { Resend } from 'resend'

const FROM_EMAIL = process.env.FROM_EMAIL || 'Trackr <onboarding@resend.dev>'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY
}

/** Send an email verification code to a new user. */
export async function sendVerificationEmail(to: string, name: string, code: string): Promise<void> {
  const resend = getResend()
  if (!resend) return // demo mode — caller returns the code in the response instead

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${code} is your Trackr verification code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#0d9488);display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-size:18px;font-weight:700">T</span>
          </div>
          <span style="font-size:20px;font-weight:700;color:#111827">Trackr</span>
        </div>
        <h2 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px">Verify your email</h2>
        <p style="color:#6b7280;font-size:15px;margin:0 0 24px">Hi ${name}, use the code below to verify your Trackr account.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <p style="font-size:36px;font-weight:800;letter-spacing:0.3em;color:#065f46;margin:0">${code}</p>
          <p style="font-size:13px;color:#6b7280;margin:8px 0 0">Expires in 10 minutes</p>
        </div>
        <p style="color:#9ca3af;font-size:13px;margin:0">If you didn't create a Trackr account, you can safely ignore this email.</p>
      </div>
    `,
  })
}

/** Send a password reset code. */
export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const resend = getResend()
  if (!resend) return // demo mode — caller returns the code in the response instead

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${code} is your Trackr password reset code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#0d9488);display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-size:18px;font-weight:700">T</span>
          </div>
          <span style="font-size:20px;font-weight:700;color:#111827">Trackr</span>
        </div>
        <h2 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px">Reset your password</h2>
        <p style="color:#6b7280;font-size:15px;margin:0 0 24px">Use the code below to reset your Trackr password.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <p style="font-size:36px;font-weight:800;letter-spacing:0.3em;color:#065f46;margin:0">${code}</p>
          <p style="font-size:13px;color:#6b7280;margin:8px 0 0">Expires in 10 minutes</p>
        </div>
        <p style="color:#9ca3af;font-size:13px;margin:0">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  })
}
