import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPrices } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// Price alerts for the signed-in website user (terminal ALRT). Same PriceAlert
// table the mobile app writes, so an alert set here shows up in the app and is
// delivered by the existing /api/price-alerts/check cron as an app push.

const MAX_ACTIVE = 50;

async function sessionUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  const id = parseInt((session?.user as { id?: string } | undefined)?.id ?? "", 10);
  return Number.isNaN(id) ? null : id;
}
const unauthorized = () => NextResponse.json({ error: "Not signed in" }, { status: 401 });

// A signed-out visitor gets { signedIn: false } with a 200 — the panel shows a
// sign-in prompt, and a 401 here would only log a console error on every load.
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  const alerts = await prisma.priceAlert.findMany({
    where: { userId },
    orderBy: [{ isTriggered: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ signedIn: true, alerts }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => null);
  const symbol = String(body?.symbol ?? "").trim().toUpperCase();
  const targetPrice = Number(body?.targetPrice);
  if (!/^[A-Z0-9^./-]{1,12}$/.test(symbol)) return NextResponse.json({ error: "Enter a valid ticker." }, { status: 400 });
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return NextResponse.json({ error: "Enter a target price above zero." }, { status: 400 });

  const active = await prisma.priceAlert.count({ where: { userId, isActive: true, isTriggered: false } });
  if (active >= MAX_ACTIVE) return NextResponse.json({ error: `You can keep up to ${MAX_ACTIVE} active alerts.` }, { status: 400 });

  // Direction follows the market: a target above the last price fires on a
  // rise to it, a target below fires on a fall to it.
  let direction = body?.direction === "above" || body?.direction === "below" ? body.direction : "";
  if (!direction) {
    const prices = await getPrices([symbol]).catch(() => ({}) as Record<string, number>);
    const last = prices[symbol];
    if (typeof last !== "number" || !Number.isFinite(last)) {
      return NextResponse.json({ error: `No live price for ${symbol}, so the alert direction can't be set.` }, { status: 400 });
    }
    direction = targetPrice >= last ? "above" : "below";
  }

  const dup = await prisma.priceAlert.findFirst({ where: { userId, symbol, targetPrice, direction, isActive: true, isTriggered: false } });
  if (dup) return NextResponse.json(dup);

  const alert = await prisma.priceAlert.create({ data: { userId, symbol, targetPrice, direction } });
  return NextResponse.json(alert, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  const id = parseInt(req.nextUrl.searchParams.get("id") ?? "", 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
  // Scoped to the owner so one user cannot delete another's alert.
  const { count } = await prisma.priceAlert.deleteMany({ where: { id, userId } });
  if (!count) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
