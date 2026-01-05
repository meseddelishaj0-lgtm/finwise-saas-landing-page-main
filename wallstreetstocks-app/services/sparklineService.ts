// services/sparklineService.ts
// Centralized sparkline fetching with caching and fallback
// Properly handles premarket/after-hours by filtering to today's session

import { getFromMemory, setToMemory, CACHE_KEYS } from '../utils/memoryCache';

const TWELVE_DATA_API_KEY = '604ed688209443c89250510872616f41';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// Cache TTL: 5 minutes for sparklines during extended hours, 10 minutes otherwise
const SPARKLINE_CACHE_TTL_EXTENDED = 5 * 60 * 1000;
const SPARKLINE_CACHE_TTL_NORMAL = 10 * 60 * 1000;

// Timeout: 20 seconds
const FETCH_TIMEOUT = 20000;

// ============================================================================
// TIMEZONE UTILITIES
// ============================================================================

/**
 * Get the current time in Eastern timezone
 */
function getEasternTime(): {
  hour: number;
  minute: number;
  day: number;
  month: number;
  year: number;
  dayOfWeek: string;
  totalMinutes: number;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';

  const hour = parseInt(get('hour')) || 0;
  const minute = parseInt(get('minute')) || 0;

  return {
    hour,
    minute,
    day: parseInt(get('day')) || 1,
    month: parseInt(get('month')) || 1,
    year: parseInt(get('year')) || 2025,
    dayOfWeek: get('weekday'),
    totalMinutes: hour * 60 + minute,
  };
}

/**
 * Check if currently in extended hours (premarket or after-hours)
 */
function isExtendedHours(): boolean {
  const et = getEasternTime();
  const { totalMinutes, dayOfWeek } = et;

  // Weekend = treat as closed (like extended hours for cache purposes)
  if (dayOfWeek === 'Sat' || dayOfWeek === 'Sun') return true;

  const preMarketStart = 4 * 60;      // 4:00 AM
  const marketOpen = 9 * 60 + 30;     // 9:30 AM
  const marketClose = 16 * 60;        // 4:00 PM
  const afterHoursEnd = 20 * 60;      // 8:00 PM

  return (totalMinutes >= preMarketStart && totalMinutes < marketOpen) ||
         (totalMinutes >= marketClose && totalMinutes < afterHoursEnd);
}

/**
 * Get today's trading session start (4 AM ET) as a Date object
 */
function getTodaySessionStart(): Date {
  const et = getEasternTime();
  let { year, month, day } = et;

  // If before 4 AM ET, use yesterday's date
  if (et.hour < 4) {
    const yesterday = new Date(year, month - 1, day - 1);
    year = yesterday.getFullYear();
    month = yesterday.getMonth() + 1;
    day = yesterday.getDate();
  }

  // Create 4:00 AM ET as ISO string
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T04:00:00`;

  // Determine DST (rough approximation: March-November)
  const isDST = month >= 3 && month <= 10;
  const offset = isDST ? '-04:00' : '-05:00';

  return new Date(dateStr + offset);
}

/**
 * Parse a Twelve Data datetime string to a Date object
 */
function parseTwelveDataTime(datetime: string): Date {
  const tempDate = new Date(datetime.replace(' ', 'T'));
  const month = tempDate.getMonth(); // 0-11

  // DST check: April-October is definitely DST
  const isDST = month > 2 && month < 10;
  const offset = isDST ? '-04:00' : '-05:00';

  return new Date(datetime.replace(' ', 'T') + offset);
}

// ============================================================================
// SPARKLINE GENERATION
// ============================================================================

/**
 * Generate fallback sparkline data based on price direction
 * Creates a realistic-looking sparkline when API fails
 */
function generateFallbackSparkline(isPositive: boolean, points: number = 24): number[] {
  const data: number[] = [];
  let value = 50; // Start at midpoint

  for (let i = 0; i < points; i++) {
    const trend = isPositive ? 0.3 : -0.3;
    const noise = (Math.random() - 0.5) * 4;
    value = Math.max(10, Math.min(90, value + trend + noise));
    data.push(value);
  }

  // Ensure end point reflects direction
  if (isPositive && data[data.length - 1] < data[0]) {
    data[data.length - 1] = data[0] + Math.random() * 10 + 5;
  } else if (!isPositive && data[data.length - 1] > data[0]) {
    data[data.length - 1] = data[0] - Math.random() * 10 - 5;
  }

  return data;
}

/**
 * Filter sparkline data to today's session and ensure minimum points
 */
function filterToTodaySession(
  values: { datetime: string; close: string }[],
  isPositive: boolean
): number[] {
  const sessionStart = getTodaySessionStart();
  const sessionStartTime = sessionStart.getTime();

  // Filter to only points from today's session
  const filteredValues = values.filter(item => {
    const pointTime = parseTwelveDataTime(item.datetime).getTime();
    return pointTime >= sessionStartTime;
  });

  // If we have enough filtered points, use them
  if (filteredValues.length >= 4) {
    return filteredValues
      .slice(0, 24)
      .reverse()
      .map(item => parseFloat(item.close));
  }

  // If we have some points but not enough, pad with the first price
  if (filteredValues.length > 0) {
    const sparkline = filteredValues
      .slice(0, 24)
      .reverse()
      .map(item => parseFloat(item.close));

    // Pad to minimum 4 points for smooth chart
    while (sparkline.length < 4) {
      sparkline.unshift(sparkline[0]);
    }
    return sparkline;
  }

  // No points from today's session - get the last known price from API data
  if (values.length > 0) {
    const lastPrice = parseFloat(values[0].close); // Newest first
    return [lastPrice, lastPrice, lastPrice, lastPrice];
  }

  // Fallback to generated data
  return generateFallbackSparkline(isPositive);
}

// ============================================================================
// API FETCHING
// ============================================================================

/**
 * Fetch sparkline data for a single symbol with caching
 */
export async function fetchSparkline(
  symbol: string,
  isPositive: boolean = true
): Promise<number[]> {
  // Determine cache TTL based on market hours
  const cacheTTL = isExtendedHours() ? SPARKLINE_CACHE_TTL_EXTENDED : SPARKLINE_CACHE_TTL_NORMAL;

  // Check cache first
  const cached = getFromMemory<number[]>(CACHE_KEYS.sparkline(symbol), cacheTTL);
  if (cached && cached.length > 0) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Use Twelve Data time_series endpoint for sparkline data
    // Add prepost=true to include premarket and after-hours data
    const response = await fetch(
      `${TWELVE_DATA_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1h&outputsize=48&prepost=true&apikey=${TWELVE_DATA_API_KEY}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // Twelve Data returns { values: [...] } with newest first
    if (data?.values && Array.isArray(data.values) && data.values.length > 0) {
      // Filter to today's session for accurate intraday sparklines
      const sparkline = filterToTodaySession(data.values, isPositive);

      // Cache the result
      setToMemory(CACHE_KEYS.sparkline(symbol), sparkline);

      return sparkline;
    }

    // No data, return fallback
    return generateFallbackSparkline(isPositive);
  } catch (error: any) {
    // Log but don't spam console
    if (error.name !== 'AbortError') {
      console.warn(`Sparkline fetch failed for ${symbol}, using fallback`);
    }

    // Return fallback sparkline
    return generateFallbackSparkline(isPositive);
  }
}

/**
 * Fetch sparklines for multiple symbols in parallel with rate limiting
 * Batches requests to avoid overwhelming the API
 */
export async function fetchSparklines(
  symbols: string[],
  changePercents?: Record<string, number>
): Promise<Record<string, number[]>> {
  const results: Record<string, number[]> = {};
  const cacheTTL = isExtendedHours() ? SPARKLINE_CACHE_TTL_EXTENDED : SPARKLINE_CACHE_TTL_NORMAL;

  // Check cache first for all symbols
  const uncachedSymbols: string[] = [];

  for (const symbol of symbols) {
    const cached = getFromMemory<number[]>(CACHE_KEYS.sparkline(symbol), cacheTTL);
    if (cached && cached.length > 0) {
      results[symbol] = cached;
    } else {
      uncachedSymbols.push(symbol);
    }
  }

  // If all cached, return immediately
  if (uncachedSymbols.length === 0) {
    return results;
  }

  // Fetch uncached sparklines in batches of 4 to avoid rate limiting
  const BATCH_SIZE = 4;
  const BATCH_DELAY = 500; // 500ms between batches

  for (let i = 0; i < uncachedSymbols.length; i += BATCH_SIZE) {
    const batch = uncachedSymbols.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (symbol) => {
      const isPositive = changePercents ? (changePercents[symbol] ?? 0) >= 0 : true;
      const data = await fetchSparkline(symbol, isPositive);
      results[symbol] = data;
    });

    await Promise.all(batchPromises);

    // Add delay between batches (except for last batch)
    if (i + BATCH_SIZE < uncachedSymbols.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  return results;
}

/**
 * Get sparkline from cache only (no fetch)
 * Useful for instant display
 */
export function getCachedSparkline(symbol: string): number[] | null {
  const cacheTTL = isExtendedHours() ? SPARKLINE_CACHE_TTL_EXTENDED : SPARKLINE_CACHE_TTL_NORMAL;
  return getFromMemory<number[]>(CACHE_KEYS.sparkline(symbol), cacheTTL);
}

/**
 * Pre-warm sparkline cache for common symbols
 */
export async function prefetchSparklines(symbols: string[]): Promise<void> {
  // Fire and forget - don't wait for completion
  fetchSparklines(symbols).catch(() => {});
}

/**
 * Clear sparkline cache for a symbol
 * Useful for forcing fresh data
 */
export function clearSparklineCache(symbol: string): void {
  // Clear by setting null/undefined - memoryCache will treat expired items as missing
  setToMemory(CACHE_KEYS.sparkline(symbol), null);
}
