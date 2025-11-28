import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    const prompt = `
    You are a startup mentor. Give a detailed, structured explanation for:
    "${topic}" in the context of building and scaling a startup.
    Include 3 sections:
    1. Overview
    2. Practical Steps
    3. Common Mistakes
    Make it simple and professional.
    `;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const output = data?.choices?.[0]?.message?.content || "No response";

    return NextResponse.json({ result: output });
  } catch (err) {
    console.error("Startup API Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
