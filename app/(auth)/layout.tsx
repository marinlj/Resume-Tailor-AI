import { SessionProvider } from 'next-auth/react';

// Auth pages have a minimal layout without the sidebar
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
