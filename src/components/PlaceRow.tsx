import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';

import { placePhotoUrl } from '@/data/places';
import { milesLabel } from '@/geo';
import type { PlaceWithDistance } from '@/hooks/useVisiblePlaces';
import { directionsUrl, telUrl } from '@/links';
import { Diamond } from '@/motifs/Diamond';
import { categoryColor, colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const THUMB = 72;
// A literal for both states of the thumbnail: `rounded-lg` is 7 on a device,
// where NativeWind counts a rem as 14.
const THUMB_RADIUS = 8;

/**
 * The place's first photograph, small. It stands where the diamond bullet stood:
 * a bullet said "this is a place" and a photograph says which one.
 *
 * A place with no photograph — or one whose photograph won't load — gets an
 * outlined tile with the rhomb in it rather than a grey box, which on a slow
 * connection is what a photograph still on its way looks like.
 *
 * A failure is remembered against the fetch it happened under, not for good: the
 * list tab never unmounts, so pulling to refresh is the only way a photograph
 * that timed out once gets asked for again.
 */
function Thumb({ path, fetchedAt }: { path: string | undefined; fetchedAt: number }) {
  const [failedAt, setFailedAt] = useState<number | null>(null);

  if (!path || failedAt === fetchedAt) {
    return (
      <View
        className="items-center justify-center border border-line"
        style={{ width: THUMB, height: THUMB, borderRadius: THUMB_RADIUS }}
      >
        <Diamond size={10} tint="transparent" border={colors.line} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: placePhotoUrl(path) }}
      style={{
        width: THUMB,
        height: THUMB,
        borderRadius: THUMB_RADIUS,
        backgroundColor: colors.line,
      }}
      contentFit="cover"
      // The gallery's fade, for the gallery's reason.
      transition={180}
      onError={() => setFailedAt(fetchedAt)}
    />
  );
}

/**
 * One way out of the app from a card: the icon that says where, and the word
 * that says it again. In cherry, the palette's colour for a link that is an
 * action — and the one place an icon takes it, because here the icon is the point.
 *
 * The vertical padding is what makes the target 44.
 */
function CardAction({
  icon,
  label,
  accessibilityLabel,
  url,
}: {
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  url: string;
}) {
  const { t } = useTranslation();

  const open = () => {
    // The detail screen's answer to a device with nothing to open a link with.
    Linking.openURL(url).catch(() => Alert.alert(t('detail.linkFailed')));
  };

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      onPress={open}
      className="flex-row items-center gap-1.5 py-[13px] active:opacity-60"
    >
      <Ionicons name={icon} size={16} color={colors.cherry} />
      <Text className="text-[13.5px] font-semibold leading-[18px] text-cherry">{label}</Text>
    </Pressable>
  );
}

/**
 * A place as a stitched card: white ground, hairline border, and a 3px band of
 * the category's thread across the top. The tint arrives as data, so the two
 * parts that carry it — the band and the eyebrow — take it as a value rather
 * than as a class.
 *
 * The card is two things to press, and they are siblings rather than one inside
 * the other: the body opens the place, the foot leaves the app for the maps app
 * or the dialer. A button inside a button is one a screen reader can't reach.
 *
 * The body is labelled rather than left to read its own text, because its text
 * now includes a description somebody else wrote, at whatever length they wrote
 * it. The label is what the row said before: category, name, address, distance.
 *
 * Distance shares the eyebrow's line in a parchment pill, because it is measured
 * rather than declared — and with tabular figures, so a column of them lines up
 * down the list. Up there it costs the name and the address none of their width.
 */
export function PlaceRow({
  place,
  fetchedAt,
  onPress,
}: {
  place: PlaceWithDistance;
  fetchedAt: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const tint = categoryColor[place.category];
  const category = t(`categories.${place.category}`);
  const miles = milesLabel(place.miles);
  const distance = t(miles.isBelow ? 'units.milesBelow' : 'units.miles', { value: miles.value });
  // Un-dialable is the same as absent: a link that goes nowhere is worse than none.
  const callUrl = place.phone ? telUrl(place.phone) : null;

  return (
    <View
      className="rounded-[13px] border border-line bg-card"
      style={{ borderTopWidth: 3, borderTopColor: tint }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('list.card', {
          category,
          name: place.name,
          address: place.address,
          distance,
        })}
        onPress={onPress}
        // A card can't take a full-bleed press highlight without losing its
        // edges, so the part that was pressed dims instead.
        className="flex-row gap-3 px-4 pb-3 pt-3.5 active:opacity-80"
      >
        <Thumb key={place.photo_paths[0]} path={place.photo_paths[0]} fetchedAt={fetchedAt} />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2.5">
            <Text
              numberOfLines={1}
              className="flex-1 text-[10px] font-semibold uppercase tracking-[1.5px]"
              style={{ color: tint }}
            >
              {category}
            </Text>
            <View className="rounded-full bg-parchment px-[9px] py-1">
              <Text
                className="text-[11px] font-semibold text-muted"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {distance}
              </Text>
            </View>
          </View>
          <Text numberOfLines={2} className="mt-0.5 text-[16px] font-semibold leading-[21px] text-ink">
            {place.name}
          </Text>
          <Text numberOfLines={2} className="mt-[3px] text-[12px] leading-[15px] text-muted">
            {place.address}
          </Text>
          {/* Written by whoever submitted the place, shown as written — one line
              of it. In ink, where the address is muted: this is prose, and set
              like the address it would read as a second one. */}
          <Text numberOfLines={1} className="mt-1.5 text-[12.5px] leading-[17px] text-ink">
            {place.description}
          </Text>
        </View>
      </Pressable>
      <View className="flex-row gap-6 border-t border-line px-4">
        <CardAction
          icon="navigate-outline"
          label={t('actions.directions')}
          accessibilityLabel={t('actions.directionsTo', { name: place.name })}
          url={directionsUrl(place, Platform.OS)}
        />
        {callUrl ? (
          <CardAction
            icon="call-outline"
            label={t('actions.call')}
            accessibilityLabel={t('actions.callPlace', { name: place.name })}
            url={callUrl}
          />
        ) : null}
      </View>
    </View>
  );
}
