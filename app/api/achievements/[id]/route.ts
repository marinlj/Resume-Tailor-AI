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

  // Verify ownership through the role
  const achievement = await prisma.achievement.findFirst({
    where: { id },
    include: { role: { select: { userId: true } } },
  });

  if (!achievement || achievement.role.userId !== session.user.id) {
    return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
  }

  const body = await req.json();

  const updated = await prisma.achievement.update({
    where: { id },
    data: {
      ...(body.text !== undefined && { text: body.text }),
      ...(body.tags !== undefined && { tags: body.tags }),
    },
  });

  return NextResponse.json({ achievement: updated });
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

  // Verify ownership through the role
  const achievement = await prisma.achievement.findFirst({
    where: { id },
    include: { role: { select: { userId: true } } },
  });

  if (!achievement || achievement.role.userId !== session.user.id) {
    return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
  }

  await prisma.achievement.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
