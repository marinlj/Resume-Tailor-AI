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

    // Fetch roles with achievements (CORRECT: uses Role model)
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
    } catch {
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
          ...(item.isLibraryItem && { isLibraryItem: true, itemType: (item as { itemType: string }).itemType }),
        };
      }).filter((item): item is NonNullable<typeof item> => item !== null);

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

      const topMatches: RankedMatch[] = scoredItems
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
