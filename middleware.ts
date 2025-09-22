// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // For now, just pass through all requests and let the components handle authentication
  // This avoids potential database connection issues in middleware
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/moderator/:path*', '/profile/:path*', '/polls/create/:path*'],
}