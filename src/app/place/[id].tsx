import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoGallery } from '@/components/PhotoGallery';
import { Loading, LoadFailed, RetryPill, ScreenNotice } from '@/components/ScreenState';
import type { Place } from '@/data/places';
import { distanceMiles, milesLabel } from '@/geo';
import { useOrigin } from '@/hooks/useOrigin';
import { usePlace } from '@/hooks/usePlace';
import { directionsUrl, telUrl, webUrl } from '@/links';
import { StarBand } from '@/motifs/Band';
import { Diamond } from '@/motifs/Diamond';
import { categoryColor, colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * The body's inset. Wider than the app's 24px gutter and the List's 18px card
 * margin: this screen is one column of prose under a full-bleed photograph, and
 * prose set to the same measure as a card reads as a card that lost its border.
 */
const GUTTER = 22;

function Eyebrow({ tint, children }: { tint: string; children: string }) {
  return (
    <Text
      className="text-[11px] font-semibold uppercase leading-4 tracking-[1.5px]"
      style={{ color: tint }}
    >
      {children}
    </Text>
  );
}

type ContactLink = {
  key: 'call' | 'website' | 'social';
  /** Shown as the submitter wrote it, so you can see where you are about to go. */
  value: string;
  url: string;
  icon: IconName;
};

/**
 * The optional contact fields, in the order the spec names them, keeping only
 * the ones that can actually be opened.
 *
 * A field holding something that isn't a number or a web address is dropped
 * rather than shown: offering a link that goes nowhere is worse than not
 * offering one.
 */
function contactLinks(place: Place): ContactLink[] {
  const fields = [
    { key: 'call', raw: place.phone, toUrl: telUrl, icon: 'call-outline' },
    { key: 'website', raw: place.website, toUrl: webUrl, icon: 'open-outline' },
    { key: 'social', raw: place.social_url, toUrl: webUrl, icon: 'open-outline' },
  ] as const;

  return fields.flatMap(({ key, raw, toUrl, icon }) => {
    const url = raw ? toUrl(raw) : null;
    return url ? [{ key, value: raw!, url, icon }] : [];
  });
}

/**
 * One way of reaching the place: a hairline-separated row, label over value,
 * with the icon that says what tapping it will open.
 *
 * The first row's hairline doubles as the rule under the description, so the
 * contact block needs no divider of its own.
 */
function ContactRow({ link }: { link: ContactLink }) {
  const { t } = useTranslation();
  const label = t(`detail.${link.key}`);

  const open = () => {
    // A tablet with no dialer, or a device with no browser, is a real answer and
    // not a bug — say so rather than letting the tap do nothing.
    Linking.openURL(link.url).catch(() => Alert.alert(t('detail.linkFailed')));
  };

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${link.value}`}
      onPress={open}
      className="flex-row items-center gap-4 border-t border-line py-3.5 active:opacity-60"
    >
      <View className="flex-1">
        <Eyebrow tint={colors.muted}>{label}</Eyebrow>
        {/* A long social URL would otherwise run to five lines and outweigh
            the place it belongs to. */}
        <Text numberOfLines={2} className="mt-1 text-[14px] leading-[19px] text-ink">
          {link.value}
        </Text>
      </View>
      <Ionicons name={link.icon} size={16} color={colors.muted} />
    </Pressable>
  );
}

/**
 * Where the place is, and how far that is from here.
 *
 * The distance waits for the origin to resolve — while the prompt is still up
 * there is nothing to measure from but a guess about the reader. Once it has
 * resolved to the fallback, the number is honestly from downtown Detroit and is
 * stated as such, without the List's caveat: the List says it once over a whole
 * column of numbers, and this screen has one.
 *
 * The distance is a nested `Text` rather than a longer string so that the
 * address stays its own line of text: one node the address, one the measurement.
 */
function AddressLine({ place }: { place: Place }) {
  const { t } = useTranslation();
  const { origin, isResolved } = useOrigin();
  const miles = isResolved ? milesLabel(distanceMiles(origin, place)) : null;

  return (
    <Text className="mt-[5px] text-[13px] leading-[18px] text-muted">
      <Text>{place.address}</Text>
      {miles ? (
        <Text style={{ fontVariant: ['tabular-nums'] }}>
          {` · ${t(miles.isBelow ? 'units.milesBelow' : 'units.miles', {
            value: miles.value,
          })}`}
        </Text>
      ) : null}
    </Text>
  );
}

type PlaceAction = {
  key: 'directions' | 'call';
  variant: 'primary' | 'secondary';
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  url: string;
};

/** Between the two pills, side by side or stacked. */
const ACTION_GAP = 10;

/**
 * The primary and secondary pill recipes of `docs/DESIGN.md`, with an icon, at a
 * 44 minimum that grows with the text.
 *
 * Both carry the outline's 1.5px cherry border — on the filled pill it vanishes
 * into the fill, with the padding trimmed to match. Without it the pair is not
 * equal width: Yoga won't flex a pill narrower than its padding and border, so
 * the outlined one comes out 3 wider.
 */
const PILL =
  'min-h-[44px] flex-row items-center justify-center gap-2 rounded-full border-[1.5px] border-cherry px-6 py-[11px]';
const PILL_VARIANT = {
  primary: 'bg-cherry active:opacity-80',
  secondary: 'active:opacity-70',
} as const;

function PillFace({ action }: { action: PlaceAction }) {
  const tint = action.variant === 'primary' ? colors.surface : colors.cherry;
  return (
    <>
      <Ionicons name={action.icon} size={16} color={tint} />
      <Text className="text-center text-[14px] font-semibold" style={{ color: tint }}>
        {action.label}
      </Text>
    </>
  );
}

/**
 * What most visits to a place end in — going there, or ringing them — straight
 * under where it is, rather than at the foot of everything it says about itself.
 *
 * Two pills share the width equally while both icon-and-label pairs fit in half
 * of it, and stack full-width when either doesn't. Whether they fit is measured,
 * not guessed from the font scale: Romanian labels, a narrow phone and enlarged
 * text all move the line, and only the layout knows where it is. Each pair is
 * laid out once more out of sight, at its natural width, and that copy is what
 * gets compared — the visible pills can't be, because a stacked pill always fits.
 */
function PlaceActions({ place }: { place: Place }) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [naturalWidths, setNaturalWidths] = useState<
    Partial<Record<PlaceAction['key'], number>>
  >({});

  // Un-dialable is the same as absent, as on the List card.
  const callUrl = place.phone ? telUrl(place.phone) : null;
  const actions: PlaceAction[] = [
    {
      key: 'directions',
      variant: 'primary',
      icon: 'navigate-outline',
      label: t('actions.directions'),
      accessibilityLabel: t('actions.directionsTo', { name: place.name }),
      url: directionsUrl(place, Platform.OS),
    },
    ...(callUrl
      ? [
          {
            key: 'call',
            variant: 'secondary',
            icon: 'call-outline',
            label: t('actions.call'),
            accessibilityLabel: t('actions.callPlace', { name: place.name }),
            url: callUrl,
          } as const,
        ]
      : []),
  ];
  const paired = actions.length > 1;
  // A point short of half: a label measured at exactly the half can still wrap
  // once the pill's edges are rounded to pixels.
  const room = (width - ACTION_GAP) / 2 - 1;
  // Side by side until there is a width to compare with: zero wide, nothing fits.
  const stacked =
    paired && width > 0 && actions.some(({ key }) => (naturalWidths[key] ?? 0) > room);

  const open = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert(t('detail.linkFailed')));
  };

  return (
    <View
      testID="place-actions"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className="mt-4"
    >
      {paired
        ? actions.map((action) => (
            <View
              key={action.key}
              testID={`place-action-measure-${action.key}`}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              onLayout={(e) => {
                const measured = e.nativeEvent.layout.width;
                setNaturalWidths((prev) => ({ ...prev, [action.key]: measured }));
              }}
              className={`${PILL} ${PILL_VARIANT[action.variant]} absolute left-0 top-0`}
              style={{ opacity: 0 }}
            >
              <PillFace action={action} />
            </View>
          ))
        : null}
      <View
        testID="place-actions-row"
        style={{ flexDirection: stacked ? 'column' : 'row', gap: ACTION_GAP }}
      >
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="link"
            accessibilityLabel={action.accessibilityLabel}
            onPress={() => open(action.url)}
            className={`${PILL} ${PILL_VARIANT[action.variant]} ${stacked ? '' : 'flex-1'}`}
          >
            <PillFace action={action} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * The way back: a 32px chip, the canvas's, with a shadow that keeps a dark
 * photograph from swallowing it.
 *
 * The chip is smaller than a finger, so the padding around it — not `hitSlop`,
 * which Android clips at an absolutely positioned parent's edge — is what makes
 * the touch target 44.
 */
function BackChip() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('actions.back')}
      onPress={() => router.back()}
      className="mt-2 self-start p-1.5 active:opacity-70"
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-full bg-surface"
        style={{ boxShadow: `0px 1px 4px ${colors.ink}26` }}
      >
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
      </View>
    </Pressable>
  );
}

/**
 * The chip floating over the photographs rather than sitting above them: the
 * hero runs to the top of the screen. Only ever over a real photograph — with
 * nothing under it, a floating chip is just something in the way of the text.
 *
 * The inset comes from a top-edge `SafeAreaView` rather than from
 * `useSafeAreaInsets`, which needs a provider mounted above it — this screen is
 * pushed onto a stack, and the chip should not depend on who mounted it.
 */
function FloatingBackChip() {
  return (
    <SafeAreaView edges={['top']} className="absolute left-2 top-0">
      <BackChip />
    </SafeAreaView>
  );
}

/**
 * The states with no photograph for the chip to float on: held clear of the
 * status bar the hero would otherwise run under, the chip first in the flow.
 */
function WithoutHero({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} className="flex-1">
      <View className="pl-2">
        <BackChip />
      </View>
      {children}
    </SafeAreaView>
  );
}

/**
 * What stands at the top of a place with no photograph to show — none taken
 * yet, or none that would load. A third of the screen of empty 4:3 box said
 * "loading" when it meant "nothing here", so this is as short as the message:
 * card-white from the very top edge, the Back chip in its flow, then one line
 * that wraps, over a hairline.
 */
/** The compact header's message line, shared by the text and the rhomb beside it. */
const HEADER_LINE = 18;

function PlaceHeader({ message, onRetry }: { message: string; onRetry?: () => void }) {
  // Enlarged text scales the message's line, and the box the rhomb is centred in
  // has to scale with it.
  const { fontScale } = useWindowDimensions();

  return (
    <View testID="place-header" className="border-b border-line bg-card">
      <SafeAreaView edges={['top']}>
        <View className="pl-2">
          <BackChip />
        </View>
        <View className="min-h-[96px] justify-center py-4" style={{ paddingHorizontal: GUTTER }}>
          <View className="flex-row items-start gap-3.5">
            {/* One text line tall, so the rhomb marks the message's first line
                rather than the middle of the message and its Retry. */}
            <View className="justify-center" style={{ height: HEADER_LINE * fontScale }}>
              <Diamond size={10} tint="transparent" border={colors.line} />
            </View>
            {/* A column of its own, so the message and the Retry under it wrap
                at the text's width rather than beside each other. */}
            <View className="flex-1 items-start gap-3">
              <Text
                className="text-[13px] text-muted"
                style={{ lineHeight: HEADER_LINE }}
              >
                {message}
              </Text>
              {onRetry ? <RetryPill onPress={onRetry} /> : null}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Keyed by the place and its photo paths where it is mounted, so a different
 * place — or this one after an edit — starts again from the first photograph
 * with nothing marked as failed.
 */
function PlaceBody({ place }: { place: Place }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set());
  const tint = categoryColor[place.category];
  const links = contactLinks(place);

  const paths = place.photo_paths;
  const allFailed = paths.length > 0 && failed.size === paths.length;
  const hasHero = paths.length > 0 && !allFailed;

  const fail = (index: number) => setFailed((prev) => new Set(prev).add(index));
  const retry = (index: number) =>
    setFailed((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {hasHero ? (
          // Full-bleed and hard against the top: the photographs lead, and the
          // chrome that would frame them floats over them instead.
          <PhotoGallery
            paths={paths}
            width={width}
            failed={failed}
            onFail={fail}
            onRetry={retry}
          />
        ) : allFailed ? (
          // Retry clears every failure at once, and the gallery that comes back
          // mounts every image afresh.
          <PlaceHeader
            message={t('detail.photosFailed')}
            onRetry={() => setFailed(new Set())}
          />
        ) : (
          <PlaceHeader message={t('detail.noPhotos')} />
        )}

        <View style={{ paddingHorizontal: GUTTER }} className="pt-[18px]">
          <Eyebrow tint={tint}>{t(`categories.${place.category}`)}</Eyebrow>
          <Text className="mt-1.5 text-[23px] font-semibold leading-[29px] text-ink">
            {place.name}
          </Text>
          <AddressLine place={place} />
          <PlaceActions place={place} />

          {/* The signature, at the width of the text rather than the screen: here
              it divides a block of prose instead of underwriting a header. */}
          <View className="my-4">
            <StarBand height={10} />
          </View>

          {/* Written by whoever submitted the place, shown as written. */}
          <Text className="text-[13.5px] leading-[22px] text-ink">{place.description}</Text>

          {links.length > 0 ? (
            <View className="mt-[18px]">
              {links.map((link) => (
                <ContactRow key={link.key} link={link} />
              ))}
            </View>
          ) : null}

          <ReportAction placeId={place.id} />
        </View>
      </ScrollView>

      {/* After the scroll view, so it paints over the photographs it floats on. */}
      {hasHero ? <FloatingBackChip /> : null}
    </>
  );
}

/**
 * The way to tell the moderator a listing is wrong, at the foot of the body:
 * after everything the place says about itself, never in the way of it.
 *
 * Muted text rather than a pill, now that the screen has pills that are about
 * the place — a third one here would compete with Directions for the eye. The
 * underline is what says it can be pressed, and the vertical padding is what
 * makes the target 44. It opens the report screen whether or not anyone is
 * signed in: that screen asks for an account, so signing in lands back on the
 * report rather than here.
 */
function ReportAction({ placeId }: { placeId: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/report/[id]', params: { id: placeId } })}
      className="mt-5 min-h-[44px] justify-center self-start py-2.5 active:opacity-60"
    >
      <Text className="text-[13px] text-muted underline">{t('detail.report')}</Text>
    </Pressable>
  );
}

export default function PlaceDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { place, isPending, isError, refetch } = usePlace(id);

  return (
    <View className="flex-1 bg-surface">
      {isPending ? (
        <WithoutHero>
          <Loading label={t('detail.loading')} />
        </WithoutHero>
      ) : isError ? (
        <WithoutHero>
          <LoadFailed label={t('detail.error')} onRetry={refetch} />
        </WithoutHero>
      ) : place === null ? (
        <WithoutHero>
          <ScreenNotice>
            {/* A pending place and a deleted one look the same from out here, and
                the copy says both rather than guessing which. */}
            <Diamond size={10} tint={colors.line} />
            <Text className="mt-2 text-center text-[15px] text-ink">
              {t('detail.notFound')}
            </Text>
            <Text className="text-center text-[13px] leading-5 text-muted">
              {t('detail.notFoundHint')}
            </Text>
          </ScreenNotice>
        </WithoutHero>
      ) : (
        <PlaceBody key={`${place.id}:${place.photo_paths.join('\n')}`} place={place} />
      )}
    </View>
  );
}
