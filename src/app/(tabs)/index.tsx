import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChips } from '@/components/CategoryChips';
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
const CARD =
  'absolute bottom-3 left-[14px] right-[14px] overflow-hidden rounded-xl border border-line bg-surface';
// One line rather than the per-platform shadow props: RN takes the CSS shorthand
// on both platforms now, and the canvas states the shadow that way — ink at 12%,
// the palette's own colour rather than a second black.
const CARD_SHADOW = { boxShadow: `0px 4px 14px ${colors.ink}1F` };

/**
 * The foot of the map, where everything the map can't say itself is said: the
 * nearest place, a filter that has emptied it, or places that never arrived.
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
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label?: string;
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
      // The place's name, not "open place": the card is the place.
      accessibilityLabel={label}
      onPress={onPress}
      className={`${CARD} active:opacity-90`}
      style={CARD_SHADOW}
    >
      {body}
    </Pressable>
  );
}

/**
 * The closest place, brought to the foot of the map so the answer to "what's
 * near me" doesn't depend on finding the right pin. The list is already ordered
 * by distance, so the nearest place is the first one the map is showing —
 * chips included, since a filtered map's nearest place is the nearest place the
 * user asked to see.
 */
function NearestPlace({ place }: { place: PlaceWithDistance }) {
  const { t } = useTranslation();
  const router = useRouter();
  const tint = categoryColor[place.category];
  const distance = milesLabel(place.miles);

  return (
    <MapCard
      label={place.name}
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
  const { selected } = useCategoryFilter();
  const { places, origin, isUserLocation, isPending, isError, refetch } =
    useVisiblePlaces();
  const nearest = places[0];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <Header />

      <View className="flex-1">
        <PlacesMap places={places} origin={origin} isUserLocation={isUserLocation} />

        {/* One foot to the map, and three things that might stand in it: the
            places that never arrived, the map's own emptiness, or — when there
            is anything to show at all — the nearest place. */}
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
        ) : nearest ? (
          <NearestPlace place={nearest} />
        ) : isPending ? null : (
          <MapCard>
            {/* An empty map means two different things, and blaming the chips for
                an empty dataset would send the user hunting for a filter to undo. */}
            <Text className="text-[13px] text-muted">
              {selected.size > 0 ? t('filters.noMatch') : t('map.empty')}
            </Text>
          </MapCard>
        )}
      </View>
    </SafeAreaView>
  );
}
