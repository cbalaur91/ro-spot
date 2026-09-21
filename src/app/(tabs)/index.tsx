import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChips, ClearFilters } from '@/components/CategoryChips';
import { PlacesMap } from '@/components/PlacesMap';
import { milesLabel } from '@/geo';
import { useVisiblePlaces, type PlaceWithDistance } from '@/hooks/useVisiblePlaces';
import { StarBand } from '@/motifs/Band';
import { Diamond } from '@/motifs/Diamond';
import { useCategoryFilter } from '@/state/categoryFilter';
import { categoryColor, colors } from '@/theme';

/**
 * The Map's own header, stacked above the map rather than floating over it: the
 * wordmark at the app's gutter, the star band edge to edge, then the chips. The
 * wordmark is smaller than the List's — the List's header is the top of a page,
 * this one is a strip above a map that wants the rest of the screen.
 */
function Header() {
  return (
    <View>
      <View className="flex-row items-center justify-between px-6 pb-2.5 pt-1.5">
        {/* The wordmark is a name, not copy — it stays the same in both locales. */}
        <Text className="text-[22px] font-bold leading-[22px] tracking-[-0.3px] text-ink">
          <Text className="text-cherry">Ro</Text>Spot
        </Text>
        <Diamond size={11} tint={colors.cherry} />
      </View>
      <StarBand height={14} />
      <CategoryChips />
    </View>
  );
}

// `bg-surface` rather than the List's `bg-card`: a card sits on white when the
// page under it is the warm ground, but this one sits on map tiles, and the
// app's own paper is what lifts it off them.
const CARD = 'overflow-hidden rounded-xl border border-line bg-surface';
// Where the card stands: 14 from the sides, 12 from the foot.
const FOOT_GAP = 12;
// One line rather than the per-platform shadow props: RN takes the CSS shorthand
// on both platforms now, and the canvas states the shadow that way — ink at 12%,
// the palette's own colour rather than a second black.
const CARD_SHADOW = { boxShadow: `0px 4px 14px ${colors.ink}1F` };

/**
 * The foot of the map, where everything the map can't say itself is said: the
 * selected place, a filter that has emptied it, or places that never arrived.
 * One card recipe for all three — a strip of the star band over a padded body —
 * so a system state doesn't look bolted onto a screen the card language already
 * covers.
 *
 * `onPress` turns the whole card into one button rather than hanging a control
 * off it: the card is about a single place, so tapping anywhere on it should
 * open that place.
 */
function MapCard({
  children,
  onPress,
  label,
  hint,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label?: string;
  hint?: string;
}) {
  const body = (
    <>
      <StarBand height={10} />
      <View className="px-[14px] pb-[14px] pt-[11px]">{children}</View>
    </>
  );

  if (!onPress) {
    return (
      <View className={CARD} style={CARD_SHADOW}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      className={`${CARD} active:opacity-90`}
      style={CARD_SHADOW}
    >
      {body}
    </Pressable>
  );
}

/**
 * The selected place — the pin the user tapped, or until they tap one, the
 * nearest — brought to the foot of the map, so the answer to "what's near me"
 * doesn't depend on finding the right pin and a pin tap has somewhere to say
 * which place it is.
 */
function SelectedPlace({ place }: { place: PlaceWithDistance }) {
  const { t } = useTranslation();
  const router = useRouter();
  const tint = categoryColor[place.category];
  const distance = milesLabel(place.miles);

  return (
    <MapCard
      // Name, kind and street: a card picked from a pin the reader can't see
      // has to say which of the places it is.
      label={t('map.card', {
        name: place.name,
        category: t(`categories.${place.category}`),
        address: place.address,
      })}
      hint={t('map.cardHint')}
      onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
    >
      <View className="flex-row justify-between gap-2.5">
        <View className="flex-1">
          <Text
            className="text-[10px] font-semibold uppercase tracking-[1.5px]"
            style={{ color: tint }}
          >
            {t(`categories.${place.category}`)}
          </Text>
          <Text className="mt-1 text-[16px] font-semibold leading-5 text-ink">
            {place.name}
          </Text>
          <Text className="mt-[3px] text-[12px] text-muted">{place.address}</Text>
        </View>
        {/* Bare rather than in the List's pill: there is one distance here, and
            a pill is for a column of them that has to line up. */}
        <Text
          className="text-[12px] font-semibold text-muted"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {t(distance.isBelow ? 'units.milesBelow' : 'units.miles', {
            value: distance.value,
          })}
        </Text>
      </View>
    </MapCard>
  );
}

export default function MapScreen() {
  const { t } = useTranslation();
  const { selected, clear } = useCategoryFilter();
  const { places, origin, isUserLocation, isPending, isError, refetch } =
    useVisiblePlaces();
  // The pin the user picked, if they have. Until then the card follows the
  // nearest place, so a location fix that re-sorts the list moves it too; after
  // a pick, a re-sort leaves it alone.
  const [pickedId, setPickedId] = useState<string>();
  const picked = places.find((place) => place.id === pickedId);
  // A pick that a refresh or a chip took off the map is forgotten rather than
  // parked, so the card falls back to the nearest remaining place — and keeps
  // following it — instead of jumping back when the chip is lifted. Set during
  // render, React's way to adjust state to a prop, so no frame shows the gap.
  if (pickedId !== undefined && !picked) setPickedId(undefined);
  const shown = picked ?? places[0];
  // How much of the map's foot the card covers, so the map can keep its own
  // furniture — the Google logo, which the terms say must stay visible — clear
  // of it.
  const [footInset, setFootInset] = useState(0);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <Header />

      <View className="flex-1">
        <PlacesMap
          places={places}
          origin={origin}
          isUserLocation={isUserLocation}
          footInset={footInset}
          selectedId={shown?.id}
          onSelect={setPickedId}
        />

        {/* One foot to the map, and three things that might stand in it: the
            places that never arrived, the map's own emptiness, or — when there
            is anything to show at all — the selected place. */}
        <View
          pointerEvents="box-none"
          className="absolute left-[14px] right-[14px]"
          style={{ bottom: FOOT_GAP }}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setFootInset(height > 0 ? height + FOOT_GAP : 0);
          }}
        >
          {isError ? (
            <MapCard>
              <View className="flex-row items-center justify-between gap-4">
                <Text className="flex-1 text-[13px] text-ink">{t('map.error')}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={refetch}
                  className="active:opacity-70"
                >
                  <Text className="text-[13px] font-semibold text-cherry">
                    {t('actions.retry')}
                  </Text>
                </Pressable>
              </View>
            </MapCard>
          ) : shown ? (
            <SelectedPlace place={shown} />
          ) : isPending ? null : (
            <MapCard>
              {/* An empty map means two different things, and blaming the chips for
                  an empty dataset would send the user hunting for a filter to undo.
                  The one the chips caused comes with the way out of it. */}
              {selected.size > 0 ? (
                <View className="flex-row flex-wrap items-center justify-between gap-x-4">
                  <Text className="shrink text-[13px] text-muted">{t('filters.noMatch')}</Text>
                  <ClearFilters onPress={clear} />
                </View>
              ) : (
                <Text className="text-[13px] text-muted">{t('map.empty')}</Text>
              )}
            </MapCard>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
