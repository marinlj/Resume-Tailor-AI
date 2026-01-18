import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const role = await prisma.role.findFirst({
    where: { id, userId: session.user.id },
    include: { achievements: true },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  return NextResponse.json({ role });
}

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
    const role = await prisma.role.update({
      where: { id, userId: session.user.id },
      data: {
        ...(body.company && { company: body.company }),
        ...(body.title && { title: body.title }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && {
          endDate: body.endDate === 'present' ? null : body.endDate ? new Date(body.endDate) : null,
        }),
        ...(body.summary !== undefined && { summary: body.summary || null }),
      },
      include: { achievements: true },
    });

    return NextResponse.json({ role });
  } catch {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
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
    await prisma.role.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }
}
