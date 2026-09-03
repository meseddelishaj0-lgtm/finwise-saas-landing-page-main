"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [billingInfo, setBillingInfo] = useState({
    plan: "Loading...",
    nextBillingDate: "Loading...",
  });

  // Fetch user billing info
  useEffect(() => {
    const fetchBillingInfo = async () => {
      try {
        const res = await fetch("/api/stripe-subscription");
        const data = await res.json();
        if (res.ok) {
          setBillingInfo({
            plan: data.plan || "Free",
            nextBillingDate: data.nextBillingDate || "N/A",
          });
        } else {
          console.error("Failed to fetch billing info:", data.error);
        }
      } catch (err) {
        console.error("Error fetching billing info:", err);
      }
    };
    fetchBillingInfo();
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-lg">
        Loading your personalized dashboard...
      </div>
    );
  }

  // Stripe Billing Portal handler
  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/create-portal-session", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to open billing portal: " + data.error);
      }
    } catch (err) {
      console.error("Billing portal error:", err);
      alert("Something went wrong opening the billing portal.");
    }
  };

  // Handle navigation to current plan dashboard
  const handleGoToPlan = () => {
    const plan = billingInfo.plan.toLowerCase();
    if (plan === "gold") router.push("/dashboard/gold");
    else if (plan === "platinum") router.push("/dashboard/platinum");
    else if (plan === "diamond") router.push("/dashboard/diamond");
    else router.push("/plans");
  };

  // Dynamic color scheme for plan cards
  const getPlanStyle = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "gold":
        return {
          bg: "from-yellow-100 to-yellow-50",
          border: "border-yellow-400",
          text: "text-gold-soft",
          button:
            "bg-yellow-400 hover:bg-gold text-black hover:scale-105 transition-all",
        };
      case "platinum":
        return {
          bg: "from-gray-100 to-gray-50",
          border: "border-white/20",
          text: "text-gray-300",
          button:
            "bg-white/15 hover:bg-white/20 text-black hover:scale-105 transition-all",
        };
      case "diamond":
        return {
          bg: "from-surface2 to-surface",
          border: "border-gold/40",
          text: "text-gold",
          button:
            "bg-gold hover:bg-gold-deep text-night hover:scale-105 transition-all",
        };
      default:
        return {
          bg: "from-gray-50 to-gray-100",
          border: "border-white/10",
          text: "text-gray-300",
          button:
            "bg-white/15 hover:bg-white/20 text-black hover:scale-105 transition-all",
        };
    }
  };

  const planStyle = getPlanStyle(billingInfo.plan);

  return (
    <div className="min-h-screen bg-night">
      {/* Header */}
      <header className="bg-surface shadow-sm py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <h1
            className="text-2xl text-ivory cursor-pointer font-display font-normal tracking-tight"
            onClick={() => router.push("/dashboard")}
          >
            WallStreetStocks
          </h1>

          <div className="flex items-center gap-4">
            <p className="text-gray-300">
              Welcome,{" "}
              <span className="font-semibold">
                {session?.user?.name || session?.user?.email}
              </span>
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-yellow-400 hover:bg-gold text-black px-5 py-2 rounded-full font-medium transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="max-w-6xl mx-auto px-6 py-14">
        {/* Welcome Card */}
        <div className="bg-surface p-10 rounded-2xl shadow-md text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 text-ivory">
            Welcome to Your Dashboard
          </h2>
          <p className="text-gray-400 mb-8">
            Explore your premium AI-powered financial insights and tools.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/dashboard/portfolio")}
              className="bg-yellow-400 hover:bg-gold text-black font-semibold py-3 px-8 rounded-full transition-all"
            >
              View My Portfolio
            </button>
            <button
              onClick={() => router.push("/dashboard/ai-picks")}
              className="bg-yellow-400 hover:bg-gold text-black font-semibold py-3 px-8 rounded-full transition-all"
            >
              AI Research Ideas
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. AI Stock Picks */}
          <div className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">AI Stock Picks</h3>
            <p className="text-gray-400 mb-4">
              Get real-time stock picks generated by our proprietary AI model
              trained on market sentiment, fundamentals, and technicals.
            </p>
            <button
              onClick={() => router.push("/dashboard/ai-picks")}
              className="bg-yellow-400 hover:bg-gold text-black font-semibold py-2 px-6 rounded-full"
            >
              View Today’s Picks
            </button>
          </div>

          {/* 2. Weekly Research Reports */}
          <div className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">
              Weekly Research Reports
            </h3>
            <p className="text-gray-400 mb-4">
              Access in-depth reports on trending sectors, key economic data,
              and high-performing companies — updated weekly.
            </p>
            <button
              onClick={() => router.push("/dashboard/reports")}
              className="bg-yellow-400 hover:bg-gold text-black font-semibold py-2 px-6 rounded-full"
            >
              Read Reports
            </button>
          </div>

          {/* 3. Fundamental AI Ratings */}
          <div className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">
              Fundamental AI Ratings
            </h3>
            <p className="text-gray-400 mb-4">
              Get AI-powered ratings for companies based on intrinsic value,
              growth metrics, and balance sheet strength.
            </p>
            <button
              onClick={() => router.push("/dashboard/ratings")}
              className="bg-yellow-400 hover:bg-gold text-black font-semibold py-2 px-6 rounded-full"
            >
              Explore Ratings
            </button>
          </div>

          {/* 4. Beginner Portfolio Templates */}
          <div className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">
              Beginner Portfolio Templates
            </h3>
            <p className="text-gray-400 mb-4">
              New to investing? Start with our ready-made templates built for
              long-term growth and diversification.
            </p>
            <button
              onClick={() => router.push("/dashboard/templates")}
              className="bg-yellow-400 hover:bg-gold text-black font-semibold py-2 px-6 rounded-full"
            >
              Browse Templates
            </button>
          </div>

          {/* 5. Community Access */}
          <div className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">Community Access</h3>
            <p className="text-gray-400 mb-4">
              Join our exclusive WallStreetStocks investor community — share
              insights, track ideas, and grow together.
            </p>
            <button
              onClick={() => router.push("/dashboard/community")}
              className="bg-yellow-400 hover:bg-gold text-black font-semibold py-2 px-6 rounded-full"
            >
              Join Community
            </button>
          </div>
        </section>

        {/* Market chart — opens in the site's own Terminal */}
        <div className="mt-14 bg-surface border border-white/10 p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Live market chart</h3>
          <p className="text-gray-400 mb-4">
            Charts, fundamentals and news for any US stock, ETF or crypto pair in the Terminal.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {["AAPL", "NVDA", "SPY", "QQQ", "TSLA"].map((s) => (
              <Link
                key={s}
                href={`/terminal?symbol=${s}`}
                className="px-3 py-1.5 rounded-lg font-monodata text-xs font-bold text-gray-400 border border-white/10 hover:text-gold hover:border-gold/40 transition-colors"
              >
                {s}
              </Link>
            ))}
            <Link href="/terminal?symbol=AAPL" className="btn-gold !py-2 text-sm sm:ml-auto">
              Open Terminal
            </Link>
          </div>
        </div>

        {/* My Plan Access - color themed */}
        <div
          className={`bg-gradient-to-br ${planStyle.bg} border ${planStyle.border} p-6 rounded-2xl shadow-sm text-center mt-12 transition-all`}
        >
          <h3 className={`text-xl font-semibold mb-2 ${planStyle.text}`}>
            My Plan Access
          </h3>
          <p className="text-gray-300 mb-4">
            Current Plan:{" "}
            <span className={`font-semibold ${planStyle.text}`}>
              {billingInfo.plan}
            </span>
          </p>
          <button
            onClick={handleGoToPlan}
            className={`font-semibold py-3 px-8 rounded-full ${planStyle.button}`}
          >
            Go to {billingInfo.plan} Dashboard →
          </button>
        </div>

        {/* Billing Overview */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm text-center mt-12 border border-white/10">
          <h3 className="text-xl font-semibold text-ivory mb-2">
            Billing Overview
          </h3>
          <p className="text-gray-300">
            Active Plan:{" "}
            <span className="font-semibold text-gold">
              {billingInfo.plan}
            </span>
          </p>
          <p className="text-gray-300 mt-1">
            Next Billing Date:{" "}
            <span className="font-semibold text-gold">
              {billingInfo.nextBillingDate}
            </span>
          </p>
        </div>

        {/* Manage Subscription */}
        <div className="text-center mt-8 mb-10">
          <button
            onClick={handleManageBilling}
            className="bg-gold hover:bg-gold-deep text-night font-semibold py-3 px-8 rounded-full transition-all"
          >
            Manage Subscription & Billing
          </button>
        </div>
      </main>
    </div>
  );
}
