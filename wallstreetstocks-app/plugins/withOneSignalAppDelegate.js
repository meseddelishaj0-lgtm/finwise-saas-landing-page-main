const { withAppDelegate } = require("expo/config-plugins");

// This plugin injects OneSignal initialization directly into the Swift AppDelegate.
// Required because OneSignal's Objective-C method swizzling doesn't work with
// Expo 54's Swift-based ExpoAppDelegate.
//
// It also adds:
// - A didRegisterForRemoteNotificationsWithDeviceToken override to forward the APNs
//   device token to OneSignal, since swizzling doesn't work with Swift AppDelegate.
// - A native OSNotificationClickListener that opens article URLs in SFSafariViewController.
//   This is done natively (not JS) because on cold start the JS bridge isn't loaded
//   when the click event fires, causing URLs to be lost.

const ONESIGNAL_APP_ID = "f964a298-9c86-43a2-bb7f-a9f0cc8dac24";

function withOneSignalAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;

    // Add OneSignalFramework, OneSignalNotifications and SafariServices imports at the top
    if (!contents.includes("import OneSignalFramework")) {
      contents = contents.replace(
        "import Expo",
        "import Expo\nimport OneSignalFramework\nimport OneSignalNotifications\nimport SafariServices"
      );
    }

    // Add a native OSNotificationClickListener class at the end of the file that opens
    // article URLs in SFSafariViewController. Handles cold start, background, and foreground.
    if (!contents.includes("WSSNotificationClickListener")) {
      contents += `

// Native OneSignal click listener — opens article URLs in SFSafariViewController.
// Must be done natively because on cold start the JS bridge isn't ready yet
// when OneSignal fires the click event, so a JS-side listener misses the URL.
class WSSNotificationClickListener: NSObject, OSNotificationClickListener {
  func onClick(event: OSNotificationClickEvent) {
    // Extract URL from additionalData.url first, then fall back to launchURL
    var urlString: String? = nil
    if let additionalData = event.notification.additionalData,
       let url = additionalData["url"] as? String {
      urlString = url
    } else if let launchURL = event.notification.launchURL {
      urlString = launchURL
    }

    NSLog("[WSSNotif] Click received, url=\\(urlString ?? "nil")")

    guard let urlStr = urlString,
          let url = URL(string: urlStr),
          url.scheme == "http" || url.scheme == "https" else {
      NSLog("[WSSNotif] No valid http(s) URL in notification — skipping")
      return
    }

    // Present SFSafariViewController on main thread, with a short delay on cold start
    // so the root view controller is ready.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
      guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let rootVC = windowScene.windows.first?.rootViewController else {
        NSLog("[WSSNotif] No root view controller — falling back to Safari app")
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
        return
      }

      // Walk the presentation chain to find the topmost view controller
      var topVC = rootVC
      while let presented = topVC.presentedViewController {
        topVC = presented
      }

      let safariVC = SFSafariViewController(url: url)
      safariVC.modalPresentationStyle = .pageSheet
      topVC.present(safariVC, animated: true, completion: nil)
      NSLog("[WSSNotif] Presented SFSafariViewController for \\(urlStr)")
    }
  }
}

// Strong reference so the listener isn't deallocated
private let wssClickListener = WSSNotificationClickListener()
`;
    }

    // Add OneSignal initialization before the return statement in didFinishLaunchingWithOptions
    if (!contents.includes("OneSignal.initialize")) {
      contents = contents.replace(
        "return super.application(application, didFinishLaunchingWithOptions: launchOptions)",
        `// OneSignal push notification setup
    OneSignal.Debug.setLogLevel(.LL_VERBOSE)
    OneSignal.initialize("${ONESIGNAL_APP_ID}", withLaunchOptions: launchOptions)
    OneSignal.Notifications.addClickListener(wssClickListener)
    OneSignal.Notifications.requestPermission({ accepted in
      print("[OneSignal] Permission accepted: \\(accepted)")
    }, fallbackToSettings: true)

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`
      );
    }

    // Add didRegisterForRemoteNotificationsWithDeviceToken to forward APNs token to OneSignal
    // Without this, OneSignal never receives the device token on Expo 54's Swift AppDelegate
    if (!contents.includes("didRegisterForRemoteNotificationsWithDeviceToken")) {
      contents = contents.replace(
        "// Linking API",
        `// Forward APNs device token to OneSignal
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    OSNotificationsManager.didRegister(forRemoteNotifications: application, deviceToken: deviceToken)
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  // Linking API`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withOneSignalAppDelegate;
