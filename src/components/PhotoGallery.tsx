import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { placePhotoUrl } from '@/data/places';
import { colors } from '@/theme';

/**
 * The one place on the screen the photographs may go past the gutter: a photo
 * runs off the right edge, so the page reads as a deck you can push through
 * rather than a framed picture. The left edge stays on the 36px gutter, because
 * that is where the column runs and nothing crosses it.
 */
function Photo({ path, width, label }: { path: string; width: number; label: string }) {
  return (
    <Image
      source={{ uri: placePhotoUrl(path) }}
      style={{ width, aspectRatio: 4 / 3, backgroundColor: colors.line }}
      contentFit="cover"
      // Fades the decoded image in over the hairline-grey box rather than
      // snapping, which on a slow connection is the difference between "loading"
      // and "broken".
      transition={180}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    />
  );
}

/** The rhomboid again, at its smallest: one per photo, solid for the one you're on. */
function PageMarks({ count, current }: { count: number; current: number }) {
  return (
    <View className="mt-3 flex-row gap-2">
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          className="h-1.5 w-1.5 rotate-45"
          style={
            index === current
              ? { backgroundColor: colors.ink }
              : { borderWidth: 1, borderColor: colors.line }
          }
        />
      ))}
    </View>
  );
}

/**
 * Stands in for the photographs when there are none — a place can be approved
 * before anyone has photographed it, and an empty band with no explanation reads
 * as a failed download.
 */
function NoPhotos({ width }: { width: number }) {
  const { t } = useTranslation();

  return (
    <View
      className="items-center justify-center border border-line"
      style={{ width, aspectRatio: 4 / 3 }}
    >
      <View className="h-2.5 w-2.5 rotate-45 border border-line" />
      <Text className="mt-4 text-[13px] text-muted">{t('detail.noPhotos')}</Text>
    </View>
  );
}

/**
 * The photographs of one place, one per page.
 *
 * `width` is the gallery's, not the screen's — the caller owns the gutter.
 */
export function PhotoGallery({ paths, width }: { paths: string[]; width: number }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);

  if (paths.length === 0) return <NoPhotos width={width} />;

  const onSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrent(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View>
      <FlatList
        data={paths}
        horizontal
        keyExtractor={(path) => path}
        showsHorizontalScrollIndicator={false}
        // Not `pagingEnabled`: that snaps to the width of the scroll view, which
        // here runs to the screen edge while a page stops at the gutter.
        snapToInterval={width}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={onSettled}
        renderItem={({ item, index }) => (
          <Photo
            path={item}
            width={width}
            label={t('detail.photo', { index: index + 1, total: paths.length })}
          />
        )}
      />
      {paths.length > 1 ? <PageMarks count={paths.length} current={current} /> : null}
    </View>
  );
}
