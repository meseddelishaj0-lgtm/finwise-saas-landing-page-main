// src/app/api/notifications/send-watchlist-alert/route.ts
// Send alerts to users who have a specific ticker in their watchlist
import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotificationToWatchlistUsers } from '@/lib/pushNotifications';

export async function POST(request: NextRequest) {
  try {
    // Admin-only: these broadcast to the entire user base. Require the admin
    // key so they can't be used to push phishing to every device.
    const authHeader = request.headers.get('authorization');
    if (!process.env.ADMIN_API_KEY || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticker, title, body: messageBody, alertType, price, change, percentChange } = body;

    // Validate required fields
    if (!ticker || !title || !messageBody) {
      return NextResponse.json(
        { error: 'ticker, title, and body are required' },
        { status: 400 }
      );
    }

    // Valid alert types for watchlist
    const validAlertTypes = [
      'price_target',
      'price_move',
      'earnings',
      'news',
      'high_52_week',
      'low_52_week',
      'volume_spike',
    ];

    if (alertType && !validAlertTypes.includes(alertType)) {
      return NextResponse.json(
        { error: `Invalid alertType. Must be one of: ${validAlertTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await sendPushNotificationToWatchlistUsers(
      ticker.toUpperCase(),
      title,
      messageBody,
      {
        alertType: alertType || 'general',
        ticker: ticker.toUpperCase(),
        price: price || null,
        change: change || null,
        percentChange: percentChange || null,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Watchlist alert sent for ${ticker.toUpperCase()}`,
      ticker: ticker.toUpperCase(),
      usersWithTicker: result.usersNotified,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error sending watchlist alert notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
