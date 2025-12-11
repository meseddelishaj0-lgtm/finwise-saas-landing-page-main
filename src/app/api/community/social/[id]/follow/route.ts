// app/api/community/users/[id]/follow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

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
        { error: 'You cannot follow yourself' },
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

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        action: 'unfollowed',
        isFollowing: false,
        message: `You have unfollowed this user`,
      });
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: userId,
          followingId: targetUserId,
        },
      });

      // Create notification for the target user
      try {
        await prisma.notification.create({
          data: {
            type: 'follow',
            userId: targetUserId,
            fromUserId: userId,
            message: `User ${userId} started following you.`,
          },
        });
      } catch (notifError) {
        console.error('Error creating follow notification:', notifError);
        // Don't fail the follow if notification fails
      }

      return NextResponse.json({
        success: true,
        action: 'followed',
        isFollowing: true,
        message: `You are now following this user`,
      });
    }
  } catch (error) {
    console.error('Error in follow/unfollow:', error);
    return NextResponse.json(
      { error: 'Failed to process follow request' },
      { status: 500 }
    );
  }
}

// GET - Check if user is following another user
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

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: parseInt(userId),
          followingId: targetUserId,
        },
      },
    });

    return NextResponse.json({
      isFollowing: !!existingFollow,
    });
  } catch (error) {
    console.error('Error checking follow status:', error);
    return NextResponse.json(
      { error: 'Failed to check follow status' },
      { status: 500 }
    );
  }
}
