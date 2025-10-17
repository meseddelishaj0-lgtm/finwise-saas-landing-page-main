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
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("🔐 Webhook secret loaded:", endpointSecret ? "✅ yes" : "❌ missing");
  console.log("📩 Stripe signature received:", signature ? "✅ yes" : "❌ missing");

  if (!signature || !endpointSecret) {
    return NextResponse.json({ error: "Invalid webhook setup" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {

  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    console.log(`✅ Verified Stripe event: ${event.type}`);
  } catch (err: any) {
    console.error("❌ Stripe verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || session.metadata?.email;
        const plan = session.metadata?.plan || "Unknown";

        if (email && session.customer) {
          await prisma.user.upsert({
            where: { email },
            update: {
              stripeCustomerId: session.customer as string,
              currentPlan: plan,
            },
            create: {
              email,
              stripeCustomerId: session.customer as string,
              currentPlan: plan,
              name: email.split("@")[0],
              password: "",
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const email = invoice.customer_email || invoice.metadata?.email;
        const nextBillingDate = new Date(
          (invoice.lines?.data?.[0]?.period?.end ?? invoice.created) * 1000
        );
        if (customerId && email) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { nextBillingDate },
          });
        }
        break;
      }

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
        break;
      }

      default:
        console.log(`ℹ️ Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("🔥 Webhook processing error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
