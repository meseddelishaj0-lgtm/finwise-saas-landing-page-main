// src/app/api/notifications/register-device/route.ts
// Register device push tokens for push notifications
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pushToken, platform, deviceName } = body;

    if (!userId || !pushToken) {
      return NextResponse.json(
        { error: 'userId and pushToken are required' },
        { status: 400 }
      );
    }

    // Validate platform
    if (platform && !['ios', 'android', 'web'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be ios, android, or web' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Upsert the device token (update if exists, create if not)
    const deviceToken = await prisma.deviceToken.upsert({
      where: { pushToken },
      update: {
        userId: parseInt(userId),
        platform: platform || 'unknown',
        deviceName: deviceName || null,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: parseInt(userId),
        pushToken,
        platform: platform || 'unknown',
        deviceName: deviceName || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Device token registered successfully',
      deviceToken: {
        id: deviceToken.id,
        platform: deviceToken.platform,
        deviceName: deviceToken.deviceName,
      },
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    return NextResponse.json(
      { error: 'Failed to register device token' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to unregister a device token
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pushToken = searchParams.get('pushToken');

    if (!pushToken) {
      return NextResponse.json(
        { error: 'pushToken is required' },
        { status: 400 }
      );
    }

    // Deactivate the token instead of deleting (for audit purposes)
    await prisma.deviceToken.updateMany({
      where: { pushToken },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Device token unregistered successfully',
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    return NextResponse.json(
      { error: 'Failed to unregister device token' },
      { status: 500 }
    );
  }
}
