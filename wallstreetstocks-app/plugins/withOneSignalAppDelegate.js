const { withAppDelegate } = require("expo/config-plugins");

// This plugin injects OneSignal initialization directly into the Swift AppDelegate.
// Required because OneSignal's Objective-C method swizzling doesn't work with
// Expo 54's Swift-based ExpoAppDelegate.

const ONESIGNAL_APP_ID = "f964a298-9c86-43a2-bb7f-a9f0cc8dac24";

function withOneSignalAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;

    // Add OneSignalFramework import at the top
    if (!contents.includes("import OneSignalFramework")) {
      contents = contents.replace(
        "import Expo",
        "import Expo\nimport OneSignalFramework"
      );
    }

    // Add OneSignal initialization before the return statement in didFinishLaunchingWithOptions
    if (!contents.includes("OneSignal.initialize")) {
      contents = contents.replace(
        "return super.application(application, didFinishLaunchingWithOptions: launchOptions)",
        `// OneSignal push notification setup
    OneSignal.Debug.setLogLevel(.LL_VERBOSE)
    OneSignal.initialize("${ONESIGNAL_APP_ID}", withLaunchOptions: launchOptions)
    OneSignal.Notifications.requestPermission({ accepted in
      print("[OneSignal] Permission accepted: \\(accepted)")
    }, fallbackToSettings: true)

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withOneSignalAppDelegate;
