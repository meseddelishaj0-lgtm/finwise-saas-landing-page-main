import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
