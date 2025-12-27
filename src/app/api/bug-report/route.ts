// src/app/api/bug-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Valid bug report categories matching the app UI
const VALID_CATEGORIES = [
  'app_crash',
  'ui_issue',
  'slow_laggy',
  'data_error',
  'login_issue',
  'other',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      category,
      description,
      contactEmail,
      screenshotUrl,
      deviceInfo,
      appVersion,
    } = body;

    // Validate required fields
    if (!category) {
      return NextResponse.json(
        { error: 'Bug category is required' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid bug category' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (contactEmail && contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Determine priority based on category
    let priority = 'medium';
    if (category === 'app_crash' || category === 'login_issue') {
      priority = 'high';
    } else if (category === 'ui_issue') {
      priority = 'low';
    }

    // Create the bug report
    const bugReport = await prisma.bugReport.create({
      data: {
        userId: userId || null,
        category,
        description: description.trim(),
        contactEmail: contactEmail?.trim() || null,
        screenshotUrl: screenshotUrl || null,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        appVersion: appVersion || null,
        status: 'pending',
        priority,
      },
    });

    return NextResponse.json({
      success: true,
      reportId: bugReport.id,
      message: 'Thank you for your report! Our team will review it shortly.',
    });
  } catch (error) {
    console.error('Error creating bug report:', error);
    return NextResponse.json(
      { error: 'Failed to submit bug report' },
      { status: 500 }
    );
  }
}

// GET - Get bug reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('adminKey');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Admin check
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const bugReports = await prisma.bugReport.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
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

    const totalCount = await prisma.bugReport.count({ where });

    // Get counts by status for dashboard
    const statusCounts = await prisma.bugReport.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get counts by category
    const categoryCounts = await prisma.bugReport.groupBy({
      by: ['category'],
      _count: true,
    });

    return NextResponse.json({
      bugReports,
      totalCount,
      hasMore: offset + bugReports.length < totalCount,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      categoryCounts: categoryCounts.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bug reports' },
      { status: 500 }
    );
  }
}

// PATCH - Update bug report status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, status, adminKey, adminNotes, priority } = body;

    // Admin check
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
      }
    }
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (priority) updateData.priority = priority;

    const bugReport = await prisma.bugReport.update({
      where: { id: reportId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      bugReport,
    });
  } catch (error) {
    console.error('Error updating bug report:', error);
    return NextResponse.json(
      { error: 'Failed to update bug report' },
      { status: 500 }
    );
  }
}
