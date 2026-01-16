import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';
  const isAuthApi = req.nextUrl.pathname.startsWith('/api/auth');

  // Allow auth API routes
  if (isAuthApi) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to home if already logged in and on login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|resumes).*)'],
};
