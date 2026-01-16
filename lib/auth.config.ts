import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

// Edge-compatible auth configuration (no Prisma)
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Allow auth API routes
      if (pathname.startsWith('/api/auth')) {
        return true;
      }

      // Redirect logged-in users away from login page
      if (isLoggedIn && pathname === '/login') {
        return Response.redirect(new URL('/', nextUrl));
      }

      // Allow login page for unauthenticated users
      if (pathname === '/login') {
        return true;
      }

      // Require authentication for all other paths
      return isLoggedIn;
    },
    session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
