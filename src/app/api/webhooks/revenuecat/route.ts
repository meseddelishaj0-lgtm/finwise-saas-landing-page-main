import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/webhooks/revenuecat
 * Handles RevenueCat webhook events for subscription changes
 * 
 * Set this URL in RevenueCat dashboard:
 * https://your-domain.com/api/webhooks/revenuecat
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity (optional but recommended)
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTH;
    
    if (expectedAuth && authHeader !== expectedAuth) {
      console.error('Invalid webhook authorization');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const event = await request.json();
    
    console.log('RevenueCat webhook event:', event.event.type);

    const eventType = event.event.type;
    const appUserId = event.event.app_user_id;
    const productId = event.event.product_id;
    const expirationDate = event.event.expiration_at_ms 
      ? new Date(event.event.expiration_at_ms)
      : null;

    // Find user by RevenueCat app_user_id (which should match our user ID)
    const userId = parseInt(appUserId, 10);
    
    if (isNaN(userId)) {
      console.log('Non-numeric user ID, skipping database update:', appUserId);
      return NextResponse.json({ received: true });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('User not found:', userId);
      return NextResponse.json({ received: true });
    }

    // Map product ID to subscription tier
    const getSubscriptionTier = (productId: string): string => {
      const productIdLower = productId?.toLowerCase() || '';
      if (productIdLower.includes('diamond') || productIdLower.includes('29.99') || productIdLower.includes('premium_plus')) {
        return 'diamond';
      }
      if (productIdLower.includes('platinum') || productIdLower.includes('19.99') || productIdLower.includes('premium')) {
        return 'platinum';
      }
      if (productIdLower.includes('gold') || productIdLower.includes('9.99') || productIdLower.includes('basic')) {
        return 'gold';
      }
      // Default to gold for any subscription
      return 'gold';
    };

    // Handle different event types
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        // User purchased or renewed subscription
        const tier = getSubscriptionTier(productId);
        await prisma.user.update({
          where: { id: userId },
          data: {
            currentPlan: productId,
            nextBillingDate: expirationDate,
            subscriptionTier: tier,
            subscriptionStatus: 'active',
            subscriptionExpiry: expirationDate,
            subscriptionProductId: productId,
          },
        });
        console.log(`Subscription activated for user ${userId}: ${productId} (tier: ${tier})`);
        break;

      case 'CANCELLATION':
        // User cancelled but may still have access until expiration
        console.log(`Subscription cancelled for user ${userId}, expires: ${expirationDate}`);
        // Don't remove access yet - they have until expiration date
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'cancelled',
          },
        });
        break;

      case 'EXPIRATION':
      case 'BILLING_ISSUE':
        // Subscription expired or billing failed
        await prisma.user.update({
          where: { id: userId },
          data: {
            currentPlan: null,
            nextBillingDate: null,
            subscriptionTier: 'free',
            subscriptionStatus: 'expired',
            subscriptionExpiry: null,
            subscriptionProductId: null,
          },
        });
        console.log(`Subscription expired for user ${userId}`);
        break;

      case 'SUBSCRIBER_ALIAS':
        // User accounts were merged
        console.log(`Subscriber alias event for user ${userId}`);
        break;

      case 'TRANSFER':
        // Subscription transferred to another user
        console.log(`Subscription transferred for user ${userId}`);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook URL verification)
export async function GET() {
  return NextResponse.json({ status: 'RevenueCat webhook endpoint active' });
}
