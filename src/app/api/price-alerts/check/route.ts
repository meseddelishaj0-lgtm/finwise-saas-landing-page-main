// src/app/api/price-alerts/check/route.ts
// Endpoint to check and trigger price alerts
// Can be called by a cron job (e.g., Vercel Cron, GitHub Actions)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushNotificationToUser, NotificationMessages } from '@/lib/pushNotifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for processing

// Fetch current price from FMP API
async function getStockPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
      symbol
    )}?apikey=${process.env.FMP_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return data?.[0]?.price || null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

// POST /api/price-alerts/check - Check all active alerts and trigger if conditions met
// Protected by API key to prevent abuse
export async function POST(req: NextRequest) {
  try {
    // Verify API key for cron job security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow if CRON_SECRET matches or if called from same origin in dev
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Also check for Vercel cron header
      const vercelCron = req.headers.get('x-vercel-cron');
      if (!vercelCron) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Get all active, non-triggered alerts
    const activeAlerts = await prisma.priceAlert.findMany({
      where: {
        isActive: true,
        isTriggered: false,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (activeAlerts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active alerts to check',
        checked: 0,
        triggered: 0,
      });
    }

    // Group alerts by symbol to minimize API calls
    const alertsBySymbol = activeAlerts.reduce((acc, alert) => {
      if (!acc[alert.symbol]) {
        acc[alert.symbol] = [];
      }
      acc[alert.symbol].push(alert);
      return acc;
    }, {} as Record<string, typeof activeAlerts>);

    const triggeredAlerts: number[] = [];
    const errors: string[] = [];

    // Check each symbol
    for (const [symbol, alerts] of Object.entries(alertsBySymbol)) {
      const currentPrice = await getStockPrice(symbol);

      if (currentPrice === null) {
        errors.push(`Failed to get price for ${symbol}`);
        continue;
      }

      // Check each alert for this symbol
      for (const alert of alerts) {
        let shouldTrigger = false;

        if (alert.direction === 'above' && currentPrice >= alert.targetPrice) {
          shouldTrigger = true;
        } else if (alert.direction === 'below' && currentPrice <= alert.targetPrice) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          try {
            // Mark alert as triggered
            await prisma.priceAlert.update({
              where: { id: alert.id },
              data: {
                isTriggered: true,
                triggeredAt: new Date(),
              },
            });

            // Create notification in database
            await prisma.notification.create({
              data: {
                type: 'price_alert',
                userId: alert.userId,
                message: `${symbol} is now ${alert.direction === 'above' ? 'above' : 'below'} $${alert.targetPrice.toFixed(2)} (Current: $${currentPrice.toFixed(2)})`,
              },
            });

            // Send push notification
            const { title, body } = NotificationMessages.priceAlert(
              symbol,
              `$${currentPrice.toFixed(2)}`,
              alert.direction as 'above' | 'below'
            );

            await sendPushNotificationToUser(
              alert.userId,
              title,
              body,
              {
                type: 'price_alert',
                symbol,
                targetPrice: alert.targetPrice,
                currentPrice,
                direction: alert.direction,
              },
              { channelId: 'alerts' }
            );

            triggeredAlerts.push(alert.id);
            console.log(`Triggered alert ${alert.id} for ${symbol} at $${currentPrice}`);
          } catch (alertError) {
            console.error(`Error triggering alert ${alert.id}:`, alertError);
            errors.push(`Failed to trigger alert ${alert.id}`);
          }
        }
      }

      // Small delay between symbols to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${activeAlerts.length} alerts, triggered ${triggeredAlerts.length}`,
      checked: activeAlerts.length,
      triggered: triggeredAlerts.length,
      triggeredIds: triggeredAlerts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error checking price alerts:', error);
    return NextResponse.json(
      { error: 'Failed to check price alerts' },
      { status: 500 }
    );
  }
}

// GET endpoint to manually check a single symbol (for testing)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const userId = searchParams.get('userId');

    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol is required' },
        { status: 400 }
      );
    }

    const currentPrice = await getStockPrice(symbol.toUpperCase());

    if (currentPrice === null) {
      return NextResponse.json(
        { error: 'Failed to fetch price' },
        { status: 500 }
      );
    }

    // If userId provided, check their alerts for this symbol
    let userAlerts = null;
    if (userId) {
      userAlerts = await prisma.priceAlert.findMany({
        where: {
          userId: parseInt(userId),
          symbol: symbol.toUpperCase(),
          isActive: true,
          isTriggered: false,
        },
      });
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      currentPrice,
      userAlerts,
    });
  } catch (error) {
    console.error('Error in GET price check:', error);
    return NextResponse.json(
      { error: 'Failed to check price' },
      { status: 500 }
    );
  }
}
