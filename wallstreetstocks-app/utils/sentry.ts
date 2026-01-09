// utils/sentry.ts
// Sentry crash reporting initialization

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initializeSentry() {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured - crash reporting disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // Adjust this value in production.
    tracesSampleRate: 1.0,

    // Enable automatic session tracking
    enableAutoSessionTracking: true,

    // Sessions close after 30 seconds of inactivity
    sessionTrackingIntervalMillis: 30000,

    // Capture unhandled promise rejections
    enableNdkScopeSync: true,

    // Only send errors in production
    enabled: !__DEV__,

    // Set environment
    environment: __DEV__ ? 'development' : 'production',

    // Attach stack traces to messages
    attachStacktrace: true,

    // Before sending event, you can modify or drop it
    beforeSend(event) {
      // Don't send events in development
      if (__DEV__) {
        console.log('Sentry event (dev):', event);
        return null;
      }
      return event;
    },
  });
}

// Helper to capture errors manually
export function captureError(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

// Helper to capture messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

// Set user info for better error tracking
export function setUser(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

// Clear user on logout
export function clearUser() {
  Sentry.setUser(null);
}

export { Sentry };
