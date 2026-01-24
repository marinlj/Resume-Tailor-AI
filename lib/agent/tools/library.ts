import { tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { achievementInputSchema, skillInputSchema, educationInputSchema, contactDetailsInputSchema, libraryItemInputSchema, roleInputSchema } from '../schemas';
import { z } from 'zod';
import { getCurrentUserId } from './utils';

export const getLibraryStatus = tool({
  description: 'Check if the user has a master library of achievements and get stats',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getCurrentUserId();
    try {
      const [roleCount, achievementCount, latestRole] = await Promise.all([
        prisma.role.count({ where: { userId } }),
        prisma.achievement.count({ where: { role: { userId } } }),
        prisma.role.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

      return {
        success: true,
        exists: roleCount > 0 || achievementCount > 0,
        roleCount,
        achievementCount,
        // For backwards compatibility, also include 'count' as achievementCount
        count: achievementCount,
        lastUpdated: latestRole?.updatedAt.toISOString() ?? null,
      };
    } catch {
      return { success: false, error: 'Failed to check library status' };
    }
  },
});

export const getAchievements = tool({
  description: 'Get achievements from the library, optionally filtered by tags or role',
  inputSchema: z.object({
    tags: z.array(z.string()).optional().describe('Filter by tags (OR logic)'),
    roleId: z.string().optional().describe('Filter by role ID'),
    company: z.string().optional().describe('Filter by company name (searches in role)'),
  }),
  execute: async ({ tags, roleId, company }) => {
    const userId = getCurrentUserId();
    try {
      // Build the where clause - achievements are filtered via their role
      const where: Record<string, unknown> = {
        role: { userId },
      };

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      if (roleId) {
        where.roleId = roleId;
      }

      if (company) {
        where.role = {
          ...where.role as object,
          company: { contains: company, mode: 'insensitive' },
        };
      }

      const achievements = await prisma.achievement.findMany({
        where,
        include: {
          role: {
            select: {
              id: true,
              company: true,
              title: true,
              location: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: [{ role: { company: 'asc' } }, { role: { startDate: 'desc' } }],
      });

      return {
        success: true,
        achievements: achievements.map((a) => ({
          id: a.id,
          roleId: a.roleId,
          text: a.text,
          tags: a.tags,
          // Include role info for context
          role: {
            id: a.role.id,
            company: a.role.company,
            title: a.role.title,
            location: a.role.location,
            startDate: a.role.startDate?.toISOString().slice(0, 7) ?? null,
            endDate: a.role.endDate?.toISOString().slice(0, 7) ?? null,
          },
        })),
      };
    } catch {
      return { success: false, error: 'Failed to fetch achievements' };
    }
  },
});

export const addAchievement = tool({
  description: 'Add a new achievement to a role in the library',
  inputSchema: achievementInputSchema,
  execute: async (input) => {
    const userId = getCurrentUserId();
    try {
      // Verify the role belongs to this user
      const role = await prisma.role.findFirst({
        where: { id: input.roleId, userId },
      });

      if (!role) {
        return { success: false, error: 'Role not found or does not belong to user' };
      }

      const achievement = await prisma.achievement.create({
        data: {
          roleId: input.roleId,
          text: input.text,
          tags: input.tags,
        },
        include: {
          role: {
            select: {
              company: true,
              title: true,
            },
          },
        },
      });

      return {
        success: true,
        id: achievement.id,
        roleId: achievement.roleId,
        text: achievement.text,
        tags: achievement.tags,
        role: {
          company: achievement.role.company,
          title: achievement.role.title,
        },
      };
    } catch {
      return { success: false, error: 'Failed to add achievement' };
    }
  },
});

export const addMultipleAchievements = tool({
  description: 'Add multiple achievements to a single role (all must belong to the same role)',
  inputSchema: z.object({
    roleId: z.string().describe('The role ID to add achievements to'),
    achievements: z.array(z.object({
      text: z.string().describe('The achievement bullet text'),
      tags: z.array(z.string()).describe('Tags for matching'),
    })).describe('Array of achievements to add'),
  }),
  execute: async ({ roleId, achievements }) => {
    console.log('[addMultipleAchievements] Starting with', achievements.length, 'achievements for role', roleId);
    let userId: string;
    try {
      userId = getCurrentUserId();
      console.log('[addMultipleAchievements] userId:', userId);
    } catch (error) {
      console.error('[addMultipleAchievements] Failed to get userId:', error);
      return { success: false, error: `Failed to get user context: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }

    try {
      // Verify the role belongs to this user
      const role = await prisma.role.findFirst({
        where: { id: roleId, userId },
      });

      if (!role) {
        return { success: false, error: 'Role not found or does not belong to user' };
      }

      console.log('[addMultipleAchievements] Creating achievements...');
      const created = await prisma.achievement.createMany({
        data: achievements.map((a) => ({
          roleId,
          text: a.text,
          tags: a.tags,
        })),
      });
      console.log('[addMultipleAchievements] Successfully created', created.count, 'achievements');

      return {
        success: true,
        added: created.count,
        roleId,
        message: `Successfully added ${created.count} achievements to the role.`,
      };
    } catch (error) {
      console.error('[addMultipleAchievements] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to add achievements: ${errorMessage}` };
    }
  },
});

// Schema for adding roles with their achievements in one operation (used for resume parsing)
const roleWithAchievementsSchema = z.object({
  company: z.string().describe('Company name'),
  title: z.string().describe('Job title'),
  location: z.string().optional().describe('Location (city, state/country)'),
  startDate: z.string().optional().describe('Start date (YYYY-MM format)'),
  endDate: z.string().optional().describe('End date (YYYY-MM format) or "present"'),
  summary: z.string().optional().describe('Role summary (1-2 sentences)'),
  achievements: z.array(z.object({
    text: z.string().describe('The achievement bullet text'),
    tags: z.array(z.string()).describe('Tags for matching'),
  })).describe('Achievements for this role'),
});

export const addRolesWithAchievements = tool({
  description: 'Add multiple roles with their achievements in one operation (used after parsing a resume). Each role includes company, title, dates, and its achievements.',
  inputSchema: z.object({
    roles: z.array(roleWithAchievementsSchema).describe('Array of roles with their achievements'),
  }),
  execute: async ({ roles }) => {
    console.log('[addRolesWithAchievements] Starting with', roles.length, 'roles');
    let userId: string;
    try {
      userId = getCurrentUserId();
      console.log('[addRolesWithAchievements] userId:', userId);
    } catch (error) {
      console.error('[addRolesWithAchievements] Failed to get userId:', error);
      return { success: false, error: `Failed to get user context: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }

    try {
      // Ensure user exists
      console.log('[addRolesWithAchievements] Upserting user...');
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });
      console.log('[addRolesWithAchievements] User upserted successfully');

      let totalRoles = 0;
      let totalAchievements = 0;
      const createdRoles: Array<{ id: string; company: string; title: string; achievementCount: number }> = [];

      // Create each role with its achievements
      for (const roleData of roles) {
        const role = await prisma.role.create({
          data: {
            userId,
            company: roleData.company,
            title: roleData.title,
            location: roleData.location ?? null,
            startDate: roleData.startDate ? new Date(roleData.startDate) : null,
            endDate: roleData.endDate === 'present' ? null : roleData.endDate ? new Date(roleData.endDate) : null,
            summary: roleData.summary ?? null,
            achievements: {
              create: roleData.achievements.map((a) => ({
                text: a.text,
                tags: a.tags,
              })),
            },
          },
        });

        totalRoles++;
        totalAchievements += roleData.achievements.length;
        createdRoles.push({
          id: role.id,
          company: role.company,
          title: role.title,
          achievementCount: roleData.achievements.length,
        });
      }

      console.log('[addRolesWithAchievements] Successfully created', totalRoles, 'roles with', totalAchievements, 'achievements');

      return {
        success: true,
        rolesAdded: totalRoles,
        achievementsAdded: totalAchievements,
        roles: createdRoles,
        message: `Successfully added ${totalRoles} roles with ${totalAchievements} achievements to your library.`,
      };
    } catch (error) {
      console.error('[addRolesWithAchievements] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to add roles: ${errorMessage}` };
    }
  },
});

export const updateAchievement = tool({
  description: 'Update an existing achievement in the library',
  inputSchema: z.object({
    id: z.string().describe('Achievement ID to update'),
    updates: z.object({
      text: z.string().optional().describe('The achievement bullet text'),
      tags: z.array(z.string()).optional().describe('Tags for matching'),
      roleId: z.string().optional().describe('Move achievement to a different role'),
    }).describe('Fields to update'),
  }),
  execute: async ({ id, updates }) => {
    const userId = getCurrentUserId();
    try {
      // First verify the achievement belongs to a role owned by this user
      const existingAchievement = await prisma.achievement.findFirst({
        where: {
          id,
          role: { userId },
        },
        include: { role: true },
      });

      if (!existingAchievement) {
        return { success: false, error: 'Achievement not found or does not belong to user' };
      }

      // If moving to a new role, verify that role also belongs to the user
      if (updates.roleId && updates.roleId !== existingAchievement.roleId) {
        const newRole = await prisma.role.findFirst({
          where: { id: updates.roleId, userId },
        });
        if (!newRole) {
          return { success: false, error: 'Target role not found or does not belong to user' };
        }
      }

      const achievement = await prisma.achievement.update({
        where: {
          id,
          role: { userId },
        },
        data: {
          ...(updates.text && { text: updates.text }),
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.roleId && { roleId: updates.roleId }),
        },
        include: {
          role: {
            select: {
              company: true,
              title: true,
            },
          },
        },
      });

      return {
        success: true,
        id: achievement.id,
        roleId: achievement.roleId,
        text: achievement.text,
        tags: achievement.tags,
        role: {
          company: achievement.role.company,
          title: achievement.role.title,
        },
      };
    } catch {
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
    const userId = getCurrentUserId();
    try {
      // Verify the achievement belongs to a role owned by this user
      const achievement = await prisma.achievement.findFirst({
        where: {
          id,
          role: { userId },
        },
      });

      if (!achievement) {
        return { success: false, error: 'Achievement not found or does not belong to user' };
      }

      await prisma.achievement.delete({
        where: { id },
      });

      return { success: true, deleted: true, id };
    } catch {
      return { success: false, error: 'Achievement not found or already deleted' };
    }
  },
});

// ============================================================================
// Role Tools
// ============================================================================

export const getRoles = tool({
  description: 'Get all roles (work experiences) from the library with their achievements',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getCurrentUserId();
    try {
      const roles = await prisma.role.findMany({
        where: { userId },
        include: { achievements: true },
        orderBy: [{ startDate: 'desc' }],
      });

      return {
        success: true,
        roles: roles.map((r) => ({
          id: r.id,
          company: r.company,
          title: r.title,
          location: r.location,
          startDate: r.startDate?.toISOString().slice(0, 7) ?? null,
          endDate: r.endDate?.toISOString().slice(0, 7) ?? null,
          summary: r.summary,
          achievements: r.achievements.map((a) => ({
            id: a.id,
            text: a.text,
            tags: a.tags,
          })),
        })),
      };
    } catch {
      return { success: false, error: 'Failed to fetch roles' };
    }
  },
});

export const addRole = tool({
  description: 'Add a new role (work experience) to the library',
  inputSchema: roleInputSchema,
  execute: async (input) => {
    const userId = getCurrentUserId();
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });

      const role = await prisma.role.create({
        data: {
          userId,
          company: input.company,
          title: input.title,
          location: input.location ?? null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate === 'present' ? null : input.endDate ? new Date(input.endDate) : null,
          summary: input.summary ?? null,
        },
      });

      return {
        success: true,
        id: role.id,
        company: role.company,
        title: role.title,
        location: role.location,
        startDate: role.startDate?.toISOString().slice(0, 7) ?? null,
        endDate: role.endDate?.toISOString().slice(0, 7) ?? null,
        summary: role.summary,
      };
    } catch {
      return { success: false, error: 'Failed to add role' };
    }
  },
});

export const updateRole = tool({
  description: 'Update an existing role in the library',
  inputSchema: z.object({
    id: z.string().describe('Role ID to update'),
    updates: roleInputSchema.partial().describe('Fields to update'),
  }),
  execute: async ({ id, updates }) => {
    const userId = getCurrentUserId();
    try {
      const role = await prisma.role.update({
        where: { id, userId },
        data: {
          ...(updates.company && { company: updates.company }),
          ...(updates.title && { title: updates.title }),
          ...(updates.location !== undefined && { location: updates.location }),
          ...(updates.startDate && { startDate: new Date(updates.startDate) }),
          ...(updates.endDate !== undefined && {
            endDate: updates.endDate === 'present' ? null : updates.endDate ? new Date(updates.endDate) : null
          }),
          ...(updates.summary !== undefined && { summary: updates.summary }),
        },
        include: { achievements: true },
      });

      return {
        success: true,
        id: role.id,
        company: role.company,
        title: role.title,
        location: role.location,
        startDate: role.startDate?.toISOString().slice(0, 7) ?? null,
        endDate: role.endDate?.toISOString().slice(0, 7) ?? null,
        summary: role.summary,
        achievements: role.achievements.map((a) => ({
          id: a.id,
          text: a.text,
          tags: a.tags,
        })),
      };
    } catch {
      return { success: false, error: 'Role not found or update failed' };
    }
  },
});

export const deleteRole = tool({
  description: 'Delete a role and all its achievements from the library',
  inputSchema: z.object({
    id: z.string().describe('Role ID to delete'),
  }),
  execute: async ({ id }) => {
    const userId = getCurrentUserId();
    try {
      await prisma.role.delete({
        where: { id, userId },
      });
      return { success: true, deleted: true, id };
    } catch {
      return { success: false, error: 'Role not found or already deleted' };
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
    const userId = getCurrentUserId();
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
    } catch {
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
      const userId = getCurrentUserId();
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

export const updateSkill = tool({
  description: 'Update an existing skill in the library',
  inputSchema: z.object({
    id: z.string().describe('Skill ID to update'),
    updates: skillInputSchema.partial().describe('Fields to update'),
  }),
  execute: async ({ id, updates }) => {
    const userId = getCurrentUserId();
    try {
      const skill = await prisma.skill.update({
        where: { id, userId },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.category !== undefined && { category: updates.category }),
          ...(updates.level !== undefined && { level: updates.level }),
        },
      });

      return {
        success: true,
        id: skill.id,
        name: skill.name,
        category: skill.category,
        level: skill.level,
      };
    } catch {
      return { success: false, error: 'Skill not found or update failed' };
    }
  },
});

export const deleteSkill = tool({
  description: 'Delete a skill from the library',
  inputSchema: z.object({
    id: z.string().describe('Skill ID to delete'),
  }),
  execute: async ({ id }) => {
    const userId = getCurrentUserId();
    try {
      await prisma.skill.delete({
        where: { id, userId },
      });

      return { success: true, deleted: true, id };
    } catch {
      return { success: false, error: 'Skill not found or already deleted' };
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
    const userId = getCurrentUserId();
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
    } catch {
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
      const userId = getCurrentUserId();
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

export const updateEducation = tool({
  description: 'Update an existing education entry in the library',
  inputSchema: z.object({
    id: z.string().describe('Education ID to update'),
    updates: educationInputSchema.partial().describe('Fields to update'),
  }),
  execute: async ({ id, updates }) => {
    const userId = getCurrentUserId();
    try {
      const education = await prisma.education.update({
        where: { id, userId },
        data: {
          ...(updates.institution && { institution: updates.institution }),
          ...(updates.degree && { degree: updates.degree }),
          ...(updates.field !== undefined && { field: updates.field }),
          ...(updates.location !== undefined && { location: updates.location }),
          ...(updates.startDate && { startDate: new Date(updates.startDate) }),
          ...(updates.endDate && {
            endDate: updates.endDate === 'present' ? null : new Date(updates.endDate)
          }),
          ...(updates.gpa !== undefined && { gpa: updates.gpa }),
          ...(updates.honors !== undefined && { honors: updates.honors }),
          ...(updates.activities && { activities: updates.activities }),
        },
      });

      return {
        success: true,
        id: education.id,
        institution: education.institution,
        degree: education.degree,
        field: education.field,
        location: education.location,
        startDate: education.startDate?.toISOString().slice(0, 7) ?? null,
        endDate: education.endDate?.toISOString().slice(0, 7) ?? null,
        gpa: education.gpa,
        honors: education.honors,
        activities: education.activities,
      };
    } catch {
      return { success: false, error: 'Education entry not found or update failed' };
    }
  },
});

export const deleteEducation = tool({
  description: 'Delete an education entry from the library',
  inputSchema: z.object({
    id: z.string().describe('Education ID to delete'),
  }),
  execute: async ({ id }) => {
    const userId = getCurrentUserId();
    try {
      await prisma.education.delete({
        where: { id, userId },
      });

      return { success: true, deleted: true, id };
    } catch {
      return { success: false, error: 'Education entry not found or already deleted' };
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
    const userId = getCurrentUserId();
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
    } catch {
      return { success: false, error: 'Failed to fetch contact details' };
    }
  },
});

export const updateContactDetails = tool({
  description: 'Create or update the user\'s contact details in the library',
  inputSchema: contactDetailsInputSchema,
  execute: async (input) => {
    console.log('[updateContactDetails] Input received:', JSON.stringify(input, null, 2));
    let userId: string;
    try {
      userId = getCurrentUserId();
      console.log('[updateContactDetails] userId:', userId);
    } catch (error) {
      console.error('[updateContactDetails] Failed to get userId:', error);
      return { success: false, error: `Failed to get user context: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }

    try {
      // Ensure user exists
      console.log('[updateContactDetails] Upserting user...');
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });
      console.log('[updateContactDetails] User upserted successfully');

      console.log('[updateContactDetails] Upserting contact details...');
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
      console.log('[updateContactDetails] Successfully saved contact details with id:', contactDetails.id);

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
      console.error('[updateContactDetails] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to save contact details: ${errorMessage}` };
    }
  },
});

export const parseResumeIntoLibrary = tool({
  description: `Parse a raw resume text and extract ALL sections: contact details, work experiences (achievements), skills, and education. Returns structured data for the LLM to process.

The LLM should:
1. Extract contact details from the resume header
2. Parse the resume text to identify work experiences and extract achievements
3. Extract all skills from the skills/technical skills section
4. Extract all education entries
5. Call the appropriate tools to add each type of data`,
  inputSchema: z.object({
    resumeText: z.string().describe('Raw resume text to parse'),
  }),
  execute: async ({ resumeText }) => {
    // This is a "prompt tool" - it returns instructions for the LLM
    // The actual parsing is done by the LLM's reasoning capability
    return {
      success: true,
      instruction: `Parse the following resume text and extract ALL information into the library.

## 0. CONTACT DETAILS (Header)
Extract from the resume header:
- Full name
- Email address
- Phone number (if present)
- Location (City, State/Country if present)
- LinkedIn URL (if present)
- Portfolio/website URL (if present)
- GitHub URL (if present)
- Professional headline (if present, e.g., "Senior Software Engineer")

Call \`updateContactDetails\` with the extracted contact information.

## 1. WORK EXPERIENCE (Roles with Achievements)
For each work experience section:
- Identify the company, title, location, and dates for the ROLE
- Extract each bullet point as a separate achievement under that role
- Optionally extract a 1-2 sentence summary of the role
- Suggest 2-5 tags for each achievement from this list:
  - Technical: engineering, technical, architecture, api, database, cloud, infrastructure, ai, ml, llm
  - Leadership: leadership, management, mentoring, team-building, cross-functional, hiring
  - Data: data, analytics, metrics, reporting, a/b-testing, data-driven
  - Product: product, roadmap, strategy, prioritization, user-research, mvp
  - Communication: communication, stakeholder, presentation, documentation
  - Impact: cost-reduction, revenue, efficiency, automation, scale, growth
  - Process: agile, scrum, process-improvement, optimization

Call \`addRolesWithAchievements\` with an array of roles, where each role contains:
- company, title, location, startDate, endDate, summary (optional)
- achievements: array of { text, tags[] }

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

## 4. OTHER SECTIONS (Projects, Certifications, Awards, Publications, Volunteer)

For any additional sections in the resume (Projects, Certifications, Awards, Publications, Volunteer Work, etc.):
- Identify the section type from the header (e.g., "Projects" → type: "project", "Certifications" → type: "certification", "Awards" → type: "award", "Publications" → type: "publication", "Volunteer" → type: "volunteer")
- Extract each item with:
  - type: The section type (project, certification, award, publication, volunteer, or other descriptive type)
  - title: The project/award/certification name
  - subtitle: Organization, issuer, or context (optional)
  - date: When it occurred or was earned (optional)
  - location: Where it happened (optional)
  - bullets: Description or details as bullet points
  - tags: Relevant tags for matching (similar to achievements)
  - url: Link if applicable

Call \`addLibraryItems\` with the extracted items.

## IMPORTANT
- Extract EVERYTHING from the resume - don't skip any sections
- Contact details are typically at the very top of the resume
- If a section is not present in the resume, that's fine - just skip that tool call
- Present ALL extracted data to the user for confirmation before calling the add tools

Resume text to parse:
---
${resumeText}
---`,
      schema: {
        contactDetails: '{ fullName, email, phone?, location?, linkedinUrl?, portfolioUrl?, githubUrl?, headline? }',
        roles: 'array of { company, title, location?, startDate (YYYY-MM), endDate (YYYY-MM or "present"), summary?, achievements: [{ text, tags[] }] }',
        skills: 'array of { name, category?, level? }',
        education: 'array of { institution, degree, field?, location?, startDate?, endDate?, gpa?, honors?, activities[]? }',
        libraryItems: 'array of { type, title, subtitle?, date?, location?, bullets[]?, tags[]?, url? }',
      },
    };
  },
});

// ============================================================================
// Library Items Tools (Projects, Certifications, Awards, Publications, etc.)
// ============================================================================

export const getLibraryItems = tool({
  description: 'Get library items, optionally filtered by type',
  inputSchema: z.object({
    type: z.string().optional().describe('Filter by type (project, certification, award, publication, volunteer, etc.)'),
  }),
  execute: async ({ type }) => {
    const userId = getCurrentUserId();
    try {
      const where: Record<string, unknown> = { userId };
      if (type) {
        where.type = type;
      }

      const items = await prisma.libraryItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        items: items.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          subtitle: item.subtitle,
          date: item.date,
          location: item.location,
          bullets: item.bullets,
          tags: item.tags,
          url: item.url,
        })),
      };
    } catch {
      return { success: false, error: 'Failed to fetch library items' };
    }
  },
});

export const addLibraryItems = tool({
  description: 'Add multiple library items at once (projects, certifications, awards, publications, volunteer work, etc.)',
  inputSchema: z.object({
    items: z.array(libraryItemInputSchema).describe('Array of items to add'),
  }),
  execute: async ({ items }) => {
    console.log('[addLibraryItems] Starting with', items.length, 'items');
    let userId: string;
    try {
      userId = getCurrentUserId();
      console.log('[addLibraryItems] userId:', userId);
    } catch (error) {
      console.error('[addLibraryItems] Failed to get userId:', error);
      return { success: false, error: `Failed to get user context: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }

    try {
      // Ensure user exists
      console.log('[addLibraryItems] Upserting user...');
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@temp.local` },
      });
      console.log('[addLibraryItems] User upserted successfully');

      console.log('[addLibraryItems] Creating library items...');
      const created = await prisma.libraryItem.createMany({
        data: items.map((item) => ({
          userId,
          type: item.type,
          title: item.title,
          subtitle: item.subtitle ?? null,
          date: item.date ?? null,
          location: item.location ?? null,
          bullets: item.bullets ?? [],
          tags: item.tags ?? [],
          url: item.url ?? null,
        })),
      });
      console.log('[addLibraryItems] Successfully created', created.count, 'items');

      return {
        success: true,
        added: created.count,
        message: `Successfully added ${created.count} items to your library.`,
      };
    } catch (error) {
      console.error('[addLibraryItems] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Failed to add library items: ${errorMessage}` };
    }
  },
});

export const updateLibraryItem = tool({
  description: 'Update an existing library item',
  inputSchema: z.object({
    id: z.string().describe('Library item ID to update'),
    updates: libraryItemInputSchema.partial().describe('Fields to update'),
  }),
  execute: async ({ id, updates }) => {
    const userId = getCurrentUserId();
    try {
      const item = await prisma.libraryItem.update({
        where: { id, userId },
        data: {
          ...(updates.type && { type: updates.type }),
          ...(updates.title && { title: updates.title }),
          ...(updates.subtitle !== undefined && { subtitle: updates.subtitle }),
          ...(updates.date !== undefined && { date: updates.date }),
          ...(updates.location !== undefined && { location: updates.location }),
          ...(updates.bullets && { bullets: updates.bullets }),
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.url !== undefined && { url: updates.url }),
        },
      });

      return {
        success: true,
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        date: item.date,
        location: item.location,
        bullets: item.bullets,
        tags: item.tags,
        url: item.url,
      };
    } catch {
      return { success: false, error: 'Library item not found or update failed' };
    }
  },
});

export const deleteLibraryItem = tool({
  description: 'Delete a library item',
  inputSchema: z.object({
    id: z.string().describe('Library item ID to delete'),
  }),
  execute: async ({ id }) => {
    const userId = getCurrentUserId();
    try {
      await prisma.libraryItem.delete({
        where: { id, userId },
      });

      return { success: true, deleted: true, id };
    } catch {
      return { success: false, error: 'Library item not found or already deleted' };
    }
  },
});

// ============================================================================
// Professional Summary Tools
// ============================================================================

export const getProfessionalSummary = tool({
  description: 'Get the user\'s professional summary from the library',
  inputSchema: z.object({}),
  execute: async () => {
    const userId = getCurrentUserId();
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { professionalSummary: true },
      });

      return {
        success: true,
        professionalSummary: user?.professionalSummary ?? null,
      };
    } catch {
      return { success: false, error: 'Failed to fetch professional summary' };
    }
  },
});

export const updateProfessionalSummary = tool({
  description: 'Update the user\'s professional summary in the library',
  inputSchema: z.object({
    summary: z.string().describe('Professional summary text (2-4 sentences)'),
  }),
  execute: async ({ summary }) => {
    const userId = getCurrentUserId();
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { professionalSummary: summary },
        create: { id: userId, email: `${userId}@temp.local`, professionalSummary: summary },
      });

      return {
        success: true,
        professionalSummary: summary,
        message: 'Professional summary updated.',
      };
    } catch {
      return { success: false, error: 'Failed to update professional summary' };
    }
  },
});
