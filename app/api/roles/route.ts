import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = await prisma.role.findMany({
    where: { userId: session.user.id },
    include: { achievements: true },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const role = await prisma.role.create({
    data: {
      userId: session.user.id,
      company: body.company,
      title: body.title,
      location: body.location || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate === 'present' ? null : body.endDate ? new Date(body.endDate) : null,
      summary: body.summary || null,
    },
  });

  return NextResponse.json({ role });
}
