"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Brain,
  TrendingUp,
  BarChart3,
  CalendarDays,
  LineChart as ChartIcon,
  Lightbulb,
} from "lucide-react";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

interface Bar {
  t: string; // "YYYY-MM-DD HH:MM:SS"
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONO = "var(--font-mono-wss), ui-monospace, SFMono-Regular, monospace";

const fmtDay = (t: string) => `${MONTHS[Number(t.slice(5, 7)) - 1]} ${Number(t.slice(8, 10))}`;
const fmtStamp = (t: string) => `${fmtDay(t)} · ${t.slice(11, 16)}`;
const fmtPx = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const inputClass =
  "w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-monodata uppercase text-ivory placeholder:normal-case placeholder:text-gray-600 transition-colors focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";

const INSIGHT_CARDS = [
  {
    icon: Brain,
    title: "AI-powered analysis",
    desc: "AI models evaluate company fundamentals, sentiment, and valuation in seconds.",
    href: "/ai-dashboard/ai-powered-analysis",
    cta: "Open analysis",
  },
  {
    icon: TrendingUp,
    title: "Market trends",
    desc: "Track real-time performance and surface potential outperformers with our screening models.",
    href: "/ai-dashboard/market-trends",
    cta: "Open market trends",
  },
  {
    icon: BarChart3,
    title: "Portfolio insights",
    desc: "Portfolio health, risk exposure, and diversification with an instant AI summary.",
    href: "/ai-dashboard/portfolio-insights",
    cta: "Open portfolio insights",
  },
];

const FORECAST_CARDS = [
  {
    icon: ChartIcon,
    title: "Short-term forecast",
    desc: "AI predicts moderate bullish movement with strong tech sector momentum.",
    href: "/ai-dashboard/forecast",
    cta: "Open forecast",
  },
  {
    icon: CalendarDays,
    title: "Long-term outlook",
    desc: "Steady growth expected in renewable energy and healthcare sectors.",
    href: "/ai-dashboard/outlook",
    cta: "Open outlook",
  },
  {
    icon: Lightbulb,
    title: "Smart portfolio tips",
    desc: "Rebalance quarterly to reduce volatility and maximize compounding gains.",
    href: "/ai-dashboard/portfolio",
    cta: "Open tips",
  },
];

function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Bar }> }) {
  if (!active || !payload?.length) return null;
  const bar = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-surface px-3 py-2 font-monodata text-xs tabular-nums shadow-xl">
      <div className="text-gray-500">{fmtStamp(bar.t)}</div>
      <div className="mt-0.5 text-ivory">{fmtPx(bar.c)}</div>
    </div>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  desc,
  href,
  cta,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} className="card-night card-hover group flex h-full flex-col p-6">
      <Icon className="h-6 w-6 text-gold" aria-hidden="true" />
      <h3 className="mt-5 text-lg md:text-xl font-semibold text-ivory">{title}</h3>
      <p className="mt-2 flex-1 text-gray-400 leading-relaxed">{desc}</p>
      <span className="mt-6 font-monodata text-[11px] uppercase tracking-widest text-gold-soft">
        {cta} <span className="arrow">→</span>
      </span>
    </Link>
  );
}

export default function AIDashboardPage() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState<any>(null);
  const [error, setError] = useState("");

  const [bars, setBars] = useState<Bar[] | null>(null);
  const [chartError, setChartError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market/chart?symbol=%5EGSPC&range=1M")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(json) || json.length === 0) throw new Error("empty");
        const all = json as Bar[];
        // The route can return more than a month of hourly bars; keep the last 31 days.
        const last = new Date(`${all[all.length - 1].t.slice(0, 10)}T00:00:00Z`);
        const cutoff = new Date(last.getTime() - 31 * 86_400_000).toISOString().slice(0, 10);
        setBars(all.filter((b) => b.t.slice(0, 10) >= cutoff));
      })
      .catch(() => {
        if (!cancelled) setChartError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!bars || bars.length < 2) return null;
    const first = bars[0].c;
    const latest = bars[bars.length - 1].c;
    const pct = ((latest - first) / first) * 100;
    return { latest, pct };
  }, [bars]);

  const handleSearch = async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError("");
    setStock(null);

    try {
      const res = await fetch(`/api/stock?symbol=${symbol}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setStock(json);
      }
    } catch (e) {
      setError("Error fetching stock data.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        {/* Masthead */}
        <Reveal>
          <CommandLine cmd="AID" note="ai investment dashboard" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            The AI <em className="italic text-gold-soft">desk</em>, in one view.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Smart financial insights, AI stock forecasts, and portfolio analytics — all in
            one place.
          </p>
        </Reveal>

        {/* Insight cards */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {INSIGHT_CARDS.map((item, i) => (
            <Reveal key={item.href} delay={i * 0.06} className="h-full">
              <DashboardCard {...item} />
            </Reveal>
          ))}
        </div>

        {/* S&P 500 chart */}
        <Reveal className="mt-16">
          <div className="card-night p-6 md:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-ivory">S&amp;P 500 · last month</h2>
              {stats && (
                <div className="flex items-baseline gap-4 font-monodata tabular-nums">
                  <span className="text-xl text-ivory">{fmtPx(stats.latest)}</span>
                  <span className={`text-sm ${stats.pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {stats.pct >= 0 ? "+" : ""}
                    {stats.pct.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            <p className="mt-1 font-monodata text-[11px] uppercase tracking-widest text-gray-500">
              Hourly closes · ^GSPC
            </p>

            <div className="mt-6 h-[300px]">
              {bars && bars.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bars} margin={{ top: 8, right: 28, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spxFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FACC15" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#FACC15" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tickFormatter={fmtDay}
                      minTickGap={56}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 11, fontFamily: MONO }}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) => v.toLocaleString("en-US")}
                      width={60}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 11, fontFamily: MONO }}
                    />
                    <Tooltip content={<ChartTip />} cursor={{ stroke: "rgba(250,204,21,0.35)" }} />
                    <Area
                      type="monotone"
                      dataKey="c"
                      stroke="#FACC15"
                      strokeWidth={2}
                      fill="url(#spxFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#FACC15", stroke: "#0D0C09", strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 font-monodata text-xs uppercase tracking-widest text-gray-500">
                  {chartError ? "Chart unavailable right now" : "Loading S&P 500…"}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* AI stock research */}
        <Reveal className="mt-20">
          <h2 className="font-display text-ivory text-3xl md:text-5xl tracking-tight">
            AI stock research
          </h2>
          <p className="mt-4 max-w-2xl text-gray-400 leading-relaxed">
            Enter a ticker (AAPL, TSLA, NVDA) and the desk pulls the live quote, key metrics,
            and a plain-English read of the numbers.
          </p>

          <div className="card-night mt-8 p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label htmlFor="ai-symbol" className="sr-only">
                Stock symbol
              </label>
              <input
                id="ai-symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                type="text"
                placeholder="Search a stock symbol"
                className={inputClass}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn-gold px-5 py-2.5 text-sm shrink-0 disabled:opacity-60"
              >
                {loading ? "Analyzing…" : "Analyze"}
              </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            {stock && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-surface2 p-6 md:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-lg md:text-xl font-semibold text-ivory">
                    {stock.symbol} · live market data
                  </h3>
                  <span
                    className={`font-monodata tabular-nums text-sm ${
                      stock.change > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {stock.change > 0 ? "+" : ""}
                    {stock.change} ({stock.percentChange}%)
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
                  {[
                    ["Price", stock.current],
                    ["Open", stock.open],
                    ["High", stock.high],
                    ["Low", stock.low],
                    ["Prev close", stock.prevClose],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                        {label}
                      </dt>
                      <dd className="mt-1 font-monodata tabular-nums text-ivory">${value}</dd>
                    </div>
                  ))}
                </dl>

                {/* AI Summary */}
                {stock.metrics && (
                  <div className="mt-6 rounded-xl border border-gold/30 bg-gold/5 p-5">
                    <h4 className="font-monodata text-[11px] uppercase tracking-widest text-gold-soft">
                      AI summary
                    </h4>
                    <p className="mt-2 text-gray-300 leading-relaxed">
                      {(() => {
                        const pe = stock.metrics.peBasicExclExtraTTM;
                        const roe = stock.metrics.roeTTM;
                        const rev = stock.metrics.revenueGrowthTTMYoy;
                        let summary = "";

                        if (pe && pe < 15) summary += "Stock appears undervalued with a low P/E ratio. ";
                        else if (pe && pe > 30) summary += "Stock trades at a premium valuation. ";
                        else summary += "Valuation looks moderate. ";

                        if (roe && roe > 15) summary += "Strong profitability based on high ROE. ";
                        else summary += "Average profitability trend. ";

                        if (rev && rev > 5) summary += "Revenue growth remains positive and stable. ";
                        else summary += "Revenue growth is relatively flat. ";

                        return (
                          summary +
                          "Overall outlook: " +
                          (roe > 15 && rev > 5 ? "bullish momentum." : "neutral performance.")
                        );
                      })()}
                    </p>
                  </div>
                )}

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {/* Company Profile */}
                  {stock.profile && (
                    <div>
                      <h4 className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                        Company profile
                      </h4>
                      <ul className="mt-2 space-y-1 text-gray-300">
                        <li><strong className="text-ivory">Name:</strong> {stock.profile.name}</li>
                        <li><strong className="text-ivory">Exchange:</strong> {stock.profile.exchange}</li>
                        <li><strong className="text-ivory">Industry:</strong> {stock.profile.finnhubIndustry}</li>
                        <li><strong className="text-ivory">Country:</strong> {stock.profile.country}</li>
                        <li>
                          <strong className="text-ivory">Market cap:</strong>{" "}
                          <span className="font-monodata tabular-nums">${stock.profile.marketCapitalization}B</span>
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Financial Metrics */}
                  {stock.metrics && (
                    <div>
                      <h4 className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                        Key financial metrics
                      </h4>
                      <ul className="mt-2 space-y-1 text-gray-300 font-monodata tabular-nums">
                        <li><strong className="font-sans text-ivory">P/E ratio:</strong> {stock.metrics.peBasicExclExtraTTM}</li>
                        <li><strong className="font-sans text-ivory">ROE:</strong> {stock.metrics.roeTTM}%</li>
                        <li><strong className="font-sans text-ivory">Debt/Equity:</strong> {stock.metrics.debtEquityQuarterly}</li>
                        <li><strong className="font-sans text-ivory">Revenue growth:</strong> {stock.metrics.revenueGrowthTTMYoy}%</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Latest News */}
                {stock.news && stock.news.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                      Recent news
                    </h4>
                    <ul className="mt-2 space-y-2 text-sm text-gray-300">
                      {stock.news.slice(0, 3).map((n: any, i: number) => (
                        <li key={i}>
                          <a href={n.url} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                            {n.headline}
                          </a>{" "}
                          <span className="text-gray-500">({n.source})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* Forecast cards */}
        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          {FORECAST_CARDS.map((card, i) => (
            <Reveal key={card.href} delay={i * 0.06} className="h-full">
              <DashboardCard {...card} />
            </Reveal>
          ))}
        </div>

        {/* CTA band */}
        <Reveal className="mt-20">
          <div className="card-night border-gold/30 p-8 md:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  Premium
                </p>
                <h2 className="mt-3 font-display text-ivory text-3xl md:text-5xl tracking-tight">
                  Unlock full AI analytics.
                </h2>
                <p className="mt-4 text-gray-400 leading-relaxed">
                  Upgrade for unlimited forecasts, portfolio integration, and market data alerts.
                </p>
              </div>
              <Link href="/plans" className="btn-gold shrink-0">
                View plans
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
