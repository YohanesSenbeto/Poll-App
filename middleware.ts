// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Cache admin checks to avoid repeated database calls
const adminCache = new Map<string, { isAdmin: boolean; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  // Check cache first
  const cached = adminCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.isAdmin
  }

  try {
    const { data, error } = await supabase
      .rpc('get_user_role', { user_id: userId })
    
    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }
    
    const isAdminResult = data === 'admin'
    
    // Cache the result
    adminCache.set(userId, { isAdmin: isAdminResult, timestamp: Date.now() })
    
    return isAdminResult
  } catch (error) {
    console.error('Exception checking admin status:', error)
    return false
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const isUserAdmin = await isAdmin(supabase, session.user.id)
    if (!isUserAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Protect authenticated-only routes
  const protectedRoutes = ['/profile', '/polls/create'];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/polls/create/:path*'],
}