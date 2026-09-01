"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-ivory placeholder:text-gray-600 transition-colors focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
    } else if (res?.ok) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-night px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface p-8 md:p-10">
        <CommandLine cmd="LOGIN" note="sign in to the desk" className="mb-4" />
        <h1 className="font-display text-ivory text-3xl md:text-4xl tracking-tight">
          Welcome <em className="italic text-gold-soft">back</em>.
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Your watchlists, portfolios, and research are where you left them.
        </p>

        {error && (
          <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`btn-gold w-full py-3 mt-2 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          New to the desk?{" "}
          <Link
            href="/register"
            className="text-gold hover:text-gold-soft underline underline-offset-4 transition-colors"
          >
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
