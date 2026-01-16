import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [contactDetails, achievements, skills, education] = await Promise.all([
    prisma.contactDetails.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.achievement.findMany({
      where: { userId: session.user.id },
      orderBy: [{ company: 'asc' }, { startDate: 'desc' }],
    }),
    prisma.skill.findMany({
      where: { userId: session.user.id },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.education.findMany({
      where: { userId: session.user.id },
      orderBy: { endDate: 'desc' },
    }),
  ]);

  return NextResponse.json({ contactDetails, achievements, skills, education });
}
