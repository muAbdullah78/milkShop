const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Android 11+ hides other apps unless they are declared in <queries>.
 * Without this, Linking.canOpenURL('whatsapp://…') always returns false and
 * "Send bill on WhatsApp" silently falls back to the browser.
 */
const withWhatsAppQueries = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    manifest.queries = manifest.queries ?? [];
    const bucket = manifest.queries[0] ?? {};
    manifest.queries[0] = bucket;

    bucket.package = bucket.package ?? [];
    const packages = ['com.whatsapp', 'com.whatsapp.w4b'];
    packages.forEach((name) => {
      if (!bucket.package.some((p) => p.$?.['android:name'] === name)) {
        bucket.package.push({ $: { 'android:name': name } });
      }
    });

    bucket.intent = bucket.intent ?? [];
    const hasHttps = bucket.intent.some((i) =>
      i.data?.some((d) => d.$?.['android:scheme'] === 'https')
    );
    if (!hasHttps) {
      bucket.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': 'https' } }],
      });
    }

    const hasTel = bucket.intent.some((i) => i.data?.some((d) => d.$?.['android:scheme'] === 'tel'));
    if (!hasTel) {
      bucket.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.DIAL' } }],
        data: [{ $: { 'android:scheme': 'tel' } }],
      });
    }

    return cfg;
  });

module.exports = withWhatsAppQueries;
