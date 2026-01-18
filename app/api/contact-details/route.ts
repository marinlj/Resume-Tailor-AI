import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const contactDetails = await prisma.contactDetails.upsert({
    where: { userId: session.user.id },
    update: {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || null,
      location: body.location || null,
      linkedinUrl: body.linkedinUrl || null,
      portfolioUrl: body.portfolioUrl || null,
      githubUrl: body.githubUrl || null,
      headline: body.headline || null,
    },
    create: {
      userId: session.user.id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || null,
      location: body.location || null,
      linkedinUrl: body.linkedinUrl || null,
      portfolioUrl: body.portfolioUrl || null,
      githubUrl: body.githubUrl || null,
      headline: body.headline || null,
    },
  });

  return NextResponse.json({ contactDetails });
}
