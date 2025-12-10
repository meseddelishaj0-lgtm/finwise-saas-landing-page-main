import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: "⚠️ No message provided." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // GPT-5-level model
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
      return NextResponse.json(
        { reply: "⚠️ OpenAI API error: " + data.error.message },
        { status: 500 }
      );
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
