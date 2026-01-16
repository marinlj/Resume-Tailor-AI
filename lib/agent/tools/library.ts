import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { achievementInputSchema } from '../schemas';
import { z } from 'zod';
import { getTempUserId } from './utils';

export const getLibraryStatus = tool({
  description: 'Check if the user has a master library of achievements and get stats',
  inputSchema: z.object({}),
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
      return { success: false, error: 'Failed to check library status' };
    }
  },
});

export const getAchievements = tool({
  description: 'Get achievements from the library, optionally filtered by tags',
  inputSchema: z.object({
    tags: z.array(z.string()).optional().describe('Filter by tags (OR logic)'),
    company: z.string().optional().describe('Filter by company name'),
  }),
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
      return { success: false, error: 'Failed to fetch achievements' };
    }
  },
});

export const addAchievement = tool({
  description: 'Add a new achievement to the master library',
  inputSchema: achievementInputSchema,
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
      return { success: false, error: 'Failed to add achievement' };
    }
  },
});

export const addMultipleAchievements = tool({
  description: 'Add multiple achievements to the library at once (used after parsing a resume)',
  inputSchema: z.object({
    achievements: z.array(achievementInputSchema).describe('Array of achievements to add'),
  }),
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
      return { success: false, error: 'Failed to add achievements' };
    }
  },
});

export const updateAchievement = tool({
  description: 'Update an existing achievement in the library',
  inputSchema: z.object({
    id: z.string().describe('Achievement ID to update'),
    updates: achievementInputSchema.partial().describe('Fields to update'),
  }),
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
      return { success: false, error: 'Achievement not found or update failed' };
    }
  },
});

export const deleteAchievement = tool({
  description: 'Delete an achievement from the library',
  inputSchema: z.object({
    id: z.string().describe('Achievement ID to delete'),
  }),
  execute: async ({ id }) => {
    const userId = getTempUserId();
    try {
      await prisma.achievement.delete({
        where: { id, userId },
      });

      return { success: true, deleted: true, id };
    } catch (error) {
      return { success: false, error: 'Achievement not found or already deleted' };
    }
  },
});

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
