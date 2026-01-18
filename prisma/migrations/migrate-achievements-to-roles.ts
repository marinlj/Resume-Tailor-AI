import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

interface RawAchievement {
  id: string;
  userId: string;
  company: string;
  title: string;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  text: string;
  tags: string[];
}

interface RoleData {
  userId: string;
  company: string;
  title: string;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  achievements: Array<{ id: string; text: string; tags: string[] }>;
}

/**
 * Data migration script for Task 1.2
 *
 * This script migrates existing Achievement data to the new Role model:
 * 1. Fetches all existing achievements using raw SQL
 * 2. Groups achievements by (userId, company, title, startDate) to identify unique roles
 * 3. Creates Role records for each unique combination
 * 4. Updates achievements with the roleId reference
 *
 * Run this script AFTER the intermediate migration adds the roleId column to Achievement
 * and BEFORE the final migration makes roleId required.
 */
async function migrateAchievementsToRoles(): Promise<void> {
  console.log('Starting migration: Achievements -> Roles...\n');

  // Fetch all existing achievements using raw SQL
  // We use raw SQL because the schema may be in an intermediate state
  const achievements = await prisma.$queryRaw<RawAchievement[]>`
    SELECT id, "userId", company, title, location, "startDate", "endDate", text, tags
    FROM "Achievement"
  `;

  if (achievements.length === 0) {
    console.log('No achievements found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${achievements.length} achievements to process.\n`);

  // Group achievements by unique role key: (userId, company, title, startDate)
  const roleMap = new Map<string, RoleData>();

  for (const ach of achievements) {
    // Create a consistent key for grouping
    // Handle null startDate by using 'null' string
    const startDateKey = ach.startDate?.toISOString() ?? 'null';
    const key = `${ach.userId}|${ach.company}|${ach.title}|${startDateKey}`;

    if (!roleMap.has(key)) {
      roleMap.set(key, {
        userId: ach.userId,
        company: ach.company,
        title: ach.title,
        location: ach.location,
        startDate: ach.startDate,
        endDate: ach.endDate,
        achievements: [],
      });
    }

    const roleData = roleMap.get(key)!;
    roleData.achievements.push({
      id: ach.id,
      text: ach.text,
      tags: ach.tags,
    });

    // If this achievement has location/endDate and the role doesn't, use it
    // This handles cases where achievements in the same role have different metadata
    if (!roleData.location && ach.location) {
      roleData.location = ach.location;
    }
    if (!roleData.endDate && ach.endDate) {
      roleData.endDate = ach.endDate;
    }
  }

  console.log(`Identified ${roleMap.size} unique roles.\n`);

  // Create roles and update achievements
  let createdCount = 0;
  let updatedAchievements = 0;

  for (const [, roleData] of roleMap) {
    try {
      // Check if role already exists (idempotent) using Prisma's findFirst
      // This handles NULL startDate correctly
      const existingRole = await prisma.role.findFirst({
        where: {
          userId: roleData.userId,
          company: roleData.company,
          title: roleData.title,
          startDate: roleData.startDate, // Prisma handles NULL correctly
        },
      });

      let roleId: string;
      const achievementIds = roleData.achievements.map((a) => a.id);

      if (existingRole) {
        roleId = existingRole.id;
        console.log(`  Role already exists: ${roleData.company} - ${roleData.title} (id: ${roleId})`);

        // Update achievements with roleId using Prisma's type-safe updateMany
        try {
          await prisma.achievement.updateMany({
            where: { id: { in: achievementIds } },
            data: { roleId },
          });
          updatedAchievements += achievementIds.length;
          console.log(`    Linked ${achievementIds.length} achievements`);
        } catch (error) {
          // roleId column might not exist yet - this is expected in certain migration states
          if (error instanceof Error && error.message.includes('roleId')) {
            console.log(`    Note: roleId column not yet added - achievements will be linked after schema migration`);
          } else {
            throw error;
          }
        }
      } else {
        // Wrap role creation and achievement update in a transaction
        try {
          const result = await prisma.$transaction(async (tx) => {
            // Create the role
            const newRole = await tx.role.create({
              data: {
                userId: roleData.userId,
                company: roleData.company,
                title: roleData.title,
                location: roleData.location,
                startDate: roleData.startDate,
                endDate: roleData.endDate,
              },
            });

            // Update achievements with roleId using Prisma's type-safe updateMany
            let linkedCount = 0;
            try {
              await tx.achievement.updateMany({
                where: { id: { in: achievementIds } },
                data: { roleId: newRole.id },
              });
              linkedCount = achievementIds.length;
            } catch (error) {
              // roleId column might not exist yet - this is expected in certain migration states
              if (error instanceof Error && error.message.includes('roleId')) {
                console.log(`    Note: roleId column not yet added - achievements will be linked after schema migration`);
              } else {
                throw error;
              }
            }

            return { roleId: newRole.id, linkedCount };
          });

          roleId = result.roleId;
          createdCount++;
          updatedAchievements += result.linkedCount;
          console.log(`  Created role: ${roleData.company} - ${roleData.title} (id: ${roleId})`);
          if (result.linkedCount > 0) {
            console.log(`    Linked ${result.linkedCount} achievements`);
          }
        } catch (error) {
          // Handle unique constraint violation (concurrent creation)
          if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
            // Unique constraint violation - find the existing role
            const found = await prisma.role.findFirst({
              where: {
                userId: roleData.userId,
                company: roleData.company,
                title: roleData.title,
                startDate: roleData.startDate,
              },
            });
            if (found) {
              roleId = found.id;
              console.log(`  -> Using existing role (concurrent creation): ${roleData.company} - ${roleData.title}`);

              // Update achievements with roleId
              try {
                await prisma.achievement.updateMany({
                  where: { id: { in: achievementIds } },
                  data: { roleId },
                });
                updatedAchievements += achievementIds.length;
                console.log(`    Linked ${achievementIds.length} achievements`);
              } catch (updateError) {
                if (updateError instanceof Error && updateError.message.includes('roleId')) {
                  console.log(`    Note: roleId column not yet added - achievements will be linked after schema migration`);
                } else {
                  throw updateError;
                }
              }
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error(`  Error processing role ${roleData.company} - ${roleData.title}:`, error);
      throw error;
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Roles created: ${createdCount}`);
  console.log(`Roles found existing: ${roleMap.size - createdCount}`);
  console.log(`Achievements linked: ${updatedAchievements}`);
  console.log('\nMigration complete!');
}

// Main execution
migrateAchievementsToRoles()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
