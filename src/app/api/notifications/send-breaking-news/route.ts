// src/app/api/notifications/send-breaking-news/route.ts
// Send breaking news notifications to all users
import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotificationToAllUsers } from '@/lib/pushNotifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: messageBody, ticker, url } = body;

    // Validate required fields
    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'title and body are required' },
        { status: 400 }
      );
    }

    // Optional: Add admin authentication here
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const result = await sendPushNotificationToAllUsers(
      title,
      messageBody,
      {
        type: 'breaking_news',
        ticker: ticker || null,
        url: url || null,
      },
      { channelId: 'default' }
    );

    return NextResponse.json({
      success: true,
      message: 'Breaking news notification sent',
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error sending breaking news notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
