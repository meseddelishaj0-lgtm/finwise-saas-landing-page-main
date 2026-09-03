"use client";

import React, { useState, useRef } from "react";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-ivory placeholder:text-gray-600 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const aiMessage = { sender: "ai", text: "" };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (!response.ok) throw new Error("Failed to connect to AI API");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullText += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.sender === "ai") last.text = fullText;
          return [...updated];
        });

        scrollToBottom();
      }
    } catch (err) {
      console.error("AI fetch error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="ASK" note="ask the desk anything" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
            Ask the <em className="italic text-gold-soft">desk</em>.
          </h1>
          <p className="mt-5 text-lg text-gray-300 max-w-2xl">
            Stock picks, market outlook, valuation models, portfolio strategy.
            Ask in plain English and the desk answers from live data.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-12">
          <div className="max-w-3xl">
            {/* Transcript */}
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 flex flex-col gap-4 min-h-[280px] max-h-[60vh] overflow-y-auto"
              role="log"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <p className="text-[15px] md:text-base leading-relaxed text-gray-500">
                  Ask a question to start the conversation.
                </p>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={i}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] md:text-base leading-relaxed whitespace-pre-wrap break-words ${
                          isUser
                            ? "bg-gold/10 border border-gold/30 text-ivory"
                            : "bg-surface border border-white/10 text-gray-300"
                        }`}
                      >
                        {msg.text === "" && !isUser && loading ? (
                          <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                            Thinking
                          </span>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Composer */}
            <div className="mt-4 flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about a stock, a sector, or your portfolio"
                aria-label="Message the desk"
                className={inputClass}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="btn-gold px-5 py-2.5 text-sm shrink-0 disabled:opacity-60 disabled:pointer-events-none"
              >
                Send
              </button>
            </div>
            <p className="mt-3 font-monodata text-[11px] uppercase tracking-widest text-gray-500">
              Enter to send. Not investment advice.
            </p>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
