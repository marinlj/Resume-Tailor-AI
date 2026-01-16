import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { achievementInputSchema } from '../schemas';
import { z } from 'zod';

// Temporary user ID until auth is implemented
const getTempUserId = () => process.env.TEMP_USER_ID || 'temp-user-id';

export const getLibraryStatus = tool({
  description: 'Check if the user has a master library of achievements and get stats',
  inputSchema: z.object({}),
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
  inputSchema: z.object({
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
  inputSchema: achievementInputSchema,
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
  inputSchema: z.object({
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
  inputSchema: z.object({
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
  inputSchema: z.object({
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
