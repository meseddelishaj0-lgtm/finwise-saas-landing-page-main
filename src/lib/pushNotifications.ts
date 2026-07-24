// src/lib/pushNotifications.ts
// Per-user / targeted push notifications.
//
// These now send through OneSignal (see src/lib/onesignal.ts) so the app uses a
// single push provider. The public function signatures are kept identical to the
// previous Expo-push implementation so existing callers (social, messages, price
// alerts, etc.) work unchanged. Targeting is done by OneSignal external_id, which
// the mobile app sets via OneSignal.login(userId) on launch.
import { prisma } from '@/lib/prisma';
import { sendToAllSubscribers, sendToExternalUserIds, NotificationCategory } from '@/lib/onesignal';

// Map DB notification types to the mute categories users control in
// Settings → Notifications. Unknown types send unconditionally.
const CATEGORY_BY_TYPE: Record<string, NotificationCategory> = {
  like: 'social',
  comment: 'social',
  reply: 'social',
  follow: 'social',
  mention: 'social',
  repost: 'social',
  message: 'messages',
  price_alert: 'price_alerts',
  watchlist_alert: 'watchlist',
  breaking_news: 'market_news',
  market_alert: 'market_news',
};

export function categoryForType(type?: string): NotificationCategory | undefined {
  return type ? CATEGORY_BY_TYPE[type] : undefined;
}

/**
 * Drop user ids whose stored prefs mute the category — reads
 * User.notificationPrefs, the SOURCE OF TRUTH (the app mirrors it to
 * OneSignal tags, but tags lag until a device relaunches; the DB is instant
 * and one query covers every recipient). Fails OPEN: a DB hiccup or missing
 * prefs must never eat a notification.
 */
async function filterUserIdsByDbPrefs(
  userIds: number[],
  category: NotificationCategory
): Promise<number[]> {
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, notificationPrefs: true },
    });
    const muted = new Set<number>();
    for (const u of users) {
      const p = u.notificationPrefs as { master?: boolean; categories?: Record<string, boolean> } | null;
      if (!p || typeof p !== 'object') continue; // never saved prefs → enabled
      if (p.master === false || p.categories?.[category] === false) muted.add(u.id);
    }
    return userIds.filter((id) => !muted.has(id));
  } catch (e) {
    console.error('filterUserIdsByDbPrefs failed (failing open):', e);
    return userIds;
  }
}

/**
 * Send push notification to a single user (all their devices).
 */
export async function sendPushNotificationToUser(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: {
    channelId?: string;
    badge?: number;
    category?: NotificationCategory;
  }
): Promise<void> {
  try {
    const category = options?.category ?? categoryForType(data?.type);
    if (category) {
      // Mute check against the DB (source of truth) — one query, instant.
      // Don't ALSO pass category to sendToExternalUserIds: that would redo
      // the check via per-recipient OneSignal tag lookups (slower, staler).
      const allowed = await filterUserIdsByDbPrefs([userId], category);
      if (allowed.length === 0) return;
    }
    await sendToExternalUserIds([userId], title, body, data);
  } catch (error) {
    console.error('Error sending push notification to user:', error);
  }
}

/**
 * Notification types with their messages
 */
export const NotificationMessages = {
  like: (actorName: string) => ({
    title: 'New Like',
    body: `${actorName} liked your post`,
  }),
  comment: (actorName: string) => ({
    title: 'New Comment',
    body: `${actorName} commented on your post`,
  }),
  reply: (actorName: string) => ({
    title: 'New Reply',
    body: `${actorName} replied to your comment`,
  }),
  follow: (actorName: string) => ({
    title: 'New Follower',
    body: `${actorName} started following you`,
  }),
  mention: (actorName: string) => ({
    title: 'You were mentioned',
    body: `${actorName} mentioned you in a post`,
  }),
  repost: (actorName: string) => ({
    title: 'New Repost',
    body: `${actorName} reposted your post`,
  }),
  message: (senderName: string, preview?: string) => ({
    title: senderName,
    body: preview ? (preview.length > 50 ? preview.substring(0, 50) + '...' : preview) : 'Sent you a message',
  }),
  priceAlert: (symbol: string, price: string, direction: 'above' | 'below') => ({
    title: `${symbol} Price Alert`,
    body: `${symbol} is now ${direction === 'above' ? 'above' : 'below'} ${price}`,
  }),
};

/**
 * Send push notification to ALL subscribers (for breaking news, market alerts).
 */
export async function sendPushNotificationToAllUsers(
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: {
    channelId?: string;
    category?: NotificationCategory;
  }
): Promise<{ sent: number; failed: number }> {
  const category = options?.category ?? categoryForType(data?.type);
  const result = await sendToAllSubscribers(title, body, data, { category });
  return { sent: result?.recipients ?? 0, failed: 0 };
}

/**
 * Send push notification to users who have a specific ticker in their watchlist.
 */
export async function sendPushNotificationToWatchlistUsers(
  ticker: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: { ttl?: number; image?: string }
): Promise<{ sent: number; failed: number; usersNotified: number }> {
  try {
    // Find users who have this ticker in their watchlist
    const watchlistEntries = await prisma.watchlistItem.findMany({
      where: { ticker: ticker.toUpperCase() },
      select: { userId: true },
    });

    const allIds = [...new Set(watchlistEntries.map((w: { userId: number }) => w.userId))];

    if (allIds.length === 0) {
      console.log(`No users have ${ticker} in their watchlist`);
      return { sent: 0, failed: 0, usersNotified: 0 };
    }

    // Mute check against the DB (source of truth) — one query for the whole
    // audience instead of per-recipient OneSignal tag lookups.
    const userIds = await filterUserIdsByDbPrefs(allIds, 'watchlist');
    if (userIds.length === 0) {
      return { sent: 0, failed: 0, usersNotified: 0 };
    }

    const result = await sendToExternalUserIds(
      userIds,
      title,
      body,
      { ...data, type: 'watchlist_alert', ticker },
      { ttl: options?.ttl, image: options?.image }
    );

    return { sent: result?.recipients ?? 0, failed: 0, usersNotified: userIds.length };
  } catch (error) {
    console.error('Error sending watchlist notifications:', error);
    return { sent: 0, failed: 0, usersNotified: 0 };
  }
}

/**
 * Create notification in database and send push notification.
 */
export async function createAndSendNotification(params: {
  userId: number;
  actorId?: number;
  type: string;
  postId?: number;
  message: string;
  pushTitle: string;
  pushBody: string;
  data?: Record<string, any>;
}): Promise<void> {
  const { userId, actorId, type, postId, message, pushTitle, pushBody, data } = params;

  try {
    // Create notification in database
    await prisma.notification.create({
      data: {
        userId,
        actorId,
        type,
        postId,
        message,
        fromUserId: actorId,
      },
    });

    // Send push notification
    await sendPushNotificationToUser(userId, pushTitle, pushBody, {
      type,
      postId,
      actorId,
      ...data,
    });
  } catch (error) {
    console.error('Error creating and sending notification:', error);
  }
}
