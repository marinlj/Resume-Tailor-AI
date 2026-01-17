import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Debug endpoint to check database state - REMOVE IN PRODUCTION
export async function GET() {
  const session = await auth();

  console.log('[api/debug] Session:', JSON.stringify(session, null, 2));

  // Get all users and their data counts
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      _count: {
        select: {
          achievements: true,
          skills: true,
          education: true,
        },
      },
    },
  });

  // Get contact details for each user
  const contactDetails = await prisma.contactDetails.findMany({
    select: {
      id: true,
      userId: true,
      fullName: true,
      email: true,
    },
  });

  // Get total counts
  const totalAchievements = await prisma.achievement.count();
  const totalSkills = await prisma.skill.count();
  const totalEducation = await prisma.education.count();

  return NextResponse.json({
    currentSession: {
      userId: session?.user?.id ?? 'none',
      email: session?.user?.email ?? 'none',
      name: session?.user?.name ?? 'none',
    },
    users,
    contactDetails,
    totals: {
      achievements: totalAchievements,
      skills: totalSkills,
      education: totalEducation,
    },
  });
}
