"use client";

// Streaming last-trade prices for the terminal. One shared WebSocket to the
// WallStreetStocks relay (the same Twelve Data stream the mobile app uses),
// reference-counted per symbol, reconnecting with backoff, closed when no
// component needs it.
//
// The stream covers stocks, ETFs, crypto and FX. Indices and futures are not
// on it — those keep polling.

import React, { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WSS_PRICE_URL || "wss://wallstreetstocks-ws-server-production.up.railway.app";
const MAX_SYMBOLS = 24;

const CRYPTO = new Set([
  "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "DOT", "LINK", "LTC", "BCH", "UNI", "ATOM", "XLM", "ETC",
  "FIL", "APT", "ARB", "NEAR", "TRX", "SUI", "HBAR", "BNB", "AAVE",
]);
const FX = new Set(["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "MXN", "CNY"]);
const NOT_STREAMED = /^(GC|SI|PL|PA|CL|BZ|NG|HG|CC|LB|DX|ES|NQ|YM|RTY|ZN|ZB|RB|HO|ALI)USD$/;

/** Site symbol → stream symbol, or null when the stream does not carry it. */
export const toStream = (symbol: string): string | null => {
  const s = symbol.toUpperCase();
  if (s.startsWith("^") || s.endsWith("USX") || NOT_STREAMED.test(s) || s.includes(".")) return null;
  if (s.length === 6 && FX.has(s.slice(0, 3)) && FX.has(s.slice(3))) return `${s.slice(0, 3)}/${s.slice(3)}`;
  if (s.endsWith("USD") && CRYPTO.has(s.slice(0, -3))) return `${s.slice(0, -3)}/USD`;
  return /^[A-Z]{1,5}$/.test(s) ? s : null;
};

type Listener = () => void;

const prices = new Map<string, number>(); // stream symbol → last price
const refs = new Map<string, number>(); // stream symbol → subscriber count
const listeners = new Set<Listener>();
let ws: WebSocket | null = null;
let connected = false;
let retry = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

const emit = () => listeners.forEach((l) => l());
const send = (msg: object) => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

function connect() {
  if (ws || typeof window === "undefined" || refs.size === 0) return;
  try {
    ws = new WebSocket(WS_URL);
  } catch {
    ws = null;
    return;
  }
  ws.onopen = () => {
    connected = true;
    retry = 0;
    if (refs.size) send({ action: "subscribe", symbols: [...refs.keys()].join(",") });
    pingTimer = setInterval(() => send({ action: "ping" }), 25_000);
    emit();
  };
  ws.onmessage = (e) => {
    try {
      const m = JSON.parse(e.data);
      if (m.event === "price" && typeof m.price === "number" && refs.has(m.symbol)) {
        if (prices.get(m.symbol) !== m.price) {
          prices.set(m.symbol, m.price);
          emit();
        }
      }
    } catch {}
  };
  const drop = () => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
    ws = null;
    if (connected) {
      connected = false;
      emit();
    }
    if (refs.size && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, Math.min(30_000, 1500 * 2 ** retry++));
    }
  };
  ws.onclose = drop;
  ws.onerror = () => ws?.close();
}

function retain(streamSymbols: string[]) {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  const fresh: string[] = [];
  for (const s of streamSymbols) {
    const n = refs.get(s) ?? 0;
    if (!n) {
      if (refs.size >= MAX_SYMBOLS) continue;
      fresh.push(s);
    }
    refs.set(s, n + 1);
  }
  if (!ws) connect();
  else if (fresh.length) send({ action: "subscribe", symbols: fresh.join(",") });
  return () => {
    const gone: string[] = [];
    for (const s of streamSymbols) {
      const n = refs.get(s);
      if (!n) continue;
      if (n <= 1) {
        refs.delete(s);
        gone.push(s);
      } else refs.set(s, n - 1);
    }
    if (gone.length) send({ action: "unsubscribe", symbols: gone.join(",") });
    // Close shortly after the last subscriber leaves (not instantly, so a
    // symbol change does not bounce the socket).
    if (refs.size === 0 && !idleTimer) {
      idleTimer = setTimeout(() => {
        idleTimer = null;
        if (refs.size === 0 && ws) ws.close();
      }, 20_000);
    }
  };
}

/** Live prices keyed by site symbol. Re-renders at most twice a second. */
export function useLive(symbols: string[], enabled = true): Record<string, number> {
  const [, bump] = useState(0);
  const key = enabled ? symbols.join(",") : "";

  useEffect(() => {
    if (!key) return;
    const stream = key.split(",").map(toStream).filter((s): s is string => !!s);
    if (!stream.length) return;
    const release = retain([...new Set(stream)]);
    let dirty = false;
    const l = () => {
      dirty = true;
    };
    listeners.add(l);
    const t = setInterval(() => {
      if (dirty) {
        dirty = false;
        bump((n) => n + 1);
      }
    }, 500);
    return () => {
      listeners.delete(l);
      clearInterval(t);
      release();
    };
  }, [key]);

  const out: Record<string, number> = {};
  if (key) {
    for (const s of key.split(",")) {
      const st = toStream(s);
      const p = st ? prices.get(st) : undefined;
      if (p !== undefined) out[s] = p;
    }
  }
  return out;
}

/** True while the stream is connected. */
export function useLiveStatus(): boolean {
  const [on, setOn] = useState(connected);
  useEffect(() => {
    const l = () => setOn(connected);
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return on;
}

/** Wraps a number and flashes green/red for a moment when it ticks. */
export const Tick: React.FC<{ value?: number | null; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  const prev = useRef<number | null | undefined>(value);
  const [flash, setFlash] = useState<"" | "tick-up" | "tick-down">("");
  useEffect(() => {
    const p = prev.current;
    prev.current = value;
    if (typeof p !== "number" || typeof value !== "number" || p === value) return;
    setFlash(value > p ? "tick-up" : "tick-down");
    const t = setTimeout(() => setFlash(""), 700);
    return () => clearTimeout(t);
  }, [value]);
  return <span className={`${className ?? ""} ${flash}`}>{children}</span>;
};
