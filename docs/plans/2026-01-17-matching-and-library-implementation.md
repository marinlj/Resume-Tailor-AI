# Matching & Library Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace tag-based matching with LLM semantic matching, introduce Role model for normalized achievements, and add role summaries + professional summary support.

**Architecture:** New `Role` model groups achievements; matching uses batched LLM calls for semantic scoring; generation pulls role summaries from library and adjusts for job fit; Library UI provides full CRUD for all entities.

**Tech Stack:** Prisma (schema + migrations), Vercel AI SDK, React/Next.js, shadcn/ui components

---

## Phase 1: Schema Migration

### Task 1.1: Add Role Model to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Role model and update Achievement**

Add after the User model:

```prisma
model Role {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  company      String
  title        String
  location     String?
  startDate    DateTime?
  endDate      DateTime?
  summary      String?
  achievements Achievement[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([userId, company, title, startDate])
  @@index([userId])
}
```

Update Achievement model - replace userId with roleId:

```prisma
model Achievement {
  id        String   @id @default(cuid())
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  text      String
  tags      String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([roleId])
}
```

Add Role relation to User model:

```prisma
model User {
  // ... existing fields
  roles               Role[]
  professionalSummary String?
}
```

**Step 2: Generate migration (do NOT run yet)**

Run: `npx prisma migrate dev --create-only --name add_role_model`

Expected: Creates migration file in `prisma/migrations/`

**Step 3: Commit schema changes**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add Role model and professionalSummary field"
```

---

### Task 1.2: Write Data Migration Script

**Files:**
- Create: `prisma/migrations/migrate-achievements-to-roles.ts`

**Step 1: Create migration script**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAchievementsToRoles() {
  console.log('Starting migration...');

  // Get all users with achievements
  const users = await prisma.user.findMany({
    include: {
      // Use raw query since Achievement still has old schema
    },
  });

  // For each user, group achievements by (company, title, startDate)
  // This requires raw SQL since we're mid-migration
  const achievements = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      company: string;
      title: string;
      location: string | null;
      startDate: Date | null;
      endDate: Date | null;
      text: string;
      tags: string[];
    }>
  >`SELECT * FROM "Achievement"`;

  // Group by unique role
  const roleMap = new Map<string, {
    userId: string;
    company: string;
    title: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
    achievements: Array<{ id: string; text: string; tags: string[] }>;
  }>();

  for (const ach of achievements) {
    const key = `${ach.userId}|${ach.company}|${ach.title}|${ach.startDate?.toISOString() ?? 'null'}`;

    if (!roleMap.has(key)) {
      roleMap.set(key, {
        userId: ach.userId,
        company: ach.company,
        title: ach.title,
        location: ach.location,
        startDate: ach.startDate,
        endDate: ach.endDate,
        achievements: [],
      });
    }

    roleMap.get(key)!.achievements.push({
      id: ach.id,
      text: ach.text,
      tags: ach.tags,
    });
  }

  console.log(`Found ${roleMap.size} unique roles from ${achievements.length} achievements`);

  // Create roles and update achievements
  for (const [key, roleData] of roleMap) {
    const role = await prisma.role.create({
      data: {
        userId: roleData.userId,
        company: roleData.company,
        title: roleData.title,
        location: roleData.location,
        startDate: roleData.startDate,
        endDate: roleData.endDate,
      },
    });

    // Update achievements with roleId using raw SQL
    const achievementIds = roleData.achievements.map(a => a.id);
    await prisma.$executeRaw`
      UPDATE "Achievement"
      SET "roleId" = ${role.id}
      WHERE "id" = ANY(${achievementIds})
    `;

    console.log(`Created role: ${roleData.company} - ${roleData.title} with ${achievementIds.length} achievements`);
  }

  console.log('Migration complete!');
}

migrateAchievementsToRoles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Commit migration script**

```bash
git add prisma/migrations/migrate-achievements-to-roles.ts
git commit -m "feat(schema): add data migration script for Role model"
```

---

### Task 1.3: Update Prisma Schema for Two-Step Migration

The migration needs to happen in two steps:
1. Add new columns/tables (keep old columns)
2. Run data migration
3. Remove old columns

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Create intermediate schema (both old and new columns)**

Update Achievement to have BOTH userId (old) and roleId (new, optional for now):

```prisma
model Achievement {
  id        String   @id @default(cuid())
  // OLD - will be removed after migration
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  company   String?
  title     String?
  location  String?
  startDate DateTime?
  endDate   DateTime?
  // NEW
  roleId    String?
  role      Role?    @relation(fields: [roleId], references: [id], onDelete: Cascade)
  // Kept
  text      String
  tags      String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([roleId])
}
```

**Step 2: Generate and run migration**

Run: `npx prisma migrate dev --name add_role_model_step1`

**Step 3: Run data migration**

Run: `npx tsx prisma/migrations/migrate-achievements-to-roles.ts`

**Step 4: Update schema to final state (remove old columns)**

```prisma
model Achievement {
  id        String   @id @default(cuid())
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  text      String
  tags      String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([roleId])
}
```

**Step 5: Generate final migration**

Run: `npx prisma migrate dev --name remove_old_achievement_columns`

**Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(schema): complete Role model migration"
```

---

## Phase 2: Update Agent Tools

### Task 2.1: Update Library Tools for Role Model

**Files:**
- Modify: `lib/agent/tools/library.ts`
- Modify: `lib/agent/schemas.ts`

**Step 1: Add Role schemas**

In `lib/agent/schemas.ts`, add:

```typescript
// Role schemas
export const roleInputSchema = z.object({
  company: z.string().describe('Company name'),
  title: z.string().describe('Job title'),
  location: z.string().optional().describe('Location (city, state/country)'),
  startDate: z.string().optional().describe('Start date (YYYY-MM format)'),
  endDate: z.string().optional().describe('End date (YYYY-MM format) or "present"'),
  summary: z.string().optional().describe('Role summary (1-2 sentences)'),
});

export type RoleInput = z.infer<typeof roleInputSchema>;

export const roleOutputSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  summary: z.string().nullable(),
  achievements: z.array(z.object({
    id: z.string(),
    text: z.string(),
    tags: z.array(z.string()),
  })),
});

export type RoleOutput = z.infer<typeof roleOutputSchema>;

// Update achievement input (no longer needs company/title/dates)
export const achievementInputSchema = z.object({
  roleId: z.string().describe('ID of the role this achievement belongs to'),
  text: z.string().describe('The achievement bullet text'),
  tags: z.array(z.string()).describe('Tags for matching'),
});
```

**Step 2: Add Role CRUD tools**

In `lib/agent/tools/library.ts`, add:

```typescript
export const getRoles = tool({
  description: 'Get all roles (work experiences) from the library with their achievements',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getTempUserId();
    try {
      const roles = await prisma.role.findMany({
        where: { userId },
        include: { achievements: true },
        orderBy: [{ startDate: 'desc' }],
      });

      return {
        success: true,
        roles: roles.map((r) => ({
          id: r.id,
          company: r.company,
          title: r.title,
          location: r.location,
          startDate: r.startDate?.toISOString().slice(0, 7) ?? null,
          endDate: r.endDate?.toISOString().slice(0, 7) ?? null,
          summary: r.summary,
          achievements: r.achievements.map((a) => ({
            id: a.id,
            text: a.text,
            tags: a.tags,
          })),
        })),
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch roles' };
    }
  },
});

export const addRole = tool({
  description: 'Add a new role (work experience) to the library',
  inputSchema: roleInputSchema,
  execute: async (input) => {
    const userId = getTempUserId();
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });

      const role = await prisma.role.create({
        data: {
          userId,
          company: input.company,
          title: input.title,
          location: input.location ?? null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate === 'present' ? null : input.endDate ? new Date(input.endDate) : null,
          summary: input.summary ?? null,
        },
      });

      return {
        success: true,
        id: role.id,
        company: role.company,
        title: role.title,
        location: role.location,
        startDate: role.startDate?.toISOString().slice(0, 7) ?? null,
        endDate: role.endDate?.toISOString().slice(0, 7) ?? null,
        summary: role.summary,
      };
    } catch (error) {
      return { success: false, error: 'Failed to add role' };
    }
  },
});

export const updateRole = tool({
  description: 'Update an existing role in the library',
  inputSchema: z.object({
    id: z.string().describe('Role ID to update'),
    updates: roleInputSchema.partial().describe('Fields to update'),
  }),
  execute: async ({ id, updates }) => {
    const userId = getTempUserId();
    try {
      const role = await prisma.role.update({
        where: { id, userId },
        data: {
          ...(updates.company && { company: updates.company }),
          ...(updates.title && { title: updates.title }),
          ...(updates.location !== undefined && { location: updates.location }),
          ...(updates.startDate && { startDate: new Date(updates.startDate) }),
          ...(updates.endDate !== undefined && {
            endDate: updates.endDate === 'present' ? null : updates.endDate ? new Date(updates.endDate) : null
          }),
          ...(updates.summary !== undefined && { summary: updates.summary }),
        },
        include: { achievements: true },
      });

      return {
        success: true,
        id: role.id,
        company: role.company,
        title: role.title,
        location: role.location,
        startDate: role.startDate?.toISOString().slice(0, 7) ?? null,
        endDate: role.endDate?.toISOString().slice(0, 7) ?? null,
        summary: role.summary,
        achievements: role.achievements.map((a) => ({
          id: a.id,
          text: a.text,
          tags: a.tags,
        })),
      };
    } catch (error) {
      return { success: false, error: 'Role not found or update failed' };
    }
  },
});

export const deleteRole = tool({
  description: 'Delete a role and all its achievements from the library',
  inputSchema: z.object({
    id: z.string().describe('Role ID to delete'),
  }),
  execute: async ({ id }) => {
    const userId = getTempUserId();
    try {
      await prisma.role.delete({
        where: { id, userId },
      });
      return { success: true, deleted: true, id };
    } catch (error) {
      return { success: false, error: 'Role not found or already deleted' };
    }
  },
});
```

**Step 3: Update Achievement tools to use roleId**

Update `addAchievement`:

```typescript
export const addAchievement = tool({
  description: 'Add a new achievement to an existing role',
  inputSchema: z.object({
    roleId: z.string().describe('ID of the role this achievement belongs to'),
    text: z.string().describe('The achievement bullet text'),
    tags: z.array(z.string()).describe('Tags for matching'),
  }),
  execute: async ({ roleId, text, tags }) => {
    const userId = getTempUserId();
    try {
      // Verify role belongs to user
      const role = await prisma.role.findFirst({
        where: { id: roleId, userId },
      });
      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      const achievement = await prisma.achievement.create({
        data: { roleId, text, tags },
      });

      return {
        success: true,
        id: achievement.id,
        roleId: achievement.roleId,
        text: achievement.text,
        tags: achievement.tags,
      };
    } catch (error) {
      return { success: false, error: 'Failed to add achievement' };
    }
  },
});
```

**Step 4: Commit**

```bash
git add lib/agent/tools/library.ts lib/agent/schemas.ts
git commit -m "feat(tools): add Role CRUD tools and update Achievement tools"
```

---

### Task 2.2: Add Professional Summary Tools

**Files:**
- Modify: `lib/agent/tools/library.ts`

**Step 1: Add professional summary tools**

```typescript
export const getProfessionalSummary = tool({
  description: 'Get the user\'s professional summary from the library',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getTempUserId();
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { professionalSummary: true },
      });

      return {
        success: true,
        professionalSummary: user?.professionalSummary ?? null,
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch professional summary' };
    }
  },
});

export const updateProfessionalSummary = tool({
  description: 'Update the user\'s professional summary in the library',
  inputSchema: z.object({
    summary: z.string().describe('Professional summary text (2-4 sentences)'),
  }),
  execute: async ({ summary }) => {
    const userId = getTempUserId();
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { professionalSummary: summary },
        create: { id: userId, email: `${userId}@temp.local`, professionalSummary: summary },
      });

      return {
        success: true,
        professionalSummary: summary,
        message: 'Professional summary updated.',
      };
    } catch (error) {
      return { success: false, error: 'Failed to update professional summary' };
    }
  },
});
```

**Step 2: Commit**

```bash
git add lib/agent/tools/library.ts
git commit -m "feat(tools): add professional summary tools"
```

---

### Task 2.3: Implement LLM-Based Semantic Matching

**Files:**
- Modify: `lib/agent/tools/matching.ts`

**Step 1: Replace tag-based matching with LLM scoring**

```typescript
import { tool } from 'ai';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { successProfileInputSchema, RankedMatch, Gap } from '../schemas';
import { getTempUserId, safeJsonParse } from './utils';

const MATCH_THRESHOLDS = {
  GAP_THRESHOLD: 60,
  MIN_INCLUDE_SCORE: 40,
  MAX_MATCHES: 15,
} as const;

const matchResultSchema = z.object({
  matches: z.array(z.object({
    achievementId: z.string(),
    score: z.number().min(0).max(100),
    matchedRequirements: z.array(z.string()),
    reasoning: z.string(),
  })),
});

export const matchAchievements = tool({
  description: 'Match achievements from the library against a success profile using semantic matching. Returns ranked matches and identified gaps.',
  inputSchema: z.object({
    profileJson: z.string().describe('JSON string of the success profile'),
  }),
  execute: async ({ profileJson }) => {
    const userId = getTempUserId();

    const parseResult = safeJsonParse(profileJson, successProfileInputSchema);
    if (!parseResult.data) {
      return {
        success: false,
        error: parseResult.error || 'Failed to parse profile JSON',
        matches: [],
        gaps: [],
      };
    }
    const profile = parseResult.data;

    // Fetch roles with achievements
    let roles;
    let libraryItems;
    try {
      [roles, libraryItems] = await Promise.all([
        prisma.role.findMany({
          where: { userId },
          include: { achievements: true },
        }),
        prisma.libraryItem.findMany({
          where: { userId, tags: { isEmpty: false } },
        }),
      ]);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch from database',
        matches: [],
        gaps: [],
      };
    }

    // Flatten achievements with role context
    const achievementsWithContext = roles.flatMap((role) =>
      role.achievements.map((ach) => ({
        id: ach.id,
        text: ach.text,
        tags: ach.tags,
        company: role.company,
        title: role.title,
        location: role.location,
        startDate: role.startDate?.toISOString().slice(0, 7) ?? null,
        endDate: role.endDate?.toISOString().slice(0, 7) ?? null,
        isLibraryItem: false,
      }))
    );

    // Add library items
    const libraryItemsWithContext = libraryItems.map((item) => ({
      id: item.id,
      text: item.bullets.join(' ') || item.title,
      tags: item.tags,
      company: item.subtitle || item.type,
      title: item.title,
      location: item.location,
      startDate: item.date,
      endDate: null,
      isLibraryItem: true,
      itemType: item.type,
    }));

    const allItems = [...achievementsWithContext, ...libraryItemsWithContext];

    if (allItems.length === 0) {
      return {
        success: true,
        matches: [],
        gaps: profile.mustHave.map((req) => ({
          requirement: req,
          bestMatchScore: 0,
          bestMatchText: null,
        })),
        message: 'No achievements in library.',
      };
    }

    // Build prompt for LLM matching
    const prompt = `Score these achievements against the job requirements.

## Job Requirements

### Must Have:
${profile.mustHave.map((r, i) => `${i + 1}. ${r}`).join('\n')}

### Nice to Have:
${(profile.niceToHave || []).map((r, i) => `${i + 1}. ${r}`).join('\n') || 'None specified'}

### Key Themes:
${(profile.keyThemes || []).map((t) => `- ${t.theme}: Looking for ${t.tags.join(', ')}`).join('\n') || 'None specified'}

## Achievements to Score

${allItems.map((a, i) => `${i + 1}. [ID: ${a.id}] "${a.text}" (Tags: ${a.tags.join(', ')})`).join('\n')}

## Instructions

For each achievement, provide:
- score (0-100): How relevant is this achievement to the job? Consider:
  - Direct experience match
  - Transferable skills
  - Semantic similarity (AI ≈ LLM ≈ machine-learning, SaaS ≈ cloud platform, etc.)
  - Impact relevance
- matchedRequirements: Which must-have or nice-to-have requirements does it address?
- reasoning: Brief explanation (1 sentence)

Return scores for ALL achievements.`;

    try {
      const { object } = await generateObject({
        model: anthropic('claude-sonnet-4-20250514'),
        schema: matchResultSchema,
        prompt,
      });

      // Merge LLM scores with achievement metadata
      const scoredItems = object.matches.map((match) => {
        const item = allItems.find((a) => a.id === match.achievementId);
        if (!item) return null;
        return {
          achievementId: match.achievementId,
          achievementText: item.text,
          company: item.company,
          title: item.title,
          location: item.location,
          startDate: item.startDate,
          endDate: item.endDate,
          score: match.score,
          matchedRequirements: match.matchedRequirements,
          ...(item.isLibraryItem && { isLibraryItem: true, itemType: (item as any).itemType }),
        };
      }).filter(Boolean) as RankedMatch[];

      // Sort by score
      scoredItems.sort((a, b) => b.score - a.score);

      // Identify gaps
      const gaps: Gap[] = [];
      for (const req of profile.mustHave) {
        const bestMatch = scoredItems.find((a) =>
          a.matchedRequirements.some((mr) =>
            req.toLowerCase().includes(mr.toLowerCase()) ||
            mr.toLowerCase().includes(req.toLowerCase())
          )
        );

        if (!bestMatch || bestMatch.score < MATCH_THRESHOLDS.GAP_THRESHOLD) {
          gaps.push({
            requirement: req,
            bestMatchScore: bestMatch?.score || 0,
            bestMatchText: bestMatch?.achievementText || null,
          });
        }
      }

      const topMatches = scoredItems
        .filter((a) => a.score >= MATCH_THRESHOLDS.MIN_INCLUDE_SCORE)
        .slice(0, MATCH_THRESHOLDS.MAX_MATCHES);

      return {
        success: true,
        matches: topMatches,
        gaps,
        summary: {
          totalItems: allItems.length,
          strongMatches: topMatches.filter((m) => m.score >= 80).length,
          goodMatches: topMatches.filter((m) => m.score >= 60 && m.score < 80).length,
          gapCount: gaps.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `LLM matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        matches: [],
        gaps: [],
      };
    }
  },
});
```

**Step 2: Commit**

```bash
git add lib/agent/tools/matching.ts
git commit -m "feat(matching): implement LLM-based semantic matching"
```

---

### Task 2.4: Update Resume Generation for Role Summaries

**Files:**
- Modify: `lib/agent/tools/generation.ts`

**Step 1: Update generateExperienceSection to include role summaries**

Find the `generateExperienceSection` helper function and update it:

```typescript
// Helper function to generate experience section
const generateExperienceSection = async (label: string) => {
  if (groupedByRole.size === 0) return '';

  // Fetch structure preference for role summaries
  const includeRoleSummaries = structure?.sections?.some(
    (s: ResumeSection) => s.type === 'experience'
  ) && await prisma.resumeStructure.findUnique({
    where: { userId },
    select: { includeRoleSummaries: true },
  }).then(s => s?.includeRoleSummaries ?? false);

  let sectionMarkdown = `## ${label}\n\n`;

  for (const [key, roleMatches] of groupedByRole) {
    const [company, title] = key.split('|');
    const firstMatch = roleMatches[0];

    sectionMarkdown += `**${company}**${firstMatch.location ? ` | ${firstMatch.location}` : ''}\n`;
    sectionMarkdown += `${title}${firstMatch.startDate ? `, ${firstMatch.startDate} - ${firstMatch.endDate || 'Present'}` : ''}\n\n`;

    // Add role summary if enabled and available
    if (includeRoleSummaries && firstMatch.roleSummary) {
      sectionMarkdown += `_${firstMatch.roleSummary}_\n\n`;
    }

    for (const match of roleMatches) {
      sectionMarkdown += `- ${match.achievementText}\n`;
    }
    sectionMarkdown += '\n';
  }
  return sectionMarkdown;
};
```

**Step 2: Update ResumeStructure schema to include includeRoleSummaries**

In `prisma/schema.prisma`, update ResumeStructure:

```prisma
model ResumeStructure {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  contactFields       String[]
  sections            Json     // Array of { type, label }
  includeRoleSummaries Boolean @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

**Step 3: Update matchedAchievementSchema to include roleSummary**

In `lib/agent/schemas.ts`:

```typescript
export const matchedAchievementSchema = z.object({
  achievementId: z.string(),
  achievementText: z.string(),
  company: z.string(),
  title: z.string(),
  score: z.number(),
  matchedRequirements: z.array(z.string()),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  roleSummary: z.string().optional(), // NEW
  isLibraryItem: z.boolean().optional(),
  itemType: z.string().optional(),
});
```

**Step 4: Commit**

```bash
git add lib/agent/tools/generation.ts lib/agent/schemas.ts prisma/schema.prisma
git commit -m "feat(generation): add role summary support to resume generation"
```

---

### Task 2.5: Update Agent Instructions

**Files:**
- Modify: `lib/agent/instructions.ts`

**Step 1: Add instructions for searching library before adding**

Add to the instructions:

```typescript
## Before Adding New Achievements

ALWAYS search the library before adding new achievements:
1. When user mentions experience, call \`getAchievements\` with relevant tags/company
2. If similar achievement exists, confirm: "I found this in your library: [achievement]. Is this what you meant, or is this different?"
3. Only add new achievement if it's genuinely new

## Discovery Interview Guidelines

When adding new achievements via chat:
1. Ask for the IMPACT: "What was the business result? Revenue, cost savings, time saved?"
2. Ask for METRICS: "Do you have specific numbers? Percentages, dollar amounts, time periods?"
3. PREVIEW the bullet: "Here's how I'd phrase this: [bullet]. Does this look right?"
4. CONFIRM before saving: "I'll add this to your library under [Role]. Confirm?"

## Role Summaries

When adding new roles:
1. Ask for a 1-2 sentence role summary
2. Or offer to draft one: "Based on these achievements, how about: '[summary]'?"
3. Store in Role.summary field

## Recovery Behavior

If generated output doesn't match user preferences:
1. Don't ask permission - just regenerate immediately
2. Explain what you fixed: "I regenerated with role summaries included."
```

**Step 2: Commit**

```bash
git add lib/agent/instructions.ts
git commit -m "feat(instructions): add library search, discovery interview, and recovery guidelines"
```

---

## Phase 3: Library UI Updates

### Task 3.1: Create Role-Based Library Page Structure

**Files:**
- Modify: `app/(main)/library/page.tsx`
- Create: `components/library/RoleCard.tsx`
- Modify: `components/library/AchievementCard.tsx`

**Step 1: Update library page to fetch and display roles**

This task requires updating the library page to:
1. Fetch roles with nested achievements
2. Display in collapsible role cards
3. Add CRUD operations for roles and achievements

(Implementation details depend on existing UI patterns - review existing components first)

**Step 2: Create RoleCard component**

```tsx
// components/library/RoleCard.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AchievementCard } from './AchievementCard';

interface Role {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  summary: string | null;
  achievements: Array<{
    id: string;
    text: string;
    tags: string[];
  }>;
}

interface RoleCardProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (id: string) => void;
  onAddAchievement: (roleId: string) => void;
  onEditAchievement: (achievement: Role['achievements'][0]) => void;
  onDeleteAchievement: (id: string) => void;
}

export function RoleCard({
  role,
  onEdit,
  onDelete,
  onAddAchievement,
  onEditAchievement,
  onDeleteAchievement,
}: RoleCardProps) {
  const [expanded, setExpanded] = useState(false);

  const dateRange = role.startDate
    ? `${role.startDate} - ${role.endDate || 'Present'}`
    : '';

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            <div>
              <h3 className="font-semibold">{role.company}</h3>
              <p className="text-sm text-muted-foreground">
                {role.title} {dateRange && `· ${dateRange}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" onClick={() => onEdit(role)}>
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(role.id)}>
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {role.summary && (
            <p className="text-sm italic text-muted-foreground">{role.summary}</p>
          )}

          <div className="space-y-2">
            {role.achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                onEdit={() => onEditAchievement(achievement)}
                onDelete={() => onDeleteAchievement(achievement.id)}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddAchievement(role.id)}
          >
            <Plus size={16} className="mr-2" />
            Add Achievement
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
```

**Step 3: Commit**

```bash
git add app/(main)/library/page.tsx components/library/
git commit -m "feat(ui): add role-based library page structure"
```

---

### Task 3.2: Add Professional Summary Section to Library UI

**Files:**
- Modify: `app/(main)/library/page.tsx`
- Create: `components/library/ProfessionalSummaryCard.tsx`

**Step 1: Create ProfessionalSummaryCard component**

```tsx
// components/library/ProfessionalSummaryCard.tsx
'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface ProfessionalSummaryCardProps {
  summary: string | null;
  onSave: (summary: string) => Promise<void>;
}

export function ProfessionalSummaryCard({ summary, onSave }: ProfessionalSummaryCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(summary || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(summary || '');
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Professional Summary</CardTitle>
        {!editing && (
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Write a 2-4 sentence professional summary..."
              rows={4}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check size={16} className="mr-2" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X size={16} className="mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {summary || 'No professional summary yet. Click edit to add one.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/library/ProfessionalSummaryCard.tsx
git commit -m "feat(ui): add professional summary card component"
```

---

### Task 3.3: Add API Routes for Role and Professional Summary

**Files:**
- Create: `app/api/roles/route.ts`
- Create: `app/api/roles/[id]/route.ts`
- Create: `app/api/professional-summary/route.ts`

**Step 1: Create roles API route**

```typescript
// app/api/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = await prisma.role.findMany({
    where: { userId: session.user.id },
    include: { achievements: true },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const role = await prisma.role.create({
    data: {
      userId: session.user.id,
      company: body.company,
      title: body.title,
      location: body.location || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate === 'present' ? null : body.endDate ? new Date(body.endDate) : null,
      summary: body.summary || null,
    },
  });

  return NextResponse.json({ role });
}
```

**Step 2: Create professional summary API route**

```typescript
// app/api/professional-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { professionalSummary: true },
  });

  return NextResponse.json({ professionalSummary: user?.professionalSummary || null });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { summary } = await req.json();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { professionalSummary: summary },
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add app/api/roles/ app/api/professional-summary/
git commit -m "feat(api): add roles and professional summary API routes"
```

---

## Phase 4: Register New Tools

### Task 4.1: Register New Tools in Agent Index

**Files:**
- Modify: `lib/agent/index.ts`

**Step 1: Import and register new tools**

Add imports:
```typescript
import {
  // ... existing imports
  getRoles,
  addRole,
  updateRole,
  deleteRole,
  getProfessionalSummary,
  updateProfessionalSummary,
} from './tools/library';
```

Add to tools object:
```typescript
export const tools = {
  // ... existing tools
  getRoles,
  addRole,
  updateRole,
  deleteRole,
  getProfessionalSummary,
  updateProfessionalSummary,
};
```

**Step 2: Commit**

```bash
git add lib/agent/index.ts
git commit -m "feat(agent): register new Role and ProfessionalSummary tools"
```

---

## Final Steps

### Task 5.1: Run Full Migration

**Step 1: Generate Prisma client**

Run: `npx prisma generate`

**Step 2: Run migrations**

Run: `npx prisma migrate dev`

**Step 3: Test locally**

Run: `npm run dev`

Verify:
- Library page loads with new role structure
- Can add/edit/delete roles and achievements
- Chat can use new matching and generation

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete matching and library improvements implementation"
```

---

## Summary

| Phase | Tasks | Key Changes |
|-------|-------|-------------|
| 1. Schema | 1.1-1.3 | Role model, professionalSummary, migrations |
| 2. Tools | 2.1-2.5 | Role CRUD, LLM matching, generation updates, instructions |
| 3. UI | 3.1-3.3 | RoleCard, ProfessionalSummaryCard, API routes |
| 4. Register | 4.1 | Wire up new tools |
| 5. Final | 5.1 | Migration, testing, final commit |

**Total estimated tasks:** 12
**Commits:** ~12 atomic commits
