// src/app/api/portfolio/holdings/route.ts
// Portfolio holdings CRUD
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Add a holding to portfolio
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { portfolioId, symbol, shares, avgCost, notes } = await req.json();

    if (!portfolioId || !symbol || !shares || !avgCost) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId: parseInt(userId),
      },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Check if holding already exists
    const existingHolding = await prisma.portfolioHolding.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId,
          symbol: symbol.toUpperCase(),
        },
      },
    });

    if (existingHolding) {
      // Update existing holding (average the cost basis)
      const totalShares = existingHolding.shares + shares;
      const totalCost = (existingHolding.shares * existingHolding.avgCost) + (shares * avgCost);
      const newAvgCost = totalCost / totalShares;

      const holding = await prisma.portfolioHolding.update({
        where: { id: existingHolding.id },
        data: {
          shares: totalShares,
          avgCost: newAvgCost,
          notes: notes || existingHolding.notes,
        },
      });

      return NextResponse.json({ holding, updated: true });
    }

    // Create new holding
    const holding = await prisma.portfolioHolding.create({
      data: {
        portfolioId,
        symbol: symbol.toUpperCase(),
        shares,
        avgCost,
        notes,
      },
    });

    return NextResponse.json({ holding });
  } catch (error) {
    console.error('Holdings POST error:', error);
    return NextResponse.json({ error: 'Failed to add holding' }, { status: 500 });
  }
}

// Update a holding
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { holdingId, shares, avgCost, notes } = await req.json();

    if (!holdingId) {
      return NextResponse.json({ error: 'Holding ID required' }, { status: 400 });
    }

    // Verify ownership through portfolio
    const holding = await prisma.portfolioHolding.findFirst({
      where: { id: holdingId },
      include: { portfolio: true },
    });

    if (!holding || holding.portfolio.userId !== parseInt(userId)) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const updated = await prisma.portfolioHolding.update({
      where: { id: holdingId },
      data: {
        ...(shares !== undefined && { shares }),
        ...(avgCost !== undefined && { avgCost }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ holding: updated });
  } catch (error) {
    console.error('Holdings PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 });
  }
}

// Delete a holding
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const holdingId = searchParams.get('id');

    if (!holdingId) {
      return NextResponse.json({ error: 'Holding ID required' }, { status: 400 });
    }

    // Verify ownership
    const holding = await prisma.portfolioHolding.findFirst({
      where: { id: parseInt(holdingId) },
      include: { portfolio: true },
    });

    if (!holding || holding.portfolio.userId !== parseInt(userId)) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    await prisma.portfolioHolding.delete({
      where: { id: parseInt(holdingId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Holdings DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 });
  }
}
