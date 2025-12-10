import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/user/muted - Get all users muted by current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const mutedUsers = await prisma.mute.findMany({
      where: {
        oderId: parseInt(userId),
      },
      include: {
        muted: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the response to a cleaner format
    const result = mutedUsers.map((mute) => ({
      id: mute.muted.id,
      name: mute.muted.name,
      email: mute.muted.email,
      profileImage: mute.muted.profileImage,
      mutedAt: mute.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching muted users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch muted users' },
      { status: 500 }
    );
  }
}
