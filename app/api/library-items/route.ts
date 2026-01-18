// app/api/library-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const libraryItems = await prisma.libraryItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ libraryItems });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const libraryItem = await prisma.libraryItem.create({
    data: {
      userId: session.user.id,
      type: body.type,
      title: body.title,
      subtitle: body.subtitle || null,
      date: body.date || null,
      location: body.location || null,
      url: body.url || null,
      bullets: body.bullets || [],
      tags: body.tags || [],
    },
  });

  return NextResponse.json({ libraryItem });
}
