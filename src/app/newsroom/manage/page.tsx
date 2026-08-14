"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import CommandLine from "@/components/ui/CommandLine";

interface Article {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  imageUrl: string | null;
  symbol: string | null;
  published: boolean;
  publishedAt: string;
}

const inputCls =
  "w-full rounded-lg bg-surface border border-white/10 px-4 py-3 text-white placeholder-gray-600 focus:border-yellow-400/50 focus:outline-none transition-colors";

export default function NewsroomManagePage() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [symbol, setSymbol] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/newsroom?manage=1");
      if (r.status === 403) {
        setIsAdmin(false);
        return;
      }
      const d = await r.json();
      setIsAdmin(!!d.admin);
      if (Array.isArray(d.articles)) setArticles(d.articles);
    } catch {
      setNotice("Couldn't load articles — try refreshing.");
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSymbol("");
    setImageUrl("");
    setSummary("");
    setContent("");
  };

  const startEdit = (a: Article) => {
    setEditingId(a.id);
    setTitle(a.title);
    setSymbol(a.symbol ?? "");
    setImageUrl(a.imageUrl ?? "");
    setSummary(a.summary ?? "");
    setContent(a.content);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (published: boolean) => {
    if (!title.trim() || !content.trim()) {
      setNotice("A title and the story text are required.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const payload = { title, symbol, imageUrl, summary, content, published };
      const r = editingId
        ? await fetch(`/api/newsroom/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/newsroom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Save failed");
      setNotice(published ? "Published." : "Saved as draft.");
      resetForm();
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (a: Article) => {
    setBusy(true);
    try {
      await fetch(`/api/newsroom/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !a.published }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    try {
      await fetch(`/api/newsroom/${id}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <section
      className="relative w-screen min-h-screen text-white bg-night"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      <div className="max-w-4xl mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-24">{children}</div>
    </section>
  );

  if (status === "loading") return shell(<p className="text-gray-500">Checking session…</p>);

  if (status === "unauthenticated") {
    return shell(
      <>
        <CommandLine cmd="PUB" note="newsroom access" className="mb-4" />
        <h1 className="font-display text-ivory text-4xl md:text-5xl tracking-tight">
          Log in to write the wire.
        </h1>
        <p className="mt-4 text-gray-400">
          The newsroom composer is for the WallStreetStocks team.
        </p>
        <Link href="/login" className="btn-gold mt-8 inline-flex px-8 py-3">
          Log in
        </Link>
      </>
    );
  }

  if (isAdmin === false) {
    return shell(
      <>
        <CommandLine cmd="PUB" note="newsroom access" className="mb-4" />
        <h1 className="font-display text-ivory text-4xl md:text-5xl tracking-tight">
          This account can&apos;t publish.
        </h1>
        <p className="mt-4 text-gray-400">
          You&apos;re signed in as{" "}
          <span className="text-gray-200">{session?.user?.email}</span>, which isn&apos;t on
          the newsroom admin list. Sign in with the owner account, or add this
          email to the <span className="font-monodata text-gold">ADMIN_EMAILS</span>{" "}
          environment variable.
        </p>
      </>
    );
  }

  return shell(
    <>
      <CommandLine cmd="PUB" note="write the wire" className="mb-4" />
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <h1 className="font-display text-ivory text-4xl md:text-5xl tracking-tight">
          {editingId ? "Edit story." : "New story."}
        </h1>
        <Link
          href="/newsroom"
          className="font-monodata text-[11px] uppercase tracking-widest text-gray-500 hover:text-gold transition-colors"
        >
          View public newsroom →
        </Link>
      </div>

      {/* Composer */}
      <div className="mt-10 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline"
          className={`${inputCls} font-display text-2xl`}
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Ticker tag (optional) — e.g. NVDA"
            className={`${inputCls} font-monodata uppercase`}
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className={inputCls}
          />
        </div>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="One-line summary shown in feeds (optional)"
          className={inputCls}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="The story. Separate paragraphs with a blank line."
          rows={12}
          className={`${inputCls} leading-relaxed resize-y`}
        />

        <div className="flex items-center gap-4 flex-wrap pt-2">
          <button onClick={() => save(true)} disabled={busy} className="btn-gold px-8 py-3 disabled:opacity-50">
            {editingId ? "Update & publish" : "Publish"}
          </button>
          <button
            onClick={() => save(false)}
            disabled={busy}
            className="btn-ghost-gold px-8 py-3 disabled:opacity-50"
          >
            Save draft
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="font-monodata text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel edit
            </button>
          )}
          {notice && <span className="text-sm text-gold-soft">{notice}</span>}
        </div>
      </div>

      {/* Existing stories */}
      <h2 className="mt-16 font-display text-ivory text-2xl tracking-tight">On file</h2>
      <div className="mt-4 border-t border-white/10">
        {articles.length === 0 && (
          <p className="py-8 text-gray-500">No stories yet — publish your first above.</p>
        )}
        {articles.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-4 py-4 border-b border-white/10 flex-wrap"
          >
            <span
              className={`font-monodata text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${
                a.published
                  ? "text-green-400 bg-green-500/10 border border-green-500/25"
                  : "text-gray-400 bg-white/[0.05] border border-white/10"
              }`}
            >
              {a.published ? "Live" : "Draft"}
            </span>
            <span className="flex-1 min-w-[200px]">
              <span className="block text-ivory font-semibold leading-snug">{a.title}</span>
              <span className="font-monodata text-[11px] text-gray-500 uppercase tracking-wider">
                {new Date(a.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {a.symbol ? ` · ${a.symbol}` : ""}
              </span>
            </span>
            <div className="flex items-center gap-3 font-monodata text-xs uppercase tracking-wider">
              {a.published && (
                <Link href={`/newsroom/${a.slug}`} className="text-gray-400 hover:text-gold transition-colors">
                  View
                </Link>
              )}
              <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-gold transition-colors">
                Edit
              </button>
              <button
                onClick={() => togglePublish(a)}
                disabled={busy}
                className="text-gray-400 hover:text-gold transition-colors disabled:opacity-50"
              >
                {a.published ? "Unpublish" : "Publish"}
              </button>
              {confirmDeleteId === a.id ? (
                <button
                  onClick={() => remove(a.id)}
                  disabled={busy}
                  className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  Confirm delete
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(a.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
