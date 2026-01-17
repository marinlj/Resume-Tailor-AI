import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import {
  matchAchievementsInputSchema,
  RankedMatch,
  Gap,
  successProfileInputSchema,
} from '../schemas';
import { getTempUserId, safeJsonParse } from './utils';

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

export const matchAchievements = tool({
  description: 'Match achievements and library items (projects, certifications, etc.) from the library against a success profile. Returns ranked matches and identified gaps.',
  inputSchema: matchAchievementsInputSchema,
  execute: async ({ profileJson }) => {
    const userId = getTempUserId();

    // Validate JSON input
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

    // Get all user achievements AND library items with tags
    let achievements;
    let libraryItems;
    try {
      [achievements, libraryItems] = await Promise.all([
        prisma.achievement.findMany({
          where: { userId },
        }),
        prisma.libraryItem.findMany({
          where: {
            userId,
            tags: { isEmpty: false }, // Only items that have tags
          },
        }),
      ]);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch achievements and library items from database',
        matches: [],
        gaps: [],
      };
    }

    if (achievements.length === 0 && libraryItems.length === 0) {
      return {
        success: true,
        matches: [],
        gaps: profile.mustHave.map((req: string) => ({
          requirement: req,
          bestMatchScore: 0,
          bestMatchText: null,
        })),
        message: 'No achievements or library items in library. Please add your resume first.',
      };
    }

    // Score each achievement against each theme, take best match
    const scoredAchievements = achievements.map((achievement) => {
      let bestThemeScore = 0;
      const matchedRequirements: string[] = [];

      for (const theme of profile.keyThemes || []) {
        const tagOverlap = achievement.tags.filter((tag) =>
          theme.tags.some((themeTag: string) =>
            tag.toLowerCase().includes(themeTag.toLowerCase()) ||
            themeTag.toLowerCase().includes(tag.toLowerCase())
          )
        );

        // Score for this theme: percentage of theme's tags matched
        const themeScore = theme.tags.length > 0
          ? (tagOverlap.length / theme.tags.length) * 100
          : 0;

        if (themeScore > 0) {
          matchedRequirements.push(theme.theme);
        }

        if (themeScore > bestThemeScore) {
          bestThemeScore = themeScore;
        }
      }

      // Use best theme score (not average of all themes)
      const score = (profile.keyThemes?.length ?? 0) > 0
        ? bestThemeScore
        : MATCH_THRESHOLDS.DEFAULT_SCORE;

      return {
        achievementId: achievement.id,
        achievementText: achievement.text,
        company: achievement.company,
        title: achievement.title,
        location: achievement.location,
        startDate: achievement.startDate?.toISOString().slice(0, 7) ?? null,
        endDate: achievement.endDate?.toISOString().slice(0, 7) ?? null,
        score: Math.round(score),
        matchedRequirements,
        tags: achievement.tags,
        isLibraryItem: false,
        itemType: undefined,
      };
    });

    // Score library items the same way as achievements
    const scoredLibraryItems = libraryItems.map((item) => {
      let bestThemeScore = 0;
      const matchedRequirements: string[] = [];

      for (const theme of profile.keyThemes || []) {
        const tagOverlap = item.tags.filter((tag) =>
          theme.tags.some((themeTag: string) =>
            tag.toLowerCase().includes(themeTag.toLowerCase()) ||
            themeTag.toLowerCase().includes(tag.toLowerCase())
          )
        );

        // Score for this theme: percentage of theme's tags matched
        const themeScore = theme.tags.length > 0
          ? (tagOverlap.length / theme.tags.length) * 100
          : 0;

        if (themeScore > 0) {
          matchedRequirements.push(theme.theme);
        }

        if (themeScore > bestThemeScore) {
          bestThemeScore = themeScore;
        }
      }

      // Use best theme score (not average of all themes)
      const score = (profile.keyThemes?.length ?? 0) > 0
        ? bestThemeScore
        : MATCH_THRESHOLDS.DEFAULT_SCORE;

      return {
        achievementId: item.id,
        achievementText: item.title + (item.subtitle ? ` at ${item.subtitle}` : ''),
        company: item.subtitle || item.type, // Use type as fallback
        title: item.title,
        location: item.location,
        startDate: item.date,
        endDate: null,
        score: Math.round(score),
        matchedRequirements,
        tags: item.tags,
        isLibraryItem: true, // Flag to distinguish from achievements
        itemType: item.type, // "project", "certification", "award", etc.
      };
    });

    // Combine and sort all scored items by score descending
    const allScoredItems = [...scoredAchievements, ...scoredLibraryItems];
    allScoredItems.sort((a, b) => b.score - a.score);

    // Identify gaps - requirements with no strong matches
    const gaps: Gap[] = [];
    for (const req of profile.mustHave || []) {
      const bestMatch = allScoredItems.find((a) =>
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

    // Return top matches (limit to reasonable number for resume)
    const topMatches: RankedMatch[] = allScoredItems
      .filter((a) => a.score >= MATCH_THRESHOLDS.MIN_INCLUDE_SCORE)
      .slice(0, MATCH_THRESHOLDS.MAX_MATCHES)
      .map(({ achievementId, achievementText, company, title, score, matchedRequirements, isLibraryItem, itemType }) => ({
        achievementId,
        achievementText,
        company,
        title,
        score,
        matchedRequirements,
        ...(isLibraryItem && { isLibraryItem, itemType }),
      }));

    return {
      success: true,
      matches: topMatches,
      gaps,
      summary: {
        totalAchievements: achievements.length,
        totalLibraryItems: libraryItems.length,
        strongMatches: topMatches.filter((m) => m.score >= 80).length,
        goodMatches: topMatches.filter((m) => m.score >= 60 && m.score < 80).length,
        weakMatches: topMatches.filter((m) => m.score < 60).length,
        libraryItemMatches: topMatches.filter((m) => m.isLibraryItem).length,
        gapCount: gaps.length,
      },
    };
  },
});
