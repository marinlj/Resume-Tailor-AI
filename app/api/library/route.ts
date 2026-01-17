import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('[api/library] GET request received');
    const session = await auth();
    console.log('[api/library] Session userId:', session?.user?.id ?? 'none');

    if (!session?.user?.id) {
      console.log('[api/library] Unauthorized - no user id');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[api/library] Querying library for userId:', userId);

    const [contactDetails, achievements, skills, education] = await Promise.all([
      prisma.contactDetails.findUnique({
        where: { userId },
      }),
      prisma.achievement.findMany({
        where: { userId },
        orderBy: [{ company: 'asc' }, { startDate: 'desc' }],
      }),
      prisma.skill.findMany({
        where: { userId },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.education.findMany({
        where: { userId },
        orderBy: { endDate: 'desc' },
      }),
    ]);

    console.log('[api/library] Results:', {
      hasContactDetails: !!contactDetails,
      achievementsCount: achievements.length,
      skillsCount: skills.length,
      educationCount: education.length,
    });

    return NextResponse.json({ contactDetails, achievements, skills, education });
  } catch (error) {
    console.error('[api/library] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
