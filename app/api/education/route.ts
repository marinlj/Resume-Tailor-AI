// app/api/education/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const education = await prisma.education.findMany({
    where: { userId: session.user.id },
    orderBy: { endDate: 'desc' },
  });

  return NextResponse.json({ education });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const education = await prisma.education.create({
    data: {
      userId: session.user.id,
      institution: body.institution,
      degree: body.degree,
      field: body.field || null,
      location: body.location || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      gpa: body.gpa || null,
      honors: body.honors || null,
      activities: body.activities || [],
    },
  });

  return NextResponse.json({ education });
}
