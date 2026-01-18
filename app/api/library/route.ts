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

    const [contactDetails, roles, skills, education, libraryItems] = await Promise.all([
      prisma.contactDetails.findUnique({
        where: { userId },
      }),
      prisma.role.findMany({
        where: { userId },
        include: { achievements: true },
        orderBy: [{ startDate: 'desc' }],
      }),
      prisma.skill.findMany({
        where: { userId },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.education.findMany({
        where: { userId },
        orderBy: { endDate: 'desc' },
      }),
      prisma.libraryItem.findMany({
        where: { userId },
        orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    console.log('[api/library] Results:', {
      hasContactDetails: !!contactDetails,
      rolesCount: roles.length,
      achievementsCount: roles.reduce((sum, role) => sum + role.achievements.length, 0),
      skillsCount: skills.length,
      educationCount: education.length,
      libraryItemsCount: libraryItems.length,
    });

    return NextResponse.json({ contactDetails, roles, skills, education, libraryItems });
  } catch (error) {
    console.error('[api/library] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
