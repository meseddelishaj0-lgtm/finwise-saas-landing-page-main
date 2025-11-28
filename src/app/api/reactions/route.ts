import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/reactions - Add or update reaction
export async function POST(req: NextRequest) {
  try {
    const { postId, commentId, type, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!postId && !commentId) {
      return NextResponse.json(
        { error: "Either postId or commentId is required" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json({ error: "Reaction type is required" }, { status: 400 });
    }

    const validTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid reaction type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingReaction = await prisma.reaction.findFirst({
      where: {
        userId: user.id,
        ...(postId ? { postId } : { commentId })
      }
    });

    if (existingReaction) {
      const updatedReaction = await prisma.reaction.update({
        where: { id: existingReaction.id },
        data: { emoji: type },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      return NextResponse.json(updatedReaction, { status: 200 });
    } else {
      const newReaction = await prisma.reaction.create({
        data: {
          userId: user.id,
          emoji: type,
          ...(postId ? { postId } : { commentId })
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      return NextResponse.json(newReaction, { status: 201 });
    }
  } catch (err) {
    console.error("❌ Error adding reaction:", err);
    return NextResponse.json({ error: "Failed to add reaction" }, { status: 500 });
  }
}

// GET /api/reactions?postId=123 - Get reactions (PUBLIC)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postIdStr = searchParams.get("postId");
    const commentIdStr = searchParams.get("commentId");

    if (!postIdStr && !commentIdStr) {
      return NextResponse.json(
        { error: "Either postId or commentId is required" },
        { status: 400 }
      );
    }

    const postId = postIdStr ? parseInt(postIdStr, 10) : undefined;
    const commentId = commentIdStr ? parseInt(commentIdStr, 10) : undefined;

    const reactions = await prisma.reaction.findMany({
      where: postId ? { postId } : { commentId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(reactions, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching reactions:", err);
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 });
  }
}
