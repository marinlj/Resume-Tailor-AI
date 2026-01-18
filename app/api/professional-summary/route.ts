import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { professionalSummary: true },
    });

    return NextResponse.json({ professionalSummary: user?.professionalSummary || null });
  } catch (error) {
    console.error('[api/professional-summary] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { summary } = body;

    if (typeof summary !== 'string') {
      return NextResponse.json({ error: 'Summary must be a string' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { professionalSummary: summary },
    });

    return NextResponse.json({ professionalSummary: summary });
  } catch (error) {
    console.error('[api/professional-summary] PUT error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
