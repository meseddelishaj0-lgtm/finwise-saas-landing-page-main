import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST() {
  try {
    const session = await getServerSession();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-09-30.clover" as any,
    });

    // ✅ Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: "https://www.wallstreetstocks.ai/dashboard",
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("❌ Billing portal creation error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
