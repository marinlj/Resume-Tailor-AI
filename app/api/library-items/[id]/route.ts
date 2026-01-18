// app/api/library-items/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const libraryItem = await prisma.libraryItem.update({
      where: { id, userId: session.user.id },
      data: {
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
  } catch {
    return NextResponse.json({ error: 'Library item not found' }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.libraryItem.delete({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Library item not found' }, { status: 404 });
  }
}
