// src/app/api/notifications/send-market-alert/route.ts
// Send market alerts to all users (market open/close, major moves, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotificationToAllUsers } from '@/lib/pushNotifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: messageBody, alertType, data } = body;

    // Validate required fields
    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'title and body are required' },
        { status: 400 }
      );
    }

    // Valid alert types
    const validAlertTypes = [
      'market_open',
      'market_close',
      'market_hours',
      'major_move',
      'volatility_alert',
      'index_update',
    ];

    if (alertType && !validAlertTypes.includes(alertType)) {
      return NextResponse.json(
        { error: `Invalid alertType. Must be one of: ${validAlertTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await sendPushNotificationToAllUsers(
      title,
      messageBody,
      {
        type: 'market_alert',
        alertType: alertType || 'general',
        ...data,
      },
      { channelId: 'alerts' }
    );

    return NextResponse.json({
      success: true,
      message: 'Market alert notification sent',
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error sending market alert notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
