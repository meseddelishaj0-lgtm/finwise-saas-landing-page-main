const { withMainActivity } = require("expo/config-plugins");

// Keeps Android PHONES portrait-only while letting tablets and unfolded
// foldables rotate freely.
//
// app.json uses `"orientation": "default"` so the manifest carries no
// android:screenOrientation (Play flags that restriction for large screens,
// and Android 16 ignores it there anyway). Instead MainActivity requests
// portrait at runtime when the smallest screen width is below 600dp (the
// standard phone/tablet split). It re-checks on configuration changes, so a
// foldable switches between locked (folded) and free (unfolded) live.
// iOS orientation is handled in Info.plist (see ios.infoPlist in app.json).

const IMPORTS = [
  "import android.content.pm.ActivityInfo",
  "import android.content.res.Configuration",
];

const POLICY_METHODS = `
  private fun applyOrientationPolicy(config: Configuration) {
    requestedOrientation = if (config.smallestScreenWidthDp < 600) {
      ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    } else {
      ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    applyOrientationPolicy(newConfig)
  }
`;

function withAndroidPhonePortraitLock(config) {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      throw new Error("withAndroidPhonePortraitLock expects a Kotlin MainActivity");
    }
    let contents = config.modResults.contents;
    if (contents.includes("applyOrientationPolicy")) return config;

    for (const imp of IMPORTS) {
      if (!contents.includes(imp)) {
        contents = contents.replace(/^package .*$/m, (pkg) => `${pkg}\n\n${imp}`);
      }
    }

    // Apply before super.onCreate so phones never draw a landscape frame
    contents = contents.replace(
      /(\n(\s*)super\.onCreate\()/,
      "\n$2applyOrientationPolicy(resources.configuration)$1"
    );

    // Add the policy + config-change hook just inside the class body
    contents = contents.replace(
      /(class MainActivity : ReactActivity\(\) \{\n)/,
      `$1${POLICY_METHODS}\n`
    );

    if (!contents.includes("applyOrientationPolicy(resources.configuration)") ||
        !contents.includes("override fun onConfigurationChanged")) {
      throw new Error("withAndroidPhonePortraitLock: MainActivity template changed; update the plugin");
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidPhonePortraitLock;
