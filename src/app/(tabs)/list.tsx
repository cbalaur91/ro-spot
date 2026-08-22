import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChips } from '@/components/CategoryChips';
import { PlaceRow } from '@/components/PlaceRow';
import { Loading, LoadFailed, ScreenNotice } from '@/components/ScreenState';
import { useVisiblePlaces } from '@/hooks/useVisiblePlaces';
import { StarBand } from '@/motifs/Band';
import { useCategoryFilter } from '@/state/categoryFilter';

function Header({ showOriginNote }: { showOriginNote: boolean }) {
  const { t } = useTranslation();

  return (
    <View className="pt-2">
      <View className="px-6 pb-3">
        {/* The wordmark is a name, not copy — it stays the same in both locales. */}
        <Text className="text-[30px] font-bold leading-[30px] tracking-[-0.5px] text-ink">
          <Text className="text-cherry">Ro</Text>Spot
        </Text>
        <Text className="mt-[5px] text-[13px] text-muted">{t('list.subtitle')}</Text>
        {showOriginNote ? (
          // Said once, plainly: the order is real, it's just measured from
          // downtown rather than from you.
          <Text className="mt-3 text-[12px] leading-[18px] text-muted">
            {t('list.fallbackOrigin')}
          </Text>
        ) : null}
      </View>
      {/* Edge to edge, under the header rather than around it: the band is the
          app's signature, and a signature that stopped at the gutter would read
          as a rule instead. */}
      <StarBand height={14} />
      <CategoryChips />
    </View>
  );
}

export default function ListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
          <Loading label={t('list.loading')} />
        ) : (
          <LoadFailed label={t('list.error')} onRetry={refetch} />
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
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/place/[id]', params: { id: item.id } })}
            // Cards can't take a full-bleed press highlight without losing their
            // edges, so the whole card dims instead.
            className="mx-[18px] mb-3 active:opacity-80"
          >
            <PlaceRow place={item} />
          </Pressable>
        )}
        ListEmptyComponent={
          <ScreenNotice>
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
          </ScreenNotice>
        }
        contentContainerStyle={{ paddingBottom: 12 }}
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    </SafeAreaView>
  );
}
