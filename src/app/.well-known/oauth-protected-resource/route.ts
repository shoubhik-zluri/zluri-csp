export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zluri-csm.vercel.app'
  return Response.json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ['header', 'query'],
    scopes_supported: ['mcp'],
  })
}
