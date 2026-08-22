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

import { ColumnSegment, GUTTER } from '@/components/Column';
import { PhotoGallery } from '@/components/PhotoGallery';
import { Loading, LoadFailed, ScreenNotice } from '@/components/ScreenState';
import type { Place } from '@/data/places';
import { usePlace } from '@/hooks/usePlace';
import { telUrl, webUrl } from '@/links';
import { categoryColor, colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * One block of the screen, hung off the same column the list rows hang off. The
 * screen is the row you tapped, unfolded: one rung per thing there is to know
 * about the place.
 *
 * The first rung is the place itself and takes the category colour, as its row
 * in the list did. The rest are hollow — the category has already been stated,
 * and repeating it in three colours would say nothing new.
 */
function Rung({ tint, children }: { tint?: string; children: React.ReactNode }) {
  return (
    <View className="flex-row">
      {/* 1px: these blocks have no padding above them, so the rhomboid needs
          almost nothing to land on the first line. */}
      <ColumnSegment tint={tint} offset={1} />
      <View className="flex-1 pb-8 pr-9">{children}</View>
    </View>
  );
}

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

function ContactRung({ link }: { link: ContactLink }) {
  const { t } = useTranslation();
  const label = t(`detail.${link.key}`);

  const open = () => {
    // A tablet with no dialer, or a device with no browser, is a real answer and
    // not a bug — say so rather than letting the tap do nothing.
    Linking.openURL(link.url).catch(() => Alert.alert(t('detail.linkFailed')));
  };

  return (
    <Rung>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${label}: ${link.value}`}
        onPress={open}
        className="flex-row items-start gap-4 active:opacity-60"
      >
        <View className="flex-1">
          <Eyebrow tint={colors.muted}>{label}</Eyebrow>
          {/* A long social URL would otherwise run to five lines and outweigh
              the place it belongs to. */}
          <Text numberOfLines={2} className="mt-1.5 text-[15px] leading-5 text-ink">
            {link.value}
          </Text>
        </View>
        <Ionicons name={link.icon} size={16} color={colors.muted} style={{ marginTop: 1 }} />
      </Pressable>
    </Rung>
  );
}

function BackButton() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('actions.back')}
      // Centred on the gutter, so the way back sits at the top of the column
      // the rest of the screen hangs from.
      onPress={() => router.back()}
      className="h-11 w-9 items-center justify-center active:opacity-60"
    >
      <Ionicons name="chevron-back" size={24} color={colors.ink} />
    </Pressable>
  );
}

function PlaceBody({ place }: { place: Place }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const tint = categoryColor[place.category];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Inset to the gutter on the left and off the edge on the right: the
          photographs are the one thing allowed past the margin. The padding is
          `GUTTER` rather than `pl-9` so it and the width below cannot disagree. */}
      <View style={{ paddingLeft: GUTTER }}>
        <PhotoGallery paths={place.photo_paths} width={width - GUTTER} />
      </View>

      <View className="mt-8">
        <Rung tint={tint}>
          <Eyebrow tint={tint}>{t(`categories.${place.category}`)}</Eyebrow>
          <Text className="mt-2 text-[28px] font-bold leading-8 tracking-tight text-ink">
            {place.name}
          </Text>
          <Text className="mt-2 text-[13px] leading-5 text-muted">{place.address}</Text>
          {/* Written by whoever submitted the place, shown as written. */}
          <Text className="mt-5 text-[15px] leading-6 text-ink">{place.description}</Text>
        </Rung>

        {contactLinks(place).map((link) => (
          <ContactRung key={link.key} link={link} />
        ))}
      </View>
    </ScrollView>
  );
}

export default function PlaceDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { place, isPending, isError, refetch } = usePlace(id);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <BackButton />

      {isPending ? (
        <Loading label={t('detail.loading')} />
      ) : isError ? (
        <LoadFailed label={t('detail.error')} onRetry={refetch} />
      ) : place === null ? (
        <ScreenNotice>
          {/* A pending place and a deleted one look the same from out here, and
              the copy says both rather than guessing which. */}
          <View className="h-2.5 w-2.5 rotate-45 bg-line" />
          <Text className="mt-2 text-center text-[15px] text-ink">
            {t('detail.notFound')}
          </Text>
          <Text className="text-center text-[13px] leading-5 text-muted">
            {t('detail.notFoundHint')}
          </Text>
        </ScreenNotice>
      ) : (
        <PlaceBody place={place} />
      )}
    </SafeAreaView>
  );
}
