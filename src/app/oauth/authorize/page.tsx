import { redirect } from 'next/navigation'
import { SignJWT } from 'jose'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'

async function submitConsent(formData: FormData) {
  'use server'

  const apiKey = ((formData.get('api_key') as string) ?? '').trim()
  const redirectUri = formData.get('redirect_uri') as string
  const state = (formData.get('state') as string) ?? ''
  const codeChallenge = formData.get('code_challenge') as string
  const codeChallengeMethod = (formData.get('code_challenge_method') as string) ?? 'S256'
  const clientId = (formData.get('client_id') as string) ?? ''
  const scope = (formData.get('scope') as string) ?? ''

  if (!apiKey || !redirectUri || !codeChallenge) {
    const q = new URLSearchParams({ redirect_uri: redirectUri, code_challenge: codeChallenge, client_id: clientId, state, scope, code_challenge_method: codeChallengeMethod, error: 'missing_params' })
    redirect(`/oauth/authorize?${q}`)
  }

  if (!apiKey.startsWith('zsk_')) {
    const q = new URLSearchParams({ redirect_uri: redirectUri, code_challenge: codeChallenge, client_id: clientId, state, scope, code_challenge_method: codeChallengeMethod, error: 'invalid_api_key' })
    redirect(`/oauth/authorize?${q}`)
  }

  const supabase = createAdminClient()
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  const { data } = await supabase
    .from('api_keys')
    .select('id')
    .eq('key_hash', keyHash)
    .single()

  if (!data) {
    const q = new URLSearchParams({ redirect_uri: redirectUri, code_challenge: codeChallenge, client_id: clientId, state, scope, code_challenge_method: codeChallengeMethod, error: 'invalid_api_key' })
    redirect(`/oauth/authorize?${q}`)
  }

  const signingSecret = process.env.OAUTH_SIGNING_SECRET
  if (!signingSecret) throw new Error('OAUTH_SIGNING_SECRET not configured')

  const secret = new TextEncoder().encode(signingSecret)
  const code = await new SignJWT({ apiKey, codeChallenge })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)

  const callbackUrl = new URL(redirectUri)
  callbackUrl.searchParams.set('code', code)
  if (state) callbackUrl.searchParams.set('state', state)
  redirect(callbackUrl.toString())
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const redirectUri = params.redirect_uri as string | undefined
  const state = (params.state as string) ?? ''
  const codeChallenge = params.code_challenge as string | undefined
  const codeChallengeMethod = (params.code_challenge_method as string) ?? 'S256'
  const clientId = (params.client_id as string) ?? ''
  const scope = (params.scope as string) ?? ''
  const error = params.error as string | undefined

  if (!redirectUri || !codeChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
          <h1 className="text-lg font-semibold text-gray-900">Invalid Request</h1>
          <p className="text-sm text-gray-500 mt-2">Missing required OAuth parameters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-md">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">Z</span>
            </div>
            <span className="text-sm font-medium text-gray-700">Zluri CSM</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Connect to Claude</h1>
          <p className="text-sm text-gray-500 mt-1">
            Authorize Claude Desktop to access your Zluri CSM workspace using your API key.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error === 'invalid_api_key'
              ? 'API key not found. Make sure you copy the full key from Settings.'
              : 'Something went wrong. Please try again.'}
          </div>
        )}

        <form action={submitConsent} className="space-y-4">
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="scope" value={scope} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="api_key">
              API Key
            </label>
            <input
              id="api_key"
              type="text"
              name="api_key"
              placeholder="zsk_..."
              required
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Copy your API key from{' '}
              <a
                href="/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Settings → API Keys
              </a>
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
          >
            Authorize
          </button>
        </form>
      </div>
    </div>
  )
}
