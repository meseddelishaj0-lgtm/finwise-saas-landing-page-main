"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [billingInfo, setBillingInfo] = useState({
    plan: "Loading...",
    nextBillingDate: "Loading...",
  });

  // ✅ Fetch user billing info from Stripe
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
      <div className="flex items-center justify-center h-screen text-gray-600 text-lg">
        Loading your personalized dashboard...
      </div>
    );
  }

  // ✅ Stripe Customer Portal handler
  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
      });
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <h1
            className="text-2xl font-semibold text-gray-900 cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            🧠 WallStreetStocks
          </h1>

          <div className="flex items-center gap-4">
            <p className="text-gray-700">
              Welcome,{" "}
              <span className="font-semibold">
                {session?.user?.name || session?.user?.email}
              </span>
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-2 rounded-full font-medium transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="max-w-6xl mx-auto px-6 py-14">
        {/* ✅ Billing Overview */}
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center mb-10 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            💳 Billing Overview
          </h3>
          <p className="text-gray-700">
            Active Plan:{" "}
            <span className="font-semibold text-blue-600">
              {billingInfo.plan}
            </span>
          </p>
          <p className="text-gray-700 mt-1">
            Next Billing Date:{" "}
            <span className="font-semibold text-blue-600">
              {billingInfo.nextBillingDate}
            </span>
          </p>
        </div>

        {/* Welcome Card */}
        <div className="bg-white p-10 rounded-2xl shadow-md text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            Welcome to Your Dashboard
          </h2>
          <p className="text-gray-600 mb-8">
            Explore your premium AI-powered financial insights and tools.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/dashboard/portfolio")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-8 rounded-full transition-all"
            >
              View My Portfolio
            </button>
            <button
              onClick={() => router.push("/dashboard/ai-picks")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-8 rounded-full transition-all"
            >
              AI Research Ideas
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. AI Stock Picks */}
          <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">🤖 AI Stock Picks</h3>
            <p className="text-gray-600 mb-4">
              Get real-time stock picks generated by our proprietary AI model
              trained on market sentiment, fundamentals, and technicals.
            </p>
            <button
              onClick={() => router.push("/dashboard/ai-picks")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded-full"
            >
              View Today’s Picks
            </button>
          </div>

          {/* 2. Weekly Research Reports */}
          <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">
              📅 Weekly Research Reports
            </h3>
            <p className="text-gray-600 mb-4">
              Access in-depth reports on trending sectors, key economic data,
              and high-performing companies — updated weekly.
            </p>
            <button
              onClick={() => router.push("/dashboard/reports")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded-full"
            >
              Read Reports
            </button>
          </div>

          {/* 3. Fundamental AI Ratings */}
          <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">
              📊 Fundamental AI Ratings
            </h3>
            <p className="text-gray-600 mb-4">
              Get AI-powered ratings for companies based on intrinsic value,
              growth metrics, and balance sheet strength.
            </p>
            <button
              onClick={() => router.push("/dashboard/ratings")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded-full"
            >
              Explore Ratings
            </button>
          </div>

          {/* 4. Beginner Portfolio Templates */}
          <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">
              📈 Beginner Portfolio Templates
            </h3>
            <p className="text-gray-600 mb-4">
              New to investing? Start with our ready-made templates built for
              long-term growth and diversification.
            </p>
            <button
              onClick={() => router.push("/dashboard/templates")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded-full"
            >
              Browse Templates
            </button>
          </div>

          {/* 5. Community Access */}
          <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <h3 className="text-xl font-semibold mb-2">💬 Community Access</h3>
            <p className="text-gray-600 mb-4">
              Join our exclusive WallStreetStocks investor community — share
              insights, track ideas, and grow together.
            </p>
            <button
              onClick={() => router.push("/dashboard/community")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded-full"
            >
              Join Community
            </button>
          </div>
        </section>

        {/* Market Chart */}
        <div className="mt-14 bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-semibold mb-4">📈 Live Market Chart</h3>
          <div className="tradingview-widget-container">
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_01&symbol=NASDAQ:AAPL&interval=D&hidesidetoolbar=1&theme=light"
              style={{
                width: "100%",
                height: "400px",
                border: "none",
                borderRadius: "10px",
              }}
            ></iframe>
          </div>
        </div>

        {/* ✅ Manage Subscription Button */}
        <div className="text-center mt-12">
          <button
            onClick={handleManageBilling}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-all"
          >
            Manage Subscription & Billing
          </button>
        </div>
      </main>
    </div>
  );
}
