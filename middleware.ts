// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Cache role checks to avoid repeated database calls
const roleCache = new Map<string, { role: string; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function getUserRole(supabase: any, userId: string): Promise<string> {
  // Check cache first
  const cached = roleCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.role
  }

  try {
    const { data, error } = await supabase
      .rpc('get_user_role', { user_uuid: userId })
    
    if (error) {
      console.error('Error checking user role:', error)
      return 'user'
    }
    
    const userRole = data || 'user'
    
    // Cache the result
    roleCache.set(userId, { role: userRole, timestamp: Date.now() })
    
    return userRole
  } catch (error) {
    console.error('Exception checking user role:', error)
    return 'user'
  }
}

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const role = await getUserRole(supabase, userId)
  return role === 'admin'
}

async function isModerator(supabase: any, userId: string): Promise<boolean> {
  const role = await getUserRole(supabase, userId)
  return role === 'moderator' || role === 'admin'
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

  // Protect moderator routes
  if (request.nextUrl.pathname.startsWith('/moderator')) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const isUserModerator = await isModerator(supabase, session.user.id)
    if (!isUserModerator) {
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
  matcher: ['/admin/:path*', '/moderator/:path*', '/profile/:path*', '/polls/create/:path*'],
}