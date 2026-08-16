/**
 * Every name, address and URL used across the website, the legal pages and
 * the admin console.
 *
 * ⚠️  FILL THIS IN BEFORE DEPLOYING. The same values live in
 *     `../src/config/brand.ts` for the mobile app — keep the two in step.
 *
 * Google verifies that the privacy policy URL in Play Console resolves and is
 * publicly reachable. Placeholder contact details are a rejection risk.
 */
export const site = {
  appName: 'MilkBook',
  appNameUr: 'ملک بک',
  tagline: 'Your milk shop, in your pocket',
  taglineUr: 'آپ کی دودھ کی دکان، آپ کی جیب میں',

  /** The legal publisher. An individual's full name is fine. */
  publisher: 'MilkBook',

  /** A mailbox you actually read — Google emails it and users write to it. */
  supportEmail: 'support@milkbook.app',
  privacyEmail: 'privacy@milkbook.app',

  /** No trailing slash. */
  url: 'https://milkbook.app',

  androidPackage: 'com.milkbook.app',

  /** Country whose law governs the terms. */
  jurisdiction: 'Pakistan',

  /** Shown on the legal pages. Update when you change the documents. */
  legalUpdated: '2026-08-16',
} as const;

export const playUrl = `https://play.google.com/store/apps/details?id=${site.androidPackage}`;
