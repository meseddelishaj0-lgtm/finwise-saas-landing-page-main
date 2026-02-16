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
  }
): Promise<OneSignalResponse | null> {
  const payload: Partial<OneSignalNotificationPayload> = {
    included_segments: ['Total Subscriptions'],
    headings: { en: title },
    contents: { en: body },
    data,
    priority: 10,
  };

  if (options?.image) {
    payload.big_picture = options.image;
    payload.ios_attachments = { image: options.image };
  }

  if (options?.url) {
    payload.url = options.url;
  }

  if (options?.ttl) {
    payload.ttl = options.ttl;
  }

  return sendNotification(payload);
}
