// hooks/useQuoteTick.ts
// Re-render driver for live prices.
//
// Screens used to run a timer that re-rendered them 4-10 times a second
// forever, whether or not a price had moved and whether or not the screen was
// visible. This hook returns a counter that only moves when one of the given
// symbols actually changed in the price store, at most once per `intervalMs`,
// and only while `enabled` (pass the screen's focus state).
//
// Use it exactly like the old trigger: put the returned number in the
// dependency list of a memo that reads priceStore.

import { useEffect, useRef, useState } from 'react';
import { usePriceStore, QuoteTable } from '@/stores/priceStore';

interface Options {
  /** Minimum time between two updates, in ms. */
  intervalMs?: number;
  /** False pauses updates (screen not focused). */
  enabled?: boolean;
}

// The store keys a symbol can live under: as given, and the other crypto /
// forex spelling (BTCUSD <-> BTC/USD), which screens also look up.
function storeKeys(symbols: readonly string[]): string[] {
  const keys = new Set<string>();
  for (const raw of symbols) {
    if (!raw) continue;
    const symbol = String(raw);
    keys.add(symbol);
    const upper = symbol.toUpperCase();
    keys.add(upper);
    if (upper.includes('/')) {
      keys.add(upper.replace('/', ''));
    } else if (upper.length >= 6) {
      keys.add(upper.slice(0, -3) + '/' + upper.slice(-3));
    }
  }
  return Array.from(keys);
}

export function useQuoteTick(symbols: readonly string[], options: Options = {}): number {
  const { intervalMs = 250, enabled = true } = options;
  const [tick, setTick] = useState(0);

  // Watched keys, refreshed whenever the symbol list changes
  const signature = symbols.join(',');
  const keysRef = useRef<string[]>([]);
  // The quote table as of the last update we reported
  const seenRef = useRef<QuoteTable | null>(null);

  useEffect(() => {
    keysRef.current = storeKeys(symbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastFlush = 0;

    const flush = () => {
      timer = null;
      lastFlush = Date.now();
      const next = usePriceStore.getState().quotes;
      const prev = seenRef.current;
      if (prev === next) return;

      let changed = prev === null;
      if (!changed) {
        for (const key of keysRef.current) {
          if (prev![key] !== next[key]) {
            changed = true;
            break;
          }
        }
      }
      if (changed) {
        seenRef.current = next;
        setTick(t => t + 1);
      }
    };

    const schedule = () => {
      if (timer) return;
      const wait = Math.max(0, intervalMs - (Date.now() - lastFlush));
      timer = setTimeout(flush, wait);
    };

    // Catch up on whatever moved while this was paused or the list changed
    schedule();
    const unsubscribe = usePriceStore.subscribe(schedule);

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, intervalMs, signature]);

  return tick;
}
