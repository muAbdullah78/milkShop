/**
 * One place for every name, address and URL that appears in the app, on the
 * website, and in the Play Store listing.
 *
 * ⚠️  FILL THIS IN BEFORE PUBLISHING. The same values live in
 *     `web/src/site.config.ts` — keep the two in step.
 *
 * Google checks that the privacy policy URL in Play Console resolves, is
 * publicly reachable without a login, and actually describes this app. A
 * placeholder here is a rejection.
 */
export const brand = {
  appName: 'MilkBook',
  /** The full Play Store listing name. Max 30 characters. */
  storeName: 'MilkBook - Doodh Dahi Khata',
  appNameUr: 'ملک بک',

  /** The legal publisher. An individual's full name is fine. */
  publisher: 'Usconnect Solutions',

  /** Must be a mailbox you actually read — Google emails it and users write to it. */
  supportEmail: 'support@milkbook.app',

  /** Root of the public website. No trailing slash. */
  siteUrl: 'https://milkbook.app',

  androidPackage: 'com.usconnect.milkbook',

  /** Country whose law governs the terms. */
  jurisdiction: 'Pakistan',
} as const;

export const brandUrls = {
  home: brand.siteUrl,
  privacy: `${brand.siteUrl}/privacy`,
  terms: `${brand.siteUrl}/terms`,
  deleteAccount: `${brand.siteUrl}/delete-account`,
  support: `${brand.siteUrl}/support`,
  faq: `${brand.siteUrl}/faq`,
  play: `https://play.google.com/store/apps/details?id=${brand.androidPackage}`,
} as const;
