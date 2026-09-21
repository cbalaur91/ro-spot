import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoGallery } from '@/components/PhotoGallery';
import { Loading, LoadFailed, ScreenNotice } from '@/components/ScreenState';
import type { Place } from '@/data/places';
import { distanceMiles, milesLabel } from '@/geo';
import { useOrigin } from '@/hooks/useOrigin';
import { usePlace } from '@/hooks/usePlace';
import { telUrl, webUrl } from '@/links';
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

/**
 * The way back, floating over the photographs rather than sitting above them:
 * the hero runs to the top of the screen, so the chip is what keeps a dark
 * photograph from swallowing the control.
 *
 * The inset comes from a top-edge `SafeAreaView` rather than from
 * `useSafeAreaInsets`, which needs a provider mounted above it — this screen is
 * pushed onto a stack, and the chip should not depend on who mounted it.
 */
function BackChip() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="absolute left-2 top-0">
      {/* The chip is the canvas's 32px and smaller than a finger, so the padding
          around it — not `hitSlop`, which Android clips at this absolutely
          positioned parent's edge — is what makes the touch target 44. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('actions.back')}
        onPress={() => router.back()}
        className="mt-2 p-1.5 active:opacity-70"
      >
        <View
          className="h-8 w-8 items-center justify-center rounded-full bg-surface"
          style={{ boxShadow: `0px 1px 4px ${colors.ink}26` }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

/**
 * The states with no photograph for the chip to float on, held clear of the
 * status bar the hero would otherwise run under.
 */
function WithoutHero({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top']} className="flex-1">
      {children}
    </SafeAreaView>
  );
}

function PlaceBody({ place }: { place: Place }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const tint = categoryColor[place.category];
  const links = contactLinks(place);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Full-bleed and hard against the top: the photographs lead, and the
          chrome that would frame them floats over them instead. */}
      <PhotoGallery paths={place.photo_paths} width={width} />

      <View style={{ paddingHorizontal: GUTTER }} className="pt-[18px]">
        <Eyebrow tint={tint}>{t(`categories.${place.category}`)}</Eyebrow>
        <Text className="mt-1.5 text-[23px] font-semibold leading-[29px] text-ink">
          {place.name}
        </Text>
        <AddressLine place={place} />

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

        <ReportPill placeId={place.id} />
      </View>
    </ScrollView>
  );
}

/**
 * The way to tell the moderator a listing is wrong, at the foot of the body:
 * after everything the place says about itself, never in the way of it.
 *
 * Outlined in `line` rather than `cherry` — the secondary pill's border would
 * make it the loudest thing on a screen that is about the place. It opens the
 * report screen whether or not anyone is signed in: that screen asks for an
 * account, so signing in lands back on the report rather than here.
 */
function ReportPill({ placeId }: { placeId: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/report/[id]', params: { id: placeId } })}
      className="mt-7 self-start rounded-full border-[1.5px] border-line px-6 py-[11px] active:opacity-70"
    >
      <Text className="text-[14px] font-semibold text-cherry">{t('detail.report')}</Text>
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
        <PlaceBody place={place} />
      )}

      {/* Last, so it paints over the photographs it floats on. */}
      <BackChip />
    </View>
  );
}
