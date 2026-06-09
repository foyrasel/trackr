import { NextRequest, NextResponse } from 'next/server'

/**
 * AI Proxy Endpoint
 *
 * This endpoint proxies AI chat completion requests to the Z.ai internal API.
 * It only works when running inside the Z.ai sandbox (where internal-api.z.ai is reachable).
 *
 * The Vercel deployment calls this endpoint through the Z.ai preview URL to get AI results.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verify this is called with a secret key to prevent abuse
    const proxyKey = request.headers.get('x-proxy-key')
    if (proxyKey !== 'trackr-ai-proxy-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the Z.ai internal API directly using fetch
    // This works because we're running inside the Z.ai sandbox
    const config = {
      baseUrl: 'https://internal-api.z.ai/v1',
      apiKey: 'Z.ai',
      chatId: 'chat-bc95edbc-f046-472e-941f-3596e90019b1',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZWVlY2E5ZDUtNWY4Ny00YmYyLTlmNTQtNDNkOGM3ZmZhYTExIiwiY2hhdF9pZCI6ImNoYXQtYmM5NWVkYmMtZjA0Ni00NzJlLTk0MWYtMzU5NmU5MDAxOWIxIiwicGxhdGZvcm0iOiJ6YWkifQ.ArtAJkRtPlzgbFAbygVPSu75Vdq_fTrLEdLkU1Mf6ME',
      userId: 'eeeca9d5-5f87-4bf2-9f54-43d8c7ffaa11',
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Chat-Id': config.chatId,
        'X-User-Id': config.userId,
        'X-Token': config.token,
        'X-Z-AI-From': 'Z',
      },
      body: JSON.stringify({
        ...body,
        thinking: body.thinking || { type: 'disabled' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[AI Proxy] Error:', error.message)
    return NextResponse.json(
      { error: 'Proxy request failed', details: error.message },
      { status: 500 }
    )
  }
}
