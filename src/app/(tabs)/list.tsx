import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChips } from '@/components/CategoryChips';
import { PlaceRow } from '@/components/PlaceRow';
import { useVisiblePlaces } from '@/hooks/useVisiblePlaces';
import { useCategoryFilter } from '@/state/categoryFilter';
import { colors } from '@/theme';

function Header({ showOriginNote }: { showOriginNote: boolean }) {
  const { t } = useTranslation();

  return (
    <View className="pb-1 pt-2">
      <View className="px-9">
        {/* The wordmark is a name, not copy — it stays the same in both locales. */}
        <Text className="text-[32px] font-bold tracking-tight text-ink">
          <Text className="text-cherry">Ro</Text>Spot
        </Text>
        <Text className="mt-1 text-[13px] text-muted">{t('list.subtitle')}</Text>
        {showOriginNote ? (
          // Said once, plainly: the order is real, it's just measured from
          // downtown rather than from you.
          <Text className="mt-3 text-[12px] leading-[18px] text-muted">
            {t('list.fallbackOrigin')}
          </Text>
        ) : null}
      </View>
      <CategoryChips />
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="items-center gap-3 px-9 py-16">{children}</View>;
}

export default function ListScreen() {
  const { t } = useTranslation();
  const { selected } = useCategoryFilter();
  const { places, isResolved, isUserLocation, isPending, isError, isRefetching, refetch } =
    useVisiblePlaces();
  // Only once the device has answered: saying "distances are from downtown"
  // while the prompt is still up would be a claim we can't yet make.
  const showOriginNote = isResolved && !isUserLocation;

  if (isPending || isError) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Header showOriginNote={showOriginNote} />
        {isPending ? (
          <Centered>
            <ActivityIndicator color={colors.cherry} />
            <Text className="text-[13px] text-muted">{t('list.loading')}</Text>
          </Centered>
        ) : (
          <Centered>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
            <Text className="text-center text-[15px] text-ink">{t('list.error')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={refetch}
              className="mt-1 rounded-full bg-cherry px-5 py-2.5 active:opacity-80"
            >
              <Text className="text-[14px] font-semibold text-surface">
                {t('list.retry')}
              </Text>
            </Pressable>
          </Centered>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <FlatList
        data={places}
        keyExtractor={(place) => place.id}
        ListHeaderComponent={<Header showOriginNote={showOriginNote} />}
        renderItem={({ item }) => <PlaceRow place={item} />}
        ListEmptyComponent={
          <Centered>
            {/* An empty list means two different things, and telling the user
                which one saves them wondering where their places went. */}
            {selected.size > 0 ? (
              <Text className="text-[15px] text-ink">{t('filters.noMatch')}</Text>
            ) : (
              <>
                <Text className="text-[15px] text-ink">{t('list.empty')}</Text>
                <Text className="text-[13px] text-muted">{t('list.emptyHint')}</Text>
              </>
            )}
          </Centered>
        }
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    </SafeAreaView>
  );
}
