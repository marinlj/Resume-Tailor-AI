import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resumeStructureInputSchema, ResumeSection } from '../schemas';
import { getCurrentUserId } from './utils';

export const getResumeStructure = tool({
  description: 'Get the user\'s saved resume structure preference',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getCurrentUserId();
    try {
      const structure = await prisma.resumeStructure.findUnique({
        where: { userId },
      });

      if (!structure) {
        return {
          success: true,
          structure: null,
          message: 'No saved structure. On first resume generation, present structure for confirmation.',
        };
      }

      return {
        success: true,
        structure: {
          contactFields: structure.contactFields,
          sections: structure.sections as ResumeSection[],
          includeRoleSummaries: structure.includeRoleSummaries,
        },
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch resume structure' };
    }
  },
});

export const saveResumeStructure = tool({
  description: 'Save the user\'s preferred resume structure after confirmation',
  inputSchema: resumeStructureInputSchema,
  execute: async (input) => {
    const userId = getCurrentUserId();
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });

      const structure = await prisma.resumeStructure.upsert({
        where: { userId },
        update: {
          contactFields: input.contactFields,
          sections: input.sections,
          includeRoleSummaries: input.includeRoleSummaries ?? false,
        },
        create: {
          userId,
          contactFields: input.contactFields,
          sections: input.sections,
          includeRoleSummaries: input.includeRoleSummaries ?? false,
        },
      });

      return {
        success: true,
        message: 'Resume structure saved. Future resumes will use this format.',
        structure: {
          contactFields: structure.contactFields,
          sections: structure.sections as ResumeSection[],
          includeRoleSummaries: structure.includeRoleSummaries,
        },
      };
    } catch (error) {
      // Log full error for debugging but don't expose database internals to user
      console.error('[saveResumeStructure] Error:', error);
      return { success: false, error: 'Failed to save resume structure. Please try again.' };
    }
  },
});
