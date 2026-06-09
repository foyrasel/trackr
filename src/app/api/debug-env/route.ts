import { NextResponse } from 'next/server'

export async function GET() {
  // Test if internal-api.z.ai is reachable from this server
  let apiReachable = 'unknown'
  let apiError = ''
  let dnsResult = ''
  try {
    const resp = await fetch('https://internal-api.z.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer Z.ai',
        'X-Chat-Id': 'chat-bc95edbc-f046-472e-941f-3596e90019b1',
        'X-User-Id': 'eeeca9d5-5f87-4bf2-9f54-43d8c7ffaa11',
        'X-Token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZWVlY2E5ZDUtNWY4Ny00YmYyLTlmNTQtNDNkOGM3ZmZhYTExIiwiY2hhdF9pZCI6ImNoYXQtYmM5NWVkYmMtZjA0Ni00NzJlLTk0MWYtMzU5NmU5MDAxOWIxIiwicGxhdGZvcm0iOiJ6YWkifQ.ArtAJkRtPlzgbFAbygVPSu75Vdq_fTrLEdLkU1Mf6ME',
        'X-Z-AI-From': 'Z',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Say OK' }],
        thinking: { type: 'disabled' },
      }),
    })
    apiReachable = `status_${resp.status}`
    const text = await resp.text()
    dnsResult = text.substring(0, 200)
  } catch (err: any) {
    apiReachable = 'failed'
    apiError = err?.message || String(err)
    if (err?.cause) {
      apiError += ` | cause: ${err.cause.message || err.cause.code || JSON.stringify(err.cause)}`
    }
  }

  // Also try DNS resolution
  try {
    const { lookup } = await import('dns').then(m => m.promises ? m : import('dns/promises'))
    const result = await (await import('dns/promises')).lookup('internal-api.z.ai')
    dnsResult = `DNS: ${result.address} (family: ${result.family})`
  } catch (dnsErr: any) {
    dnsResult = `DNS failed: ${dnsErr.message}`
  }

  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    AI_API_REACHABLE: apiReachable,
    AI_API_ERROR: apiError || undefined,
    DNS_INFO: dnsResult,
  })
}
