// lib/authHeaders.ts
// Build headers for authenticated mobile API calls. Sends the login-issued JWT
// as `Authorization: Bearer <token>` so the server can verify identity from the
// signed token instead of trusting the spoofable x-user-id header. The x-user-id
// header is still included for backward compatibility with the current server
// (which falls back to it until strict token auth is enabled).
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function buildAuthHeaders(
  userId?: string | number | null,
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem('authToken');
  } catch {}
  return {
    ...(extra || {}),
    ...(userId != null && userId !== '' ? { 'x-user-id': String(userId) } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
