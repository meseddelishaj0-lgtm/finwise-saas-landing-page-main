import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { FUNCTIONS } from "@/components/market/functions/registry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Terminal ASK: plain-English questions answered from the terminal's own data.
// The model is given tools that read the same server routes the panels use, so
// every number in an answer comes from a live feed rather than its memory.
//
//   { mode: "ask",        question, symbol, history? }
//   { mode: "brief",      symbol }                      what changed last quarter
//   { mode: "transcript", symbol, year, quarter, question }

const MODEL = "gpt-4o";
const MAX_ROUNDS = 5;
const SYM = /^[A-Z0-9^./-]{1,12}$/;

type Msg = Record<string, any>;

const FUND_DATASETS = [
  "profile", "income", "balance", "cashflow", "key-metrics-ttm", "ratios-ttm", "growth", "estimates",
  "price-target-consensus", "rating", "earnings", "surprises", "dividends", "dcf", "peers", "insider",
];

const PANEL_CODES = FUNCTIONS.filter((f) => !f.href).map((f) => f.code);

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_quotes",
      description: "Live price, day change, day and 52-week range, market cap and P/E for up to 12 symbols. Stocks/ETFs use tickers (NVDA); indices ^GSPC ^IXIC ^DJI ^VIX; crypto BTCUSD; FX EURUSD; commodities CLUSD (WTI) BZUSD (Brent) GCUSD (gold) SIUSD (silver) HGUSD (copper) NGUSD (nat gas).",
      parameters: { type: "object", properties: { symbols: { type: "array", items: { type: "string" } } }, required: ["symbols"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_fundamentals",
      description: "Company fundamentals for one stock. Statement datasets (income, balance, cashflow, growth) return the most recent periods newest-first.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          dataset: { type: "string", enum: FUND_DATASETS },
          period: { type: "string", enum: ["annual", "quarter"] },
        },
        required: ["symbol", "dataset"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_performance",
      description: "Total price change over a range for up to 8 symbols, with the period high and low.",
      parameters: {
        type: "object",
        properties: {
          symbols: { type: "array", items: { type: "string" } },
          range: { type: "string", enum: ["5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "10Y"] },
        },
        required: ["symbols", "range"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_news",
      description: "Recent headlines. Pass a ticker for company news, or omit it for market-wide news.",
      parameters: { type: "object", properties: { symbol: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_market_board",
      description: "A market-wide board: world equity indices, futures and commodities, FX rates, crypto, US economic indicators, or CFTC positioning.",
      parameters: {
        type: "object",
        properties: { board: { type: "string", enum: ["indices", "futures", "fx", "crypto", "economy", "positioning"] } },
        required: ["board"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_panels",
      description: "Offer the user up to 4 terminal panels to open next that show the data behind the answer.",
      parameters: {
        type: "object",
        properties: {
          panels: {
            type: "array",
            items: {
              type: "object",
              properties: { fn: { type: "string", enum: PANEL_CODES }, symbol: { type: "string" } },
              required: ["fn"],
            },
          },
        },
        required: ["panels"],
      },
    },
  },
];

const SYSTEM = `You are the analyst inside the WallStreetStocks terminal. Answer questions about markets and companies using the tools, which read the terminal's live data.

Rules:
- Every figure you state must come from a tool result in this conversation. If the tools cannot supply something, say it is not available rather than estimating.
- Lead with the answer in one or two sentences, then the supporting numbers. Keep it under 180 words unless the user asks for depth.
- Use short paragraphs or "- " bullets. Bold only the key figures with **double asterisks**. No headings, no tables.
- When comparing companies or periods, give the actual values and the change.
- You explain and compare; you do not tell the user to buy or sell.
- After gathering data, call suggest_panels with the panels that show the underlying data (${FUNCTIONS.filter((f) => !f.href).map((f) => `${f.code} = ${f.name}`).join("; ")}).`;

/* ------------------------------ tools ------------------------------ */

const trimRows = (v: unknown, rows: number, maxChars = 6000): string => {
  const d = Array.isArray(v) ? v.slice(0, rows) : v;
  const s = JSON.stringify(d);
  return s.length > maxChars ? `${s.slice(0, maxChars)}…(truncated)` : s;
};

async function self(origin: string, path: string): Promise<unknown> {
  try {
    const r = await fetch(`${origin}${path}`, { cache: "no-store" });
    if (!r.ok) return { error: `No data (${r.status})` };
    return await r.json();
  } catch {
    return { error: "Request failed" };
  }
}

const cleanSyms = (v: unknown, max: number): string[] =>
  (Array.isArray(v) ? v : [])
    .map((s) => String(s).toUpperCase().trim().replace("/", ""))
    .filter((s) => SYM.test(s))
    .slice(0, max);

async function runTool(origin: string, name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "get_quotes": {
      const symbols = cleanSyms(args.symbols, 12);
      if (!symbols.length) return '{"error":"No valid symbols"}';
      return trimRows(await self(origin, `/api/market/quotes?symbols=${encodeURIComponent(symbols.join(","))}`), 12);
    }
    case "get_fundamentals": {
      const symbol = String(args.symbol ?? "").toUpperCase();
      if (!SYM.test(symbol) || !FUND_DATASETS.includes(args.dataset)) return '{"error":"Bad arguments"}';
      const period = args.period === "quarter" ? "&period=quarter" : "";
      const data = await self(origin, `/api/market/fundamentals?symbol=${encodeURIComponent(symbol)}&dataset=${args.dataset}${period}`);
      return trimRows(data, args.period === "quarter" ? 6 : 5, 7000);
    }
    case "get_performance": {
      const symbols = cleanSyms(args.symbols, 8);
      const range = String(args.range ?? "1Y");
      const out = await Promise.all(
        symbols.map(async (s) => {
          const bars = (await self(origin, `/api/market/chart?symbol=${encodeURIComponent(s)}&range=${range}`)) as any;
          if (!Array.isArray(bars) || bars.length < 2) return { symbol: s, error: "No history" };
          const first = bars[0].c;
          const last = bars[bars.length - 1].c;
          return {
            symbol: s,
            range,
            from: bars[0].t,
            to: bars[bars.length - 1].t,
            start: first,
            end: last,
            changePercent: Math.round((last / first - 1) * 10000) / 100,
            high: Math.max(...bars.map((b: any) => b.h)),
            low: Math.min(...bars.map((b: any) => b.l)),
          };
        })
      );
      return JSON.stringify(out);
    }
    case "get_news": {
      const symbol = String(args.symbol ?? "").toUpperCase().replace("^", "");
      const data = (await self(origin, `/api/market/news${SYM.test(symbol) ? `?symbol=${encodeURIComponent(symbol)}` : ""}`)) as any;
      if (!Array.isArray(data)) return JSON.stringify(data);
      return JSON.stringify(data.slice(0, 12).map((n: any) => ({ title: n.title, site: n.site, date: n.publishedDate, symbol: n.symbol })));
    }
    case "get_market_board": {
      const path: Record<string, string> = {
        indices: "/api/market/global?view=wei",
        futures: "/api/market/global?view=futures",
        fx: "/api/market/global?view=fx",
        crypto: "/api/market/desk?view=crypto",
        economy: "/api/market/desk?view=econ",
        positioning: "/api/market/desk?view=cot",
      };
      const p = path[String(args.board)];
      if (!p) return '{"error":"Unknown board"}';
      let data = (await self(origin, p)) as any;
      if (Array.isArray(data)) {
        if (args.board === "economy") data = data.map(({ series: _s, ...r }: any) => r);
        else data = data.map((r: any) => ({ symbol: r.symbol, name: r.name, price: r.price, changePercent: r.changePercent, yearLow: r.yearLow, yearHigh: r.yearHigh, longPct: r.longPct, net: r.net, situation: r.situation }));
      }
      return trimRows(data, 70, 9000);
    }
    default:
      return '{"error":"Unknown tool"}';
  }
}

/* ------------------------------ model ------------------------------ */

// OPENAI_BASE_URL lets the route sit behind a gateway (and be tested against a stub).
const OPENAI_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

class ModelError extends Error {
  constructor(public status: number) {
    super(`model ${status}`);
  }
}

async function chat(messages: Msg[], tools?: unknown[]): Promise<Msg> {
  const res = await fetch(`${OPENAI_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 900, temperature: 0.2, ...(tools ? { tools } : {}) }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.choices?.[0]?.message) {
    console.error("ask: model error", res.status, data?.error?.message);
    throw new ModelError(res.status);
  }
  return data.choices[0].message;
}

/** Turn a model failure into a response the panel can show. */
function modelFailure(e: unknown) {
  const status = e instanceof ModelError ? e.status : 0;
  // 401/402/429 from the provider mean the account, not this request, is the problem.
  if (status === 401 || status === 402 || status === 429) {
    return NextResponse.json({ error: "The AI service is unavailable right now. The rest of the terminal is unaffected." }, { status: 503 });
  }
  return NextResponse.json({ error: "The AI service did not respond. Try again in a moment." }, { status: 502 });
}

interface Panel {
  fn: string;
  symbol?: string;
}

async function agent(origin: string, messages: Msg[]): Promise<{ answer: string; panels: Panel[] }> {
  let panels: Panel[] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const msg = await chat(messages, TOOLS);
    messages.push(msg);
    const calls: Msg[] = msg.tool_calls ?? [];
    if (!calls.length) return { answer: String(msg.content ?? "").trim(), panels };

    const results = await Promise.all(
      calls.map(async (c) => {
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(c.function?.arguments || "{}");
        } catch {}
        if (c.function?.name === "suggest_panels") {
          panels = (Array.isArray(args.panels) ? args.panels : [])
            .filter((p: any) => PANEL_CODES.includes(p?.fn))
            .slice(0, 4)
            .map((p: any) => {
              const s = String(p.symbol ?? "").toUpperCase();
              return { fn: p.fn, ...(SYM.test(s) ? { symbol: s } : {}) };
            });
          return { id: c.id, content: '{"ok":true}' };
        }
        return { id: c.id, content: await runTool(origin, c.function?.name, args) };
      })
    );
    for (const r of results) messages.push({ role: "tool", tool_call_id: r.id, content: r.content });
  }
  // Out of rounds: ask for the answer with what has been gathered.
  const final = await chat([...messages, { role: "user", content: "Answer now with the data you have." }]);
  return { answer: String(final.content ?? "").trim(), panels };
}

/* ------------------------------ route ------------------------------ */

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "terminal-ask", 12, 60_000);
  if (limited) return limited;
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "The AI service is not configured." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const mode = body?.mode ?? "ask";
  const symbol = String(body?.symbol ?? "").toUpperCase();
  const origin = req.nextUrl.origin;

  try {
    return await answer(mode, symbol, body, origin);
  } catch (e) {
    return modelFailure(e);
  }
}

async function answer(mode: string, symbol: string, body: any, origin: string) {
  if (mode === "transcript") {
    const question = String(body?.question ?? "").trim().slice(0, 500);
    const year = parseInt(body?.year, 10);
    const quarter = parseInt(body?.quarter, 10);
    if (!SYM.test(symbol) || !question || !year || !(quarter >= 1 && quarter <= 4)) {
      return NextResponse.json({ error: "symbol, year, quarter and question are required" }, { status: 400 });
    }
    const t = (await self(origin, `/api/market/fundamentals?symbol=${encodeURIComponent(symbol)}&dataset=transcript&quarter=${quarter}&year=${year}`)) as any;
    const content = typeof t?.content === "string" ? t.content : "";
    if (!content) return NextResponse.json({ error: "That transcript is not available." }, { status: 404 });
    const msg = await chat([
      {
        role: "system",
        content:
          "You answer questions about one earnings call using only the transcript provided. Quote or closely paraphrase what was said and name the speaker. If the call does not address the question, say so plainly. Under 160 words, short paragraphs or '- ' bullets, **bold** for key figures. No investment advice.",
      },
      { role: "user", content: `Transcript of the ${symbol} Q${quarter} ${year} earnings call:\n\n${content.slice(0, 90_000)}\n\nQuestion: ${question}` },
    ]);
    return NextResponse.json({ answer: String(msg.content ?? "").trim(), panels: [] });
  }

  if (mode === "brief") {
    if (!SYM.test(symbol)) return NextResponse.json({ error: "symbol required" }, { status: 400 });
    const messages: Msg[] = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Write a brief on what changed in ${symbol}'s most recent reported quarter. Pull the quarterly income statement and cash flow, the earnings surprise history and analyst estimates. Cover: revenue and EPS versus the prior quarter and the same quarter a year ago, margin direction, cash flow, whether it beat or missed estimates, and what analysts expect next quarter. Up to 220 words.`,
      },
    ];
    return NextResponse.json(await agent(origin, messages));
  }

  const question = String(body?.question ?? "").trim().slice(0, 600);
  if (!question) return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  const history: Msg[] = (Array.isArray(body?.history) ? body.history : [])
    .slice(-6)
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
  const messages: Msg[] = [
    { role: "system", content: SYSTEM },
    ...history,
    { role: "user", content: `${SYM.test(symbol) ? `[Security loaded in the terminal: ${symbol}]\n` : ""}${question}` },
  ];
  return NextResponse.json(await agent(origin, messages));
}
