# Phase 1 Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical and important issues identified in the Phase 1 code review to make the Agent Core production-ready.

**Architecture:** Add structured error handling wrapper for all tools, validate JSON inputs with Zod safeParse, add parseResumeIntoLibrary tool, and sanitize user inputs for file operations.

**Tech Stack:** TypeScript, Zod, Prisma, AI SDK 6

---

## Overview

The code review identified:
- 3 Critical issues (API already verified correct, missing tool, no error handling)
- 6 Important issues (JSON validation, filename sanitization, magic numbers, etc.)
- 5 Minor issues (unused imports, type safety, etc.)

**Note:** The AI SDK 6 API verification is complete - `inputSchema` and `createAgentUIStreamResponse` are correct.

---

### Task 1: Create Tool Result Type and Error Wrapper

**Files:**
- Create: `lib/agent/tools/utils.ts`

**Step 1: Create the utils file with ToolResult type and wrapper**

```typescript
// lib/agent/tools/utils.ts
import { z } from 'zod';

/**
 * Standard result type for all tools
 * Tools should return success: true with data, or success: false with error message
 */
export type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Wraps a tool execute function with try-catch error handling
 * Returns structured ToolResult instead of throwing
 */
export function withErrorHandling<TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<ToolResult<TOutput>> {
  return async (input: TInput) => {
    try {
      const data = await fn(input);
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: message };
    }
  };
}

/**
 * Safely parse JSON with Zod schema validation
 * Returns the parsed data or null with error message
 */
export function safeJsonParse<T>(
  json: string,
  schema: z.ZodType<T>
): { data: T; error: null } | { data: null; error: string } {
  try {
    const parsed = JSON.parse(json);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return { data: null, error: `Validation error: ${result.error.message}` };
    }
    return { data: result.data, error: null };
  } catch {
    return { data: null, error: 'Invalid JSON format' };
  }
}

/**
 * Sanitize a string for use in filenames
 * Removes all characters except alphanumeric, underscore, hyphen
 */
export function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

/**
 * Get the temporary user ID until auth is implemented
 */
export function getTempUserId(): string {
  return process.env.TEMP_USER_ID || 'temp-user-id';
}
```

**Step 2: Verify file was created**

Run: `cat lib/agent/tools/utils.ts | head -20`

**Step 3: Commit**

```bash
git add lib/agent/tools/utils.ts
git commit -m "feat: add tool utils with error handling wrapper and helpers"
```

---

### Task 2: Add Matching Algorithm Constants

**Files:**
- Modify: `lib/agent/tools/matching.ts`

**Step 1: Add constants at the top of the file**

Add after imports (line 5):

```typescript
/**
 * Matching algorithm thresholds
 */
const MATCH_THRESHOLDS = {
  /** Score when no tags to compare (baseline) */
  DEFAULT_SCORE: 50,
  /** Below this score, requirement is considered a gap */
  GAP_THRESHOLD: 60,
  /** Minimum score to include in results */
  MIN_INCLUDE_SCORE: 40,
  /** Maximum matches to return (reasonable for a resume) */
  MAX_MATCHES: 15,
} as const;
```

**Step 2: Replace magic numbers with constants**

Replace line 56 (`50`) with `MATCH_THRESHOLDS.DEFAULT_SCORE`
Replace line 96 (`60`) with `MATCH_THRESHOLDS.GAP_THRESHOLD`
Replace line 107 (`40`) with `MATCH_THRESHOLDS.MIN_INCLUDE_SCORE`
Replace line 108 (`15`) with `MATCH_THRESHOLDS.MAX_MATCHES`

**Step 3: Verify changes compile**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add lib/agent/tools/matching.ts
git commit -m "refactor: extract magic numbers to named constants in matching"
```

---

### Task 3: Add JSON Schema for Success Profile

**Files:**
- Modify: `lib/agent/schemas.ts`

**Step 1: Read current schemas file to find where to add**

Check the end of the file for the right location.

**Step 2: Add SuccessProfile schema**

Add after the existing schemas:

```typescript
/**
 * Schema for success profile used in matching
 */
export const keyThemeSchema = z.object({
  theme: z.string(),
  tags: z.array(z.string()),
});

export const successProfileSchema = z.object({
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()).optional(),
  keyThemes: z.array(keyThemeSchema).optional(),
});

export type KeyTheme = z.infer<typeof keyThemeSchema>;
export type SuccessProfile = z.infer<typeof successProfileSchema>;

/**
 * Schema for matched achievements array used in generation
 */
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
});

export const matchedAchievementsArraySchema = z.array(matchedAchievementSchema);
export type MatchedAchievement = z.infer<typeof matchedAchievementSchema>;

/**
 * Schema for parsed requirements in research tools
 */
export const parsedRequirementSchema = z.object({
  text: z.string(),
  type: z.enum(['must_have', 'nice_to_have']),
  tags: z.array(z.string()).optional(),
});

export const parsedRequirementsArraySchema = z.array(parsedRequirementSchema);
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add lib/agent/schemas.ts
git commit -m "feat: add Zod schemas for success profile and matched achievements"
```

---

### Task 4: Refactor matching.ts with Error Handling and JSON Validation

**Files:**
- Modify: `lib/agent/tools/matching.ts`

**Step 1: Update imports**

Replace lines 1-5:

```typescript
import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import {
  matchAchievementsInputSchema,
  RankedMatch,
  Gap,
  successProfileSchema,
  SuccessProfile,
  KeyTheme,
} from '../schemas';
import { getTempUserId, safeJsonParse } from './utils';
```

**Step 2: Remove local interface definitions**

Delete lines 7-15 (the local KeyTheme and SuccessProfile interfaces).

**Step 3: Remove local getTempUserId**

Delete the line `const getTempUserId = () => ...`

**Step 4: Wrap execute with JSON validation**

Replace the execute function (lines ~20-128) with:

```typescript
execute: async ({ profileJson }) => {
  const userId = getTempUserId();

  // Validate JSON input
  const parseResult = safeJsonParse(profileJson, successProfileSchema);
  if (parseResult.error) {
    return {
      success: false,
      error: parseResult.error,
      matches: [],
      gaps: [],
    };
  }
  const profile = parseResult.data;

  // Get all user achievements
  let achievements;
  try {
    achievements = await prisma.achievement.findMany({
      where: { userId },
    });
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch achievements from database',
      matches: [],
      gaps: [],
    };
  }

  if (achievements.length === 0) {
    return {
      success: true,
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
  const allRequiredTags = profile.keyThemes?.flatMap((t: KeyTheme) => t.tags) || [];

  // Score each achievement
  const scoredAchievements = achievements.map((achievement) => {
    const tagOverlap = achievement.tags.filter((tag) =>
      allRequiredTags.some((reqTag: string) =>
        tag.toLowerCase().includes(reqTag.toLowerCase()) ||
        reqTag.toLowerCase().includes(tag.toLowerCase())
      )
    );

    const score = allRequiredTags.length > 0
      ? (tagOverlap.length / allRequiredTags.length) * 100
      : MATCH_THRESHOLDS.DEFAULT_SCORE;

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

  scoredAchievements.sort((a, b) => b.score - a.score);

  const gaps: Gap[] = [];
  for (const req of profile.mustHave || []) {
    const bestMatch = scoredAchievements.find((a) =>
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

  const topMatches: RankedMatch[] = scoredAchievements
    .filter((a) => a.score >= MATCH_THRESHOLDS.MIN_INCLUDE_SCORE)
    .slice(0, MATCH_THRESHOLDS.MAX_MATCHES)
    .map(({ achievementId, achievementText, company, title, score, matchedRequirements }) => ({
      achievementId,
      achievementText,
      company,
      title,
      score,
      matchedRequirements,
    }));

  return {
    success: true,
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
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add lib/agent/tools/matching.ts
git commit -m "refactor: add error handling and JSON validation to matching tool"
```

---

### Task 5: Refactor research.ts with Error Handling

**Files:**
- Modify: `lib/agent/tools/research.ts`

**Step 1: Update imports**

Replace line 1-3:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { parseJDInputSchema, parsedRequirementsArraySchema } from '../schemas';
import { safeJsonParse } from './utils';
```

**Step 2: Wrap buildSuccessProfile execute with JSON validation**

Replace the execute function in buildSuccessProfile (lines ~36-65) with:

```typescript
execute: async ({ company, role, requirements, keywords, companyContext }) => {
  // Validate requirements JSON
  const reqResult = safeJsonParse(requirements, parsedRequirementsArraySchema);
  if (reqResult.error) {
    return {
      success: false,
      error: `Invalid requirements: ${reqResult.error}`,
    };
  }
  const parsedRequirements = reqResult.data;

  // Validate keywords JSON
  const keywordsResult = safeJsonParse(keywords, z.array(z.string()));
  if (keywordsResult.error) {
    return {
      success: false,
      error: `Invalid keywords: ${keywordsResult.error}`,
    };
  }
  const parsedKeywords = keywordsResult.data;

  const mustHave = parsedRequirements
    .filter((r) => r.type === 'must_have')
    .map((r) => r.text);

  const niceToHave = parsedRequirements
    .filter((r) => r.type === 'nice_to_have')
    .map((r) => r.text);

  const allTags = parsedRequirements.flatMap((r) => r.tags || []);
  const uniqueTags = [...new Set(allTags)] as string[];
  const themes = groupTagsByTheme(uniqueTags);

  return {
    success: true,
    company,
    role,
    mustHave,
    niceToHave,
    keyThemes: themes,
    terminology: [],
    keywords: parsedKeywords,
    companyContext: companyContext || null,
  };
},
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add lib/agent/tools/research.ts
git commit -m "refactor: add JSON validation to research tools"
```

---

### Task 6: Refactor generation.ts with Error Handling and Filename Sanitization

**Files:**
- Modify: `lib/agent/tools/generation.ts`

**Step 1: Update imports**

Replace lines 1-9:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Packer } from 'docx';
import { generateDocx, parseMarkdownToResumeData } from '@/lib/docx/generator';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { matchedAchievementsArraySchema } from '../schemas';
import { getTempUserId, safeJsonParse, sanitizeFilename } from './utils';
```

**Step 2: Remove local getTempUserId**

Delete `const getTempUserId = () => ...`

**Step 3: Update generateResume execute with validation**

Replace the execute function (lines ~24-91) with:

```typescript
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

  // Validate JSON input
  const parseResult = safeJsonParse(matchedAchievementsJson, matchedAchievementsArraySchema);
  if (parseResult.error) {
    return {
      success: false,
      error: parseResult.error,
    };
  }
  const matches = parseResult.data;

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

  const contactParts = [userEmail, userPhone, userLocation, userLinkedin].filter(Boolean);
  markdown += `${contactParts.join(' | ')}\n\n`;

  if (summary) {
    markdown += `## Summary\n\n${summary}\n\n`;
  }

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
  try {
    const resume = await prisma.generatedResume.create({
      data: {
        userId,
        targetCompany,
        targetRole,
        markdown,
      },
    });

    return {
      success: true,
      id: resume.id,
      markdown,
      message: `Resume generated for ${targetRole} at ${targetCompany}. Use generateDocxFile to create a downloadable Word document.`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save resume to database',
    };
  }
},
```

**Step 4: Update generateDocxFile execute with sanitization and error handling**

Replace the execute function (lines ~99-138) with:

```typescript
execute: async ({ resumeId }) => {
  const userId = getTempUserId();

  let resume;
  try {
    resume = await prisma.generatedResume.findFirst({
      where: { id: resumeId, userId },
    });
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch resume from database',
    };
  }

  if (!resume) {
    return {
      success: false,
      error: 'Resume not found',
    };
  }

  try {
    // Parse markdown to structured data
    const resumeData = parseMarkdownToResumeData(resume.markdown);

    // Generate DOCX
    const doc = generateDocx(resumeData);
    const buffer = await Packer.toBuffer(doc);

    // Save file with sanitized filename
    const uploadsDir = path.join(process.cwd(), 'public', 'resumes');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${sanitizeFilename(resumeData.name)}_${sanitizeFilename(resume.targetCompany)}_${sanitizeFilename(resume.targetRole)}_Resume.docx`;
    const filepath = path.join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // Update database with file path
    const downloadUrl = `/resumes/${filename}`;
    await prisma.generatedResume.update({
      where: { id: resumeId },
      data: { docxUrl: downloadUrl },
    });

    return {
      success: true,
      downloadUrl,
      filename,
      message: `DOCX file generated: ${filename}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate DOCX file',
    };
  }
},
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add lib/agent/tools/generation.ts
git commit -m "refactor: add error handling, JSON validation, and filename sanitization to generation tools"
```

---

### Task 7: Refactor library.ts with Error Handling

**Files:**
- Modify: `lib/agent/tools/library.ts`

**Step 1: Update imports**

Replace lines 1-4:

```typescript
import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { achievementInputSchema } from '../schemas';
import { z } from 'zod';
import { getTempUserId } from './utils';
```

**Step 2: Remove local getTempUserId**

Delete line `const getTempUserId = () => ...`

**Step 3: Wrap getLibraryStatus execute with try-catch**

Replace execute (lines ~12-29) with:

```typescript
execute: async () => {
  const userId = getTempUserId();

  try {
    const [count, latest] = await Promise.all([
      prisma.achievement.count({ where: { userId } }),
      prisma.achievement.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    return {
      success: true,
      exists: count > 0,
      count,
      lastUpdated: latest?.updatedAt.toISOString() ?? null,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to check library status',
    };
  }
},
```

**Step 4: Wrap getAchievements execute with try-catch**

Replace execute (lines ~38-66) with:

```typescript
execute: async ({ tags, company }) => {
  const userId = getTempUserId();

  try {
    const where: Record<string, unknown> = { userId };

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

    return {
      success: true,
      achievements: achievements.map((a) => ({
        id: a.id,
        company: a.company,
        title: a.title,
        location: a.location,
        startDate: a.startDate?.toISOString().slice(0, 7) ?? null,
        endDate: a.endDate?.toISOString().slice(0, 7) ?? null,
        text: a.text,
        tags: a.tags,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch achievements',
    };
  }
},
```

**Step 5: Wrap addAchievement execute with try-catch**

Replace execute (lines ~72-105) with:

```typescript
execute: async (input) => {
  const userId = getTempUserId();

  try {
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
      success: true,
      id: achievement.id,
      company: achievement.company,
      title: achievement.title,
      location: achievement.location,
      startDate: achievement.startDate?.toISOString().slice(0, 7) ?? null,
      endDate: achievement.endDate?.toISOString().slice(0, 7) ?? null,
      text: achievement.text,
      tags: achievement.tags,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to add achievement',
    };
  }
},
```

**Step 6: Wrap addMultipleAchievements execute with try-catch**

Replace execute (lines ~113-140) with:

```typescript
execute: async ({ achievements }) => {
  const userId = getTempUserId();

  try {
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
      success: true,
      added: created.count,
      message: `Successfully added ${created.count} achievements to your library.`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to add achievements',
    };
  }
},
```

**Step 7: Wrap updateAchievement execute with try-catch**

Replace execute (lines ~149-177) with:

```typescript
execute: async ({ id, updates }) => {
  const userId = getTempUserId();

  try {
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
      success: true,
      id: achievement.id,
      company: achievement.company,
      title: achievement.title,
      location: achievement.location,
      startDate: achievement.startDate?.toISOString().slice(0, 7) ?? null,
      endDate: achievement.endDate?.toISOString().slice(0, 7) ?? null,
      text: achievement.text,
      tags: achievement.tags,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Achievement not found or update failed',
    };
  }
},
```

**Step 8: Wrap deleteAchievement execute with try-catch**

Replace execute (lines ~185-193) with:

```typescript
execute: async ({ id }) => {
  const userId = getTempUserId();

  try {
    await prisma.achievement.delete({
      where: { id, userId },
    });

    return { success: true, deleted: true, id };
  } catch (error) {
    return {
      success: false,
      error: 'Achievement not found or already deleted',
    };
  }
},
```

**Step 9: Verify types compile**

Run: `npx tsc --noEmit`

**Step 10: Commit**

```bash
git add lib/agent/tools/library.ts
git commit -m "refactor: add error handling to all library tools"
```

---

### Task 8: Refactor preferences.ts with Error Handling

**Files:**
- Modify: `lib/agent/tools/preferences.ts`

**Step 1: Update imports**

Replace lines 1-4:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { updatePreferencesInputSchema } from '../schemas';
import { getTempUserId } from './utils';
```

**Step 2: Remove local getTempUserId**

Delete `const getTempUserId = () => ...`

**Step 3: Wrap getPreferences execute with try-catch**

Replace execute (lines ~11-34) with:

```typescript
execute: async () => {
  const userId = getTempUserId();

  try {
    const prefs = await prisma.preference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      return {
        success: true,
        includeSummary: true,
        includeRoleSummaries: true,
        boldPattern: 'action_and_kpi',
        format: 'company_location_dates',
      };
    }

    return {
      success: true,
      includeSummary: prefs.includeSummary,
      includeRoleSummaries: prefs.includeRoleSummaries,
      boldPattern: prefs.boldPattern,
      format: prefs.format,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch preferences',
    };
  }
},
```

**Step 4: Wrap updatePreferences execute with try-catch**

Replace execute (lines ~40-74) with:

```typescript
execute: async (updates) => {
  const userId = getTempUserId();

  try {
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
      success: true,
      includeSummary: prefs.includeSummary,
      includeRoleSummaries: prefs.includeRoleSummaries,
      boldPattern: prefs.boldPattern,
      format: prefs.format,
      message: 'Preferences updated successfully.',
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to update preferences',
    };
  }
},
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add lib/agent/tools/preferences.ts
git commit -m "refactor: add error handling to preferences tools"
```

---

### Task 9: Add parseResumeIntoLibrary Tool

**Files:**
- Modify: `lib/agent/tools/library.ts`

**Step 1: Add the new tool at the end of the file**

Add after deleteAchievement:

```typescript
export const parseResumeIntoLibrary = tool({
  description: `Parse a raw resume text and extract achievements. Returns structured data for the LLM to process.

The LLM should:
1. Parse the resume text to identify work experiences
2. Extract each achievement/bullet point with its associated role
3. Suggest relevant tags for each achievement
4. Call addMultipleAchievements with the parsed data`,
  inputSchema: z.object({
    resumeText: z.string().describe('Raw resume text to parse'),
  }),
  execute: async ({ resumeText }) => {
    // This is a "prompt tool" - it returns instructions for the LLM
    // The actual parsing is done by the LLM's reasoning capability
    return {
      success: true,
      instruction: `Parse the following resume text and extract achievements.

For each work experience section:
1. Identify the company, title, location, and dates
2. Extract each bullet point as a separate achievement
3. Suggest 2-5 tags for each achievement from this list:
   - Technical: engineering, technical, architecture, api, database, cloud, infrastructure, ai, ml, llm
   - Leadership: leadership, management, mentoring, team-building, cross-functional, hiring
   - Data: data, analytics, metrics, reporting, a/b-testing, data-driven
   - Product: product, roadmap, strategy, prioritization, user-research, mvp
   - Communication: communication, stakeholder, presentation, documentation
   - Impact: cost-reduction, revenue, efficiency, automation, scale, growth
   - Process: agile, scrum, process-improvement, optimization

After parsing, call addMultipleAchievements with the extracted data.

Resume text to parse:
---
${resumeText}
---`,
      schema: {
        achievements: 'array of { company, title, location?, startDate (YYYY-MM), endDate (YYYY-MM or "present"), text, tags[] }',
      },
    };
  },
});
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add lib/agent/tools/library.ts
git commit -m "feat: add parseResumeIntoLibrary tool for resume parsing workflow"
```

---

### Task 10: Update Agent Configuration with New Tool

**Files:**
- Modify: `lib/agent/agent.ts`

**Step 1: Read current agent.ts file**

Check the current imports and tools configuration.

**Step 2: Add parseResumeIntoLibrary to imports**

Update the import from library.ts to include the new tool:

```typescript
import {
  getLibraryStatus,
  getAchievements,
  addAchievement,
  addMultipleAchievements,
  updateAchievement,
  deleteAchievement,
  parseResumeIntoLibrary,
} from './tools/library';
```

**Step 3: Add parseResumeIntoLibrary to tools object**

Add to the tools configuration:

```typescript
parseResumeIntoLibrary,
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add lib/agent/agent.ts
git commit -m "feat: register parseResumeIntoLibrary tool with agent"
```

---

### Task 11: Verify Full Build

**Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run Next.js build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit any remaining changes**

```bash
git status
# If clean, continue. Otherwise commit any fixes.
```

---

### Task 12: Final Verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test the chat endpoint**

Use Playwright or curl to verify the agent responds correctly.

**Step 3: Create final commit if needed**

```bash
git log --oneline -5
# Verify all fixes are committed
```

---

## Summary

After completing all tasks:

| Issue | Status | Task |
|-------|--------|------|
| API compatibility (inputSchema) | Verified correct | N/A |
| Missing parseResumeIntoLibrary | Fixed | Task 9, 10 |
| No error handling | Fixed | Tasks 4-8 |
| JSON.parse validation | Fixed | Tasks 3-6 |
| Filename sanitization | Fixed | Task 6 |
| Magic numbers | Fixed | Task 2 |
| Tool utils/helpers | Added | Task 1 |

All critical and important issues addressed. Ready for Phase 2 or production use.
