# Phase 1: Agent Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core resume tailoring agent with tools, database schema, and streaming API endpoint.

**Architecture:** Single ToolLoopAgent (AI SDK 6) with tools for library management, job research, matching, and resume generation. PostgreSQL database via Prisma for persistence. Streaming API route for chat.

**Tech Stack:** Next.js 15, AI SDK 6, Prisma, PostgreSQL, Zod, docx library

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/marinljubas/Projects/Resume-Tailor-AI
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

When prompted, accept defaults. If directory not empty, allow overwrite of existing files.

**Step 2: Install core dependencies**

Run:
```bash
npm install ai @ai-sdk/anthropic @ai-sdk/react zod
npm install @prisma/client docx react-markdown
npm install -D prisma @types/node
```

**Step 3: Create environment file**

Create `.env.example`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/resume_tailor_ai"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# NextAuth (Phase 3)
# NEXTAUTH_SECRET=""
# NEXTAUTH_URL="http://localhost:3000"
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
```

**Step 4: Create `.env.local` from example**

Run:
```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual `DATABASE_URL` and `ANTHROPIC_API_KEY`.

**Step 5: Verify setup**

Run:
```bash
npm run dev
```

Expected: Dev server starts on http://localhost:3000

**Step 6: Commit**

Run:
```bash
git init
git add .
git commit -m "chore: initialize Next.js project with dependencies"
```

---

## Task 2: Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

**Step 1: Initialize Prisma**

Run:
```bash
npx prisma init
```

**Step 2: Write database schema**

Replace `prisma/schema.prisma` with:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?

  achievements  Achievement[]
  preferences   Preference?
  conversations Conversation[]
  resumes       GeneratedResume[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Achievement {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  company   String
  title     String
  location  String?
  startDate DateTime?
  endDate   DateTime?

  text      String
  tags      String[]
  metrics   Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model Preference {
  id                   String  @id @default(cuid())
  userId               String  @unique
  user                 User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  includeSummary       Boolean @default(true)
  includeRoleSummaries Boolean @default(true)
  boldPattern          String  @default("action_and_kpi")
  format               String  @default("company_location_dates")

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  title     String?
  messages  Json     @default("[]")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model GeneratedResume {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversationId String?

  targetCompany  String
  targetRole     String
  markdown       String
  docxUrl        String?

  createdAt      DateTime @default(now())

  @@index([userId])
}
```

**Step 3: Create Prisma client singleton**

Create `lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Step 4: Run migration**

Run:
```bash
npx prisma migrate dev --name init
```

Expected: Migration created and applied successfully.

**Step 5: Generate Prisma client**

Run:
```bash
npx prisma generate
```

**Step 6: Verify with Prisma Studio**

Run:
```bash
npx prisma studio
```

Expected: Opens browser at http://localhost:5555 showing empty tables.

**Step 7: Commit**

Run:
```bash
git add .
git commit -m "feat: add Prisma schema with User, Achievement, Preference, Conversation, GeneratedResume models"
```

---

## Task 3: Zod Schemas for Tools

**Files:**
- Create: `lib/agent/schemas.ts`

**Step 1: Create tool input/output schemas**

Create `lib/agent/schemas.ts`:
```typescript
import { z } from 'zod';

// Library Status
export const libraryStatusOutputSchema = z.object({
  exists: z.boolean(),
  count: z.number(),
  lastUpdated: z.string().nullable(),
});

export type LibraryStatusOutput = z.infer<typeof libraryStatusOutputSchema>;

// Achievement
export const achievementInputSchema = z.object({
  company: z.string().describe('Company name'),
  title: z.string().describe('Job title'),
  location: z.string().optional().describe('Location (city, state/country)'),
  startDate: z.string().optional().describe('Start date (YYYY-MM format)'),
  endDate: z.string().optional().describe('End date (YYYY-MM format) or "present"'),
  text: z.string().describe('The achievement bullet text'),
  tags: z.array(z.string()).describe('Tags for matching (e.g., leadership, metrics, cost-reduction)'),
});

export type AchievementInput = z.infer<typeof achievementInputSchema>;

export const achievementOutputSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  text: z.string(),
  tags: z.array(z.string()),
});

export type AchievementOutput = z.infer<typeof achievementOutputSchema>;

// Parse Resume
export const parseResumeInputSchema = z.object({
  text: z.string().describe('The full resume text to parse'),
});

export const parsedAchievementSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  text: z.string(),
  suggestedTags: z.array(z.string()),
});

export type ParsedAchievement = z.infer<typeof parsedAchievementSchema>;

// Job Description
export const parseJDInputSchema = z.object({
  text: z.string().describe('The job description text'),
});

export const requirementSchema = z.object({
  text: z.string(),
  type: z.enum(['must_have', 'nice_to_have']),
  tags: z.array(z.string()),
});

export type Requirement = z.infer<typeof requirementSchema>;

export const parsedJDOutputSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string().nullable(),
  requirements: z.array(requirementSchema),
  keywords: z.array(z.string()),
  roleType: z.string(),
});

export type ParsedJDOutput = z.infer<typeof parsedJDOutputSchema>;

// Success Profile
export const successProfileSchema = z.object({
  company: z.string(),
  role: z.string(),
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()),
  keyThemes: z.array(z.object({
    theme: z.string(),
    tags: z.array(z.string()),
  })),
  terminology: z.array(z.object({
    theirTerm: z.string(),
    yourTerm: z.string(),
  })),
});

export type SuccessProfile = z.infer<typeof successProfileSchema>;

// Matching
export const matchAchievementsInputSchema = z.object({
  profileJson: z.string().describe('JSON string of the success profile'),
});

export const rankedMatchSchema = z.object({
  achievementId: z.string(),
  achievementText: z.string(),
  company: z.string(),
  title: z.string(),
  score: z.number(),
  matchedRequirements: z.array(z.string()),
});

export type RankedMatch = z.infer<typeof rankedMatchSchema>;

export const gapSchema = z.object({
  requirement: z.string(),
  bestMatchScore: z.number(),
  bestMatchText: z.string().nullable(),
});

export type Gap = z.infer<typeof gapSchema>;

export const matchOutputSchema = z.object({
  matches: z.array(rankedMatchSchema),
  gaps: z.array(gapSchema),
});

export type MatchOutput = z.infer<typeof matchOutputSchema>;

// Resume Generation
export const generateResumeInputSchema = z.object({
  matchesJson: z.string().describe('JSON string of ranked matches to include'),
  targetCompany: z.string().describe('Target company name'),
  targetRole: z.string().describe('Target role title'),
  summary: z.string().optional().describe('Optional professional summary'),
});

export const generateResumeOutputSchema = z.object({
  id: z.string(),
  markdown: z.string(),
});

export type GenerateResumeOutput = z.infer<typeof generateResumeOutputSchema>;

// DOCX Generation
export const generateDocxInputSchema = z.object({
  resumeId: z.string().describe('ID of the generated resume'),
});

export const generateDocxOutputSchema = z.object({
  downloadUrl: z.string(),
});

export type GenerateDocxOutput = z.infer<typeof generateDocxOutputSchema>;

// Preferences
export const preferencesSchema = z.object({
  includeSummary: z.boolean(),
  includeRoleSummaries: z.boolean(),
  boldPattern: z.enum(['action_only', 'action_and_kpi']),
  format: z.enum(['company_location_dates', 'title_company_dates']),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const updatePreferencesInputSchema = preferencesSchema.partial();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;
```

**Step 2: Commit**

Run:
```bash
git add .
git commit -m "feat: add Zod schemas for agent tool inputs/outputs"
```

---

## Task 4: Library Management Tools

**Files:**
- Create: `lib/agent/tools/library.ts`

**Step 1: Create library tools**

Create `lib/agent/tools/library.ts`:
```typescript
import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import {
  libraryStatusOutputSchema,
  achievementInputSchema,
  achievementOutputSchema,
  parseResumeInputSchema,
  parsedAchievementSchema,
} from '../schemas';
import { z } from 'zod';

// Temporary user ID until auth is implemented
const getTempUserId = () => process.env.TEMP_USER_ID || 'temp-user-id';

export const getLibraryStatus = tool({
  description: 'Check if the user has a master library of achievements and get stats',
  parameters: z.object({}),
  execute: async () => {
    const userId = getTempUserId();

    const [count, latest] = await Promise.all([
      prisma.achievement.count({ where: { userId } }),
      prisma.achievement.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    return {
      exists: count > 0,
      count,
      lastUpdated: latest?.updatedAt.toISOString() ?? null,
    };
  },
});

export const getAchievements = tool({
  description: 'Get achievements from the library, optionally filtered by tags',
  parameters: z.object({
    tags: z.array(z.string()).optional().describe('Filter by tags (OR logic)'),
    company: z.string().optional().describe('Filter by company name'),
  }),
  execute: async ({ tags, company }) => {
    const userId = getTempUserId();

    const where: any = { userId };

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (company) {
      where.company = { contains: company, mode: 'insensitive' };
    }

    const achievements = await prisma.achievement.findMany({
      where,
      orderBy: [{ company: 'asc' }, { startDate: 'desc' }],
    });

    return achievements.map((a) => ({
      id: a.id,
      company: a.company,
      title: a.title,
      location: a.location,
      startDate: a.startDate?.toISOString().slice(0, 7) ?? null,
      endDate: a.endDate?.toISOString().slice(0, 7) ?? null,
      text: a.text,
      tags: a.tags,
    }));
  },
});

export const addAchievement = tool({
  description: 'Add a new achievement to the master library',
  parameters: achievementInputSchema,
  execute: async (input) => {
    const userId = getTempUserId();

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@temp.local` },
    });

    const achievement = await prisma.achievement.create({
      data: {
        userId,
        company: input.company,
        title: input.title,
        location: input.location ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate === 'present' ? null : input.endDate ? new Date(input.endDate) : null,
        text: input.text,
        tags: input.tags,
      },
    });

    return {
      id: achievement.id,
      company: achievement.company,
      title: achievement.title,
      location: achievement.location,
      startDate: achievement.startDate?.toISOString().slice(0, 7) ?? null,
      endDate: achievement.endDate?.toISOString().slice(0, 7) ?? null,
      text: achievement.text,
      tags: achievement.tags,
    };
  },
});

export const addMultipleAchievements = tool({
  description: 'Add multiple achievements to the library at once (used after parsing a resume)',
  parameters: z.object({
    achievements: z.array(achievementInputSchema).describe('Array of achievements to add'),
  }),
  execute: async ({ achievements }) => {
    const userId = getTempUserId();

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@temp.local` },
    });

    const created = await prisma.achievement.createMany({
      data: achievements.map((a) => ({
        userId,
        company: a.company,
        title: a.title,
        location: a.location ?? null,
        startDate: a.startDate ? new Date(a.startDate) : null,
        endDate: a.endDate === 'present' ? null : a.endDate ? new Date(a.endDate) : null,
        text: a.text,
        tags: a.tags,
      })),
    });

    return {
      added: created.count,
      message: `Successfully added ${created.count} achievements to your library.`,
    };
  },
});

export const updateAchievement = tool({
  description: 'Update an existing achievement in the library',
  parameters: z.object({
    id: z.string().describe('Achievement ID to update'),
    updates: achievementInputSchema.partial().describe('Fields to update'),
  }),
  execute: async ({ id, updates }) => {
    const userId = getTempUserId();

    const achievement = await prisma.achievement.update({
      where: { id, userId },
      data: {
        ...(updates.company && { company: updates.company }),
        ...(updates.title && { title: updates.title }),
        ...(updates.location !== undefined && { location: updates.location }),
        ...(updates.startDate && { startDate: new Date(updates.startDate) }),
        ...(updates.endDate && {
          endDate: updates.endDate === 'present' ? null : new Date(updates.endDate)
        }),
        ...(updates.text && { text: updates.text }),
        ...(updates.tags && { tags: updates.tags }),
      },
    });

    return {
      id: achievement.id,
      company: achievement.company,
      title: achievement.title,
      location: achievement.location,
      startDate: achievement.startDate?.toISOString().slice(0, 7) ?? null,
      endDate: achievement.endDate?.toISOString().slice(0, 7) ?? null,
      text: achievement.text,
      tags: achievement.tags,
    };
  },
});

export const deleteAchievement = tool({
  description: 'Delete an achievement from the library',
  parameters: z.object({
    id: z.string().describe('Achievement ID to delete'),
  }),
  execute: async ({ id }) => {
    const userId = getTempUserId();

    await prisma.achievement.delete({
      where: { id, userId },
    });

    return { deleted: true, id };
  },
});
```

**Step 2: Commit**

Run:
```bash
git add .
git commit -m "feat: add library management tools (getLibraryStatus, getAchievements, addAchievement, etc.)"
```

---

## Task 5: Research Tools

**Files:**
- Create: `lib/agent/tools/research.ts`

**Step 1: Create research tools**

Create `lib/agent/tools/research.ts`:
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import {
  parseJDInputSchema,
  parsedJDOutputSchema,
  successProfileSchema,
} from '../schemas';

export const parseJobDescription = tool({
  description: 'Parse a job description to extract requirements, keywords, and role information. Call this when user provides a job description.',
  parameters: parseJDInputSchema,
  execute: async ({ text }) => {
    // This tool returns structured data that the LLM will fill in
    // The actual parsing is done by the LLM's reasoning
    // We return a template that indicates what to extract
    return {
      instruction: 'Analyze the job description and extract the following. Return as JSON matching the schema.',
      schema: {
        company: 'string - company name',
        role: 'string - job title',
        location: 'string | null - work location',
        requirements: 'array of { text, type: "must_have" | "nice_to_have", tags: string[] }',
        keywords: 'string[] - technical terms, tools, methodologies',
        roleType: 'string - e.g., "IC", "Manager", "Technical", "Business"',
      },
      jobDescriptionText: text,
    };
  },
});

export const buildSuccessProfile = tool({
  description: 'Build a success profile from parsed job description. Call this after parseJobDescription to create a matching profile.',
  parameters: z.object({
    company: z.string().describe('Company name'),
    role: z.string().describe('Role title'),
    requirements: z.string().describe('JSON string of requirements array'),
    keywords: z.string().describe('JSON string of keywords array'),
    companyContext: z.string().optional().describe('Additional company context if available'),
  }),
  execute: async ({ company, role, requirements, keywords, companyContext }) => {
    const parsedRequirements = JSON.parse(requirements);
    const parsedKeywords = JSON.parse(keywords);

    const mustHave = parsedRequirements
      .filter((r: any) => r.type === 'must_have')
      .map((r: any) => r.text);

    const niceToHave = parsedRequirements
      .filter((r: any) => r.type === 'nice_to_have')
      .map((r: any) => r.text);

    // Extract unique tags from requirements
    const allTags = parsedRequirements.flatMap((r: any) => r.tags || []);
    const uniqueTags = [...new Set(allTags)];

    // Group by theme
    const themes = groupTagsByTheme(uniqueTags);

    return {
      company,
      role,
      mustHave,
      niceToHave,
      keyThemes: themes,
      terminology: [], // LLM will populate based on JD language
      keywords: parsedKeywords,
      companyContext: companyContext || null,
    };
  },
});

function groupTagsByTheme(tags: string[]): Array<{ theme: string; tags: string[] }> {
  const themeMap: Record<string, string[]> = {
    'Technical Skills': [],
    'Leadership': [],
    'Data & Analytics': [],
    'Product Management': [],
    'Communication': [],
    'Other': [],
  };

  const tagToTheme: Record<string, string> = {
    // Technical
    'engineering': 'Technical Skills',
    'technical': 'Technical Skills',
    'architecture': 'Technical Skills',
    'api': 'Technical Skills',
    'database': 'Technical Skills',
    'cloud': 'Technical Skills',
    'infrastructure': 'Technical Skills',

    // Leadership
    'leadership': 'Leadership',
    'management': 'Leadership',
    'mentoring': 'Leadership',
    'team-building': 'Leadership',
    'cross-functional': 'Leadership',

    // Data
    'data': 'Data & Analytics',
    'analytics': 'Data & Analytics',
    'metrics': 'Data & Analytics',
    'reporting': 'Data & Analytics',
    'a/b-testing': 'Data & Analytics',

    // Product
    'product': 'Product Management',
    'roadmap': 'Product Management',
    'strategy': 'Product Management',
    'prioritization': 'Product Management',
    'user-research': 'Product Management',

    // Communication
    'communication': 'Communication',
    'stakeholder': 'Communication',
    'presentation': 'Communication',
    'documentation': 'Communication',
  };

  for (const tag of tags) {
    const theme = tagToTheme[tag.toLowerCase()] || 'Other';
    themeMap[theme].push(tag);
  }

  return Object.entries(themeMap)
    .filter(([_, tags]) => tags.length > 0)
    .map(([theme, tags]) => ({ theme, tags }));
}
```

**Step 2: Commit**

Run:
```bash
git add .
git commit -m "feat: add research tools (parseJobDescription, buildSuccessProfile)"
```

---

## Task 6: Matching Tools

**Files:**
- Create: `lib/agent/tools/matching.ts`

**Step 1: Create matching tools**

Create `lib/agent/tools/matching.ts`:
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { matchAchievementsInputSchema, RankedMatch, Gap } from '../schemas';

const getTempUserId = () => process.env.TEMP_USER_ID || 'temp-user-id';

export const matchAchievements = tool({
  description: 'Match achievements from the library against a success profile. Returns ranked matches and identified gaps.',
  parameters: matchAchievementsInputSchema,
  execute: async ({ profileJson }) => {
    const userId = getTempUserId();
    const profile = JSON.parse(profileJson);

    // Get all user achievements
    const achievements = await prisma.achievement.findMany({
      where: { userId },
    });

    if (achievements.length === 0) {
      return {
        matches: [],
        gaps: profile.mustHave.map((req: string) => ({
          requirement: req,
          bestMatchScore: 0,
          bestMatchText: null,
        })),
        message: 'No achievements in library. Please add your resume first.',
      };
    }

    // Extract all requirement tags from profile
    const allRequiredTags = profile.keyThemes?.flatMap((t: any) => t.tags) || [];

    // Score each achievement
    const scoredAchievements = achievements.map((achievement) => {
      const tagOverlap = achievement.tags.filter((tag) =>
        allRequiredTags.some((reqTag: string) =>
          tag.toLowerCase().includes(reqTag.toLowerCase()) ||
          reqTag.toLowerCase().includes(tag.toLowerCase())
        )
      );

      // Simple scoring: percentage of required tags matched
      const score = allRequiredTags.length > 0
        ? (tagOverlap.length / allRequiredTags.length) * 100
        : 50; // Default score if no tags specified

      // Find which requirements this achievement addresses
      const matchedRequirements: string[] = [];
      for (const theme of profile.keyThemes || []) {
        const themeMatched = theme.tags.some((themeTag: string) =>
          achievement.tags.some((achTag) =>
            achTag.toLowerCase().includes(themeTag.toLowerCase()) ||
            themeTag.toLowerCase().includes(achTag.toLowerCase())
          )
        );
        if (themeMatched) {
          matchedRequirements.push(theme.theme);
        }
      }

      return {
        achievementId: achievement.id,
        achievementText: achievement.text,
        company: achievement.company,
        title: achievement.title,
        score: Math.round(score),
        matchedRequirements,
        tags: achievement.tags,
      };
    });

    // Sort by score descending
    scoredAchievements.sort((a, b) => b.score - a.score);

    // Identify gaps - requirements with no strong matches
    const gaps: Gap[] = [];
    for (const req of profile.mustHave || []) {
      const bestMatch = scoredAchievements.find((a) =>
        a.matchedRequirements.some((mr) =>
          req.toLowerCase().includes(mr.toLowerCase()) ||
          mr.toLowerCase().includes(req.toLowerCase())
        )
      );

      if (!bestMatch || bestMatch.score < 60) {
        gaps.push({
          requirement: req,
          bestMatchScore: bestMatch?.score || 0,
          bestMatchText: bestMatch?.achievementText || null,
        });
      }
    }

    // Return top matches (limit to reasonable number for resume)
    const topMatches: RankedMatch[] = scoredAchievements
      .filter((a) => a.score >= 40)
      .slice(0, 15)
      .map(({ achievementId, achievementText, company, title, score, matchedRequirements }) => ({
        achievementId,
        achievementText,
        company,
        title,
        score,
        matchedRequirements,
      }));

    return {
      matches: topMatches,
      gaps,
      summary: {
        totalAchievements: achievements.length,
        strongMatches: topMatches.filter((m) => m.score >= 80).length,
        goodMatches: topMatches.filter((m) => m.score >= 60 && m.score < 80).length,
        weakMatches: topMatches.filter((m) => m.score < 60).length,
        gapCount: gaps.length,
      },
    };
  },
});
```

**Step 2: Commit**

Run:
```bash
git add .
git commit -m "feat: add matching tool with tag-based scoring and gap detection"
```

---

## Task 7: Resume Generation Tools

**Files:**
- Create: `lib/agent/tools/generation.ts`
- Create: `lib/docx/generator.ts`

**Step 1: Create DOCX generator**

Create `lib/docx/generator.ts`:
```typescript
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
} from 'docx';

interface ResumeData {
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  location?: string;
  summary?: string;
  experience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets: string[];
  }>;
  skills?: string[];
  education?: Array<{
    school: string;
    degree: string;
    year?: string;
  }>;
}

export function parseMarkdownToResumeData(markdown: string): ResumeData {
  const lines = markdown.split('\n');

  const data: ResumeData = {
    name: '',
    email: '',
    experience: [],
    skills: [],
    education: [],
  };

  let currentSection = '';
  let currentExperience: any = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Name (h1)
    if (trimmed.startsWith('# ')) {
      data.name = trimmed.slice(2);
      continue;
    }

    // Contact info line
    if (trimmed.includes('@') && trimmed.includes('|')) {
      const parts = trimmed.split('|').map((p) => p.trim());
      for (const part of parts) {
        if (part.includes('@')) data.email = part;
        else if (part.match(/\(\d{3}\)/)) data.phone = part;
        else if (part.includes('linkedin')) data.linkedin = part;
        else if (part.match(/[A-Z][a-z]+,\s*[A-Z]{2}/)) data.location = part;
      }
      continue;
    }

    // Section headers (h2)
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.slice(3).toLowerCase();
      if (currentExperience) {
        data.experience.push(currentExperience);
        currentExperience = null;
      }
      continue;
    }

    // Experience entry (bold company/title line)
    if (currentSection.includes('experience') && trimmed.startsWith('**')) {
      if (currentExperience) {
        data.experience.push(currentExperience);
      }

      // Parse: **Company** | Location
      // Title, MM/YYYY - MM/YYYY
      const companyMatch = trimmed.match(/\*\*(.+?)\*\*/);
      const locationMatch = trimmed.match(/\|\s*(.+)/);

      currentExperience = {
        company: companyMatch?.[1] || '',
        title: '',
        location: locationMatch?.[1] || '',
        bullets: [],
      };
      continue;
    }

    // Title and dates line
    if (currentExperience && !currentExperience.title && trimmed && !trimmed.startsWith('-')) {
      const dateMatch = trimmed.match(/,\s*(\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{4}|Present)/i);
      if (dateMatch) {
        currentExperience.title = trimmed.split(',')[0];
        currentExperience.startDate = dateMatch[1];
        currentExperience.endDate = dateMatch[2];
      } else {
        currentExperience.title = trimmed;
      }
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') && currentExperience) {
      currentExperience.bullets.push(trimmed.slice(2));
      continue;
    }

    // Skills section
    if (currentSection.includes('skill') && trimmed && !trimmed.startsWith('#')) {
      // Handle comma-separated skills
      const skills = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      data.skills?.push(...skills);
      continue;
    }

    // Summary
    if (currentSection.includes('summary') && trimmed && !trimmed.startsWith('#')) {
      data.summary = (data.summary || '') + trimmed + ' ';
      continue;
    }
  }

  // Don't forget last experience
  if (currentExperience) {
    data.experience.push(currentExperience);
  }

  return data;
}

export function generateDocx(data: ResumeData): Document {
  const children: Paragraph[] = [];

  // Name
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.name,
          bold: true,
          size: 28,
          font: 'Cambria',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Contact info
  const contactParts = [data.email, data.phone, data.location, data.linkedin].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join(' | '),
            size: 20,
            font: 'Cambria',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Summary
  if (data.summary) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SUMMARY',
            bold: true,
            size: 22,
            font: 'Cambria',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.summary.trim(),
            size: 20,
            font: 'Cambria',
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Professional Experience
  if (data.experience.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PROFESSIONAL EXPERIENCE',
            bold: true,
            size: 22,
            font: 'Cambria',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    for (const exp of data.experience) {
      // Company and location
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.company,
              bold: true,
              size: 20,
              font: 'Cambria',
            }),
            new TextRun({
              text: exp.location ? ` | ${exp.location}` : '',
              size: 20,
              font: 'Cambria',
            }),
          ],
          spacing: { before: 150 },
        })
      );

      // Title and dates
      const dateStr = exp.startDate && exp.endDate
        ? `${exp.startDate} - ${exp.endDate}`
        : '';
      children.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          children: [
            new TextRun({
              text: exp.title,
              italics: true,
              size: 20,
              font: 'Cambria',
            }),
            new TextRun({
              text: `\t${dateStr}`,
              size: 20,
              font: 'Cambria',
            }),
          ],
          spacing: { after: 50 },
        })
      );

      // Bullets
      for (const bullet of exp.bullets) {
        // Handle bold markers
        const parts = parseBoldText(bullet);
        children.push(
          new Paragraph({
            children: parts,
            bullet: { level: 0 },
            spacing: { after: 50 },
            indent: { left: convertInchesToTwip(0.25) },
          })
        );
      }
    }
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SKILLS',
            bold: true,
            size: 22,
            font: 'Cambria',
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.skills.join(', '),
            size: 20,
            font: 'Cambria',
          }),
        ],
      })
    );
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
            },
          },
        },
        children,
      },
    ],
  });
}

function parseBoldText(text: string): TextRun[] {
  const parts: TextRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before bold
    if (match.index > lastIndex) {
      parts.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          size: 20,
          font: 'Cambria',
        })
      );
    }
    // Bold text
    parts.push(
      new TextRun({
        text: match[1],
        bold: true,
        size: 20,
        font: 'Cambria',
      })
    );
    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(
      new TextRun({
        text: text.slice(lastIndex),
        size: 20,
        font: 'Cambria',
      })
    );
  }

  return parts.length > 0 ? parts : [
    new TextRun({
      text,
      size: 20,
      font: 'Cambria',
    }),
  ];
}
```

**Step 2: Create generation tools**

Create `lib/agent/tools/generation.ts`:
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Packer } from 'docx';
import { generateDocx, parseMarkdownToResumeData } from '@/lib/docx/generator';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const getTempUserId = () => process.env.TEMP_USER_ID || 'temp-user-id';

export const generateResume = tool({
  description: 'Generate a tailored resume markdown from matched achievements. Call this after matchAchievements.',
  parameters: z.object({
    targetCompany: z.string().describe('Target company name'),
    targetRole: z.string().describe('Target role title'),
    matchedAchievementsJson: z.string().describe('JSON string of matched achievements to include'),
    summary: z.string().optional().describe('Professional summary paragraph'),
    userName: z.string().describe('User full name'),
    userEmail: z.string().describe('User email'),
    userPhone: z.string().optional().describe('User phone number'),
    userLocation: z.string().optional().describe('User location (City, State)'),
    userLinkedin: z.string().optional().describe('User LinkedIn URL'),
  }),
  execute: async ({
    targetCompany,
    targetRole,
    matchedAchievementsJson,
    summary,
    userName,
    userEmail,
    userPhone,
    userLocation,
    userLinkedin,
  }) => {
    const userId = getTempUserId();
    const matches = JSON.parse(matchedAchievementsJson);

    // Group matches by company/role
    const groupedByRole = new Map<string, typeof matches>();
    for (const match of matches) {
      const key = `${match.company}|${match.title}`;
      if (!groupedByRole.has(key)) {
        groupedByRole.set(key, []);
      }
      groupedByRole.get(key)!.push(match);
    }

    // Build markdown
    let markdown = `# ${userName}\n\n`;

    // Contact line
    const contactParts = [userEmail, userPhone, userLocation, userLinkedin].filter(Boolean);
    markdown += `${contactParts.join(' | ')}\n\n`;

    // Summary
    if (summary) {
      markdown += `## Summary\n\n${summary}\n\n`;
    }

    // Experience
    markdown += `## Professional Experience\n\n`;

    for (const [key, roleMatches] of groupedByRole) {
      const [company, title] = key.split('|');
      const firstMatch = roleMatches[0];

      markdown += `**${company}**${firstMatch.location ? ` | ${firstMatch.location}` : ''}\n`;
      markdown += `${title}${firstMatch.startDate ? `, ${firstMatch.startDate} - ${firstMatch.endDate || 'Present'}` : ''}\n\n`;

      for (const match of roleMatches) {
        markdown += `- ${match.achievementText}\n`;
      }
      markdown += '\n';
    }

    // Save to database
    const resume = await prisma.generatedResume.create({
      data: {
        userId,
        targetCompany,
        targetRole,
        markdown,
      },
    });

    return {
      id: resume.id,
      markdown,
      message: `Resume generated for ${targetRole} at ${targetCompany}. Use generateDocx to create a downloadable Word document.`,
    };
  },
});

export const generateDocxFile = tool({
  description: 'Generate a DOCX file from a previously generated resume. Returns a download URL.',
  parameters: z.object({
    resumeId: z.string().describe('ID of the generated resume'),
  }),
  execute: async ({ resumeId }) => {
    const userId = getTempUserId();

    const resume = await prisma.generatedResume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      return { error: 'Resume not found' };
    }

    // Parse markdown to structured data
    const resumeData = parseMarkdownToResumeData(resume.markdown);

    // Generate DOCX
    const doc = generateDocx(resumeData);
    const buffer = await Packer.toBuffer(doc);

    // Save file
    const uploadsDir = path.join(process.cwd(), 'public', 'resumes');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${resumeData.name.replace(/\s+/g, '_')}_${resume.targetCompany.replace(/\s+/g, '_')}_${resume.targetRole.replace(/\s+/g, '_')}_Resume.docx`;
    const filepath = path.join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // Update database with file path
    const downloadUrl = `/resumes/${filename}`;
    await prisma.generatedResume.update({
      where: { id: resumeId },
      data: { docxUrl: downloadUrl },
    });

    return {
      downloadUrl,
      filename,
      message: `DOCX file generated: ${filename}`,
    };
  },
});
```

**Step 3: Commit**

Run:
```bash
git add .
git commit -m "feat: add resume generation tools and DOCX generator"
```

---

## Task 8: Preferences Tools

**Files:**
- Create: `lib/agent/tools/preferences.ts`

**Step 1: Create preferences tools**

Create `lib/agent/tools/preferences.ts`:
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { preferencesSchema, updatePreferencesInputSchema } from '../schemas';

const getTempUserId = () => process.env.TEMP_USER_ID || 'temp-user-id';

export const getPreferences = tool({
  description: 'Get user preferences for resume formatting',
  parameters: z.object({}),
  execute: async () => {
    const userId = getTempUserId();

    const prefs = await prisma.preference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Return defaults
      return {
        includeSummary: true,
        includeRoleSummaries: true,
        boldPattern: 'action_and_kpi',
        format: 'company_location_dates',
      };
    }

    return {
      includeSummary: prefs.includeSummary,
      includeRoleSummaries: prefs.includeRoleSummaries,
      boldPattern: prefs.boldPattern,
      format: prefs.format,
    };
  },
});

export const updatePreferences = tool({
  description: 'Update user preferences for resume formatting',
  parameters: updatePreferencesInputSchema,
  execute: async (updates) => {
    const userId = getTempUserId();

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@temp.local` },
    });

    const prefs = await prisma.preference.upsert({
      where: { userId },
      update: {
        ...(updates.includeSummary !== undefined && { includeSummary: updates.includeSummary }),
        ...(updates.includeRoleSummaries !== undefined && { includeRoleSummaries: updates.includeRoleSummaries }),
        ...(updates.boldPattern && { boldPattern: updates.boldPattern }),
        ...(updates.format && { format: updates.format }),
      },
      create: {
        userId,
        includeSummary: updates.includeSummary ?? true,
        includeRoleSummaries: updates.includeRoleSummaries ?? true,
        boldPattern: updates.boldPattern ?? 'action_and_kpi',
        format: updates.format ?? 'company_location_dates',
      },
    });

    return {
      includeSummary: prefs.includeSummary,
      includeRoleSummaries: prefs.includeRoleSummaries,
      boldPattern: prefs.boldPattern,
      format: prefs.format,
      message: 'Preferences updated successfully.',
    };
  },
});
```

**Step 2: Commit**

Run:
```bash
git add .
git commit -m "feat: add preferences tools (getPreferences, updatePreferences)"
```

---

## Task 9: Agent Setup

**Files:**
- Create: `lib/agent/instructions.ts`
- Create: `lib/agent/index.ts`

**Step 1: Create system instructions**

Create `lib/agent/instructions.ts`:
```typescript
export const RESUME_AGENT_INSTRUCTIONS = `You are a resume tailoring assistant that helps users create highly targeted resumes for specific job applications.

## Your Capabilities

You have access to tools for:
- Managing a master library of achievements
- Parsing job descriptions
- Matching achievements to job requirements
- Generating tailored resumes in markdown and DOCX format

## Workflow

### For New Users (No Library)

1. When a user first interacts, call \`getLibraryStatus\` to check if they have achievements
2. If no library exists, ask them to:
   - Upload their resume (they can paste text or upload a file)
   - Or manually describe their experience
3. Parse their resume to extract achievements
4. Ask them to confirm the extracted achievements before adding to library

### For Resume Tailoring

1. When user provides a job description:
   - Call \`getLibraryStatus\` to confirm library exists
   - Analyze the JD to extract requirements, keywords, and company info
   - Build a success profile showing what you're looking for

2. **CHECKPOINT**: Present the success profile to the user:
   \`\`\`
   Based on this JD, here's what I'm looking for:

   MUST-HAVE:
   - [requirement 1]
   - [requirement 2]

   NICE-TO-HAVE:
   - [requirement 3]

   KEY THEMES:
   - [theme]: Looking for achievements tagged [tags]

   Does this capture the key requirements? (Yes/adjust)
   \`\`\`

3. After confirmation, call \`matchAchievements\` to find best matches

4. If significant gaps exist (requirements with <60% match), conduct a brief discovery interview:
   - Ask if they have relevant experience not in their library
   - Capture new achievements if provided

5. Call \`generateResume\` with the matched achievements

6. Call \`generateDocxFile\` to create the downloadable document

7. Present the result with a file card showing download options

## Response Style

- Be concise and professional
- Use markdown formatting for clarity
- When showing achievements or requirements, use bullet points
- Always explain what you're doing and why

## Important Rules

1. NEVER invent or fabricate achievements - only use what's in the library or explicitly provided by the user
2. ALWAYS checkpoint with the user before generating the final resume
3. If the library is empty, guide the user to add content before attempting to tailor
4. When parsing resumes, suggest tags based on content but let the user confirm
5. Keep the conversation focused on the task - don't over-explain

## Tag Guidelines

When suggesting tags for achievements, use categories like:
- Technical: engineering, architecture, api, cloud, infrastructure
- Leadership: leadership, management, mentoring, cross-functional
- Data: analytics, metrics, a/b-testing, reporting
- Product: roadmap, strategy, prioritization, user-research
- Impact: cost-reduction, revenue, efficiency, scale
- Communication: stakeholder, presentation, documentation
`;
```

**Step 2: Create agent index**

Create `lib/agent/index.ts`:
```typescript
import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { RESUME_AGENT_INSTRUCTIONS } from './instructions';

// Library tools
import {
  getLibraryStatus,
  getAchievements,
  addAchievement,
  addMultipleAchievements,
  updateAchievement,
  deleteAchievement,
} from './tools/library';

// Research tools
import {
  parseJobDescription,
  buildSuccessProfile,
} from './tools/research';

// Matching tools
import { matchAchievements } from './tools/matching';

// Generation tools
import {
  generateResume,
  generateDocxFile,
} from './tools/generation';

// Preferences tools
import {
  getPreferences,
  updatePreferences,
} from './tools/preferences';

export const resumeAgent = new ToolLoopAgent({
  model: anthropic('claude-sonnet-4-20250514'),
  instructions: RESUME_AGENT_INSTRUCTIONS,
  tools: {
    // Library management
    getLibraryStatus,
    getAchievements,
    addAchievement,
    addMultipleAchievements,
    updateAchievement,
    deleteAchievement,

    // Research
    parseJobDescription,
    buildSuccessProfile,

    // Matching
    matchAchievements,

    // Generation
    generateResume,
    generateDocxFile,

    // Preferences
    getPreferences,
    updatePreferences,
  },
  stopWhen: stepCountIs(15),
});

export type ResumeAgent = typeof resumeAgent;
```

**Step 3: Commit**

Run:
```bash
git add .
git commit -m "feat: configure ToolLoopAgent with all tools and system instructions"
```

---

## Task 10: Chat API Route

**Files:**
- Create: `app/api/chat/route.ts`

**Step 1: Create streaming chat endpoint**

Create `app/api/chat/route.ts`:
```typescript
import { resumeAgent } from '@/lib/agent';
import { UIMessage } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get the latest user message
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== 'user') {
    return new Response('No user message found', { status: 400 });
  }

  // Extract text content from the message
  const userContent = lastMessage.parts
    ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n') || '';

  // Stream the agent response
  const stream = resumeAgent.stream({
    prompt: userContent,
    // Pass conversation history for context
    messages: messages.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.parts
        ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('\n') || '',
    })),
  });

  return stream.toUIMessageStreamResponse();
}
```

**Step 2: Commit**

Run:
```bash
git add .
git commit -m "feat: add streaming chat API route"
```

---

## Task 11: Test the Agent via curl

**Step 1: Add TEMP_USER_ID to environment**

Add to `.env.local`:
```env
TEMP_USER_ID="test-user-001"
```

**Step 2: Start the dev server**

Run:
```bash
npm run dev
```

**Step 3: Test library status check**

Run in a new terminal:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "1",
        "role": "user",
        "parts": [{"type": "text", "text": "Do I have any achievements in my library?"}]
      }
    ]
  }'
```

Expected: Streaming response mentioning library is empty or showing count.

**Step 4: Test adding an achievement**

Run:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "1",
        "role": "user",
        "parts": [{"type": "text", "text": "Add this to my library: At Google as a Product Manager, I led the redesign of the mobile search experience, increasing user engagement by 25% and reducing bounce rate by 15%. Tags: product, mobile, metrics, user-research"}]
      }
    ]
  }'
```

Expected: Confirmation that achievement was added.

**Step 5: Verify in database**

Run:
```bash
npx prisma studio
```

Check the Achievement table for the new entry.

**Step 6: Commit test verification**

Run:
```bash
git add .
git commit -m "test: verify agent API with curl commands"
```

---

## Summary

Phase 1 implementation complete. You now have:

1. ✅ Next.js 15 project with AI SDK 6
2. ✅ PostgreSQL database with Prisma schema
3. ✅ Zod schemas for all tool inputs/outputs
4. ✅ Library management tools
5. ✅ Research tools (JD parsing, success profile)
6. ✅ Matching tool with tag-based scoring
7. ✅ Resume generation tools (markdown + DOCX)
8. ✅ Preferences tools
9. ✅ ToolLoopAgent configuration
10. ✅ Streaming chat API endpoint
11. ✅ Manual testing via curl

**Next Phase:** Chat UI with `useChat` hook and shadcn components.
