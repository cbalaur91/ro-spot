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

import { RetryPill } from '@/components/ScreenState';
import { placePhotoUrl } from '@/data/places';
import { Diamond } from '@/motifs/Diamond';
import { colors } from '@/theme';

/**
 * One photograph, one page. The detail screen hands the gallery the whole width
 * of the screen — the photographs are the one thing on it with no gutter to
 * keep — so a page fills the frame and the next one is a push away.
 */
function Photo({
  path,
  width,
  label,
  onError,
}: {
  path: string;
  width: number;
  label: string;
  onError: () => void;
}) {
  return (
    <Image
      source={{ uri: placePhotoUrl(path) }}
      style={{ width, aspectRatio: 4 / 3, backgroundColor: colors.line }}
      contentFit="cover"
      // Fades the decoded image in over the hairline-grey box rather than
      // snapping, which on a slow connection is the difference between "loading"
      // and "broken".
      transition={180}
      onError={onError}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    />
  );
}

/**
 * A photograph that didn't arrive, in the page it would have filled: the same
 * 4:3, so nothing below it moves and the page marks still count it. On the
 * card's white rather than the loading box's grey — "still coming" and "not
 * coming" must not look alike.
 */
function PhotoFailed({
  width,
  index,
  onRetry,
}: {
  width: number;
  index: number;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View
      testID={`photo-failed-${index + 1}`}
      className="items-center justify-center gap-3 bg-card px-6"
      style={{ width, aspectRatio: 4 / 3 }}
    >
      <Diamond size={10} tint="transparent" border={colors.line} />
      <Text className="text-center text-[13px] leading-[18px] text-muted">
        {t('detail.photoUnavailable')}
      </Text>
      <RetryPill
        accessibilityLabel={t('detail.retryPhoto', { index: index + 1 })}
        onPress={onRetry}
      />
    </View>
  );
}

/**
 * The rhomboid again, at its smallest: one per photo, solid for the one you're
 * on. Centred, because the gallery it belongs to now runs the full width of the
 * screen and there is no gutter left to align them to.
 */
function PageMarks({ count, current }: { count: number; current: number }) {
  return (
    <View className="mt-3 flex-row justify-center gap-2">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} testID={`page-mark-${index}${index === current ? '-current' : ''}`}>
          {index === current ? (
            <Diamond size={6} tint={colors.ink} />
          ) : (
            <Diamond size={6} tint="transparent" border={colors.line} />
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * The photographs of one place, one per page.
 *
 * `width` is the gallery's, not the screen's — the caller owns the gutter. Which
 * pages failed is the caller's too: when every one of them has, the caller shows
 * something other than a gallery, so it has to be the one that knows. A failed
 * page retried is simply drawn as a photograph again, which mounts a fresh image
 * and asks for it anew.
 */
export function PhotoGallery({
  paths,
  width,
  failed,
  onFail,
  onRetry,
}: {
  paths: string[];
  width: number;
  failed: ReadonlySet<number>;
  onFail: (index: number) => void;
  onRetry: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);

  const onSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrent(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View>
      <FlatList
        testID="photo-gallery"
        data={paths}
        horizontal
        keyExtractor={(path) => path}
        // A failure changes a page without changing `paths`.
        extraData={failed}
        showsHorizontalScrollIndicator={false}
        // Not `pagingEnabled`: that snaps to the width of the scroll view, and a
        // page here is the width the caller gave, which needn't be the same.
        snapToInterval={width}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={onSettled}
        renderItem={({ item, index }) =>
          failed.has(index) ? (
            <PhotoFailed width={width} index={index} onRetry={() => onRetry(index)} />
          ) : (
            <Photo
              path={item}
              width={width}
              label={t('detail.photo', { index: index + 1, total: paths.length })}
              onError={() => onFail(index)}
            />
          )
        }
      />
      {paths.length > 1 ? <PageMarks count={paths.length} current={current} /> : null}
    </View>
  );
}
