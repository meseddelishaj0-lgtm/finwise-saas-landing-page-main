import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-user profile cache (name/email/bio/avatar/banner).
// Previously stored under a bare device-wide `personalInfo` key, which bled
// one user's cached profile onto the next account on a shared device. Now
// scoped per user, with a one-time adoption of the legacy device-wide key by
// the first signed-in user after this change (mirrors the watchlist/portfolio
// `_claimed` pattern).

const BASE = 'personalInfo';
const CLAIMED = 'personalInfo_claimed';

export function personalInfoKey(userId: string | number | null | undefined): string {
  return userId ? `${BASE}:${userId}` : `${BASE}:anon`;
}

export async function getPersonalInfo(
  userId: string | number | null | undefined
): Promise<any | null> {
  const key = personalInfoKey(userId);
  let raw = await AsyncStorage.getItem(key);

  // One-time adoption: the first signed-in user after this change claims the
  // legacy device-wide cache, then it's removed so later accounts start clean.
  if (!raw && userId) {
    const legacy = await AsyncStorage.getItem(BASE);
    const claimed = await AsyncStorage.getItem(CLAIMED);
    if (legacy && !claimed) {
      await AsyncStorage.setItem(key, legacy);
      await AsyncStorage.setItem(CLAIMED, String(userId));
      await AsyncStorage.removeItem(BASE);
      raw = legacy;
    }
  }

  return raw ? JSON.parse(raw) : null;
}

export async function setPersonalInfo(
  userId: string | number | null | undefined,
  data: any
): Promise<void> {
  await AsyncStorage.setItem(personalInfoKey(userId), JSON.stringify(data));
}

// Read-modify-write helper for the "load, patch one field, save" pattern.
export async function mergePersonalInfo(
  userId: string | number | null | undefined,
  patch: Record<string, any>
): Promise<any> {
  const existing = (await getPersonalInfo(userId)) || {};
  const merged = { ...existing, ...patch };
  await setPersonalInfo(userId, merged);
  return merged;
}

export async function removePersonalInfo(
  userId: string | number | null | undefined
): Promise<void> {
  await AsyncStorage.multiRemove([personalInfoKey(userId), BASE, CLAIMED]);
}
