import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// Helper to get user ID from either query param or JWT token
async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  // First check query param
  const { searchParams } = new URL(request.url);
  const queryUserId = searchParams.get('userId');
  if (queryUserId) {
    return parseInt(queryUserId);
  }
  
  // Then check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
      return parseInt(decoded.userId);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }
  
  return null;
}

// GET /api/user/profile - Get current user's profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Force fresh database query (no caching)
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

    // Return with no-cache headers
    return new NextResponse(JSON.stringify(user), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
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
    const { userId: bodyUserId, username, name, bio, location, website, profileImage, bannerImage, profileComplete } = body;
    
    // Get userId from body or JWT token
    let userId = bodyUserId;
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
          userId = decoded.userId;
        } catch (error) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
      }
    }
    
    console.log('Parsed values - userId:', userId, 'name:', name, 'username:', username);

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
      ...(username && { username: username.toLowerCase() }),
      ...(name !== undefined && { name }),
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(website !== undefined && { website }),
      ...(profileImage !== undefined && { profileImage }),
      ...(bannerImage !== undefined && { bannerImage }),
      ...(profileComplete !== undefined && { profileComplete }),
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
        profileComplete: true,
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

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
