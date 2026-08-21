import type { ExpoConfig } from 'expo/config';

/**
 * A config file rather than `app.json` because the Android Google Maps key is
 * per-developer and restricted to a signing certificate — it belongs in `.env`,
 * not in the repo. Without it the Android map renders blank tiles; iOS uses
 * Apple Maps and needs no key.
 */
const config: ExpoConfig = {
  name: 'RoSpot',
  slug: 'rospot',
  scheme: 'rospot',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.cbalaur.rospot',
    supportsTablet: true,
  },
  android: {
    package: 'com.cbalaur.rospot',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    },
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-font',
    [
      'expo-location',
      {
        // Shown in the OS prompt. Says what browsing gets out of it, because
        // denying is a supported answer here, not a dead end.
        locationWhenInUsePermission:
          'RoSpot uses your location to show Romanian places near you and sort them by distance.',
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false,
      },
    ],
  ],
};

export default config;
