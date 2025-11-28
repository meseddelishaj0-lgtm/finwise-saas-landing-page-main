import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { theme, sector } = await req.json();

    if (!theme) {
      return NextResponse.json(
        { error: "Theme is required (growth, value, momentum)." },
        { status: 400 }
      );
    }

    const prompt = `
      You are a professional equity analyst.
      Recommend 5 U.S. publicly traded stocks optimized for the ${theme} investing strategy.
      Sector (optional): ${sector || "All"}
      For each stock provide:
      - symbol
      - name
      - sector
      - one-sentence rationale
      - sentiment (Bullish, Bearish, or Neutral)
      Return a JSON array only, for example:
      [
        {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "rationale": "...", "sentiment": "Bullish"},
        ...
      ]
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const message = completion.choices[0].message.content?.trim() || "[]";
    // Parse safely in case AI returns extra text
    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch {
      const start = message.indexOf("[");
      const end = message.lastIndexOf("]");
      parsed =
        start !== -1 && end !== -1
          ? JSON.parse(message.slice(start, end + 1))
          : [];
    }

    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("AI stock picks error:", err);
    return NextResponse.json(
      { error: "Failed to generate stock picks." },
      { status: 500 }
    );
  }
}
