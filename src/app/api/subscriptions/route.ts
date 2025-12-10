import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// RevenueCat API endpoint for customer info
const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || '';

interface RevenueCatEntitlement {
  expires_date: string | null;
  product_identifier: string;
  purchase_date: string;
}

interface RevenueCatSubscriberInfo {
  entitlements: {
    [key: string]: RevenueCatEntitlement;
  };
  subscriptions: {
    [key: string]: {
      expires_date: string;
      purchase_date: string;
      original_purchase_date: string;
      product_plan_identifier: string;
      store: string;
    };
  };
}

/**
 * POST /api/subscriptions/validate
 * Validates a user's subscription with RevenueCat and updates the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, revenueCatUserId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get subscription info from RevenueCat
    const rcUserId = revenueCatUserId || userId.toString();
    const subscriberInfo = await getRevenueCatSubscriberInfo(rcUserId);

    if (!subscriberInfo) {
      return NextResponse.json(
        { error: 'Failed to fetch subscription info' },
        { status: 500 }
      );
    }

    // Check for active entitlements
    const activeEntitlement = subscriberInfo.entitlements['WallStreetStocks Pro'];
    
    let subscriptionData = {
      currentPlan: null as string | null,
      nextBillingDate: null as Date | null,
      isActive: false,
    };

    if (activeEntitlement) {
      subscriptionData = {
        currentPlan: activeEntitlement.product_identifier,
        nextBillingDate: activeEntitlement.expires_date 
          ? new Date(activeEntitlement.expires_date) 
          : null,
        isActive: true,
      };
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        currentPlan: subscriptionData.currentPlan,
        nextBillingDate: subscriptionData.nextBillingDate,
      },
      select: {
        id: true,
        email: true,
        currentPlan: true,
        nextBillingDate: true,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        isActive: subscriptionData.isActive,
        plan: subscriptionData.currentPlan,
        expiresAt: subscriptionData.nextBillingDate,
      },
      user: updatedUser,
    });
  } catch (error) {
    console.error('Subscription validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate subscription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscriptions/validate?userId=123
 * Gets the current subscription status for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        email: true,
        currentPlan: true,
        nextBillingDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if subscription is still active
    const isActive = user.currentPlan && user.nextBillingDate 
      ? new Date(user.nextBillingDate) > new Date()
      : false;

    return NextResponse.json({
      success: true,
      subscription: {
        isActive,
        plan: user.currentPlan,
        expiresAt: user.nextBillingDate,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}

/**
 * Fetch subscriber info from RevenueCat API
 */
async function getRevenueCatSubscriberInfo(
  userId: string
): Promise<RevenueCatSubscriberInfo | null> {
  try {
    const response = await fetch(
      `${REVENUECAT_API_URL}/subscribers/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('RevenueCat API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.subscriber;
  } catch (error) {
    console.error('RevenueCat API fetch error:', error);
    return null;
  }
}
