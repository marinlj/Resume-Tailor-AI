import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { updatePreferencesInputSchema } from '../schemas';
import { getCurrentUserId } from './utils';

export const getPreferences = tool({
  description: 'Get user preferences for resume formatting',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getCurrentUserId();

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
});

export const updatePreferences = tool({
  description: 'Update user preferences for resume formatting',
  inputSchema: updatePreferencesInputSchema,
  execute: async (updates) => {
    const userId = getCurrentUserId();

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
});
