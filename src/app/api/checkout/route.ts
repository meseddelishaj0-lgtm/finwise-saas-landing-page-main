import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

// ✅ Initialize Stripe (use your same version as webhook)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

export async function POST(req: Request) {
  try {
    const { priceId, plan, email } = await req.json();

    // ✅ Fallback to user session email if not provided
    let userEmail = email;
    if (!userEmail) {
      const session = await getServerSession();
      userEmail = session?.user?.email || "";
    }

    // ✅ Validate input
    if (!priceId || !userEmail || !plan) {
      return NextResponse.json(
        { error: "Missing required fields (priceId, email, or plan)." },
        { status: 400 }
      );
    }

    const normalizedPlan = plan.toLowerCase();

    // ✅ Check if user already has a Stripe customer ID
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    let customerId = (existingUser as any)?.stripeCustomerId;


    // ✅ Create new Stripe customer if none exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
      });
      customerId = customer.id;

      // ✅ Save new Stripe Customer ID to Neon (Prisma)
      await prisma.user.update({
        where: { email: userEmail },
        data: {stripeCustomerId: customerId },
      });
    }

    // ✅ Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `https://www.wallstreetstocks.ai/dashboard/${normalizedPlan}/success`,
      cancel_url: `${process.env.BASE_URL}/plans`,
    });

    console.log(`💳 Checkout started for ${userEmail} → ${plan}`);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe Checkout Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
