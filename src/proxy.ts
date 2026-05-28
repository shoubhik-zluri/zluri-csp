import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_DOMAIN = 'zluri.com'

export async function proxy(request: NextRequest) {
  // In mock mode, skip all auth checks
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    const { pathname } = request.nextUrl
    // Redirect /login to /dashboard in mock mode
    if (pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not add logic between createServerClient and getUser
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes that don't require auth
  const hasBearerToken = request.headers.get('authorization')?.startsWith('Bearer ')

  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/inngest') ||
    pathname.startsWith('/api/mcp') ||
    pathname.startsWith('/.well-known/') ||
    pathname.startsWith('/oauth/') ||
    pathname.startsWith('/api/oauth/') ||
    // API routes with Bearer tokens handle their own auth via getAuthenticatedClient
    (!!hasBearerToken && pathname.startsWith('/api/'))

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Enforce @zluri.com domain (only in production when env var is explicitly set)
    if (process.env.ENFORCE_EMAIL_DOMAIN === 'true' && user.email && !user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'unauthorized_domain')
      return NextResponse.redirect(url)
    }

    // Redirect root to dashboard
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Role guard: admin-only routes
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/import')
    if (isAdminRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
      }
    }

    // Redirect /login to /dashboard if already authenticated
    if (pathname.startsWith('/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
