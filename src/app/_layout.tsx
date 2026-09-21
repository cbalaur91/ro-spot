import '../../global.css';
import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocationProvider } from '@/hooks/useOrigin';
import { SessionProvider } from '@/state/session';

const queryClient = new QueryClient();

export default function RootLayout() {
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
