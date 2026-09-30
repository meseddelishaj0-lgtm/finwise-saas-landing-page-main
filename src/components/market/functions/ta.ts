// Technical-analysis and risk math for the terminal function panels
// (HP, COMP, TECH). Pure functions over ascending OHLCV bars.

export interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type Series = (number | null)[];

export const smaOf = (vals: number[], period: number): Series => {
  const out: Series = new Array(vals.length).fill(null);
  let sum = 0;
  for (let i = 0; i < vals.length; i++) {
    sum += vals[i];
    if (i >= period) sum -= vals[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
};

export const emaOf = (vals: Series, period: number): Series => {
  const out: Series = new Array(vals.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  let seen = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (v == null) continue;
    prev = prev == null ? v : v * k + prev * (1 - k);
    if (++seen >= period) out[i] = prev;
  }
  return out;
};

export const rsiOf = (closes: number[], period = 14): Series => {
  const out: Series = new Array(closes.length).fill(null);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = Math.max(d, 0);
    const l = Math.max(-d, 0);
    if (i <= period) {
      gain += g;
      loss += l;
      if (i === period) {
        gain /= period;
        loss /= period;
        out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
      }
    } else {
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
      out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
  }
  return out;
};

export const macdOf = (closes: number[]) => {
  const e12 = emaOf(closes, 12);
  const e26 = emaOf(closes, 26);
  const line: Series = closes.map((_, i) => (e12[i] != null && e26[i] != null ? e12[i]! - e26[i]! : null));
  const signal = emaOf(line, 9);
  return { line, signal };
};

/** Stochastic %K (raw) over `period` bars. */
export const stochK = (bars: Bar[], period = 14): Series =>
  bars.map((b, i) => {
    if (i < period - 1) return null;
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].h);
      lo = Math.min(lo, bars[j].l);
    }
    return hi === lo ? 50 : ((b.c - lo) / (hi - lo)) * 100;
  });

export const cciOf = (bars: Bar[], period = 20): Series =>
  bars.map((_, i) => {
    if (i < period - 1) return null;
    const tps: number[] = [];
    for (let j = i - period + 1; j <= i; j++) tps.push((bars[j].h + bars[j].l + bars[j].c) / 3);
    const mean = tps.reduce((a, b) => a + b, 0) / period;
    const md = tps.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    return md === 0 ? 0 : (tps[tps.length - 1] - mean) / (0.015 * md);
  });

export const atrOf = (bars: Bar[], period = 14): Series => {
  const out: Series = new Array(bars.length).fill(null);
  let atr: number | null = null;
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].h - bars[i].l,
      Math.abs(bars[i].h - bars[i - 1].c),
      Math.abs(bars[i].l - bars[i - 1].c)
    );
    if (i < period) {
      atr = (atr ?? 0) + tr;
      if (i === period - 1) atr = atr / (period - 1);
      continue;
    }
    atr = ((atr ?? tr) * (period - 1) + tr) / period;
    out[i] = atr;
  }
  return out;
};

/** Simple period returns (fractional) from a close series. */
export const returnsOf = (closes: number[]): number[] => {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) out.push(closes[i] / closes[i - 1] - 1);
  }
  return out;
};

export const stdev = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

/** Annualised volatility in percent. */
export const annualVol = (rets: number[], periodsPerYear = 252): number =>
  stdev(rets) * Math.sqrt(periodsPerYear) * 100;

/** Max peak-to-trough drawdown in percent (negative number). */
export const maxDrawdown = (closes: number[]): number => {
  let peak = -Infinity;
  let mdd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    if (peak > 0) mdd = Math.min(mdd, (c - peak) / peak);
  }
  return mdd * 100;
};

export const correlation = (a: number[], b: number[]): number | null => {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const xa = a.slice(-n);
  const xb = b.slice(-n);
  const ma = xa.reduce((s, v) => s + v, 0) / n;
  const mb = xb.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    cov += (xa[i] - ma) * (xb[i] - mb);
    va += (xa[i] - ma) ** 2;
    vb += (xb[i] - mb) ** 2;
  }
  return va && vb ? cov / Math.sqrt(va * vb) : null;
};

/** Beta of `a` against benchmark `b`. */
export const betaOf = (a: number[], b: number[]): number | null => {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  const xa = a.slice(-n);
  const xb = b.slice(-n);
  const ma = xa.reduce((s, v) => s + v, 0) / n;
  const mb = xb.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    cov += (xa[i] - ma) * (xb[i] - mb);
    vb += (xb[i] - mb) ** 2;
  }
  return vb ? cov / vb : null;
};

/** Roll daily bars up to weekly (ISO-ish: new week when weekday resets) or monthly. */
export const rollUpBars = (bars: Bar[], per: "W" | "M"): Bar[] => {
  const out: Bar[] = [];
  let key = "";
  for (const b of bars) {
    const d = new Date(`${b.t.slice(0, 10)}T12:00:00Z`);
    let k: string;
    if (per === "M") k = b.t.slice(0, 7);
    else {
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      k = monday.toISOString().slice(0, 10);
    }
    if (k !== key) {
      out.push({ ...b });
      key = k;
    } else {
      const cur = out[out.length - 1];
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v;
      cur.t = b.t;
    }
  }
  return out;
};
