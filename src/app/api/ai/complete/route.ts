// src/app/api/ai/complete/route.ts
// Server-side proxy for the app's AI tools. The app used to call
// api.openai.com directly with EXPO_PUBLIC_OPENAI_API_KEY, which baked the key
// into the published bundle (extractable by anyone). The app now posts here and
// the key lives ONLY in the server env (OPENAI_API_KEY). Rate-limited, model-
// whitelisted, and token-capped so it can't be abused as a free OpenAI relay.
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import { resolveMobileUserId } from '@/lib/mobileAuth';
import { resolveUserTier, isPaidTier } from '@/lib/subscriptionTier';

const ALLOWED_MODELS = new Set(['gpt-4o-mini']);
const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_TOKENS_CAP = 3000;
const MAX_BODY_CHARS = 20000; // bound prompt size to cap per-call cost

// The app's premium AI features (AI Tools = Diamond, ai-analysis = Gold, etc.)
// all funnel through this one proxy, so we gate it at "any paid tier" — the
// per-feature Diamond-vs-Gold gate stays client-side. OFF by default so it
// can't break un-updated builds that don't yet send auth; flip to '1' only
// after the token-sending OTA has propagated (same pattern as
// STRICT_MOBILE_AUTH).
const STRICT_AI_GATING = process.env.STRICT_AI_GATING === '1';

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'ai', 20, 60_000);
  if (limited) return limited;

  if (STRICT_AI_GATING) {
    const auth = resolveMobileUserId(req, req.headers.get('x-user-id'));
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const tier = await resolveUserTier(auth.userId);
    if (!isPaidTier(tier)) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 402 });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }
    if (JSON.stringify(messages).length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    // Force a whitelisted model and cap tokens regardless of what the client asks.
    const model = ALLOWED_MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;
    const max_tokens = Math.min(Number(body?.max_tokens) || 800, MAX_TOKENS_CAP);
    const temperature = typeof body?.temperature === 'number' ? body.temperature : 0.3;

    const payload: Record<string, any> = { model, messages, max_tokens, temperature };
    if (body?.response_format) payload.response_format = body.response_format;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // Pass OpenAI's JSON straight through so the app's existing
    // choices[0].message.content parsing works unchanged.
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    console.error('ai/complete error:', err);
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
}
