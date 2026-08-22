import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type en from '@/i18n/locales/en';
import { StarBand } from '@/motifs/Band';
import { Diamond } from '@/motifs/Diamond';
import { colors } from '@/theme';

/** Only the tabs that are actually still to come can be named here. */
type ComingSoonTab = keyof (typeof en)['comingSoon'];

/**
 * Placeholder for the tabs that later slices fill in. It says what will be here
 * rather than pretending to be a screen — but it says it in the app's own
 * language, so an unbuilt tab reads as unfinished rather than as somewhere else.
 */
export function ComingSoon({ tab }: { tab: ComingSoonTab }) {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface px-9">
      <Diamond size={10} tint={colors.cherry} />
      <View className="my-5">
        <StarBand height={10} width={132} />
      </View>
      <Text className="text-center text-[15px] leading-6 text-muted">
        {t(`comingSoon.${tab}`)}
      </Text>
    </SafeAreaView>
  );
}
