import * as Sentry from '@sentry/react-native';

/**
 * Crashes on real phones, sent to Sentry — or nothing at all, when the build was
 * given no DSN: a clone without a Sentry project runs exactly as before.
 *
 * The DSN is the caller's to pass rather than read here, so the one place that
 * reads `EXPO_PUBLIC_SENTRY_DSN` is the root layout, next to the rest of the
 * app's start-up.
 *
 * Reports carry the error, the device and what happened on screen before it —
 * what the privacy policy says they carry, and no more. So: no IP or request
 * bodies (`sendDefaultPii: false`), nothing sent on a launch that went fine
 * (no session tracking), and no trail of the app's requests, whose URLs name
 * accounts (`author_id=eq.<id>`, `place-photos/<id>/…`).
 */
const REQUEST_BREADCRUMBS = new Set(['fetch', 'xhr', 'http']);

export function startCrashReporting(dsn: string | undefined): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    enableAutoSessionTracking: false,
    beforeBreadcrumb: (breadcrumb) =>
      REQUEST_BREADCRUMBS.has(breadcrumb.category ?? '') ? null : breadcrumb,
    // The emulator's debug build reports too; this keeps its test crashes out
    // of the way of the ones real people hit.
    environment: __DEV__ ? 'development' : 'production',
  });
}
