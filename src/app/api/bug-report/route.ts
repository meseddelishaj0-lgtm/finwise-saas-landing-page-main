// src/app/api/bug-report/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      category,
      severity,
      title,
      description,
      stepsToReproduce,
      email,
      deviceInfo,
      timestamp,
    } = body;

    // Validate required fields
    if (!category || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: category, title, description' },
        { status: 400 }
      );
    }

    // Try to save to database if BugReport model exists
    // Otherwise, log to console for now
    console.log('=== NEW BUG REPORT ===');
    console.log('Category:', category);
    console.log('Severity:', severity);
    console.log('Title:', title);
    console.log('Description:', description);
    console.log('Steps to Reproduce:', stepsToReproduce || 'Not provided');
    console.log('Email:', email || 'Not provided');
    console.log('Device Info:', deviceInfo ? JSON.stringify(deviceInfo, null, 2) : 'Not included');
    console.log('Timestamp:', timestamp);
    console.log('======================');

    // Optionally send email notification (placeholder for future implementation)
    // await sendBugReportNotification({ category, severity, title, description, email });

    return NextResponse.json({
      success: true,
      message: 'Bug report received successfully',
      reportId: `BUG-${Date.now()}`,
    });
  } catch (error) {
    console.error('Error processing bug report:', error);
    return NextResponse.json(
      { error: 'Failed to process bug report' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Bug report API endpoint. Use POST to submit a bug report.',
  });
}
