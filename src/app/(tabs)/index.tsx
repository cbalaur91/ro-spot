import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChips } from '@/components/CategoryChips';
import { PlacesMap } from '@/components/PlacesMap';
import { useVisiblePlaces } from '@/hooks/useVisiblePlaces';
import { useCategoryFilter } from '@/state/categoryFilter';

/**
 * A hairline-topped strip along the bottom edge, for the two things the map
 * can't say by itself: that a filter has emptied it, and that the places never
 * arrived. Anything else and the map keeps its own counsel.
 */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View className="absolute inset-x-0 bottom-0 border-t border-line bg-surface px-9 py-4">
      {children}
    </View>
  );
}

export default function MapScreen() {
  const { t } = useTranslation();
  const { selected } = useCategoryFilter();
  const { places, origin, isUserLocation, isPending, isError, refetch } =
    useVisiblePlaces();

  return (
    <View className="flex-1 bg-surface">
      <PlacesMap places={places} origin={origin} isUserLocation={isUserLocation} />

      <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0 bg-surface">
        <View className="border-b border-line">
          <CategoryChips />
        </View>
      </SafeAreaView>

      {isError ? (
        <Notice>
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
        </Notice>
      ) : null}

      {!isPending && !isError && places.length === 0 ? (
        <Notice>
          {/* An empty map means two different things, and blaming the chips for
              an empty dataset would send the user hunting for a filter to undo. */}
          <Text className="text-[13px] text-muted">
            {selected.size > 0 ? t('filters.noMatch') : t('map.empty')}
          </Text>
        </Notice>
      ) : null}
    </View>
  );
}
