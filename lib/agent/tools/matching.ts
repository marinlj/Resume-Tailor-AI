import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { matchAchievementsInputSchema, RankedMatch, Gap } from '../schemas';

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

const getTempUserId = () => process.env.TEMP_USER_ID || 'temp-user-id';

interface KeyTheme {
  theme: string;
  tags: string[];
}

interface SuccessProfile {
  mustHave: string[];
  keyThemes: KeyTheme[];
}

export const matchAchievements = tool({
  description: 'Match achievements from the library against a success profile. Returns ranked matches and identified gaps.',
  inputSchema: matchAchievementsInputSchema,
  execute: async ({ profileJson }) => {
    const userId = getTempUserId();
    const profile: SuccessProfile = JSON.parse(profileJson);

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
    const allRequiredTags = profile.keyThemes?.flatMap((t: KeyTheme) => t.tags) || [];

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
        : MATCH_THRESHOLDS.DEFAULT_SCORE; // Default score if no tags specified

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

      if (!bestMatch || bestMatch.score < MATCH_THRESHOLDS.GAP_THRESHOLD) {
        gaps.push({
          requirement: req,
          bestMatchScore: bestMatch?.score || 0,
          bestMatchText: bestMatch?.achievementText || null,
        });
      }
    }

    // Return top matches (limit to reasonable number for resume)
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
