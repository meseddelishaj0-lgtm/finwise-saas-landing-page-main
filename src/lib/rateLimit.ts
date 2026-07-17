// src/lib/rateLimit.ts
// Lightweight best-effort rate limiter for public/unauthenticated endpoints
// (AI proxies, uploads, referral completion) to blunt bill/storage abuse.
//
// NOTE: this is in-memory and therefore PER serverless instance — it caps a
// sustained burst that keeps hitting a warm lambda, but it is not a global
// limit across the Vercel fleet. For hard guarantees, back it with a shared
// store (Upstash Redis / Vercel KV) — the call sites won't need to change.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  // Occasionally drop expired buckets so the map can't grow unbounded.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const first = fwd.split(',')[0].trim();
  return first || req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Fixed-window limiter. Returns { ok } and, when blocked, retryAfter seconds.
 * `key` should scope the bucket, e.g. `ai:${ip}`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

import { NextResponse } from 'next/server';

/** Convenience: enforce a per-IP limit; returns a 429 response if exceeded, else null. */
export function enforceRateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const { ok, retryAfter } = rateLimit(`${scope}:${clientIp(req)}`, limit, windowMs);
  if (ok) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
