import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/posts/[postId]/views - Record a view
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const userId = request.headers.get("x-user-id");

    const postIdNum = parseInt(postId);
    if (isNaN(postIdNum)) {
      return NextResponse.json(
        { error: "Invalid post ID" },
        { status: 400 }
      );
    }

    const userIdNum = userId ? parseInt(userId) : null;
    if (userId && isNaN(userIdNum as number)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postIdNum },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Don't count view if user is the post author
    if (userIdNum && post.userId === userIdNum) {
      return NextResponse.json({
        success: true,
        message: "Own post view not counted",
      });
    }

    // Check if user already viewed this post in the last hour (to avoid spam)
    if (userIdNum) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existingView = await prisma.postView.findFirst({
        where: {
          postId: postIdNum,
          userId: userIdNum,
          viewedAt: { gte: oneHourAgo },
        },
      });

      if (existingView) {
        return NextResponse.json({
          success: true,
          message: "View already recorded recently",
        });
      }
    }

    // Record the view
    await prisma.postView.create({
      data: {
        postId: postIdNum,
        userId: userIdNum,
      },
    });

    return NextResponse.json({
      success: true,
      message: "View recorded",
    });
  } catch (error) {
    console.error("Error recording view:", error);
    return NextResponse.json(
      { error: "Failed to record view" },
      { status: 500 }
    );
  }
}

// GET /api/posts/[postId]/views - Get view count and insights
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    const postIdNum = parseInt(postId);
    if (isNaN(postIdNum)) {
      return NextResponse.json(
        { error: "Invalid post ID" },
        { status: 400 }
      );
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postIdNum },
      select: { id: true, userId: true, createdAt: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Get total view count
    const totalViews = await prisma.postView.count({
      where: { postId: postIdNum },
    });

    // Get unique viewer count
    const uniqueViewers = await prisma.postView.groupBy({
      by: ['userId'],
      where: {
        postId: postIdNum,
        userId: { not: null },
      },
    });

    // Get views in the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentViews = await prisma.postView.count({
      where: {
        postId: postIdNum,
        viewedAt: { gte: last24Hours },
      },
    });

    // Get views in the last 7 days
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyViews = await prisma.postView.count({
      where: {
        postId: postIdNum,
        viewedAt: { gte: last7Days },
      },
    });

    return NextResponse.json({
      postId: postIdNum,
      totalViews,
      uniqueViewers: uniqueViewers.length,
      recentViews,  // Last 24 hours
      weeklyViews,  // Last 7 days
    });
  } catch (error) {
    console.error("Error fetching view insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch view insights" },
      { status: 500 }
    );
  }
}
