const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

// Turns on full R8 optimization for Android release builds, as recommended by
// Play Console's "R8 configuration" check. The Expo template ships the
// non-optimizing "proguard-android.txt" defaults (which pass -dontoptimize);
// minify/shrinkResources themselves come from expo-build-properties.
//
// Also enables optimized resource shrinking (AGP 8.6+), which lets R8 drop
// resources only referenced from code it already removed.

function withAndroidR8Optimize(config) {
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      'getDefaultProguardFile("proguard-android.txt")',
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
    return config;
  });

  return withGradleProperties(config, (config) => {
    const key = "android.r8.optimizedResourceShrinking";
    config.modResults = config.modResults.filter((item) => item.key !== key);
    config.modResults.push({ type: "property", key, value: "true" });
    return config;
  });
}

module.exports = withAndroidR8Optimize;
