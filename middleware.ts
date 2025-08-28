import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createMiddlewareClient({ req: request, res: response })

    // Refresh session if expired
    const { data: { session } } = await supabase.auth.getSession()

    // Protect routes that require authentication
    if (request.nextUrl.pathname.startsWith('/polls/create') && !session) {
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect authenticated users away from auth pages
    if ((request.nextUrl.pathname.startsWith('/auth/login') || request.nextUrl.pathname.startsWith('/auth/register')) && session) {
      return NextResponse.redirect(new URL('/polls', request.url))
    }

    return response
  } catch (e) {
    console.error('Middleware error:', e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/polls/create', '/auth/login', '/auth/register'],
}