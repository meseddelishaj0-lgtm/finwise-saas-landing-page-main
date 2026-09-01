"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-ivory placeholder:text-gray-600 transition-colors focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/login");
    } else {
      const data = await res.json();
      setError(data.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-night px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface p-8 md:p-10">
        <CommandLine cmd="NEW" note="open a free account" className="mb-4" />
        <h1 className="font-display text-ivory text-3xl md:text-4xl tracking-tight">
          Take a seat at the <em className="italic text-gold-soft">desk</em>.
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Free to start. The terminal, live data, and research follow you on
          the web and in the iOS app.
        </p>

        {error && (
          <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
              Full name
            </span>
            <input
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="name"
              required
            />
          </label>
          <label className="block">
            <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
              Email
            </span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
              Password
            </span>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`btn-gold w-full py-3 mt-2 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {loading ? "Creating…" : "Create free account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-gold hover:text-gold-soft underline underline-offset-4 transition-colors"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-500">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-gray-300">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-300">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
