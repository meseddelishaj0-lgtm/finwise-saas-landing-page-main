import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// Required for Next.js App Router dynamic routes
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "auto";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!sig || !endpointSecret) {
    console.error("❌ Missing Stripe signature or endpoint secret");
    return NextResponse.json({ error: "Missing Stripe signature or secret" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-09-30.clover" as any,
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    console.log("✅ Verified event:", event.type);
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const email =
        session.customer_email ||
        (session.customer_details && session.customer_details.email) ||
        session.metadata?.email;
      const plan = session.metadata?.plan || "Unknown";
      const customerId = session.customer as string;

      console.log("💰 Checkout complete:", { email, plan, customerId });

      if (!email || !customerId) {
        console.warn("⚠️ Missing email or customer ID");
        return NextResponse.json({ error: "Missing email or customerId" }, { status: 400 });
      }

      await prisma.user.upsert({
        where: { email },
        update: {
          stripeCustomerId: customerId,
          currentPlan: plan,
        },
        create: {
          email,
          stripeCustomerId: customerId,
          currentPlan: plan,
          name: email.split("@")[0],
          password: "",
        },
      });

      console.log(`✅ Saved plan ${plan} for ${email}`);
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const nextBillingDate = new Date(
        (invoice.lines.data[0]?.period?.end ?? invoice.created) * 1000
      );

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { nextBillingDate },
      });

      console.log(`📅 Updated billing for ${customerId}`);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { currentPlan: "Canceled", nextBillingDate: null },
      });

      console.log(`⚠️ Subscription canceled for ${customerId}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("🔥 Webhook error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

