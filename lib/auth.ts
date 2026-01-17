import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

// Full auth configuration with Prisma adapter (Node.js only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma as any),
  // Use JWT sessions for Edge runtime compatibility
  session: { strategy: 'jwt' },
  debug: process.env.AUTH_DEBUG === 'true',
});
