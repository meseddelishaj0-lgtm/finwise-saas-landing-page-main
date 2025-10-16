import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// ✅ Modern Next.js 14 route config
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
    apiVersion: "2024-06-20" as any,
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err: any) {
    console.error("❌ Stripe verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ✅ Checkout session completed
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("✅ Checkout completed:", session.id, session.customer_email);

        if (session.customer && session.customer_email) {
          await prisma.user.updateMany({
            where: { email: session.customer_email },
            data: {
              stripeCustomerId: session.customer as any,
            },
          });

          console.log("🧩 Saved Stripe customer ID for:", session.customer_email);
        }
        break;
      }

      // ✅ Payment succeeded
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("💰 Payment succeeded for invoice:", invoice.id);

        const customerId = invoice.customer as string;
        const nextBillingDate = new Date(
          (invoice.lines?.data?.[0]?.period?.end ?? invoice.created) * 1000
        );

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { nextBillingDate },
        });

        console.log("📆 Updated next billing date for:", customerId);
        break;
      }

      // ✅ Subscription updated
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("🔄 Subscription updated:", subscription.id);

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

        console.log("📊 Updated plan:", planName, "for:", customerId);
        break;
      }

      // ✅ Subscription canceled
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("⚠️ Subscription canceled:", subscription.id);

        const customerId = subscription.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            currentPlan: "Canceled",
            nextBillingDate: null,
          },
        });

        console.log("❌ Set plan to canceled for:", customerId);
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
