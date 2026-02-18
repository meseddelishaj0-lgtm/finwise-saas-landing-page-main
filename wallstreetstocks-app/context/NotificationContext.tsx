// context/NotificationContext.tsx
// Push notification handling and display using Expo Notifications
// NOTE: Permission requests and token registration are handled by OneSignal in _layout.tsx
// This context only handles notification display and deep link routing
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';

// Lazy import notifications to handle missing native module
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let notificationsAvailable = false;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  notificationsAvailable = true;

  // Configure how notifications appear when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  notificationsAvailable = false;
}

interface NotificationState {
  expoPushToken: string | null;
  notification: any | null;
  isPermissionGranted: boolean;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
}

interface NotificationContextType extends NotificationState {
  requestPermissions: () => Promise<boolean>;
  registerForPushNotifications: () => Promise<string | null>;
  sendTestNotification: () => Promise<void>;
  clearNotification: () => void;
  setBadgeCount: (count: number) => Promise<void>;
  getBadgeCount: () => Promise<number>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://www.wallstreetstocks.ai/api';

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    expoPushToken: null,
    notification: null,
    isPermissionGranted: false,
    isLoading: false,
    error: notificationsAvailable ? null : 'Push notifications not available in this build',
    isAvailable: notificationsAvailable,
  });

  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);
  const appState = useRef(AppState.currentState);

  // Check notification permissions (permission request handled by OneSignal)
  const requestPermissions = async (): Promise<boolean> => {
    if (!notificationsAvailable || !Notifications || !Device) {
      return false;
    }

    try {
      if (!Device.isDevice) {
        return false;
      }

      // Only check permission status - don't request (OneSignal handles that)
      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted';
      setState(prev => ({ ...prev, isPermissionGranted: granted }));

      return granted;
    } catch (error) {
      return false;
    }
  };

  // Get Expo push token
  const getExpoPushToken = async (): Promise<string | null> => {
    if (!notificationsAvailable || !Notifications || !Device) {
      return null;
    }

    try {
      if (!Device.isDevice) {
        return null;
      }

      // Get project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        // Try without projectId for Expo Go compatibility
        try {
          const token = await Notifications.getExpoPushTokenAsync();
          return token.data;
        } catch (e) {
          return null;
        }
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token.data;
    } catch (error: any) {
      // Handle case where native module isn't available (old build)
      if (error.message?.includes('expo push token manager') ||
          error.message?.includes('not linked') ||
          error.code === 'ERR_UNAVAILABLE') {
        setState(prev => ({
          ...prev,
          error: 'Push notifications require an app rebuild'
        }));
      } else {
      }
      return null;
    }
  };

  // Register device token with backend
  const registerTokenWithBackend = async (token: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/notifications/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          pushToken: token,
          platform: Platform.OS,
          deviceName: Device.deviceName || 'Unknown Device',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device token');
      }

    } catch (error) {
    }
  };

  // Full registration flow (permission request handled by OneSignal)
  const registerForPushNotifications = async (): Promise<string | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Just check permission status - OneSignal handles the actual request
      const hasPermission = await requestPermissions();

      if (!hasPermission) {
        // Permission not granted yet - OneSignal will request it
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: null // Not an error - OneSignal handles permission
        }));
        return null;
      }

      const token = await getExpoPushToken();

      if (!token) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to get push token'
        }));
        return null;
      }

      setState(prev => ({
        ...prev,
        expoPushToken: token,
        isLoading: false
      }));

      // Register with backend if user is authenticated
      if (user?.id) {
        await registerTokenWithBackend(token, user.id);
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFD700',
        });

        await Notifications.setNotificationChannelAsync('social', {
          name: 'Social',
          description: 'Notifications for likes, comments, and follows',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFD700',
        });

        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'Price Alerts',
          description: 'Stock price alert notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF0000',
        });
      }

      return token;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to register for push notifications'
      }));
      return null;
    }
  };

  // Handle notification tap/response
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    // Navigate based on notification type
    if (data?.type) {
      switch (data.type) {
        case 'like':
        case 'comment':
        case 'mention':
        case 'reply':
          if (data.postId) {
            // Navigate to community tab with openPostId param
            router.push({
              pathname: '/(tabs)/community',
              params: { openPostId: data.postId.toString() },
            } as any);
          }
          break;
        case 'follow':
          if (data.userId) {
            // Navigate to community tab with openUserId param
            router.push({
              pathname: '/(tabs)/community',
              params: { openUserId: data.userId.toString() },
            } as any);
          }
          break;
        case 'price_alert':
          if (data.symbol) {
            router.push(`/symbol/${data.symbol}/chart` as any);
          }
          break;
        case 'market_news':
          if (data.url) {
            try {
              const WebBrowser = require('expo-web-browser');
              WebBrowser.openBrowserAsync(data.url);
            } catch {}
          }
          break;
        case 'market_mover':
          router.push({
            pathname: '/(tabs)/trending',
            params: { initialTab: 'gainers' },
          } as any);
          break;
        default:
          router.push('/notifications' as any);
      }
    } else {
      // Default: go to notifications screen
      router.push('/notifications' as any);
    }
  };

  // Send a test notification (for debugging)
  const sendTestNotification = async () => {
    if (!notificationsAvailable || !Notifications) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'Push notifications are working!',
        data: { type: 'test' },
      },
      trigger: null, // Send immediately
    });
  };

  // Clear current notification
  const clearNotification = () => {
    setState(prev => ({ ...prev, notification: null }));
  };

  // Badge count management
  const setBadgeCount = async (count: number) => {
    if (!notificationsAvailable || !Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  };

  const getBadgeCount = async (): Promise<number> => {
    if (!notificationsAvailable || !Notifications) return 0;
    return await Notifications.getBadgeCountAsync();
  };

  // Initialize listeners
  useEffect(() => {
    if (!notificationsAvailable || !Notifications) {
      return;
    }

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setState(prev => ({ ...prev, notification }));
    });

    // Listen for notification responses (taps)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response);
    });

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - could refresh notifications here
      }
      appState.current = nextAppState;
    });

    // Check initial permission status
    Notifications.getPermissionsAsync().then(({ status }) => {
      setState(prev => ({ ...prev, isPermissionGranted: status === 'granted' }));
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      subscription.remove();
    };
  }, []);

  // Register Expo push token after OneSignal has requested permission
  // Delay ensures OneSignal's permission request (2s) completes first
  useEffect(() => {
    if (user?.id && notificationsAvailable) {
      const timer = setTimeout(() => {
        // OneSignal requests permission at 2s, we wait 5s to register Expo token
        // This avoids permission request conflict - we just get the token
        registerForPushNotifications();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  const value: NotificationContextType = {
    ...state,
    requestPermissions,
    registerForPushNotifications,
    sendTestNotification,
    clearNotification,
    setBadgeCount,
    getBadgeCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Default context value for when provider isn't available
const defaultNotificationContext: NotificationContextType = {
  expoPushToken: null,
  notification: null,
  isPermissionGranted: false,
  isLoading: false,
  error: 'NotificationProvider not available',
  isAvailable: false,
  requestPermissions: async () => false,
  registerForPushNotifications: async () => null,
  sendTestNotification: async () => {},
  clearNotification: () => {},
  setBadgeCount: async () => {},
  getBadgeCount: async () => 0,
};

// Custom hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);

  // Return default value instead of throwing
  if (context === undefined) {
    return defaultNotificationContext;
  }

  return context;
}

// Helper function to send push notification via Expo's push service
// This should be called from your backend, not the client
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}
