import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/messages - Get all conversations for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const userIdNum = parseInt(userId);

    // Get all conversations where user is either participant1 or participant2
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1: userIdNum },
          { participant2: userIdNum },
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
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // Format conversations for the app
    const formattedConversations = conversations.map((conv) => {
      const otherUser = conv.participant1 === userIdNum ? conv.user2 : conv.user1;
      const lastMessage = conv.messages[0] || null;

      // Count unread messages
      const unreadCount = conv.messages.filter(
        (msg) => !msg.isRead && msg.senderId !== userIdNum
      ).length;

      return {
        id: conv.id,
        otherUser: {
          id: otherUser.id,
          username: otherUser.username,
          name: otherUser.name,
          profileImage: otherUser.profileImage,
          isVerified: otherUser.isVerified,
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt.toISOString(),
              isFromMe: lastMessage.senderId === userIdNum,
            }
          : null,
        unreadCount,
        updatedAt: conv.lastMessageAt?.toISOString() || conv.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/messages - Start a new conversation or send a message
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const userIdNum = parseInt(userId);
    const body = await request.json();
    const { recipientId, content, imageUrl } = body;

    if (!recipientId || (!content && !imageUrl)) {
      return NextResponse.json(
        { error: "Recipient ID and content or image are required" },
        { status: 400 }
      );
    }

    const recipientIdNum = parseInt(recipientId);

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientIdNum },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Check if user is blocked
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: recipientIdNum, blockedId: userIdNum },
          { blockerId: userIdNum, blockedId: recipientIdNum },
        ],
      },
    });

    if (isBlocked) {
      return NextResponse.json(
        { error: "Cannot send message to this user" },
        { status: 403 }
      );
    }

    // Find or create conversation (ensure consistent ordering of user IDs)
    const [smallerId, largerId] = userIdNum < recipientIdNum
      ? [userIdNum, recipientIdNum]
      : [recipientIdNum, userIdNum];

    let conversation = await prisma.conversation.findUnique({
      where: {
        participant1_participant2: {
          participant1: smallerId,
          participant2: largerId,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1: smallerId,
          participant2: largerId,
        },
      });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userIdNum,
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt.toISOString(),
        senderId: message.senderId,
        sender: message.sender,
        isRead: message.isRead,
      },
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// DELETE /api/messages?conversationId=X - Delete a conversation
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);
    const conversationIdNum = parseInt(conversationId);

    // Find the conversation and verify user is a participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.participant1 !== userIdNum && conversation.participant2 !== userIdNum) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Delete all messages in the conversation first
    await prisma.message.deleteMany({
      where: { conversationId: conversationIdNum },
    });

    // Delete the conversation
    await prisma.conversation.delete({
      where: { id: conversationIdNum },
    });

    return NextResponse.json({ success: true, deletedConversationId: conversationIdNum });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
