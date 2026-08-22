import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Diamond } from '@/motifs/Diamond';
import { colors } from '@/theme';

import type { PlacesMapProps } from './PlacesMap.types';

/**
 * `react-native-maps` draws through the platform map SDKs and has nothing to
 * render in a browser. Web is a development convenience here, not a release
 * target, so this says where the map is rather than pretending to be one — on
 * the land colour the real map is drawn in, under a pin with nowhere to stand.
 */
export function PlacesMap(_props: PlacesMapProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-map-land px-9">
      <Diamond size={11} tint={colors.cherry} />
      <Text className="mt-5 text-center text-[15px] leading-6 text-ink">
        {t('map.webUnsupported')}
      </Text>
      <Text className="mt-1 text-center text-[13px] leading-5 text-muted">
        {t('map.webUnsupportedHint')}
      </Text>
    </View>
  );
}
