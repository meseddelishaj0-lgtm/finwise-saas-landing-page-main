// lib/openArticle.ts
// Opens a news article inside the app, in the same in-app browser sheet the
// Home news list uses. Used when a news push notification is tapped.
//
// Why this exists: the notification handler used to call
// openBrowserAsync(url, { presentationStyle: 1, ... }). That option takes a
// string ("fullScreen"), not a number, so the native side rejected the call
// every single time and the fallback sent every news tap out to Safari.
// This makes the plain call Home makes, which is known to work.

import { AppState, Linking } from 'react-native';

// In-app browser — only present in real builds, not Expo Go
let WebBrowser: any = null;
try {
  WebBrowser = require('expo-web-browser');
} catch {
  // Module not available
}

const ATTEMPTS = 3;
const RETRY_DELAY_MS = 600;
// A tap that launches the app arrives before the app is in the foreground;
// presenting a sheet that early can fail, so wait (briefly) until it is.
const FOREGROUND_WAIT_MS = 3000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Open `url` in the in-app browser. Resolves when the reader closes it.
 * Leaves the app (system browser) only as a last resort: when the in-app
 * browser is unavailable, keeps failing, or the link is not a web link.
 */
export async function openArticle(url: string): Promise<'in-app' | 'external' | 'failed'> {
  const isWebLink = /^https?:\/\//i.test(url);

  if (isWebLink && WebBrowser?.openBrowserAsync) {
    const waitStart = Date.now();
    while (AppState.currentState !== 'active' && Date.now() - waitStart < FOREGROUND_WAIT_MS) {
      await sleep(100);
    }

    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        // No options: identical to tapping an article on the Home tab
        await WebBrowser.openBrowserAsync(url);
        return 'in-app';
      } catch (e) {
        console.warn(`[openArticle] in-app browser attempt ${attempt} failed:`, e);
        if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
      }
    }
  }

  try {
    await Linking.openURL(url);
    return 'external';
  } catch {
    return 'failed';
  }
}
