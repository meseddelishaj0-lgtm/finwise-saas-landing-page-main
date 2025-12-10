"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

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
        { sender: "ai", text: "⚠️ Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#fff9e6] to-[#fff5cc] flex flex-col items-center pt-24 pb-10 px-4 text-gray-900">
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-4xl font-extrabold mb-3 text-yellow-500 text-center"
      >
        🤖 WallStreetStocks AI Assistant
      </motion.h1>

      <p className="text-gray-600 mb-10 text-center max-w-xl">
        Ask about stock picks, market outlook, valuation models, or portfolio
        strategies — powered by{" "}
        <span className="font-semibold text-yellow-600">
          WallStreetStocks.ai
        </span>
      </p>

      {/* Chat container */}
      <div className="w-full max-w-2xl flex flex-col items-center space-y-5">
        {/* Chat messages */}
        <div className="w-full bg-white rounded-3xl border border-gray-200 shadow-md p-5 flex flex-col space-y-3 max-h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 italic">
              Ask a question to start your AI conversation...
            </p>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl text-sm font-medium shadow-sm max-w-[80%] break-words ${
                    msg.sender === "user"
                      ? "bg-yellow-400 text-black rounded-br-none"
                      : "bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Section */}
        <div className="w-full flex items-center justify-center space-x-3 mt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about stocks, AI picks, or portfolio strategy..."
            className="flex-grow max-w-[80%] border border-gray-300 bg-white rounded-full px-5 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-yellow-400 text-black rounded-full px-4 py-3 hover:bg-yellow-500 transition-all shadow-md disabled:opacity-60"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}
