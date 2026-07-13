// src/lib/onesignal.ts
// Utility functions for sending push notifications via OneSignal REST API

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';

interface OneSignalNotificationPayload {
  app_id: string;
  target_channel: string;
  headings: { en: string };
  contents: { en: string };
  data?: Record<string, any>;
  included_segments?: string[];
  include_aliases?: { external_id: string[] };
  filters?: OneSignalFilter[];
  ios_sound?: string;
  android_sound?: string;
  android_channel_id?: string;
  priority?: number;
  ttl?: number;
  url?: string;
  big_picture?: string;
  ios_attachments?: Record<string, string>;
}

type OneSignalFilter =
  | { field: 'tag'; key: string; relation: '=' | '!=' | '>' | '<' | 'exists' | 'not_exists'; value?: string }
  | { operator: 'AND' | 'OR' };

interface OneSignalResponse {
  id: string;
  recipients: number;
  errors?: any;
}

// Notification categories users can mute in Settings → Notifications.
// The app sets a OneSignal tag `pref_<category>` = "off" when muted and
// removes it when re-enabled — so "no tag" means enabled, which keeps
// every existing user receiving everything by default.
export type NotificationCategory =
  | 'messages'
  | 'social'
  | 'price_alerts'
  | 'watchlist'
  | 'market_news'
  | 'market_movers'
  | 'daily_recap';

const categoryTag = (category: NotificationCategory) => `pref_${category}`;

/**
 * Fetch a user's OneSignal tags by external_id. Returns null on any error
 * (callers treat null as "allow" — a lookup failure must never eat a
 * notification).
 */
async function getUserTags(externalId: string): Promise<Record<string, string> | null> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${encodeURIComponent(externalId)}`,
      { headers: { Authorization: `Key ${ONESIGNAL_REST_API_KEY}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.properties?.tags as Record<string, string>) ?? {};
  } catch {
    return null;
  }
}

/**
 * Drop external ids whose tags mute the given category. Lookups run in
 * batches; failures fail open (user stays in the list).
 */
async function filterIdsByCategory(
  externalIds: string[],
  category: NotificationCategory
): Promise<string[]> {
  const key = categoryTag(category);
  const out: string[] = [];
  const BATCH = 20;
  for (let i = 0; i < externalIds.length; i += BATCH) {
    const chunk = externalIds.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async (id) => {
        const tags = await getUserTags(id);
        return tags === null || tags[key] !== 'off' ? id : null;
      })
    );
    for (const id of results) if (id) out.push(id);
  }
  return out;
}

/**
 * Send a raw OneSignal notification with full control over the payload.
 */
export async function sendNotification(
  payload: Partial<OneSignalNotificationPayload>
): Promise<OneSignalResponse | null> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error('OneSignal credentials not configured (ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY)');
    return null;
  }

  const body = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: 'push',
    ...payload,
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal API error:', response.status, result);
      return null;
    }

    console.log(`OneSignal notification sent: id=${result.id}, recipients=${result.recipients}`);
    return result as OneSignalResponse;
  } catch (error) {
    console.error('Error sending OneSignal notification:', error);
    return null;
  }
}

/**
 * Send a push notification to all subscribed users.
 */
export async function sendToAllSubscribers(
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: {
    image?: string;
    url?: string;
    ttl?: number;
    category?: NotificationCategory;
  }
): Promise<OneSignalResponse | null> {
  const payload: Partial<OneSignalNotificationPayload> = {
    headings: { en: title },
    contents: { en: body },
    data,
    priority: 10,
  };

  // With a category, target via a tag filter (respects per-user mutes;
  // "!=" also matches users without the tag). Otherwise use the segment.
  if (options?.category) {
    payload.filters = [
      { field: 'tag', key: categoryTag(options.category), relation: '!=', value: 'off' },
    ];
  } else {
    payload.included_segments = ['Total Subscriptions'];
  }

  if (options?.image) {
    payload.big_picture = options.image;
    payload.ios_attachments = { image: options.image };
  }

  // DO NOT set payload.url (OneSignal's launchURL) — it causes the native iOS SDK
  // to handle the tap at the native level, which races with the JS click handler
  // and blocks it on cold start (JS hasn't loaded yet). Instead, the URL is kept
  // only in payload.data where the JS handler reads it via additionalData.url.

  if (options?.ttl) {
    payload.ttl = options.ttl;
  }

  return sendNotification(payload);
}

/**
 * Send a push notification to specific users, targeted by their OneSignal
 * external_id. The mobile app sets this via OneSignal.login(userId) on launch,
 * so the external_id is the app's numeric user id (as a string).
 *
 * Used for all per-user notifications (social, messages, price alerts, etc.).
 */
export async function sendToExternalUserIds(
  userIds: Array<string | number>,
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: {
    image?: string;
    url?: string;
    ttl?: number;
    category?: NotificationCategory;
  }
): Promise<OneSignalResponse | null> {
  let externalIds = [...new Set(userIds.map((id) => String(id)))].filter(Boolean);

  if (externalIds.length === 0) {
    return null;
  }

  // include_aliases can't be combined with tag filters, so per-user sends
  // check each recipient's mute tags before sending.
  if (options?.category) {
    externalIds = await filterIdsByCategory(externalIds, options.category);
    if (externalIds.length === 0) return null;
  }

  const payload: Partial<OneSignalNotificationPayload> = {
    include_aliases: { external_id: externalIds },
    headings: { en: title },
    contents: { en: body },
    data,
    priority: 10,
  };

  if (options?.image) {
    payload.big_picture = options.image;
    payload.ios_attachments = { image: options.image };
  }

  // Deliberately do NOT set payload.url — the URL is carried in payload.data so
  // the JS click handler routes the tap (setting launchURL makes the native SDK
  // race the JS handler and breaks deep-linking on cold start).

  if (options?.ttl) {
    payload.ttl = options.ttl;
  }

  return sendNotification(payload);
}
