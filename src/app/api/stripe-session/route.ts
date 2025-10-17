export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";

// ✅ Safely initialize Stripe with fallback protection
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("❌ Missing STRIPE_SECRET_KEY in environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover" as any,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // ✅ Retrieve the Checkout session and expand line items
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });

    // ✅ Extract plan name safely
    let planName = "Unknown Plan";
    const item = session.line_items?.data?.[0];
    const priceProduct = item?.price?.product;

    if (
      priceProduct &&
      typeof priceProduct !== "string" &&
      "name" in priceProduct
    ) {
      planName = (priceProduct as any).name;
    }

    // ✅ Return clean structured response
    return NextResponse.json({
      id: session.id,
      email: session.customer_details?.email || "Unknown Email",
      plan: planName,
      amount_total: session.amount_total || 0,
      status: session.status,
      subscription: session.subscription,
    });
  } catch (error: any) {
    console.error("❌ Stripe session fetch error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Stripe session" },
      { status: 500 }
    );
  }
}
