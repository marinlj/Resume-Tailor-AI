import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { achievementInputSchema, skillInputSchema, educationInputSchema, contactDetailsInputSchema } from '../schemas';
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

// ============================================================================
// Skills Tools
// ============================================================================

export const getSkills = tool({
  description: 'Get all skills from the library, optionally filtered by category',
  inputSchema: z.object({
    category: z.string().optional().describe('Filter by category'),
  }),
  execute: async ({ category }) => {
    const userId = getTempUserId();
    try {
      const where: Record<string, unknown> = { userId };
      if (category) {
        where.category = { contains: category, mode: 'insensitive' };
      }

      const skills = await prisma.skill.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      return {
        success: true,
        skills: skills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          level: s.level,
        })),
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch skills' };
    }
  },
});

export const addSkills = tool({
  description: 'Add multiple skills to the library at once (used after parsing a resume)',
  inputSchema: z.object({
    skills: z.array(skillInputSchema).describe('Array of skills to add'),
  }),
  execute: async ({ skills }) => {
    try {
      const userId = getTempUserId();
      console.log('[addSkills] Starting with userId:', userId, 'skills count:', skills.length);

      // Ensure user exists
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });
      console.log('[addSkills] User upserted');

      // Use upsert to avoid duplicates (skill name is unique per user)
      let addedCount = 0;
      for (const skill of skills) {
        await prisma.skill.upsert({
          where: {
            userId_name: { userId, name: skill.name },
          },
          update: {
            category: skill.category ?? undefined,
            level: skill.level ?? undefined,
          },
          create: {
            userId,
            name: skill.name,
            category: skill.category ?? null,
            level: skill.level ?? null,
          },
        });
        addedCount++;
      }
      console.log('[addSkills] Successfully added', addedCount, 'skills');

      return {
        success: true,
        added: addedCount,
        message: `Successfully added/updated ${addedCount} skills in your library.`,
      };
    } catch (error) {
      console.error('[addSkills] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to add skills: ${errorMessage}` };
    }
  },
});

// ============================================================================
// Education Tools
// ============================================================================

export const getEducation = tool({
  description: 'Get all education entries from the library',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getTempUserId();
    try {
      const education = await prisma.education.findMany({
        where: { userId },
        orderBy: { endDate: 'desc' },
      });

      return {
        success: true,
        education: education.map((e) => ({
          id: e.id,
          institution: e.institution,
          degree: e.degree,
          field: e.field,
          location: e.location,
          startDate: e.startDate?.toISOString().slice(0, 7) ?? null,
          endDate: e.endDate?.toISOString().slice(0, 7) ?? null,
          gpa: e.gpa,
          honors: e.honors,
          activities: e.activities,
        })),
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch education' };
    }
  },
});

export const addEducation = tool({
  description: 'Add multiple education entries to the library at once (used after parsing a resume)',
  inputSchema: z.object({
    education: z.array(educationInputSchema).describe('Array of education entries to add'),
  }),
  execute: async ({ education }) => {
    try {
      const userId = getTempUserId();
      console.log('[addEducation] Starting with userId:', userId, 'education count:', education.length);

      // Ensure user exists
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });
      console.log('[addEducation] User upserted');

      const created = await prisma.education.createMany({
        data: education.map((e) => ({
          userId,
          institution: e.institution,
          degree: e.degree,
          field: e.field ?? null,
          location: e.location ?? null,
          startDate: e.startDate ? new Date(e.startDate) : null,
          endDate: e.endDate === 'present' ? null : e.endDate ? new Date(e.endDate) : null,
          gpa: e.gpa ?? null,
          honors: e.honors ?? null,
          activities: e.activities ?? [],
        })),
      });
      console.log('[addEducation] Successfully added', created.count, 'entries');

      return {
        success: true,
        added: created.count,
        message: `Successfully added ${created.count} education entries to your library.`,
      };
    } catch (error) {
      console.error('[addEducation] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to add education: ${errorMessage}` };
    }
  },
});

// ============================================================================
// Contact Details Tools
// ============================================================================

export const getContactDetails = tool({
  description: 'Get the user\'s contact details from the library',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getTempUserId();
    try {
      const contactDetails = await prisma.contactDetails.findUnique({
        where: { userId },
      });

      if (!contactDetails) {
        return {
          success: true,
          contactDetails: null,
          message: 'No contact details found. Ask the user for their contact information or extract from their resume.',
        };
      }

      return {
        success: true,
        contactDetails: {
          id: contactDetails.id,
          fullName: contactDetails.fullName,
          email: contactDetails.email,
          phone: contactDetails.phone,
          location: contactDetails.location,
          linkedinUrl: contactDetails.linkedinUrl,
          portfolioUrl: contactDetails.portfolioUrl,
          githubUrl: contactDetails.githubUrl,
          headline: contactDetails.headline,
        },
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch contact details' };
    }
  },
});

export const updateContactDetails = tool({
  description: 'Create or update the user\'s contact details in the library',
  inputSchema: contactDetailsInputSchema,
  execute: async (input) => {
    const userId = getTempUserId();
    try {
      // Ensure user exists
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });

      const contactDetails = await prisma.contactDetails.upsert({
        where: { userId },
        update: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          location: input.location ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          portfolioUrl: input.portfolioUrl ?? null,
          githubUrl: input.githubUrl ?? null,
          headline: input.headline ?? null,
        },
        create: {
          userId,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          location: input.location ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          portfolioUrl: input.portfolioUrl ?? null,
          githubUrl: input.githubUrl ?? null,
          headline: input.headline ?? null,
        },
      });

      return {
        success: true,
        contactDetails: {
          id: contactDetails.id,
          fullName: contactDetails.fullName,
          email: contactDetails.email,
          phone: contactDetails.phone,
          location: contactDetails.location,
          linkedinUrl: contactDetails.linkedinUrl,
          portfolioUrl: contactDetails.portfolioUrl,
          githubUrl: contactDetails.githubUrl,
          headline: contactDetails.headline,
        },
        message: 'Contact details saved to library.',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to save contact details: ${errorMessage}` };
    }
  },
});

export const parseResumeIntoLibrary = tool({
  description: `Parse a raw resume text and extract ALL sections: work experiences (achievements), skills, and education. Returns structured data for the LLM to process.

The LLM should:
1. Parse the resume text to identify work experiences and extract achievements
2. Extract all skills from the skills/technical skills section
3. Extract all education entries
4. Call the appropriate tools to add each type of data`,
  inputSchema: z.object({
    resumeText: z.string().describe('Raw resume text to parse'),
  }),
  execute: async ({ resumeText }) => {
    // This is a "prompt tool" - it returns instructions for the LLM
    // The actual parsing is done by the LLM's reasoning capability
    return {
      success: true,
      instruction: `Parse the following resume text and extract ALL information into the library.

## 1. WORK EXPERIENCE (Achievements)
For each work experience section:
- Identify the company, title, location, and dates
- Extract each bullet point as a separate achievement
- Suggest 2-5 tags for each achievement from this list:
  - Technical: engineering, technical, architecture, api, database, cloud, infrastructure, ai, ml, llm
  - Leadership: leadership, management, mentoring, team-building, cross-functional, hiring
  - Data: data, analytics, metrics, reporting, a/b-testing, data-driven
  - Product: product, roadmap, strategy, prioritization, user-research, mvp
  - Communication: communication, stakeholder, presentation, documentation
  - Impact: cost-reduction, revenue, efficiency, automation, scale, growth
  - Process: agile, scrum, process-improvement, optimization

Call \`addMultipleAchievements\` with the extracted work experience data.

## 2. SKILLS
Extract ALL skills from the skills/technical skills section:
- Identify the skill name
- Categorize each skill (e.g., "Programming Languages", "Frameworks", "Cloud/DevOps", "Databases", "Tools", "Soft Skills")
- Optionally note the proficiency level if mentioned

Call \`addSkills\` with the extracted skills data.

## 3. EDUCATION
Extract ALL education entries:
- Institution name
- Degree type (e.g., "Bachelor of Science", "Master of Arts", "PhD")
- Field of study (e.g., "Computer Science", "Business Administration")
- Location (if mentioned)
- Start and end dates
- GPA (if mentioned and notable)
- Honors or distinctions (e.g., "Magna Cum Laude", "Dean's List")
- Relevant activities, clubs, or coursework

Call \`addEducation\` with the extracted education data.

## IMPORTANT
- Extract EVERYTHING from the resume - don't skip any sections
- If a section is not present in the resume, that's fine - just skip that tool call
- Present ALL extracted data to the user for confirmation before calling the add tools

Resume text to parse:
---
${resumeText}
---`,
      schema: {
        achievements: 'array of { company, title, location?, startDate (YYYY-MM), endDate (YYYY-MM or "present"), text, tags[] }',
        skills: 'array of { name, category?, level? }',
        education: 'array of { institution, degree, field?, location?, startDate?, endDate?, gpa?, honors?, activities[]? }',
      },
    };
  },
});
