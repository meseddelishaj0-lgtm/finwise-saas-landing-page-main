// src/lib/pushNotifications.ts
// Utility functions for sending push notifications via Expo's push service
import { prisma } from '@/lib/prisma';

interface ExpoPushMessage {
  to: string;
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to a single device
 */
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: {
    channelId?: string;
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
  }
): Promise<ExpoPushTicket | null> {
  if (!pushToken.startsWith('ExponentPushToken[')) {
    console.error('Invalid Expo push token format:', pushToken);
    return null;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
    ...options,
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result.data?.[0] || null;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
}

/**
 * Send push notifications to multiple devices
 */
export async function sendBatchPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  // Expo recommends sending in batches of 100
  const BATCH_SIZE = 100;
  const tickets: ExpoPushTicket[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();
      if (result.data) {
        tickets.push(...result.data);
      }
    } catch (error) {
      console.error('Error sending batch push notifications:', error);
    }
  }

  return tickets;
}

/**
 * Send push notification to a user (all their devices)
 */
export async function sendPushNotificationToUser(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: {
    channelId?: string;
    badge?: number;
  }
): Promise<void> {
  try {
    // Get all active device tokens for the user
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (deviceTokens.length === 0) {
      console.log(`No active device tokens for user ${userId}`);
      return;
    }

    // Send to all devices
    const messages: ExpoPushMessage[] = deviceTokens.map(device => ({
      to: device.pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      channelId: options?.channelId || 'default',
      badge: options?.badge,
    }));

    const tickets = await sendBatchPushNotifications(messages);

    // Handle any errors (e.g., invalid tokens)
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        console.error(`Push notification error for token ${deviceTokens[index].pushToken}:`, ticket.message);

        // If token is invalid, mark it as inactive
        if (ticket.details?.error === 'DeviceNotRegistered') {
          prisma.deviceToken.update({
            where: { id: deviceTokens[index].id },
            data: { isActive: false },
          }).catch(console.error);
        }
      }
    });
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
 * Send push notification to ALL active devices (for breaking news, market alerts)
 */
export async function sendPushNotificationToAllUsers(
  title: string,
  body: string,
  data?: Record<string, any>,
  options?: {
    channelId?: string;
  }
): Promise<{ sent: number; failed: number }> {
  try {
    // Get all active device tokens
    const deviceTokens = await prisma.deviceToken.findMany({
      where: { isActive: true },
    });

    if (deviceTokens.length === 0) {
      console.log('No active device tokens found');
      return { sent: 0, failed: 0 };
    }

    // Create messages for all devices
    const messages: ExpoPushMessage[] = deviceTokens.map(device => ({
      to: device.pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      channelId: options?.channelId || 'default',
      priority: 'high',
    }));

    const tickets = await sendBatchPushNotifications(messages);

    let sent = 0;
    let failed = 0;

    // Handle results and mark invalid tokens as inactive
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sent++;
      } else {
        failed++;
        console.error(`Push notification error:`, ticket.message);

        if (ticket.details?.error === 'DeviceNotRegistered') {
          prisma.deviceToken.update({
            where: { id: deviceTokens[index].id },
            data: { isActive: false },
          }).catch(console.error);
        }
      }
    });

    console.log(`Push notifications sent: ${sent} successful, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error('Error sending push notifications to all users:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send push notification to users who have a specific ticker in their watchlist
 */
export async function sendPushNotificationToWatchlistUsers(
  ticker: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ sent: number; failed: number; usersNotified: number }> {
  try {
    // Find users who have this ticker in their watchlist
    const watchlistEntries = await prisma.watchlistItem.findMany({
      where: { ticker: ticker.toUpperCase() },
      select: { userId: true },
    });

    if (watchlistEntries.length === 0) {
      console.log(`No users have ${ticker} in their watchlist`);
      return { sent: 0, failed: 0, usersNotified: 0 };
    }

    const userIds = [...new Set(watchlistEntries.map((w: { userId: number }) => w.userId))];

    // Get device tokens for these users
    const deviceTokens = await prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
    });

    if (deviceTokens.length === 0) {
      console.log('No active devices for watchlist users');
      return { sent: 0, failed: 0, usersNotified: userIds.length };
    }

    // Create messages
    const messages: ExpoPushMessage[] = deviceTokens.map(device => ({
      to: device.pushToken,
      sound: 'default',
      title,
      body,
      data: { ...data, type: 'watchlist_alert', ticker },
      channelId: 'alerts',
      priority: 'high',
    }));

    const tickets = await sendBatchPushNotifications(messages);

    let sent = 0;
    let failed = 0;

    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sent++;
      } else {
        failed++;
        if (ticket.details?.error === 'DeviceNotRegistered') {
          prisma.deviceToken.update({
            where: { id: deviceTokens[index].id },
            data: { isActive: false },
          }).catch(console.error);
        }
      }
    });

    return { sent, failed, usersNotified: userIds.length };
  } catch (error) {
    console.error('Error sending watchlist notifications:', error);
    return { sent: 0, failed: 0, usersNotified: 0 };
  }
}

/**
 * Create notification in database and send push notification
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
    await sendPushNotificationToUser(
      userId,
      pushTitle,
      pushBody,
      {
        type,
        postId,
        actorId,
        ...data,
      },
      {
        channelId: type === 'price_alert' ? 'alerts' : 'social',
      }
    );
  } catch (error) {
    console.error('Error creating and sending notification:', error);
  }
}
