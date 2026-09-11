import { NextResponse } from "next/server";
import { COMMODITIES, getQuotes } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// Commodity board with a one-line AI comment per contract.
// Prices come from Twelve Data (spot metals as XAU/XAG/XPT/XPD pairs, energy
// and ags as front-month futures); the commentary still comes from OpenAI.

const BOARD = COMMODITIES.filter((c) =>
  ["XAU/USD", "CL1", "XAG/USD", "HG1", "NG1", "C_1", "W_1"].includes(c.symbol)
);

export async function GET() {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;

    const quotes = await getQuotes(
      BOARD.map((c) => c.symbol),
      { ttl: 60_000 }
    );
    const by = new Map(quotes.map((q) => [q.symbol, q]));

    const rawData = BOARD.map((c) => {
      const q = by.get(c.symbol);
      return {
        name: c.name,
        symbol: c.symbol,
        unit: c.unit,
        price: q ? Number(q.price).toFixed(2) : "N/A",
        change: q ? Number(q.change).toFixed(2) : "0.00",
        changesPercentage: q ? Number(q.changesPercentage).toFixed(2) : "0.00",
      };
    });

    // Commentary is a nicety: if the key is missing or the call fails, the
    // board still renders with prices.
    const summaries = await Promise.all(
      rawData.map(async (item) => {
        if (!openaiKey || item.price === "N/A") return "";
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are a financial analyst." },
                {
                  role: "user",
                  content: `Summarize ${item.name}'s latest market movement based on a ${item.changesPercentage}% change. Write 1 short sentence that sounds like financial commentary.`,
                },
              ],
              max_tokens: 50,
              temperature: 0.7,
            }),
          });
          const ai = await res.json();
          return ai?.choices?.[0]?.message?.content || "";
        } catch {
          return "";
        }
      })
    );

    const finalData = rawData.map((item, i) => ({
      ...item,
      summary: summaries[i] || "Market data updated.",
    }));

    return NextResponse.json(finalData, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    console.error("Commodities route error:", err);
    return NextResponse.json(
      { error: "Failed to fetch commodities" },
      { status: 500 }
    );
  }
}
