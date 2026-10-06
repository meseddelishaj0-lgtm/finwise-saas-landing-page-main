"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import CommandLine from "@/components/ui/CommandLine";
import {
  PLAN_FEATURES,
  featureValue,
  minimumTier,
  type PaidTier,
  type PlanFeature,
} from "@/data/planFeatures";

type Tier = PaidTier | "free" | "lifetime";

interface PlanInfo {
  tier: Tier;
  source: "app" | "referral" | "stripe" | null;
  expiresAt: string | null;
  isVerified: boolean;
  hasStripe: boolean;
  nextBillingDate: string | null;
}

interface Pick {
  rank: number;
  symbol: string;
  name: string;
  category: string;
  reason: string;
  price: number | null;
  changePercent: number | null;
}

const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  lifetime: "Lifetime",
};

const SOURCE_LABEL = {
  app: "Subscribed in the app",
  referral: "Earned through referrals",
  stripe: "Subscribed on the website",
} as const;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [planError, setPlanError] = useState(false);
  const [picks, setPicks] = useState<{ list: Pick[]; total: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/dashboard/plan")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setPlan)
      .catch(() => setPlanError(true));
  }, [status]);

  const tier: Tier = plan?.tier ?? "free";
  // Lifetime unlocks everything Diamond does.
  const featureTier: PaidTier | "free" = tier === "lifetime" ? "diamond" : tier;

  useEffect(() => {
    if (!plan || featureTier === "free") return;
    fetch("/api/stock-picks")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setPicks({ list: d.picks ?? [], total: d.total ?? 15 }))
      .catch(() => setPicks({ list: [], total: 15 }));
  }, [plan, featureTier]);

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/create-portal-session", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Billing portal error:", err);
    }
  };

  if (status === "loading" || (status === "authenticated" && !plan && !planError)) {
    return (
      <main className="min-h-screen bg-night text-ivory flex items-center justify-center">
        <p className="font-monodata text-sm text-gray-400">Loading your dashboard…</p>
      </main>
    );
  }

  const firstName = (session?.user?.name || session?.user?.email || "").split(/[ @]/)[0];
  const renews = formatDate(plan?.nextBillingDate ?? null) ?? formatDate(plan?.expiresAt ?? null);
  const isTopTier = featureTier === "diamond";

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <CommandLine cmd="DASH" note="your plan" className="mb-4" />
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">
          Welcome back{firstName ? <>, <em className="italic text-gold-soft">{firstName}</em></> : null}.
        </h1>

        {/* Plan summary */}
        <section className="mt-10 card-night p-6 md:p-8 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="eyebrow">Current plan</p>
            <p className="mt-2 font-display text-3xl text-gold">{TIER_LABEL[tier]}</p>
            <p className="mt-1 text-sm text-gray-400">
              {planError
                ? "We couldn't load your plan. Refresh to try again."
                : plan?.source
                ? `${SOURCE_LABEL[plan.source]}${renews && tier !== "lifetime" ? ` · renews ${renews}` : ""}`
                : "Pick a plan to unlock stock picks, AI tools and more."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {plan?.hasStripe && (
              <button onClick={handleManageBilling} className="btn-ghost-gold !py-2.5 text-sm">
                Manage billing
              </button>
            )}
            {plan?.source === "app" && !plan.hasStripe && tier !== "lifetime" && (
              <p className="self-center text-sm text-gray-400">
                Manage billing in the App Store or Google Play.
              </p>
            )}
            {!isTopTier && (
              <Link href="/plans" className="btn-gold !py-2.5 text-sm">
                {tier === "free" ? "See plans" : "Upgrade"}
              </Link>
            )}
          </div>
        </section>

        {/* Expert stock picks */}
        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight">Expert stock picks</h2>
            {picks && picks.list.length > 0 && (
              <p className="font-monodata text-xs text-gray-400 tabular-nums">
                {picks.list.length} of {picks.total}
                {!isTopTier && (
                  <>
                    {" · "}
                    <Link href="/plans" className="text-gold hover:text-gold-soft">
                      unlock more
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
          {featureTier === "free" ? (
            <LockedPanel
              text="Gold members get 5 hand-picked stocks, Platinum 8 and Diamond all 15."
              tier="gold"
            />
          ) : !picks ? (
            <p className="font-monodata text-sm text-gray-400">Loading picks…</p>
          ) : picks.list.length === 0 ? (
            <p className="text-gray-400">Picks are unavailable right now — check back shortly.</p>
          ) : (
            <div className="card-night divide-y overflow-hidden">
              {picks.list.map((p) => (
                <Link
                  key={p.symbol}
                  href={`/terminal?symbol=${p.symbol}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-surface2 transition-colors"
                >
                  <span className="w-6 font-monodata text-xs text-gray-500 tabular-nums">{p.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-monodata font-semibold text-ivory truncate">
                      {p.symbol}
                      <span className="hidden sm:inline ml-2 font-sans font-normal text-sm text-gray-400">{p.name}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-gray-400 truncate">
                      <span className="text-gold/80">{p.category}</span> · {p.reason}
                    </p>
                  </div>
                  <div className="text-right font-monodata tabular-nums">
                    <p className="text-ivory">{p.price != null ? `$${p.price.toFixed(2)}` : "—"}</p>
                    {p.changePercent != null && (
                      <p className={`text-xs ${p.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {p.changePercent >= 0 ? "+" : ""}
                        {p.changePercent.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Everything in the plan */}
        <section className="mt-14">
          <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-5">Your features</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLAN_FEATURES.filter((f) => f.key !== "picks").map((f) => (
              <FeatureCard
                key={f.key}
                feature={f}
                value={featureValue(f, featureTier)}
                isVerified={plan?.isVerified ?? false}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  feature,
  value,
  isVerified,
}: {
  feature: PlanFeature;
  value: string | boolean;
  isVerified: boolean;
}) {
  const unlocked = value !== false;
  const needed = minimumTier(feature);

  let status: string;
  if (!unlocked) status = TIER_LABEL[needed];
  else if (typeof value === "string") status = value;
  else if (feature.key === "badge") status = isVerified ? "Verified" : "Included";
  else status = "Included";

  return (
    <div className={`card-night p-6 flex flex-col ${unlocked ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ivory">{feature.label}</h3>
        <span
          className={`shrink-0 inline-flex items-center gap-1 font-monodata text-[11px] uppercase tracking-widest ${
            unlocked ? "text-gold" : "text-gray-500"
          }`}
        >
          {!unlocked && <Lock className="w-3 h-3" aria-hidden />}
          {status}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-400 flex-1">{feature.blurb}</p>
      <div className="mt-4 text-sm font-semibold">
        {!unlocked ? (
          <Link href="/plans" className="text-gray-300 hover:text-gold">
            Upgrade to {TIER_LABEL[needed]} →
          </Link>
        ) : feature.href ? (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <FeatureLink href={feature.href}>{feature.cta} →</FeatureLink>
            {feature.key === "research" && (
              <FeatureLink href="/dashboard/portfolio">Portfolio tools →</FeatureLink>
            )}
          </div>
        ) : feature.key === "badge" && !isVerified ? (
          <span className="font-normal text-gray-400">Shows on your community profile.</span>
        ) : null}
      </div>
    </div>
  );
}

function FeatureLink({ href, children }: { href: string; children: React.ReactNode }) {
  const cls = "text-gold hover:text-gold-soft";
  return href.startsWith("mailto:") ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

function LockedPanel({ text, tier }: { text: string; tier: PaidTier }) {
  return (
    <div className="card-night p-6 flex flex-wrap items-center justify-between gap-4">
      <p className="flex items-center gap-2 text-gray-300">
        <Lock className="w-4 h-4 text-gray-500" aria-hidden />
        {text}
      </p>
      <Link href="/plans" className="btn-gold !py-2.5 text-sm">
        Get {TIER_LABEL[tier]}
      </Link>
    </div>
  );
}
