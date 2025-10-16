import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20" as any, // or remove this line entirely
});

interface ExtendedSession {
  user?: {
    email?: string;
    stripeCustomerId?: string;
  };
}

export async function POST() {
  const session = (await getServerSession()) as ExtendedSession;

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = session.user.stripeCustomerId;

  if (!customerId) {
    return NextResponse.json({ error: "No Stripe customer ID" }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}
