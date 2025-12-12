// src/app/api/messages/route.ts
// Direct Messages API - Conversations list
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Get user's conversations
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userIdInt = parseInt(userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1: userIdInt },
          { participant2: userIdInt },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
            isVerified: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
            isVerified: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            isRead: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Format conversations with the other user info
    const formattedConversations = conversations.map(conv => {
      const otherUser = conv.participant1 === userIdInt ? conv.user2 : conv.user1;
      const lastMessage = conv.messages[0];
      const unreadCount = lastMessage && !lastMessage.isRead && lastMessage.senderId !== userIdInt ? 1 : 0;

      return {
        id: conv.id,
        otherUser,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          isFromMe: lastMessage.senderId === userIdInt,
        } : null,
        unreadCount,
        updatedAt: conv.lastMessageAt || conv.createdAt,
      };
    });

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// Start a new conversation or get existing one
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId } = await req.json();

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID required' }, { status: 400 });
    }

    const userIdInt = parseInt(userId);
    const recipientIdInt = parseInt(recipientId);

    if (userIdInt === recipientIdInt) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientIdInt },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if blocked
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userIdInt, blockedId: recipientIdInt },
          { blockerId: recipientIdInt, blockedId: userIdInt },
        ],
      },
    });

    if (isBlocked) {
      return NextResponse.json({ error: 'Cannot message this user' }, { status: 403 });
    }

    // Find or create conversation (ordered by smaller ID first for consistency)
    const [p1, p2] = userIdInt < recipientIdInt
      ? [userIdInt, recipientIdInt]
      : [recipientIdInt, userIdInt];

    let conversation = await prisma.conversation.findUnique({
      where: {
        participant1_participant2: {
          participant1: p1,
          participant2: p2,
        },
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
      conversation = await prisma.conversation.create({
        data: {
          participant1: p1,
          participant2: p2,
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
    }

    const otherUser = conversation.participant1 === userIdInt
      ? conversation.user2
      : conversation.user1;

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        otherUser,
      },
    });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
