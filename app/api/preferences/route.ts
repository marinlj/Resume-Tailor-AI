import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prefs = await prisma.preference.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    preferences: prefs || {
      includeSummary: true,
      includeRoleSummaries: true,
      boldPattern: 'action_and_kpi',
      format: 'company_location_dates',
    },
  });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const prefs = await prisma.preference.upsert({
    where: { userId: session.user.id },
    update: body,
    create: {
      userId: session.user.id,
      ...body,
    },
  });

  return NextResponse.json({ preferences: prefs });
}
