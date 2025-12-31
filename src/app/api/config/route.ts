// api/config/route.ts
// Edge Config endpoint for feature flags and app configuration
// Updates instantly without redeployment

import { NextRequest, NextResponse } from "next/server";
import { get, getAll } from "@vercel/edge-config";

export const runtime = "edge"; // Edge Runtime for instant global response

// Default config values (fallback if Edge Config not set up)
const DEFAULT_CONFIG = {
  // Feature flags
  features: {
    premiumEnabled: true,
    aiToolsEnabled: true,
    darkModeEnabled: false,
    pushNotificationsEnabled: true,
    socialFeedEnabled: true,
    priceAlertsEnabled: true,
    portfolioTrackingEnabled: true,
    watchlistSyncEnabled: true,
  },
  // API settings
  api: {
    quoteCacheTTL: 30,
    trendingCacheTTL: 60,
    homeFeedCacheTTL: 30,
    maxQuotesBatchSize: 50,
  },
  // Mobile app settings
  mobile: {
    minVersion: "1.0.0",
    forceUpdate: false,
    maintenanceMode: false,
    maintenanceMessage: "",
    refreshInterval: 60000, // 1 minute
    maxWatchlistItems: 50,
    maxPortfolioItems: 100,
  },
  // Rate limits
  rateLimits: {
    quotesPerMinute: 60,
    searchPerMinute: 30,
    postsPerHour: 10,
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    // If a specific key is requested, get just that value
    if (key) {
      try {
        const value = await get(key);
        if (value !== undefined) {
          return NextResponse.json({ [key]: value }, {
            headers: {
              "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
            },
          });
        }
        // Fall back to default config for this key
        const defaultValue = (DEFAULT_CONFIG as any)[key];
        return NextResponse.json({ [key]: defaultValue || null });
      } catch {
        // Edge Config not configured, use defaults
        const defaultValue = (DEFAULT_CONFIG as any)[key];
        return NextResponse.json({ [key]: defaultValue || null });
      }
    }

    // Get all config values
    try {
      const allConfig = await getAll() as Record<string, any> | undefined;

      // Merge with defaults (Edge Config values override defaults)
      const features = typeof allConfig?.features === 'object' ? allConfig.features : {};
      const api = typeof allConfig?.api === 'object' ? allConfig.api : {};
      const mobile = typeof allConfig?.mobile === 'object' ? allConfig.mobile : {};
      const rateLimits = typeof allConfig?.rateLimits === 'object' ? allConfig.rateLimits : {};

      const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...(allConfig || {}),
        features: {
          ...DEFAULT_CONFIG.features,
          ...features,
        },
        api: {
          ...DEFAULT_CONFIG.api,
          ...api,
        },
        mobile: {
          ...DEFAULT_CONFIG.mobile,
          ...mobile,
        },
        rateLimits: {
          ...DEFAULT_CONFIG.rateLimits,
          ...rateLimits,
        },
      };

      return NextResponse.json(mergedConfig, {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      });
    } catch {
      // Edge Config not configured, use defaults
      return NextResponse.json(DEFAULT_CONFIG, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }
  } catch (error) {
    console.error("Config API error:", error);
    return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
  }
}
