import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "auto";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = headers().get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!signature || !endpointSecret) {
    console.error("❌ Missing Stripe signature or endpoint secret");
    return NextResponse.json({ error: "Invalid webhook setup" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-09-30.clover" as any,
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ✅ User successfully completes checkout
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email =
          session.metadata?.email ||
          session.customer_email ||
          session.customer_details?.email;
        const plan = session.metadata?.plan || "Free";
        const stripeCustomerId = session.customer as string;

        if (!email) {
          console.warn("⚠️ No email found in checkout session:", session.id);
          break;
        }

        // ✅ Always upsert user (creates if not found)
        await prisma.user.upsert({
          where: { email },
          update: {
            stripeCustomerId,
            currentPlan: plan,
          },
          create: {
            email,
            stripeCustomerId,
            currentPlan: plan,
            name: "",
            password: "",
          },
        });

        console.log(`✅ Checkout saved for ${email} (${plan})`);
        break;
      }

      // ✅ Payment succeeded (set next billing date)
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const nextBillingDate = new Date(
          (invoice.lines?.data?.[0]?.period?.end ?? invoice.created) * 1000
        );

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { nextBillingDate },
        });

        console.log(`💰 Updated next billing date for ${customerId}`);
        break;
      }

      // ✅ Subscription updated
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const planName =
          subscription.items.data[0]?.price?.nickname || "Unknown Plan";
        const nextBillingDate = new Date(
          ((subscription as any).current_period_end ?? 0) * 1000
        );

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            currentPlan: planName,
            nextBillingDate,
          },
        });

        console.log(`🔄 Updated subscription for ${customerId}: ${planName}`);
        break;
      }

      // ✅ Subscription canceled
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            currentPlan: "Canceled",
            nextBillingDate: null,
          },
        });

        console.log(`❌ Subscription canceled for ${customerId}`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("🔥 Webhook processing error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
