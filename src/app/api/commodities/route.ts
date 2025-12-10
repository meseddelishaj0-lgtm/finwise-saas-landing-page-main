import { NextResponse } from "next/server";

export async function GET() {
  try {
    const fmp_api_key = process.env.FMP_API_KEY;
    const openai_api_key = process.env.OPENAI_API_KEY;

    if (!fmp_api_key || !openai_api_key) {
      return NextResponse.json(
        { error: "Missing API keys (FMP_API_KEY or OPENAI_API_KEY)" },
        { status: 500 }
      );
    }

    const commodities = [
      { symbol: "GC=F", name: "Gold" },
      { symbol: "CL=F", name: "Crude Oil" },
      { symbol: "SI=F", name: "Silver" },
      { symbol: "HG=F", name: "Copper" },
      { symbol: "NG=F", name: "Natural Gas" },
      { symbol: "ZC=F", name: "Corn" },
      { symbol: "ZW=F", name: "Wheat" },
    ];

    // ✅ Fetch live quotes
    const responses = await Promise.all(
      commodities.map((c) =>
        fetch(
          `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
            c.symbol
          )}?apikey=${fmp_api_key}`
        ).then((r) => r.json())
      )
    );

    // ✅ Structure commodity data
    const rawData = responses.map((r, i) => {
      const d = r[0];
      return {
        name: commodities[i].name,
        symbol: commodities[i].symbol,
        price: d?.price ? Number(d.price).toFixed(2) : "N/A",
        change: d?.change ? Number(d.change).toFixed(2) : "0.00",
        changesPercentage: d?.changesPercentage
          ? Number(d.changesPercentage).toFixed(2)
          : "0.00",
      };
    });

    // ✅ Generate AI summaries
    const summaries = await Promise.all(
      rawData.map(async (item) => {
        try {
          const prompt = `Summarize ${item.name}'s latest market movement based on a ${item.changesPercentage}% change. Write 1 short sentence that sounds like financial commentary.`;
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openai_api_key}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are a financial analyst." },
                { role: "user", content: prompt },
              ],
              max_tokens: 50,
              temperature: 0.7,
            }),
          });

          const ai = await res.json();
          const summary =
            ai?.choices?.[0]?.message?.content ||
            "Market data updated successfully.";
          return summary;
        } catch {
          return "No summary available.";
        }
      })
    );

    // ✅ Merge summaries
    const finalData = rawData.map((item, i) => ({
      ...item,
      summary: summaries[i],
    }));

    return NextResponse.json(finalData);
  } catch (err) {
    console.error("Commodities AI Route Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch commodities or generate summaries" },
      { status: 500 }
    );
  }
}
