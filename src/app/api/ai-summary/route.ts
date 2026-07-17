import { NextResponse } from "next/server";
import { enforceRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const _rl = enforceRateLimit(req, 'ai', 15, 60_000);
  if (_rl) return _rl;

  try {
    // Parse inside try — a malformed/empty body was an unhandled 500 before.
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length > 4000) {
      return NextResponse.json({ insight: "AI summary unavailable." }, { status: 400 });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 800,
        messages: [
          { role: "system", content: "You are a financial strategist." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      }),
    });

    const json = await res.json();
    const content =
      json.choices?.[0]?.message?.content || "AI summary unavailable.";
    return NextResponse.json({ insight: content });
  } catch (error) {
    console.error("AI summary error:", error);
    return NextResponse.json({ insight: "Error generating insight." });
  }
}
