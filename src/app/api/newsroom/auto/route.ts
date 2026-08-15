// Auto-published desk notes — runs on Vercel cron three times per market day
// (open / midday / close). Fetches live data from our own market APIs, has
// gpt-4o-mini write a strictly data-grounded note, renders a board PNG via
// next/og, uploads it to Vercel Blob, and publishes a NewsArticle.
//
// Modes: ?dry=1 → generate text only, no image/no insert (auth required)
//        ?img=1 → return the board PNG directly, no insert (auth required)
//        ?slot=open|midday|close → override slot; ?force=1 → skip guards
import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { buildBoardElement, type BoardTile } from "@/lib/newsroomBoard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const AUTHOR = "auto@wallstreetstocks.ai";

const INDEX_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"];
const ASSET_SYMBOLS = ["BTCUSD", "GLD", "USO", "TLT"];
const MEGA_SYMBOLS = ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA"];
const BOARD_SYMBOLS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^RUT": "RUSSELL 2000",
  GLD: "GOLD · GLD",
  BTCUSD: "BITCOIN",
};

interface Quote {
  symbol: string;
  name?: string;
  price?: number;
  changePercent?: number;
  previousClose?: number;
}

const etParts = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10),
    minute: parts.minute,
    weekday: parts.weekday,
  };
};

const fmtPrice = (v?: number) =>
  v == null
    ? "—"
    : v >= 1000
      ? v.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : v.toFixed(2);

const barTime = (t: string) => {
  const hm = t.slice(11, 16);
  if (!hm.includes(":")) return t.slice(5, 10);
  let hh = parseInt(hm.slice(0, 2), 10);
  const ap = hh >= 12 ? "P" : "A";
  hh = hh % 12 || 12;
  return `${hh}:${hm.slice(3)}${ap}`;
};

// Deterministic writer used when the LLM is unavailable (e.g. no API credits):
// composes a clean desk note straight from the numbers so the cron never
// publishes nothing.
function fallbackNote(d: {
  slot: string;
  timeET: string;
  indices: { symbol: string; name?: string; price?: number; changePercent: number }[];
  assets: { symbol: string; price?: number; changePercent: number }[];
  megaCaps: { symbol: string; price?: number; changePercent: number }[];
  topGainers: { symbol: string; name?: string; price?: number; changePercent: number }[];
  topLosers: { symbol: string; name?: string; price?: number; changePercent: number }[];
}) {
  const g = (arr: typeof d.indices, sym: string) => arr.find((x) => x.symbol === sym);
  const pct = (v?: number) => `${(v ?? 0) >= 0 ? "+" : ""}${(v ?? 0).toFixed(2)}%`;
  const money = (v?: number) => (v == null ? "—" : `$${fmtPrice(v)}`);

  const spx = g(d.indices, "^GSPC");
  const ndx = g(d.indices, "^IXIC");
  const dji = g(d.indices, "^DJI");
  const rut = g(d.indices, "^RUT");
  const vix = g(d.indices, "^VIX");
  const btc = g(d.assets, "BTCUSD");
  const gld = g(d.assets, "GLD");
  const uso = g(d.assets, "USO");
  const tlt = g(d.assets, "TLT");

  const spxUp = (spx?.changePercent ?? 0) >= 0;
  const tone =
    Math.abs(spx?.changePercent ?? 0) < 0.15 ? "flat" : spxUp ? "higher" : "lower";
  const slotName = d.slot === "open" ? "the open" : d.slot === "midday" ? "midday" : "the close";
  const verb = d.slot === "close" ? "finished" : "is trading";

  const megaSorted = [...d.megaCaps].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  );
  const megaLead = megaSorted[0];
  const megaNext = megaSorted.slice(1, 3);
  const tg = d.topGainers[0];
  const tl = d.topLosers[0];

  const title = `Desk note: ${slotName} — S&P 500 ${pct(spx?.changePercent)}, small caps ${
    (rut?.changePercent ?? 0) >= 0 ? "up" : "down"
  } ${pct(rut?.changePercent)}`;

  const paragraphs = [
    `The tape at ${slotName}: the S&P 500 ${verb} ${tone} at ${fmtPrice(spx?.price)} (${pct(
      spx?.changePercent
    )}), the Nasdaq at ${fmtPrice(ndx?.price)} (${pct(ndx?.changePercent)}), and the Dow at ${fmtPrice(
      dji?.price
    )} (${pct(dji?.changePercent)}).`,
    `Small caps ${(rut?.changePercent ?? 0) >= 0 ? "are outperforming" : "are lagging"}: the Russell 2000 sits at ${fmtPrice(
      rut?.price
    )} (${pct(rut?.changePercent)}). The VIX at ${fmtPrice(vix?.price)} reads ${
      (vix?.price ?? 20) < 17 ? "calm" : "elevated"
    }.`,
    megaLead
      ? `Among the mega caps, ${megaLead.symbol} is the biggest mover at ${money(megaLead.price)} (${pct(
          megaLead.changePercent
        )})${
          megaNext.length
            ? `, with ${megaNext.map((m) => `${m.symbol} ${pct(m.changePercent)}`).join(" and ")}`
            : ""
        }.`
      : "",
    `Elsewhere on the desk: bitcoin ${money(btc?.price)} (${pct(btc?.changePercent)}), gold via GLD ${money(
      gld?.price
    )} (${pct(gld?.changePercent)}), oil via USO ${money(uso?.price)} (${pct(
      uso?.changePercent
    )}), long Treasuries via TLT ${money(tlt?.price)} (${pct(tlt?.changePercent)}).`,
    tg && tl
      ? `On the movers board, ${tg.symbol} leads the gainers at ${money(tg.price)} (+${Math.abs(
          tg.changePercent
        ).toFixed(1)}%) while ${tl.symbol} paces the losers (−${Math.abs(tl.changePercent).toFixed(
          1
        )}%). Names moving that fast trade thin — treat the quotes with care.`
      : "",
    `Numbers as of ${d.timeET}. Follow the full tape live in the Terminal.`,
  ].filter(Boolean);

  return {
    title: title.slice(0, 78),
    summary: `S&P 500 ${pct(spx?.changePercent)}, Nasdaq ${pct(ndx?.changePercent)}, Russell 2000 ${pct(
      rut?.changePercent
    )} at ${slotName} — the desk's ${d.slot} read on the tape.`,
    content: paragraphs.join("\n\n"),
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    const vercelCron = req.headers.get("x-vercel-cron");
    if (!vercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const origin = new URL(req.url).origin;
  const et = etParts();
  const dry = searchParams.get("dry") === "1";
  const imgOnly = searchParams.get("img") === "1";
  const force = searchParams.get("force") === "1";

  const slot =
    (searchParams.get("slot") as "open" | "midday" | "close" | null) ??
    (et.hour < 12 ? "open" : et.hour < 16 ? "midday" : "close");

  try {
    // Weekend guard
    if (!force && (et.weekday === "Sat" || et.weekday === "Sun")) {
      return NextResponse.json({ skipped: "weekend" });
    }

    // Dedupe
    const slug = `desk-note-${et.date}-${slot}`;
    if (!force && !dry && !imgOnly) {
      const existing = await prisma.newsArticle.findUnique({ where: { slug }, select: { id: true } });
      if (existing) return NextResponse.json({ skipped: "already published", slug });
    }

    // ---- gather live data from our own APIs ----
    const j = async (p: string) => {
      const r = await fetch(`${origin}${p}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`${p} → ${r.status}`);
      return r.json();
    };

    const allSymbols = [...INDEX_SYMBOLS, ...ASSET_SYMBOLS, ...MEGA_SYMBOLS];
    const [quotesRaw, gainers, losers, news, ...charts] = await Promise.all([
      j(`/api/market/quotes?symbols=${encodeURIComponent(allSymbols.join(","))}`),
      j(`/api/market/movers?list=gainers`).catch(() => []),
      j(`/api/market/movers?list=losers`).catch(() => []),
      j(`/api/market/news`).catch(() => []),
      ...Object.keys(BOARD_SYMBOLS).map((s) =>
        j(`/api/market/chart?symbol=${encodeURIComponent(s)}&range=1D`).catch(() => [])
      ),
    ]);

    const quotes: Quote[] = Array.isArray(quotesRaw) ? quotesRaw : [];
    const bySym = new Map(quotes.map((q) => [q.symbol, q]));

    // Trading-day guard: S&P intraday bars must be from today (ET)
    const spxBars = charts[0] as { t: string; c: number }[];
    const lastBarDate = spxBars?.[spxBars.length - 1]?.t?.slice(0, 10);
    if (!force && lastBarDate !== et.date) {
      return NextResponse.json({ skipped: "market closed today", lastBarDate });
    }

    const pack = (syms: string[]) =>
      syms
        .map((s) => bySym.get(s))
        .filter(Boolean)
        .map((q) => ({
          symbol: q!.symbol,
          name: q!.name,
          price: q!.price,
          changePercent: Number((q!.changePercent ?? 0).toFixed(2)),
        }));

    const data = {
      slot,
      dateET: et.date,
      timeET: `${et.hour}:${et.minute} ET`,
      indices: pack(INDEX_SYMBOLS),
      assets: pack(ASSET_SYMBOLS),
      megaCaps: pack(MEGA_SYMBOLS),
      topGainers: (gainers as Quote[]).slice(0, 5).map((m) => ({
        symbol: m.symbol,
        name: m.name,
        price: m.price,
        changePercent: Number((m.changePercent ?? 0).toFixed(1)),
      })),
      topLosers: (losers as Quote[]).slice(0, 5).map((m) => ({
        symbol: m.symbol,
        name: m.name,
        price: m.price,
        changePercent: Number((m.changePercent ?? 0).toFixed(1)),
      })),
      wireHeadlines: (news as { title: string; site: string }[])
        .slice(0, 5)
        .map((n) => ({ title: n.title, site: n.site })),
    };

    // ---- LLM writes the note ----
    const slotFraming: Record<string, string> = {
      open: "It is shortly after the open. Frame as the morning read: how the session is starting, what is leading, what to watch into midday.",
      midday: "It is the middle of the trading day. Frame as a midday check: how the morning has developed, leadership, breadth, anything reversing.",
      close: "The session just ended. Frame as the closing recap: where the day settled, leaders and laggards, and what carries into tomorrow.",
    };

    const sys = `You write short market desk notes for the WallStreetStocks newsroom ("From the desk").
Voice: plain, precise, confident; a professional desk talking to serious retail investors. No hype, no emojis, no exclamation marks.
STRICT RULES:
- Use ONLY the numbers provided in the data. Never invent prices, events, causes, or news.
- Do not speculate about WHY something moved unless a provided headline supports it; you may cite provided headlines lightly ("on the wire from <site>: ...").
- Percentages: signed, two decimals for indices/mega caps (e.g. +0.42%), one decimal fine for movers. Prices with $ and commas.
- Mention 4-8 specific tickers total. Small-cap movers get a one-line liquidity caution if cited.
- 5 to 7 short paragraphs, 180 to 300 words total. Paragraphs separated by a blank line.
- End the final paragraph with a short pointer to following it live in the Terminal.
- ${slotFraming[slot]}
Return JSON: {"title": string (max 78 chars, lowercase after the colon like "Desk note: ..."), "summary": string (one sentence, max 200 chars), "content": string}.`;

    let note: { title: string; summary?: string; content: string };
    let writer = "gpt-4o-mini";
    try {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 900,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            { role: "user", content: JSON.stringify(data) },
          ],
        }),
      });
      if (!aiRes.ok) throw new Error(`OpenAI ${aiRes.status}`);
      const aiJson = await aiRes.json();
      const parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
      if (!parsed.title || !parsed.content || parsed.content.length < 300) {
        throw new Error("Generated note failed validation");
      }
      note = parsed;
    } catch (e) {
      console.error("newsroom auto: LLM writer unavailable, using template writer", e);
      note = fallbackNote(data);
      writer = "template";
    }

    if (dry) return NextResponse.json({ slot, slug, writer, note, data });

    // ---- board image ----
    const tiles: BoardTile[] = Object.entries(BOARD_SYMBOLS).map(([sym, label], i) => {
      const bars = (charts[i] as { t: string; c: number }[]) ?? [];
      const closes: number[] = [];
      const step = Math.max(1, Math.ceil(bars.length / 28));
      for (let k = bars.length - 1; k >= 0; k -= step) closes.push(bars[k].c);
      closes.reverse();
      const q = bySym.get(sym);
      return {
        label,
        price: fmtPrice(q?.price),
        changePercent: q?.changePercent ?? 0,
        closes: closes.length > 1 ? closes : [1, 1],
        prevClose: q?.previousClose,
        t0: bars.length ? barTime(bars[0].t) : "",
        t1: bars.length ? `${barTime(bars[bars.length - 1].t)} ET` : "",
      };
    });

    const slotLabel = { open: "THE OPEN", midday: "MIDDAY", close: "THE CLOSE" }[slot];
    const fontDir = path.join(process.cwd(), "public", "fonts");
    const [plexRegular, plexBold] = await Promise.all([
      readFile(path.join(fontDir, "IBMPlexMono-Regular.ttf")),
      readFile(path.join(fontDir, "IBMPlexMono-SemiBold.ttf")),
    ]);
    const board = new ImageResponse(
      buildBoardElement({
        heading: `FROM THE DESK — ${slotLabel}`,
        footerLeft: `Intraday · ${et.date} · as of ${et.hour}:${et.minute} ET`,
        tiles,
      }),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: "Plex", data: plexRegular, weight: 400, style: "normal" },
          { name: "Plex", data: plexBold, weight: 600, style: "normal" },
        ],
      }
    );

    if (imgOnly) return board;

    let imageUrl: string | null = null;
    try {
      const png = Buffer.from(await board.arrayBuffer());
      const { put } = await import("@vercel/blob");
      const blob = await put(`newsroom/${slug}.png`, png, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: true,
      });
      imageUrl = blob.url;
    } catch (e) {
      console.error("newsroom auto: board upload failed, publishing without image", e);
    }

    const article = await prisma.newsArticle.create({
      data: {
        slug,
        title: String(note.title).slice(0, 140),
        summary: note.summary ? String(note.summary).slice(0, 300) : null,
        content: String(note.content),
        symbol: "^GSPC",
        imageUrl,
        published: true,
        authorEmail: AUTHOR,
      },
    });

    return NextResponse.json({ published: article.slug, id: article.id, imageUrl, writer });
  } catch (e) {
    console.error("newsroom auto error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "auto publish failed" },
      { status: 500 }
    );
  }
}
