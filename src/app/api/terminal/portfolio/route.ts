import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The signed-in website user's default portfolio (terminal PORT). Reads and
// writes the same Portfolio / PortfolioHolding tables the mobile app syncs, so
// holdings follow the account. Edits here touch single holdings — never the
// replace-all the app's /api/portfolio/sync performs — so the user's other
// portfolios are left alone.

const MAX_HOLDINGS = 200;

async function sessionUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  const id = parseInt((session?.user as { id?: string } | undefined)?.id ?? "", 10);
  return Number.isNaN(id) ? null : id;
}
const unauthorized = () => NextResponse.json({ error: "Not signed in" }, { status: 401 });

const defaultPortfolio = (userId: number) =>
  prisma.portfolio.findFirst({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { holdings: true },
  });

// A signed-out visitor gets { signedIn: false } with a 200; the panel then
// falls back to its browser-only tracker.
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  const p = await defaultPortfolio(userId);
  return NextResponse.json(
    {
      signedIn: true,
      name: p?.name ?? "My Portfolio",
      holdings: (p?.holdings ?? []).map((h) => ({ symbol: h.symbol, shares: h.shares, cost: h.avgCost })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Upsert one holding: { symbol, shares, cost }. */
export async function PUT(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const symbol = String(body?.symbol ?? "").trim().toUpperCase();
  const shares = Number(body?.shares);
  const cost = Number(body?.cost);
  if (!/^[A-Z0-9^./-]{1,12}$/.test(symbol)) return NextResponse.json({ error: "Enter a valid ticker." }, { status: 400 });
  if (!Number.isFinite(shares) || shares <= 0) return NextResponse.json({ error: "Shares must be above zero." }, { status: 400 });
  if (!Number.isFinite(cost) || cost < 0) return NextResponse.json({ error: "Average cost can't be negative." }, { status: 400 });

  let p = await defaultPortfolio(userId);
  if (!p) {
    p = await prisma.portfolio.create({ data: { userId, name: "My Portfolio", isDefault: true }, include: { holdings: true } });
  }
  if (!p.holdings.some((h) => h.symbol === symbol) && p.holdings.length >= MAX_HOLDINGS) {
    return NextResponse.json({ error: `A portfolio holds up to ${MAX_HOLDINGS} positions.` }, { status: 400 });
  }
  await prisma.portfolioHolding.upsert({
    where: { portfolioId_symbol: { portfolioId: p.id, symbol } },
    update: { shares, avgCost: cost },
    create: { portfolioId: p.id, symbol, shares, avgCost: cost },
  });
  // Bump the portfolio so the app's sync sees a newer server copy.
  await prisma.portfolio.update({ where: { id: p.id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").trim().toUpperCase();
  const p = await defaultPortfolio(userId);
  if (!p || !symbol) return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  const { count } = await prisma.portfolioHolding.deleteMany({ where: { portfolioId: p.id, symbol } });
  if (!count) return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  await prisma.portfolio.update({ where: { id: p.id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
