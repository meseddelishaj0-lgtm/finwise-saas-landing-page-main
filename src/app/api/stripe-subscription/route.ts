export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ✅ optional but recommended for Stripe



import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function GET() {
  try {
    // ✅ Get user session
    const session = await getServerSession();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // ✅ Find user in Neon
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        stripeCustomerId: true,
        currentPlan: true,
        nextBillingDate: true,
      },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { plan: "Free", nextBillingDate: null },
        { status: 200 }
      );
    }

    // ✅ Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-09-30.clover" as any,
    });

    // ✅ Retrieve active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });

   const subscription = subscriptions.data[0];

const plan =
  subscription?.items.data[0]?.price?.nickname ||
  user.currentPlan ||
  "Unknown";

// ✅ Fixed extraction of next billing date
const rawSub: any = subscription;
const nextBillingDate =
  rawSub?.current_period_end
    ? new Date(rawSub.current_period_end * 1000).toLocaleDateString()
    : user.nextBillingDate
    ? new Date(user.nextBillingDate).toLocaleDateString()
    : "N/A";

return NextResponse.json({
  plan,
  nextBillingDate,
});


  } catch (error: any) {
    console.error("❌ Stripe subscription fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


