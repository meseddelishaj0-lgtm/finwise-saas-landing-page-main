import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserPlan } from "@/lib/planAccess";

export const dynamic = "force-dynamic";

// GET /api/dashboard/plan - the signed-in user's active plan, whether they
// bought it in the app or on the website.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = parseInt((session?.user as { id?: string } | undefined)?.id ?? "", 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const [plan, user] = await Promise.all([
      resolveUserPlan(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { isVerified: true, stripeCustomerId: true, nextBillingDate: true },
      }),
    ]);

    return NextResponse.json(
      {
        ...plan,
        isVerified: user?.isVerified ?? false,
        hasStripe: !!user?.stripeCustomerId,
        nextBillingDate: user?.nextBillingDate?.toISOString() ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("dashboard/plan error:", err);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}
