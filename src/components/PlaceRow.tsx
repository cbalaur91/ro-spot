import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { milesLabel } from '@/geo';
import type { PlaceWithDistance } from '@/hooks/useVisiblePlaces';
import { Diamond } from '@/motifs/Diamond';
import { categoryColor } from '@/theme';

/**
 * A place as a stitched card: white ground, hairline border, and a 3px band of
 * the category's thread across the top. The tint arrives as data, so every part
 * that carries it — the band, the bullet, the eyebrow — takes it as a value
 * rather than as a class.
 *
 * The card states its category three times over and means it: the top band, the
 * diamond bullet and the eyebrow. Distance sits opposite in a parchment pill,
 * because it is measured rather than declared — and with tabular figures, so a
 * column of them lines up down the list.
 */
export function PlaceRow({ place }: { place: PlaceWithDistance }) {
  const { t } = useTranslation();
  const tint = categoryColor[place.category];
  const distance = milesLabel(place.miles);

  return (
    <View
      className="flex-row justify-between gap-2.5 rounded-[13px] border border-line bg-card px-4 py-3.5"
      style={{ borderTopWidth: 3, borderTopColor: tint }}
    >
      <View className="flex-1 flex-row gap-[11px]">
        {/* 5px down: the bullet reads against the eyebrow, not above it. */}
        <View className="mt-[5px]">
          <Diamond size={9} tint={tint} />
        </View>
        <View className="flex-1">
          <Text
            className="text-[10px] font-semibold uppercase tracking-[1.5px]"
            style={{ color: tint }}
          >
            {t(`categories.${place.category}`)}
          </Text>
          <Text className="mt-1 text-[16px] font-semibold leading-[21px] text-ink">
            {place.name}
          </Text>
          <Text className="mt-[3px] text-[12px] leading-[15px] text-muted">
            {place.address}
          </Text>
        </View>
      </View>
      <View className="self-start rounded-full bg-parchment px-[9px] py-1">
        <Text
          className="text-[11px] font-semibold text-muted"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {t(distance.isBelow ? 'units.milesBelow' : 'units.miles', {
            value: distance.value,
          })}
        </Text>
      </View>
    </View>
  );
}
