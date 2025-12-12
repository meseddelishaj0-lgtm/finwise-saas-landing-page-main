// src/app/api/messages/[conversationId]/route.ts
// Messages within a conversation
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPushNotificationToUser } from '@/lib/pushNotifications';

export const dynamic = 'force-dynamic';

// Get messages in a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const userIdInt = parseInt(userId);
    const conversationIdInt = parseInt(conversationId);

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationIdInt,
        OR: [
          { participant1: userIdInt },
          { participant2: userIdInt },
        ],
      },
      include: {
        user1: {
          select: { id: true, username: true, name: true, profileImage: true, isVerified: true },
        },
        user2: {
          select: { id: true, username: true, name: true, profileImage: true, isVerified: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages with pagination
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50');

    const messages = await prisma.message.findMany({
      where: { conversationId: conversationIdInt },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && {
        cursor: { id: parseInt(cursor) },
        skip: 1,
      }),
      include: {
        sender: {
          select: { id: true, username: true, name: true, profileImage: true },
        },
      },
    });

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: {
        conversationId: conversationIdInt,
        senderId: { not: userIdInt },
        isRead: false,
      },
      data: { isRead: true },
    });

    const otherUser = conversation.participant1 === userIdInt
      ? conversation.user2
      : conversation.user1;

    return NextResponse.json({
      messages: messages.reverse(),
      otherUser,
      nextCursor: messages.length === limit ? messages[0].id : null,
    });
  } catch (error) {
    console.error('Conversation GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// Send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    const userIdInt = parseInt(userId);
    const conversationIdInt = parseInt(conversationId);

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationIdInt,
        OR: [
          { participant1: userIdInt },
          { participant2: userIdInt },
        ],
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get sender info for notification
    const sender = await prisma.user.findUnique({
      where: { id: userIdInt },
      select: { username: true, name: true },
    });

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: conversationIdInt,
        senderId: userIdInt,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, username: true, name: true, profileImage: true },
        },
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationIdInt },
      data: {
        lastMessage: content.trim().substring(0, 100),
        lastMessageAt: new Date(),
      },
    });

    // Send push notification to recipient
    const recipientId = conversation.participant1 === userIdInt
      ? conversation.participant2
      : conversation.participant1;

    const senderName = sender?.name || sender?.username || 'Someone';
    await sendPushNotificationToUser(
      recipientId,
      `New message from ${senderName}`,
      content.trim().substring(0, 100),
      { type: 'message', conversationId: conversationIdInt }
    );

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Message POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
