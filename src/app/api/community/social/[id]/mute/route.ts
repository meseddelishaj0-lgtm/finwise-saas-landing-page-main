// app/api/community/users/[id]/mute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await request.json();
    const targetUserId = parseInt(params.id);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { error: 'You cannot mute yourself' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already muted
    const existingMute = await prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId: userId,
          mutedId: targetUserId,
        },
      },
    });

    if (existingMute) {
      // Unmute
      await prisma.mute.delete({
        where: {
          muterId_mutedId: {
            muterId: userId,
            mutedId: targetUserId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        action: 'unmuted',
        isMuted: false,
        message: `You have unmuted this user`,
      });
    } else {
      // Mute the user
      await prisma.mute.create({
        data: {
          muterId: userId,
          mutedId: targetUserId,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'muted',
        isMuted: true,
        message: `You have muted this user. You won't receive notifications from them.`,
      });
    }
  } catch (error) {
    console.error('Error in mute/unmute:', error);
    return NextResponse.json(
      { error: 'Failed to process mute request' },
      { status: 500 }
    );
  }
}

// GET - Check if user has muted another user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetUserId = parseInt(params.id);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const existingMute = await prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId: parseInt(userId),
          mutedId: targetUserId,
        },
      },
    });

    return NextResponse.json({
      isMuted: !!existingMute,
    });
  } catch (error) {
    console.error('Error checking mute status:', error);
    return NextResponse.json(
      { error: 'Failed to check mute status' },
      { status: 500 }
    );
  }
}

// DELETE - Unmute a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetUserId = parseInt(params.id);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await prisma.mute.delete({
      where: {
        muterId_mutedId: {
          muterId: parseInt(userId),
          mutedId: targetUserId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      isMuted: false,
      message: 'User has been unmuted',
    });
  } catch (error) {
    console.error('Error unmuting user:', error);
    return NextResponse.json(
      { error: 'Failed to unmute user' },
      { status: 500 }
    );
  }
}
