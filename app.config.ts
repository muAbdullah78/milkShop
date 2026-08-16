import type { ExpoConfig, ConfigContext } from 'expo/config';
import fs from 'node:fs';
import path from 'node:path';

/**
 * MilkBook / دودھ کھاتہ
 * Android-only build config (Google Play).
 *
 * `google-services.json` is NOT committed. Drop yours in the project root
 * (or set GOOGLE_SERVICES_JSON to its path) before running prebuild/EAS.
 * See SETUP.md for the 10-minute Firebase walkthrough.
 */

const GOOGLE_SERVICES =
  process.env.GOOGLE_SERVICES_JSON ?? path.resolve(__dirname, 'google-services.json');
const hasGoogleServices = fs.existsSync(GOOGLE_SERVICES);

if (!hasGoogleServices) {
  console.warn(
    '\n[MilkBook] google-services.json not found.\n' +
      '  The app will build but Firebase (login + data) will not work.\n' +
      '  Follow SETUP.md step 2 to add it.\n'
  );
}

/**
 * Google Sign-In needs the *web* OAuth client id (client_type 3) to get an
 * idToken that Firebase will accept. It already lives inside
 * google-services.json, so we lift it out here instead of asking the shop
 * owner to copy-paste a second value.
 */
function readGoogleWebClientId(): string | undefined {
  if (!hasGoogleServices) return undefined;
  try {
    const json = JSON.parse(fs.readFileSync(GOOGLE_SERVICES, 'utf8'));
    for (const client of json.client ?? []) {
      const web = (client.oauth_client ?? []).find((o: { client_type: number }) => o.client_type === 3);
      if (web?.client_id) return web.client_id as string;
    }
    console.warn(
      '[MilkBook] No web OAuth client in google-services.json — enable Google sign-in ' +
        'in Firebase Console → Authentication, then re-download the file.'
    );
  } catch (e) {
    console.warn('[MilkBook] Could not read google-services.json:', e);
  }
  return undefined;
}

const googleWebClientId = readGoogleWebClientId();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MilkBook',
  slug: 'milkbook',
  scheme: 'milkbook',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#F2F6FC',
  primaryColor: '#1B3FCB',
  assetBundlePatterns: ['**/*'],
  platforms: ['android'],
  android: {
    package: 'com.milkbook.app',
    versionCode: 1,
    ...(hasGoogleServices ? { googleServicesFile: GOOGLE_SERVICES } : {}),
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#12246B',
    },
    permissions: [
      'android.permission.INTERNET',
      'android.permission.VIBRATE',
      'android.permission.POST_NOTIFICATIONS',
    ],
    // MilkBook never records audio, takes photos or reads the gallery.
    // Stripping these keeps the Play listing honest and the review quick.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  extra: {
    hasGoogleServices,
    googleWebClientId,
    eas: { projectId: process.env.EAS_PROJECT_ID ?? undefined },
  },
  plugins: [
    './plugins/withWhatsAppQueries',
    'expo-router',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-google-signin/google-signin',
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          // RNFirebase needs the Google services Gradle plugin.
          extraMavenRepos: [],
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#12246B',
        dark: { backgroundColor: '#070D1C' },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/android-icon-monochrome.png',
        color: '#1B3FCB',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
