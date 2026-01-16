# Phase 3: Auth + Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user authentication (Google/GitHub OAuth) and enable chat history persistence, library view, and settings pages.

**Architecture:** NextAuth.js v5 for authentication with Prisma adapter. Server components fetch user-specific data. Sidebar navigation links to new pages. Tools use authenticated userId instead of TEMP_USER_ID.

**Tech Stack:** NextAuth.js v5, Prisma adapter, Next.js App Router, shadcn/ui components

---

## Task 1: Install NextAuth.js and Prisma Adapter

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

Run:
```bash
npm install next-auth@beta @auth/prisma-adapter
```

**Step 2: Verify installation**

Run: `cat package.json | grep -E '"next-auth|@auth"'`
Expected: Both packages listed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install next-auth and prisma adapter"
```

---

## Task 2: Add Auth Schema to Prisma

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add NextAuth models to schema**

Add after the User model:

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

**Step 2: Update User model to include relations**

Modify the User model to add:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?

  accounts      Account[]
  sessions      Session[]
  achievements  Achievement[]
  preferences   Preference?
  conversations Conversation[]
  resumes       GeneratedResume[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

**Step 3: Run migration**

Run: `npx prisma migrate dev --name add_auth_tables`
Expected: Migration created and applied

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add nextauth schema tables"
```

---

## Task 3: Create Auth Configuration

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

**Step 1: Create auth configuration**

Create `lib/auth.ts`:

```typescript
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

**Step 2: Create API route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

**Step 3: Add types for session**

Create `types/next-auth.d.ts`:

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

**Step 4: Update .env.example**

Add to `.env.example`:

```
# Auth
AUTH_SECRET=your-auth-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**Step 5: Commit**

```bash
git add lib/auth.ts app/api/auth types/next-auth.d.ts .env.example
git commit -m "feat: configure nextauth with google and github providers"
```

---

## Task 4: Create Login Page

**Files:**
- Create: `app/login/page.tsx`
- Create: `components/auth/LoginButtons.tsx`

**Step 1: Create login buttons component**

Create `components/auth/LoginButtons.tsx`:

```typescript
'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LoginButtons() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => signIn('google', { callbackUrl: '/' })}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => signIn('github', { callbackUrl: '/' })}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        Continue with GitHub
      </Button>
    </div>
  );
}
```

**Step 2: Create login page**

Create `app/login/page.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginButtons } from '@/components/auth/LoginButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Resume Tailor AI</CardTitle>
          <CardDescription>
            Sign in to create tailored resumes from your achievement library
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <LoginButtons />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/login components/auth
git commit -m "feat: add login page with oauth buttons"
```

---

## Task 5: Add Auth Middleware

**Files:**
- Create: `middleware.ts`

**Step 1: Create middleware for protected routes**

Create `middleware.ts` in project root:

```typescript
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
```

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware for protected routes"
```

---

## Task 6: Update Tools to Use Authenticated User

**Files:**
- Modify: `lib/agent/tools/utils.ts`
- Modify: `app/api/chat/route.ts`

**Step 1: Update utils to accept userId parameter**

Modify `lib/agent/tools/utils.ts` - replace getTempUserId:

```typescript
// User ID is now passed via tool context
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string) {
  currentUserId = userId;
}

export function getCurrentUserId(): string {
  if (!currentUserId) {
    throw new Error('User ID not set. Ensure auth middleware is working.');
  }
  return currentUserId;
}

// Keep getTempUserId for backward compatibility during transition
export function getTempUserId(): string {
  return getCurrentUserId();
}
```

**Step 2: Update chat route to set user context**

Modify `app/api/chat/route.ts` to include auth:

```typescript
import { createAgentUIStreamResponse } from 'ai';
import { resumeAgent } from '@/lib/agent';
import { auth } from '@/lib/auth';
import { setCurrentUserId } from '@/lib/agent/tools/utils';

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Set the current user ID for tools to use
  setCurrentUserId(session.user.id);

  const { messages } = await req.json();

  return createAgentUIStreamResponse({
    agent: resumeAgent,
    input: messages,
  });
}
```

**Step 3: Commit**

```bash
git add lib/agent/tools/utils.ts app/api/chat/route.ts
git commit -m "feat: use authenticated user id in agent tools"
```

---

## Task 7: Add User Menu to Sidebar

**Files:**
- Modify: `components/layout/AppSidebar.tsx`
- Create: `components/auth/UserMenu.tsx`

**Step 1: Create UserMenu component**

Create `components/auth/UserMenu.tsx`:

```typescript
'use client';

import { signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left text-sm">
          <p className="font-medium truncate">{user.name}</p>
          <p className="text-muted-foreground text-xs truncate">{user.email}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          Profile (Coming soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 2: Install avatar and dropdown components**

Run:
```bash
npx shadcn@latest add avatar dropdown-menu
```

**Step 3: Update AppSidebar to show UserMenu**

Update the SidebarFooter in `components/layout/AppSidebar.tsx` to accept session:

```typescript
'use client';

import { useSession } from 'next-auth/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { MessageSquarePlus, Library, Settings } from 'lucide-react';
import { UserMenu } from '@/components/auth/UserMenu';
import Link from 'next/link';

export function AppSidebar() {
  const { data: session } = useSession();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Resume Tailor AI</h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <MessageSquarePlus className="h-4 w-4" />
                    <span>New Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>History</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span className="text-muted-foreground text-sm">No conversations yet</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/library">
                <Library className="h-4 w-4" />
                <span>Library</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {session?.user && (
          <div className="mt-2 border-t pt-2">
            <UserMenu user={session.user} />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
```

**Step 4: Wrap app with SessionProvider**

Update `app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Resume Tailor AI',
  description: 'AI-powered resume tailoring from your achievement library',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <main className="flex-1 flex flex-col">{children}</main>
            </div>
          </SidebarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

**Step 5: Commit**

```bash
git add components/auth/UserMenu.tsx components/layout/AppSidebar.tsx app/layout.tsx
git commit -m "feat: add user menu with sign out to sidebar"
```

---

## Task 8: Create Library Page

**Files:**
- Create: `app/library/page.tsx`
- Create: `components/library/AchievementList.tsx`
- Create: `components/library/AchievementCard.tsx`
- Create: `app/api/library/route.ts`

**Step 1: Create API route for library**

Create `app/api/library/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const achievements = await prisma.achievement.findMany({
    where: { userId: session.user.id },
    orderBy: [{ company: 'asc' }, { startDate: 'desc' }],
  });

  return NextResponse.json({ achievements });
}
```

**Step 2: Create AchievementCard component**

Create `components/library/AchievementCard.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AchievementCardProps {
  achievement: {
    id: string;
    company: string;
    title: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
    text: string;
    tags: string[];
  };
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const dateRange = [formatDate(achievement.startDate), formatDate(achievement.endDate) || 'Present']
    .filter(Boolean)
    .join(' - ');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{achievement.company}</CardTitle>
            <p className="text-sm text-muted-foreground">{achievement.title}</p>
          </div>
          {dateRange && (
            <span className="text-xs text-muted-foreground">{dateRange}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">{achievement.text}</p>
        <div className="flex flex-wrap gap-1">
          {achievement.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Install badge component**

Run: `npx shadcn@latest add badge`

**Step 4: Create AchievementList component**

Create `components/library/AchievementList.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AchievementCard } from './AchievementCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Achievement {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  text: string;
  tags: string[];
}

export function AchievementList() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/library')
      .then((res) => res.json())
      .then((data) => {
        setAchievements(data.achievements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No achievements in your library yet. Start a chat to add your resume.
        </p>
      </div>
    );
  }

  // Group by company
  const grouped = achievements.reduce<Record<string, Achievement[]>>((acc, ach) => {
    if (!acc[ach.company]) acc[ach.company] = [];
    acc[ach.company].push(ach);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([company, items]) => (
        <div key={company}>
          <h2 className="text-lg font-semibold mb-4">{company}</h2>
          <div className="space-y-4">
            {items.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 5: Install skeleton component**

Run: `npx shadcn@latest add skeleton`

**Step 6: Create library page**

Create `app/library/page.tsx`:

```typescript
import { AchievementList } from '@/components/library/AchievementList';

export default function LibraryPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Achievement Library</h1>
        <AchievementList />
      </div>
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add app/library app/api/library components/library
git commit -m "feat: add library page to view achievements"
```

---

## Task 9: Create Settings Page

**Files:**
- Create: `app/settings/page.tsx`
- Create: `components/settings/PreferencesForm.tsx`
- Create: `app/api/preferences/route.ts`

**Step 1: Create API route for preferences**

Create `app/api/preferences/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prefs = await prisma.preference.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    preferences: prefs || {
      includeSummary: true,
      includeRoleSummaries: true,
      boldPattern: 'action_and_kpi',
      format: 'company_location_dates',
    },
  });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const prefs = await prisma.preference.upsert({
    where: { userId: session.user.id },
    update: body,
    create: {
      userId: session.user.id,
      ...body,
    },
  });

  return NextResponse.json({ preferences: prefs });
}
```

**Step 2: Create PreferencesForm component**

Create `components/settings/PreferencesForm.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Preferences {
  includeSummary: boolean;
  includeRoleSummaries: boolean;
  boldPattern: string;
  format: string;
}

export function PreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/preferences')
      .then((res) => res.json())
      .then((data) => {
        setPreferences(data.preferences);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    setSaving(false);
  };

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!preferences) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume Preferences</CardTitle>
        <CardDescription>Customize how your resumes are generated</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Include Summary</Label>
            <p className="text-sm text-muted-foreground">
              Add a professional summary section at the top
            </p>
          </div>
          <Switch
            checked={preferences.includeSummary}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, includeSummary: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Include Role Summaries</Label>
            <p className="text-sm text-muted-foreground">
              Add a one-line summary under each role
            </p>
          </div>
          <Switch
            checked={preferences.includeRoleSummaries}
            onCheckedChange={(checked) =>
              setPreferences({ ...preferences, includeRoleSummaries: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Bold Pattern</Label>
          <Select
            value={preferences.boldPattern}
            onValueChange={(value) =>
              setPreferences({ ...preferences, boldPattern: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="action_only">Action only</SelectItem>
              <SelectItem value="action_and_kpi">Action and KPI</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            How to bold achievement bullets
          </p>
        </div>

        <div className="space-y-2">
          <Label>Header Format</Label>
          <Select
            value={preferences.format}
            onValueChange={(value) =>
              setPreferences({ ...preferences, format: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company_location_dates">Company | Location | Dates</SelectItem>
              <SelectItem value="title_company_dates">Title | Company | Dates</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            How role headers are formatted
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Install required components**

Run:
```bash
npx shadcn@latest add switch select label
```

**Step 4: Create settings page**

Create `app/settings/page.tsx`:

```typescript
import { PreferencesForm } from '@/components/settings/PreferencesForm';

export default function SettingsPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <PreferencesForm />
      </div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add app/settings app/api/preferences components/settings
git commit -m "feat: add settings page with preferences form"
```

---

## Task 10: Implement Chat History Persistence

**Files:**
- Modify: `app/api/chat/route.ts`
- Create: `app/api/conversations/route.ts`
- Create: `app/api/conversations/[id]/route.ts`
- Modify: `components/layout/AppSidebar.tsx`
- Create: `components/layout/ConversationList.tsx`

**Step 1: Create conversations API routes**

Create `app/api/conversations/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, messages } = await req.json();

  const conversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      title: title || 'New conversation',
      messages: messages || [],
    },
  });

  return NextResponse.json({ conversation });
}
```

Create `app/api/conversations/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, messages } = await req.json();

  const conversation = await prisma.conversation.update({
    where: { id, userId: session.user.id },
    data: {
      ...(title && { title }),
      ...(messages && { messages }),
    },
  });

  return NextResponse.json({ conversation });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.conversation.delete({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
```

**Step 2: Create ConversationList component**

Create `components/layout/ConversationList.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/conversations')
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations || []));
  }, [pathname]);

  if (conversations.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled>
          <span className="text-muted-foreground text-sm">No conversations yet</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Group by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const grouped = conversations.reduce<Record<string, Conversation[]>>(
    (acc, conv) => {
      const date = new Date(conv.updatedAt);
      let key = 'Older';
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(conv);
      return acc;
    },
    {}
  );

  return (
    <>
      {['Today', 'Yesterday', 'Older'].map(
        (period) =>
          grouped[period] && (
            <div key={period}>
              <p className="text-xs text-muted-foreground px-2 py-1">{period}</p>
              {grouped[period].map((conv) => (
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      pathname === `/chat/${conv.id}` && 'bg-accent'
                    )}
                  >
                    <Link href={`/chat/${conv.id}`}>
                      <MessageSquare className="h-4 w-4" />
                      <span className="truncate">{conv.title || 'Untitled'}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </div>
          )
      )}
    </>
  );
}
```

**Step 3: Update AppSidebar to use ConversationList**

Update the History section in `components/layout/AppSidebar.tsx`:

```typescript
import { ConversationList } from './ConversationList';

// In the SidebarContent, replace the History group:
<SidebarGroup>
  <SidebarGroupLabel>History</SidebarGroupLabel>
  <SidebarGroupContent>
    <SidebarMenu>
      <ConversationList />
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

**Step 4: Create conversation page**

Create `app/chat/[id]/page.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChatContainer } from '@/components/chat/ChatContainer';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect('/login');
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!conversation) {
    redirect('/');
  }

  return <ChatContainer conversationId={id} initialMessages={conversation.messages as never[]} />;
}
```

**Step 5: Update ChatContainer to support persistence**

This requires updating `components/chat/ChatContainer.tsx` to accept `conversationId` and `initialMessages` props and save messages to the API.

**Step 6: Commit**

```bash
git add app/api/conversations app/chat components/layout/ConversationList.tsx
git commit -m "feat: add chat history persistence"
```

---

## Task 11: Verify Build and Final Cleanup

**Files:**
- Various cleanup

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test auth flow locally**

1. Set up OAuth credentials in Google Cloud Console and GitHub Developer Settings
2. Add credentials to `.env.local`
3. Run `npm run dev`
4. Navigate to `http://localhost:3000`
5. Should redirect to `/login`
6. Sign in with Google or GitHub
7. Should redirect back to chat

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete phase 3 - auth and persistence"
```

---

## Summary

Phase 3 adds:
1. **Authentication** - Google and GitHub OAuth via NextAuth.js
2. **Protected Routes** - Middleware redirects unauthenticated users to login
3. **User-Specific Data** - All tools use authenticated user ID
4. **Library Page** - View and browse achievements at `/library`
5. **Settings Page** - Configure resume preferences at `/settings`
6. **Chat History** - Conversations persist and appear in sidebar
7. **User Menu** - Sign out and profile access in sidebar footer

After this phase, users can:
- Sign in with Google or GitHub
- Have their achievement library persist across sessions
- View chat history in the sidebar
- Browse their achievement library
- Configure resume preferences
