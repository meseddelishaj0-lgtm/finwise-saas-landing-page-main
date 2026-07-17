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
    // Cron auth — FAIL CLOSED. Require either Vercel's internal cron header
    // (which Vercel sets on cron invocations and strips from external requests)
    // OR the shared CRON_SECRET. Previously, if CRON_SECRET was unset the whole
    // check short-circuited and anyone could trigger it.
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = !!req.headers.get('x-vercel-cron');
    const secretOk = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
    if (!isVercelCron && !secretOk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

// Vercel Cron invokes the scheduled path with a GET request, so the actual
// alert check must run here (it previously lived only in POST, which the cron
// never hit — alerts silently never fired). POST does its own auth and reads
// no body, so we delegate. The old GET was an UNAUTHENTICATED test path that
// also leaked any user's alerts by ?userId — removed.
export async function GET(req: NextRequest) {
  return POST(req);
}
