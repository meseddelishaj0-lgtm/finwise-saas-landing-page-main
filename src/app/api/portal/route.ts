import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing Stripe customer ID" },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.BASE_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe Portal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
