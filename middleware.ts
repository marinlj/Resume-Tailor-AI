import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

// Use NextAuth with Edge-compatible config (no Prisma adapter)
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|resumes).*)'],
};
