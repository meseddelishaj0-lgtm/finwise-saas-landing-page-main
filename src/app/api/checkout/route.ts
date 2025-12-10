import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// ✅ use from /lib

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "auto";

export async function POST(req: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

    const body = await req.json();
    const { plan } = body;

    // ✅ Get session user (so email is real, not testuser@example.com)
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!plan || !email) {
      return NextResponse.json(
        { error: "Missing plan or not authenticated" },
        { status: 400 }
      );
    }

    console.log(`💳 Creating checkout session for: ${email} — Plan: ${plan}`);

    // ✅ Match your price IDs from .env
    const priceMap: Record<string, string> = {
      gold: process.env.STRIPE_PRICE_GOLD_ID!,
      platinum: process.env.STRIPE_PRICE_PLATINUM_ID!,
      diamond: process.env.STRIPE_PRICE_DIAMOND_ID!,
    };

    const priceId = priceMap[plan.toLowerCase()];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // ✅ Create Stripe checkout session
    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      // 🟩 Redirect directly to dashboard/plan after payment success
      success_url: `https://www.wallstreetstocks.ai/dashboard/${plan.toLowerCase()}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.wallstreetstocks.ai/plans?canceled=true`,
      metadata: { email, plan },
    });

    console.log("✅ Stripe session created:", sessionStripe.id);
    return NextResponse.json({ url: sessionStripe.url });
  } catch (err: any) {
    console.error("🔥 Checkout error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
