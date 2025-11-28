import { NextResponse } from "next/server";

// ✅ GET → Fetch live crypto market data
export async function GET() {
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing FMP_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    const url = `https://financialmodelingprep.com/api/v3/quotes/crypto?apikey=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`FMP API returned status ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid FMP response");
    }

    // ✅ Select top 20 cryptos by market cap
    const cryptos = data
      .filter((c: any) => c.marketCap && c.price)
      .sort((a: any, b: any) => b.marketCap - a.marketCap)
      .slice(0, 20)
      .map((c: any) => ({
        symbol: c.symbol,
        name: c.name,
        price: parseFloat(c.price).toFixed(2),
        changes24h: c.changesPercentage?.toFixed(2) || "0.00",
        marketCap: Number(c.marketCap).toLocaleString(),
        volume: Number(c.volume).toLocaleString(),
      }));

    return NextResponse.json(cryptos);
  } catch (err) {
    console.error("Crypto API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch crypto data" },
      { status: 500 }
    );
  }
}

// ✅ POST → AI-powered crypto insights
export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { error: "Missing crypto name or symbol" },
        { status: 400 }
      );
    }

    const prompt = `
Provide a professional, concise crypto analysis for ${topic}.
Include:
1. What it does and its main use case.
2. Tokenomics (supply, burn, staking, etc.).
3. Market sentiment and recent trends.
4. Key risks and challenges.
Keep it factual and engaging for investors.
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await aiRes.json();
    const result =
      data?.choices?.[0]?.message?.content || "No insights available.";

    return NextResponse.json({ result });
  } catch (err) {
    console.error("Crypto AI Error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI insights" },
      { status: 500 }
    );
  }
}
