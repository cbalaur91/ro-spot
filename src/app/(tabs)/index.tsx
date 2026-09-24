import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChips, ClearFilters } from '@/components/CategoryChips';
import { PlacesMap } from '@/components/PlacesMap';
import type { PlacesMapHandle } from '@/components/PlacesMap.types';
import { closestFraming } from '@/framing';
import { DEFAULT_REGION, milesLabel, nearbyRegion } from '@/geo';
import type { Origin } from '@/hooks/useOrigin';
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

/** How much of the map's foot a view covers, gap included; nothing when it's empty. */
const measure =
  (set: (inset: number) => void) =>
  ({ nativeEvent }: LayoutChangeEvent) =>
    set(nativeEvent.layout.height > 0 ? nativeEvent.layout.height + FOOT_GAP : 0);

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

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** The way off the fallback, by what the OS will still do: show its prompt, or only Settings. */
const ENABLE_CONTROL = {
  ask: { icon: 'navigate-outline', text: 'map.enable', label: 'map.enableLabel' },
  settings: { icon: 'settings-outline', text: 'map.settings', label: 'map.settingsLabel' },
} as const satisfies Record<Origin['access'], { icon: IconName; text: string; label: string }>;

/**
 * One of the map's own controls: a surface pill that stands on the tiles the way
 * the card does. The icon is muted and the word is ink — the controls are the
 * map's furniture, and cherry is kept for the things that are the app's.
 */
function MapControl({
  icon,
  text,
  label,
  onPress,
  disabled = false,
}: {
  /** No icon means a spinner: the control is waiting on something. */
  icon?: IconName;
  text: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: !icon }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-[44px] max-w-full flex-row items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 active:opacity-80"
      style={CARD_SHADOW}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={colors.muted} />
      ) : (
        <ActivityIndicator size="small" color={colors.muted} />
      )}
      <Text className="shrink text-[13px] font-semibold leading-[17px] text-ink">{text}</Text>
    </Pressable>
  );
}

/**
 * The way back to what's close, standing over the map's right edge above the
 * card: Closest places, then where the user is. Right-aligned so the Google logo
 * at the card's left shoulder stays in sight.
 *
 * The location control says what it will actually show. Without a fix it is
 * "Detroit", the map's fallback, because a button reading "My location" that
 * flew to downtown Detroit would be telling somebody in Ohio where they are.
 * On the fallback, the way to a real "my location" stands above it: asking
 * again, or Settings once the OS has stopped asking.
 */
function MapControls({
  locate,
  access,
  onLocate,
  onEnable,
  onClosest,
}: {
  locate: 'pending' | 'device' | 'fallback';
  access: Origin['access'];
  onLocate: () => void;
  onEnable: () => void;
  /** Absent when there is nothing to frame. */
  onClosest?: () => void;
}) {
  const { t } = useTranslation();
  const enable = ENABLE_CONTROL[access];

  return (
    <View pointerEvents="box-none" className="mb-2.5 items-end gap-2">
      {onClosest ? (
        <MapControl
          icon="scan-outline"
          text={t('map.closest')}
          label={t('map.closestLabel')}
          onPress={onClosest}
        />
      ) : null}
      {locate === 'fallback' ? (
        <MapControl
          icon={enable.icon}
          text={t(enable.text)}
          label={t(enable.label)}
          onPress={onEnable}
        />
      ) : null}
      {locate === 'fallback' ? (
        <MapControl
          icon="business-outline"
          text={t('map.detroit')}
          label={t('map.detroitLabel')}
          onPress={onLocate}
        />
      ) : (
        <MapControl
          icon={locate === 'device' ? 'locate-outline' : undefined}
          text={t('map.locate')}
          label={t(locate === 'device' ? 'map.locateLabel' : 'map.locating')}
          onPress={onLocate}
          disabled={locate === 'pending'}
        />
      )}
    </View>
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
  const { selected } = useCategoryFilter();
  const {
    places,
    origin,
    isResolved,
    isUserLocation,
    access,
    enableLocation,
    isPending,
    isError,
    refetch,
  } = useVisiblePlaces();
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
  // of it; and how much the whole foot covers, controls and all, which is what
  // a fit has to clear.
  const [footInset, setFootInset] = useState(0);
  const [fitInset, setFitInset] = useState(0);

  const map = useRef<PlacesMapHandle>(null);
  const [isMapReady, setMapReady] = useState(false);
  // The opening frame is owed until it runs — or until the user does anything to
  // the map first, after which a late location fix doesn't get to take the map
  // off them.
  const openingOwed = useRef(true);
  // Location the user turned on from here, so the map shows them where they are
  // when the fix comes — unless they've moved the map on to something else by then.
  const fixOwed = useRef(false);
  const takeOver = () => {
    openingOwed.current = false;
    fixOwed.current = false;
  };

  // The nearest five, the user beside them when they're close. The selection
  // stays if it's in the frame; otherwise the card follows the nearest again.
  const frameClosest = () => {
    const framing = closestFraming(places, origin, isUserLocation);
    if (!framing) return;

    if ('fit' in framing.camera) map.current?.fit(framing.camera.fit);
    else map.current?.show(framing.camera.region);
    if (pickedId !== undefined && !framing.ids.includes(pickedId)) setPickedId(undefined);
  };

  // Opened on what's close, once the map, the places and the location answer are
  // all in — never on an interim guess that the fix then yanks away. The places
  // count as in once the card they bring has been measured: the card and the
  // controls arrive in the same render as the rows, and a fit made before their
  // layout would clear a foot of nothing and leave pins under the card.
  const isDataReady = !isPending && !isError && footInset > 0;
  const frameOpening = useEffectEvent(() => {
    if (!openingOwed.current) return;
    openingOwed.current = false;
    frameClosest();
  });
  useEffect(() => {
    if (isMapReady && isDataReady && isResolved) frameOpening();
  }, [isMapReady, isDataReady, isResolved]);

  // Settled only by an answer: a denial drops the debt, a fix pays it. From
  // Settings there is no pending phase, and the debt waits for the return.
  const showFix = useEffectEvent(() => {
    if (!fixOwed.current) return;
    fixOwed.current = false;
    if (isUserLocation) map.current?.show(nearbyRegion(origin));
  });
  useEffect(() => {
    if (isResolved) showFix();
  }, [isResolved, isUserLocation]);

  // A chip is a new question, so it gets the same answer the opening did. Before
  // the opening has run, the opening frames the filtered set itself.
  const lastFilter = useRef(selected);
  const frameFilter = useEffectEvent(() => {
    if (!openingOwed.current) frameClosest();
  });
  useEffect(() => {
    if (lastFilter.current === selected) return;
    lastFilter.current = selected;
    frameFilter();
  }, [selected]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface">
      <Header />

      <View className="flex-1">
        <PlacesMap
          ref={map}
          places={places}
          isUserLocation={isUserLocation}
          footInset={footInset}
          fitInset={fitInset}
          selectedId={shown?.id}
          onSelect={(id) => {
            takeOver();
            setPickedId(id);
          }}
          onReady={() => setMapReady(true)}
          onGesture={takeOver}
        />

        <View
          testID="map-foot"
          pointerEvents="box-none"
          className="absolute left-[14px] right-[14px]"
          style={{ bottom: FOOT_GAP }}
          onLayout={measure(setFitInset)}
        >
          <MapControls
            locate={!isResolved ? 'pending' : isUserLocation ? 'device' : 'fallback'}
            access={access}
            onLocate={() => {
              takeOver();
              map.current?.show(isUserLocation ? nearbyRegion(origin) : DEFAULT_REGION);
            }}
            onEnable={() => {
              takeOver();
              fixOwed.current = true;
              enableLocation();
            }}
            onClosest={
              places.length > 0
                ? () => {
                    takeOver();
                    frameClosest();
                  }
                : undefined
            }
          />

          {/* One card, and three things that might stand in it: the places
              that never arrived, the map's own emptiness, or — when there is
              anything to show at all — the selected place. */}
          <View
            testID="map-card"
            pointerEvents="box-none"
            onLayout={measure(setFootInset)}
          >
            {isError ? (
              <MapCard>
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="flex-1 text-[13px] text-ink">{t('browse.error')}</Text>
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
                {/* An empty map means two different things, and blaming the chips
                    for an empty dataset would send the user hunting for a filter to
                    undo. The one the chips caused comes with the way out of it. */}
                {selected.size > 0 ? (
                  <View className="flex-row flex-wrap items-center justify-between gap-x-4">
                    <Text className="shrink text-[13px] text-muted">{t('filters.noMatch')}</Text>
                    <ClearFilters />
                  </View>
                ) : (
                  <Text className="text-[13px] text-muted">{t('map.empty')}</Text>
                )}
              </MapCard>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
