import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Place } from '@/data/places';
import { categoryColor } from '@/theme';

/**
 * One rung of the column running down the left gutter — a hairline with a
 * rhomboid at each row, after Brâncuși's Coloana Infinitului. It does the work a
 * row divider normally would, and its colour states the category twice over.
 */
function ColumnSegment({ tint }: { tint: string }) {
  return (
    <View className="w-9 items-center">
      <View className="absolute bottom-0 top-0 w-px bg-line" />
      <View
        className="mt-[26px] h-2.5 w-2.5 rotate-45"
        style={{ backgroundColor: tint }}
      />
    </View>
  );
}

export function PlaceRow({ place }: { place: Place }) {
  const { t } = useTranslation();
  const tint = categoryColor[place.category];

  return (
    <View className="flex-row" accessibilityRole="summary">
      <ColumnSegment tint={tint} />
      <View className="flex-1 py-5 pr-5">
        <Text
          className="text-[11px] font-semibold uppercase tracking-[1.5px]"
          style={{ color: tint }}
        >
          {t(`categories.${place.category}`)}
        </Text>
        <Text className="mt-1.5 text-[19px] font-semibold leading-6 text-ink">
          {place.name}
        </Text>
        <Text className="mt-1 text-[13px] leading-5 text-muted">{place.address}</Text>
      </View>
    </View>
  );
}
