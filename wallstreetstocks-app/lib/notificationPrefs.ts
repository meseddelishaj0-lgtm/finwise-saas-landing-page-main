// lib/notificationPrefs.ts
// Notification preferences (Settings → Notifications) with the SERVER as the
// source of truth (User.notificationPrefs via /api/user/notification-prefs).
//
// - AsyncStorage is only a per-user cache (`notifPrefs:<userId>`) for instant
//   UI + offline fallback — losing it loses nothing (server restores).
// - The legacy DEVICE-WIDE key `notifPrefs` is adopted once for the first
//   signed-in user and then deleted (it predates server persistence).
// - If the server has no prefs yet, the device's prefs are seeded up — this
//   migrates every existing user automatically on their first launch.
// - OneSignal tags/opt-out are DERIVED from these prefs (applyPrefsToOneSignal).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildAuthHeaders } from '@/lib/authHeaders';

export interface NotifPrefs {
  master: boolean;
  categories: Record<string, boolean>;
}

const API_URL = 'https://www.wallstreetstocks.ai/api/user/notification-prefs';
const LEGACY_KEY = 'notifPrefs'; // pre-server, device-wide (shared across accounts)
const cacheKey = (userId: number | string) => `notifPrefs:${userId}`;

function parsePrefs(raw: string | null): NotifPrefs | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    return {
      master: typeof p.master === 'boolean' ? p.master : true,
      categories: p.categories && typeof p.categories === 'object' ? p.categories : {},
    };
  } catch {
    return null;
  }
}

/** Cache locally (per-user) — never the legacy device-wide key. */
export async function cacheNotifPrefs(userId: number | string, prefs: NotifPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(prefs));
  } catch {}
}

/** Save: per-user cache immediately, then server (fire-and-forget safe). */
export async function saveNotifPrefs(userId: number | string, prefs: NotifPrefs): Promise<void> {
  await cacheNotifPrefs(userId, prefs);
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: await buildAuthHeaders(userId, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(prefs),
    });
  } catch {
    // Offline — cache holds the value; next launch's load() seeds the server.
  }
}

/**
 * Load prefs: server first (source of truth). Falls back to the per-user
 * cache, then one-time adoption of the legacy device-wide key. Seeds the
 * server whenever it has nothing but the device does.
 */
export async function loadNotifPrefs(userId: number | string): Promise<NotifPrefs | null> {
  // Local candidate: per-user cache, else adopt legacy once.
  let local: NotifPrefs | null = null;
  try {
    local = parsePrefs(await AsyncStorage.getItem(cacheKey(userId)));
    if (!local) {
      const legacy = parsePrefs(await AsyncStorage.getItem(LEGACY_KEY));
      if (legacy) {
        local = legacy;
        await cacheNotifPrefs(userId, legacy);
        await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
      }
    }
  } catch {}

  // Server read — wins when present.
  try {
    const res = await fetch(API_URL, { headers: await buildAuthHeaders(userId) });
    if (res.ok) {
      const data = await res.json();
      const server = data?.prefs
        ? parsePrefs(typeof data.prefs === 'string' ? data.prefs : JSON.stringify(data.prefs))
        : null;
      if (server) {
        await cacheNotifPrefs(userId, server);
        return server;
      }
      // Server empty → seed it from the device so nothing is ever lost.
      if (local) saveNotifPrefs(userId, local).catch(() => {});
    }
  } catch {
    // Offline — use local.
  }
  return local;
}

/**
 * Mirror prefs into OneSignal: category mute tags + master opt-out.
 * Tag semantics match the server (src/lib/onesignal.ts): `pref_<key>`="off"
 * mutes; tag absent = enabled. Only opts OUT for master=false — never forces
 * opt-in (that stays a deliberate user action in Settings).
 */
export function applyPrefsToOneSignal(OneSignal: any, prefs: NotifPrefs): void {
  if (!OneSignal?.User) return;
  try {
    for (const [key, on] of Object.entries(prefs.categories || {})) {
      if (on) OneSignal.User.removeTag(`pref_${key}`);
      else OneSignal.User.addTag(`pref_${key}`, 'off');
    }
    if (prefs.master === false) {
      OneSignal.User.pushSubscription?.optOut?.();
    }
  } catch {}
}
