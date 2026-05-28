import crypto from 'node:crypto'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const redirectUris = (body.redirect_uris as string[] | undefined) ?? []
  const clientId =
    'zluri-mcp-' +
    crypto
      .createHash('sha256')
      .update(JSON.stringify(redirectUris))
      .digest('hex')
      .slice(0, 16)

  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      client_name: (body.client_name as string | undefined) ?? 'Zluri MCP Client',
    },
    { status: 201 }
  )
}
