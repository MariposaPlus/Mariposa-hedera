import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Temporarily disable middleware for debugging
  console.log(`🔍 Middleware: ${request.nextUrl.pathname} - BYPASSED FOR DEBUGGING`);
  return NextResponse.next();
  
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = [
    '/',
    '/api/auth/send-otp',
    '/api/auth/verify-otp', 
    '/api/auth/complete-onboarding'
  ];

  // Check if the path is public
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected authenticated routes
  const protectedPaths = [
    '/dashboard',
    '/pipeline', 
    '/trading',
    '/cards',
    '/analytics',
    '/activity',
    '/agents',
    '/agent',
    '/chat'
  ];
  
  const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedRoute) {
    const token = request.cookies.get('mariposa_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.nextUrl.searchParams.get('token');

    console.log(`🔍 Middleware: ${pathname}, Token found: ${!!token}`);

    if (!token) {
      console.log(`🚫 Middleware: No token found, redirecting to /`);
      // Redirect to home page for authentication
      const url = new URL('/', request.url);
      return NextResponse.redirect(url);
    }
    
    console.log(`✅ Middleware: Token found, allowing access to ${pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 