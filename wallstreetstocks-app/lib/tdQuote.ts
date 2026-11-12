// lib/tdQuote.ts
// One Twelve Data /quote request per symbol, shared by everyone who asks for
// it at the same moment. Opening a symbol used to fetch the same quote twice
// (the screen's layout prefetch and the chart tab); both now call this and
// the second caller joins the first one's request.

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// A finished response is reused for this long, so two callers that start a
// moment apart still share it. Short enough that a manual refresh is fresh.
const REUSE_MS = 2000;

const inflight = new Map<string, Promise<any>>();
const recent = new Map<string, { at: number; data: any }>();

/**
 * Raw /quote response for one symbol, exactly as Twelve Data returns it.
 * Rejects when the request or the JSON parse fails, like a bare fetch would.
 */
export function fetchTdQuote(symbol: string): Promise<any> {
  const key = symbol.toUpperCase().trim();

  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < REUSE_MS) return Promise.resolve(hit.data);

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = (async () => {
    try {
      const res = await fetch(`${TWELVE_DATA_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVE_DATA_API_KEY}`);
      const data = await res.json();
      recent.set(key, { at: Date.now(), data });
      // Don't let the map grow with every symbol ever opened
      if (recent.size > 50) {
        const oldest = recent.keys().next().value;
        if (oldest !== undefined) recent.delete(oldest);
      }
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}
