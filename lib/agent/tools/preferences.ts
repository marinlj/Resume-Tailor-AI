import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { updatePreferencesInputSchema } from '../schemas';

const getTempUserId = () => process.env.TEMP_USER_ID || 'temp-user-id';

export const getPreferences = tool({
  description: 'Get user preferences for resume formatting',
  inputSchema: z.object({}),
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
  inputSchema: updatePreferencesInputSchema,
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
