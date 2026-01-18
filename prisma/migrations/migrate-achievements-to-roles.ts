import { PrismaClient } from '@prisma/client';

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
      // Check if role already exists (idempotent)
      const existingRole = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Role"
        WHERE "userId" = ${roleData.userId}
          AND company = ${roleData.company}
          AND title = ${roleData.title}
          AND ("startDate" = ${roleData.startDate} OR ("startDate" IS NULL AND ${roleData.startDate} IS NULL))
        LIMIT 1
      `;

      let roleId: string;

      if (existingRole.length > 0) {
        roleId = existingRole[0].id;
        console.log(`  Role already exists: ${roleData.company} - ${roleData.title} (id: ${roleId})`);
      } else {
        // Create the role
        const newRole = await prisma.role.create({
          data: {
            userId: roleData.userId,
            company: roleData.company,
            title: roleData.title,
            location: roleData.location,
            startDate: roleData.startDate,
            endDate: roleData.endDate,
          },
        });
        roleId = newRole.id;
        createdCount++;
        console.log(`  Created role: ${roleData.company} - ${roleData.title} (id: ${roleId})`);
      }

      // Update achievements with roleId using raw SQL
      const achievementIds = roleData.achievements.map((a) => a.id);

      // Check if roleId column exists before trying to update
      try {
        await prisma.$executeRaw`
          UPDATE "Achievement"
          SET "roleId" = ${roleId}
          WHERE id = ANY(${achievementIds})
        `;
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
