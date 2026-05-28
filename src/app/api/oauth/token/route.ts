import crypto from 'node:crypto'
import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''
  let params: URLSearchParams

  if (contentType.includes('application/x-www-form-urlencoded')) {
    params = new URLSearchParams(await request.text())
  } else {
    try {
      const body = await request.json() as Record<string, string>
      params = new URLSearchParams(body)
    } catch {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }
  }

  const grantType = params.get('grant_type')
  const code = params.get('code')
  const codeVerifier = params.get('code_verifier')

  if (grantType !== 'authorization_code') {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }

  if (!code || !codeVerifier) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing code or code_verifier' },
      { status: 400 }
    )
  }

  const signingSecret = process.env.OAUTH_SIGNING_SECRET
  if (!signingSecret) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const secret = new TextEncoder().encode(signingSecret)

  let payload: { apiKey: string; codeChallenge: string }
  try {
    const { payload: p } = await jwtVerify(code, secret)
    payload = p as { apiKey: string; codeChallenge: string }
  } catch {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
      { status: 400 }
    )
  }

  // PKCE verification: SHA-256(code_verifier) must equal codeChallenge
  const computed = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  if (computed !== payload.codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'PKCE verification failed' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    access_token: payload.apiKey,
    token_type: 'bearer',
    expires_in: 86400,
  })
}
