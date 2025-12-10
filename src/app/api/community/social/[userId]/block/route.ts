// app/api/community/users/[id]/block/route.ts
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
        { error: 'You cannot block yourself' },
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

    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: targetUserId,
        },
      },
    });

    if (existingBlock) {
      // Unblock
      await prisma.block.delete({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId: targetUserId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        action: 'unblocked',
        isBlocked: false,
        message: `You have unblocked this user`,
      });
    } else {
      // Block the user
      await prisma.block.create({
        data: {
          blockerId: userId,
          blockedId: targetUserId,
        },
      });

      // Also unfollow if following
      try {
        await prisma.follow.deleteMany({
          where: {
            OR: [
              { followerId: userId, followingId: targetUserId },
              { followerId: targetUserId, followingId: userId },
            ],
          },
        });
      } catch (unfollowError) {
        console.error('Error unfollowing during block:', unfollowError);
      }

      return NextResponse.json({
        success: true,
        action: 'blocked',
        isBlocked: true,
        message: `You have blocked this user`,
      });
    }
  } catch (error) {
    console.error('Error in block/unblock:', error);
    return NextResponse.json(
      { error: 'Failed to process block request' },
      { status: 500 }
    );
  }
}

// GET - Check if user has blocked another user
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

    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: parseInt(userId),
          blockedId: targetUserId,
        },
      },
    });

    return NextResponse.json({
      isBlocked: !!existingBlock,
    });
  } catch (error) {
    console.error('Error checking block status:', error);
    return NextResponse.json(
      { error: 'Failed to check block status' },
      { status: 500 }
    );
  }
}

// DELETE - Unblock a user
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

    await prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId: parseInt(userId),
          blockedId: targetUserId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      isBlocked: false,
      message: 'User has been unblocked',
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json(
      { error: 'Failed to unblock user' },
      { status: 500 }
    );
  }
}
