import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { roleId } = await params;

  // Verify the role belongs to the user
  const role = await prisma.role.findFirst({
    where: { id: roleId, userId: session.user.id },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  const body = await req.json();

  const achievement = await prisma.achievement.create({
    data: {
      roleId,
      text: body.text,
      tags: body.tags || [],
    },
  });

  return NextResponse.json({ achievement });
}
