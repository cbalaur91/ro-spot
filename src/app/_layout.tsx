import '../../global.css';

import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startCrashReporting } from '@/crashReporting';
import { LocationProvider } from '@/hooks/useOrigin';
import { restoreLanguage } from '@/i18n';
import { SessionProvider } from '@/state/session';

// First, so a crash anywhere after this line is reported. Off without a DSN.
startCrashReporting(process.env.EXPO_PUBLIC_SENTRY_DSN);

const queryClient = new QueryClient();

// i18next starts in the device language; a language chosen on the Profile tab
// comes back off the device a moment later. The splash screen stays up until it
// has, so someone who chose English on a Romanian phone never sees a frame of
// Romanian first.
void SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [languageRestored, setLanguageRestored] = useState(false);

  useEffect(() => {
    // Never rejects: an unreadable choice leaves the device language.
    void restoreLanguage().then(() => setLanguageRestored(true));
  }, []);

  useEffect(() => {
    if (languageRestored) SplashScreen.hide();
  }, [languageRestored]);

  if (!languageRestored) return null;

  return (
    <QueryClientProvider client={queryClient}>
      {/* Above the tabs, because the sign-in screen is pushed onto this stack
          rather than living inside the tab navigator. */}
      <SessionProvider>
        {/* One location answer for every screen, so enabling it anywhere
            re-measures everywhere. */}
        <LocationProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </SafeAreaProvider>
        </LocationProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

// Catches what React would otherwise swallow — a render that throws — and
// reports it with the component stack. A pass-through when Sentry is off.
export default Sentry.wrap(RootLayout);
