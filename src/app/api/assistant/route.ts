import { NextResponse } from "next/server";
import { enforceRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const _rl = enforceRateLimit(req, 'ai', 15, 60_000);
  if (_rl) return _rl;
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ reply: "⚠️ No message provided." }, { status: 400 });
    }
    // Cap input size to blunt cost/abuse.
    if (message.length > 4000) {
      return NextResponse.json({ reply: "⚠️ Message too long." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // GPT-5-level model
        max_tokens: 1000, // cap output cost
        messages: [
          {
            role: "system",
            content:
              "You are WallStreetStocks AI — an advanced market research assistant providing professional, factual insights on stocks, ETFs, and valuations.",
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI API error:", data.error);
      // Don't echo the provider's error text back to the client.
      return NextResponse.json({ reply: "⚠️ AI service error." }, { status: 502 });
    }

    const reply = data.choices?.[0]?.message?.content ?? "⚠️ No response from AI.";
    return new Response(reply, {
  headers: { "Content-Type": "text/plain; charset=utf-8" },
});

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { reply: "⚠️ Server error occurred." },
      { status: 500 }
    );
  }
}
