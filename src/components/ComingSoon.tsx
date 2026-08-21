import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type en from '@/i18n/locales/en';

/** Only the tabs that are actually still to come can be named here. */
type ComingSoonTab = keyof (typeof en)['comingSoon'];

/**
 * Placeholder for the tabs that later slices fill in. It says what will be here
 * rather than pretending to be a screen.
 */
export function ComingSoon({ tab }: { tab: ComingSoonTab }) {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface px-9">
      <View className="h-2.5 w-2.5 rotate-45 bg-line" />
      <Text className="mt-5 text-center text-[15px] leading-6 text-muted">
        {t(`comingSoon.${tab}`)}
      </Text>
    </SafeAreaView>
  );
}
