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

  console.log("🌐 Stripe Webhook Triggered");
  console.log("🔐 STRIPE_WEBHOOK_SECRET:", endpointSecret ? "✅ Loaded" : "❌ Missing");
  console.log("📩 Stripe Signature:", signature ? "✅ Present" : "❌ Missing");

  if (!signature || !endpointSecret) {
    console.error("❌ Missing Stripe signature or webhook secret");
    return NextResponse.json({ error: "Invalid webhook setup" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {,
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

        console.log("✅ Checkout completed for:", email, "→ Plan:", plan);

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
          console.log("📆 Updated next billing date for:", email);
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
        console.log("⚠️ Subscription canceled for:", customerId);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("🔥 Webhook handler error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
