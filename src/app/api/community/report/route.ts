// app/api/community/report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveMobileUserId } from '@/lib/mobileAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept both the server's canonical names and the app's names
    // (reporterId/reportedId) so the report feature works regardless of build.
    const reportedUserId = body.reportedUserId ?? body.reportedId ?? null;
    const { postId, commentId, reason, description } = body;
    const claimedReporter = body.userId ?? body.reporterId;

    // Reporter identity: trust the signed token when present so reports can't be
    // forged under different user ids to trip the auto-flag threshold below.
    // Falls back to the client-supplied id for pre-token builds (see mobileAuth).
    const resolved = resolveMobileUserId(request, claimedReporter);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const userId = resolved.userId;

    if (!reportedUserId && !postId && !commentId) {
      return NextResponse.json(
        { error: 'Must provide reportedUserId, postId, or commentId' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Report reason is required' },
        { status: 400 }
      );
    }

    // Validate reason
    const validReasons = ['spam', 'harassment', 'misinformation', 'hate_speech', 'violence', 'inappropriate', 'other'];
    if (!validReasons.includes(reason.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid report reason' },
        { status: 400 }
      );
    }

    // Check if user has already reported this content
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        ...(reportedUserId && { reportedUserId }),
        ...(postId && { postId }),
        ...(commentId && { commentId }),
      },
    });

    if (existingReport) {
      return NextResponse.json({
        success: true,
        message: 'You have already reported this content. We are reviewing it.',
        alreadyReported: true,
      });
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId: reportedUserId || null,
        postId: postId || null,
        commentId: commentId || null,
        reason: reason.toLowerCase(),
        description: description || null,
        status: 'pending',
      },
    });

    // Check if this user/post/comment has multiple reports
    const reportCount = await prisma.report.count({
      where: {
        ...(reportedUserId && { reportedUserId }),
        ...(postId && { postId }),
        ...(commentId && { commentId }),
        status: 'pending',
      },
    });

    // If multiple reports, flag for priority review
    if (reportCount >= 3) {
      await prisma.report.updateMany({
        where: {
          ...(reportedUserId && { reportedUserId }),
          ...(postId && { postId }),
          ...(commentId && { commentId }),
          status: 'pending',
        },
        data: {
          priority: 'high',
        },
      });
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: 'Thank you for your report. Our team will review it shortly.',
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}

// GET - Get reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Prefer the admin key from a header — passing it in the URL query leaks it
    // into server/proxy access logs and browser history. Query param kept as a
    // fallback for existing tooling; migrate callers to the header.
    const adminKey =
      request.headers.get('x-admin-key') ||
      (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
      searchParams.get('adminKey');

    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const reports = await prisma.report.findMany({
      where: {
        status: status as any,
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.report.count({
      where: {
        status: status as any,
      },
    });

    return NextResponse.json({
      reports,
      totalCount,
      hasMore: offset + reports.length < totalCount,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// PATCH - Update report status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const { reportId, status, adminKey: bodyAdminKey, resolution } = await request.json();

    const adminKey =
      request.headers.get('x-admin-key') ||
      (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
      bodyAdminKey;

    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!reportId || !status) {
      return NextResponse.json(
        { error: 'Report ID and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolution: resolution || null,
        resolvedAt: status === 'resolved' || status === 'dismissed' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}
