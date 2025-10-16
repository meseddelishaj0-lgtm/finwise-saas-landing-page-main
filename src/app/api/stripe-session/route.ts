import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });

    // ✅ Safely extract product name
    let planName = "Unknown Plan";
    const item = session.line_items?.data?.[0];
    const priceProduct = item?.price?.product;

    if (priceProduct && typeof priceProduct !== "string" && "name" in priceProduct) {
      planName = priceProduct.name;
    }

    return NextResponse.json({
      id: session.id,
      email: session.customer_details?.email,
      plan: planName,
      amount_total: session.amount_total,
      status: session.status,
      subscription: session.subscription,
    });
  } catch (error: any) {
    console.error("❌ Stripe session fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
