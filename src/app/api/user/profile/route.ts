import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/user/profile - Get current user's profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        location: true,
        website: true,
        profileImage: true,
        bannerImage: true,
        createdAt: true,
        subscriptionTier: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            likes: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Profile update received:', JSON.stringify(body));
    const { userId, username, name, bio, location, website, profileImage, bannerImage } = body;
    console.log('Parsed values - name:', name, 'username:', username);

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username,
          NOT: { id: parseInt(userId) },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        );
      }

      // Validate username format (alphanumeric, underscores, 3-20 chars)
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' },
          { status: 400 }
        );
      }
    }

    const updateData = {
      ...(username && { username }),
      ...(name !== undefined && { name }),
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(website !== undefined && { website }),
      ...(profileImage !== undefined && { profileImage }),
      ...(bannerImage !== undefined && { bannerImage }),
    };
    console.log('Update data:', JSON.stringify(updateData));

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        location: true,
        website: true,
        profileImage: true,
        bannerImage: true,
        createdAt: true,
        subscriptionTier: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            likes: true,
          },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
