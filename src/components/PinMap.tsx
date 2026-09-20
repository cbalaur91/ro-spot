import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Diamond } from '@/motifs/Diamond';

import type { PinMapProps } from './PinMap.types';

/**
 * The web stand-in, for the same reason `PlacesMap.tsx` is one: there is no map
 * in a browser. It says where the pin is and that it can't be moved from here,
 * so the rest of the submission can still be walked through in the preview.
 */
export function PinMap({ coords, tint }: PinMapProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-map-land px-9">
      <Diamond size={17} tint={tint} />
      <Text
        className="mt-5 text-[13px] font-semibold text-ink"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {t('add.pin.coords', coords)}
      </Text>
      <Text className="mt-1 text-center text-[13px] leading-5 text-muted">
        {t('add.pin.webUnsupported')}
      </Text>
    </View>
  );
}
