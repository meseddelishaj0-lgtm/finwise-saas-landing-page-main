// src/app/api/portfolio/route.ts
// Portfolio CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Get user's portfolios with holdings and current prices
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portfolios = await prisma.portfolio.findMany({
      where: { userId: parseInt(userId) },
      include: {
        holdings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // If no portfolios, create a default one
    if (portfolios.length === 0) {
      const defaultPortfolio = await prisma.portfolio.create({
        data: {
          userId: parseInt(userId),
          name: 'My Portfolio',
          isDefault: true,
        },
        include: { holdings: true },
      });
      return NextResponse.json({ portfolios: [defaultPortfolio] });
    }

    // Get current prices for all holdings
    const allSymbols = [...new Set(portfolios.flatMap(p => p.holdings.map(h => h.symbol)))];

    let priceMap: Record<string, any> = {};
    if (allSymbols.length > 0) {
      try {
        const quotesRes = await fetch(
          `${BASE_URL}/quote/${allSymbols.join(',')}?apikey=${FMP_API_KEY}`
        );
        const quotes = await quotesRes.json();
        if (Array.isArray(quotes)) {
          quotes.forEach((q: any) => {
            priceMap[q.symbol] = {
              price: q.price,
              change: q.change,
              changePercent: q.changesPercentage,
              name: q.name,
            };
          });
        }
      } catch (e) {
        console.error('Error fetching prices:', e);
      }
    }

    // Calculate portfolio values and P&L
    const portfoliosWithValues = portfolios.map(portfolio => {
      let totalValue = 0;
      let totalCost = 0;
      let dayChange = 0;

      const holdingsWithPrices = portfolio.holdings.map(holding => {
        const priceData = priceMap[holding.symbol] || {};
        const currentPrice = priceData.price || holding.avgCost;
        const marketValue = holding.shares * currentPrice;
        const costBasis = holding.shares * holding.avgCost;
        const gainLoss = marketValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
        const dayGain = holding.shares * (priceData.change || 0);

        totalValue += marketValue;
        totalCost += costBasis;
        dayChange += dayGain;

        return {
          ...holding,
          currentPrice,
          name: priceData.name || holding.symbol,
          marketValue,
          costBasis,
          gainLoss,
          gainLossPercent,
          dayChange: priceData.change || 0,
          dayChangePercent: priceData.changePercent || 0,
          dayGain,
        };
      });

      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
      const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

      return {
        ...portfolio,
        holdings: holdingsWithPrices,
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        dayChange,
        dayChangePercent,
      };
    });

    return NextResponse.json({ portfolios: portfoliosWithValues });
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolios' }, { status: 500 });
  }
}

// Create a new portfolio
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();

    const portfolio = await prisma.portfolio.create({
      data: {
        userId: parseInt(userId),
        name: name || 'New Portfolio',
      },
      include: { holdings: true },
    });

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error('Portfolio POST error:', error);
    return NextResponse.json({ error: 'Failed to create portfolio' }, { status: 500 });
  }
}

// Delete a portfolio
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const portfolioId = searchParams.get('id');

    if (!portfolioId) {
      return NextResponse.json({ error: 'Portfolio ID required' }, { status: 400 });
    }

    // Verify ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        id: parseInt(portfolioId),
        userId: parseInt(userId),
      },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    await prisma.portfolio.delete({
      where: { id: parseInt(portfolioId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portfolio DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete portfolio' }, { status: 500 });
  }
}
