// app/api/skills/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const skills = await prisma.skill.findMany({
    where: { userId: session.user.id },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ skills });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const skill = await prisma.skill.create({
    data: {
      userId: session.user.id,
      name: body.name,
      category: body.category || null,
      level: body.level || null,
    },
  });

  return NextResponse.json({ skill });
}
