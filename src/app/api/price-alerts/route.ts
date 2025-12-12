// src/app/api/price-alerts/route.ts
// CRUD API for managing price alerts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/price-alerts?userId=123 - Get user's price alerts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const alerts = await prisma.priceAlert.findMany({
      where: {
        userId: parseInt(userId),
        ...(activeOnly ? { isActive: true, isTriggered: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price alerts' },
      { status: 500 }
    );
  }
}

// POST /api/price-alerts - Create a new price alert
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, symbol, targetPrice, direction } = body;

    if (!userId || !symbol || !targetPrice || !direction) {
      return NextResponse.json(
        { error: 'userId, symbol, targetPrice, and direction are required' },
        { status: 400 }
      );
    }

    if (!['above', 'below'].includes(direction)) {
      return NextResponse.json(
        { error: 'direction must be "above" or "below"' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for duplicate active alert
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        userId: parseInt(userId),
        symbol: symbol.toUpperCase(),
        targetPrice: parseFloat(targetPrice),
        direction,
        isActive: true,
        isTriggered: false,
      },
    });

    if (existingAlert) {
      return NextResponse.json(
        { error: 'You already have an active alert for this price' },
        { status: 409 }
      );
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: parseInt(userId),
        symbol: symbol.toUpperCase(),
        targetPrice: parseFloat(targetPrice),
        direction,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Price alert created successfully',
      alert,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating price alert:', error);
    return NextResponse.json(
      { error: 'Failed to create price alert' },
      { status: 500 }
    );
  }
}

// DELETE /api/price-alerts - Delete a price alert
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const alertId = searchParams.get('alertId');
    const userId = searchParams.get('userId');

    if (!alertId || !userId) {
      return NextResponse.json(
        { error: 'alertId and userId are required' },
        { status: 400 }
      );
    }

    // Verify the alert belongs to the user
    const alert = await prisma.priceAlert.findFirst({
      where: {
        id: parseInt(alertId),
        userId: parseInt(userId),
      },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found or does not belong to user' },
        { status: 404 }
      );
    }

    await prisma.priceAlert.delete({
      where: { id: parseInt(alertId) },
    });

    return NextResponse.json({
      success: true,
      message: 'Price alert deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting price alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete price alert' },
      { status: 500 }
    );
  }
}

// PATCH /api/price-alerts - Update a price alert (toggle active status)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { alertId, userId, isActive } = body;

    if (!alertId || !userId) {
      return NextResponse.json(
        { error: 'alertId and userId are required' },
        { status: 400 }
      );
    }

    // Verify the alert belongs to the user
    const alert = await prisma.priceAlert.findFirst({
      where: {
        id: parseInt(alertId),
        userId: parseInt(userId),
      },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found or does not belong to user' },
        { status: 404 }
      );
    }

    const updatedAlert = await prisma.priceAlert.update({
      where: { id: parseInt(alertId) },
      data: {
        isActive: isActive ?? !alert.isActive,
        // Reset triggered status if reactivating
        ...(isActive ? { isTriggered: false, triggeredAt: null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Price alert updated successfully',
      alert: updatedAlert,
    });
  } catch (error) {
    console.error('Error updating price alert:', error);
    return NextResponse.json(
      { error: 'Failed to update price alert' },
      { status: 500 }
    );
  }
}
