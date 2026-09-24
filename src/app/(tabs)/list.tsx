import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChips, ClearFilters } from '@/components/CategoryChips';
import { PlaceRow } from '@/components/PlaceRow';
import { Loading, LoadFailed, ScreenNotice } from '@/components/ScreenState';
import type { Origin } from '@/hooks/useOrigin';
import { useVisiblePlaces, type PlaceWithDistance } from '@/hooks/useVisiblePlaces';
import { HoraBand, StarBand } from '@/motifs/Band';
import { useCategoryFilter } from '@/state/categoryFilter';

/**
 * The top of the page: the name, what it is, and — once — where distances are
 * from, with the way to measure from the user instead.
 */
function Masthead({
  showOriginNote,
  access,
  onEnable,
}: {
  showOriginNote: boolean;
  access: Origin['access'];
  onEnable: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="px-6 pb-3 pt-2">
      {/* The wordmark is a name, not copy — it stays the same in both locales. */}
      <Text className="text-[30px] font-bold leading-[30px] tracking-[-0.5px] text-ink">
        <Text className="text-cherry">Ro</Text>Spot
      </Text>
      <Text className="mt-[5px] text-[13px] text-muted">{t('list.subtitle')}</Text>
      {showOriginNote ? (
        // Said once, plainly: the order is real, it's just measured from
        // downtown rather than from you.
        <>
          <Text className="mt-3 text-[12px] leading-[18px] text-muted">
            {t('list.fallbackOrigin')}
          </Text>
          {/* Bare, as Clear is: a way out the note already explains. Settings
              once the OS won't ask again, and it says so rather than opening
              somewhere the user didn't expect. */}
          <Pressable
            accessibilityRole="button"
            onPress={onEnable}
            className="min-h-[44px] justify-center self-start active:opacity-60"
          >
            <Text className="text-[13px] font-semibold text-cherry">
              {t(access === 'ask' ? 'list.enable' : 'list.settings')}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

/**
 * The band and the chips, which stay when the masthead scrolls away: a filter
 * you have to scroll back up to reach is one you stop using halfway down.
 *
 * On `surface`, because pinned it has cards passing under it. The band runs
 * edge to edge, under the header rather than around it: it is the app's
 * signature, and a signature that stopped at the gutter would read as a rule
 * instead.
 */
function FilterBar({ count }: { count?: number }) {
  const { t } = useTranslation();
  const { selected } = useCategoryFilter();
  const isFiltered = selected.size > 0;

  return (
    <View className="bg-surface">
      <StarBand height={14} />
      <CategoryChips />
      {/* What the chips left, and the way to lift them. Pulled up into the
          chips' own bottom padding, so the row reads as theirs; 44 tall whether
          or not Clear is in it, so turning the first chip on doesn't push the
          list down under the finger. It wraps rather than truncates when the
          text is enlarged. No count until the places have arrived: "0 places"
          while they load would be a claim we can't yet make. */}
      {count !== undefined || isFiltered ? (
        <View className="-mt-3 min-h-[44px] flex-row flex-wrap content-center items-center justify-between gap-x-4 px-6">
          {count !== undefined ? (
            // The count alone is live: announcing the row would read Clear out
            // on every refilter.
            <Text
              accessibilityLiveRegion="polite"
              className="shrink text-[12px] text-muted"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {t('list.count', { count })}
            </Text>
          ) : (
            // Holds the left end, so `justify-between` keeps Clear on the right.
            <View />
          )}
          {isFiltered ? <ClearFilters /> : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * What the List says when there is genuinely nothing in it: the hora, danced
 * across the notice, and the ask that follows from it. Only the true empty gets
 * this — a list emptied by the user's own chips is told so instead, and offering
 * to add a place there would answer a question nobody asked.
 *
 * The block sits at the canvas's own 40px measure rather than the app's 24px
 * gutter: it is one column of centred text, and centred text set to the full
 * gutter reads as a paragraph that lost its page.
 *
 * The band is stretched rather than dropped straight in — it measures itself,
 * and a centred column gives its children no width to measure.
 */
function EmptyInvitation() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <View className="self-stretch">
        <HoraBand />
      </View>
      <Text className="mt-[26px] text-[17px] font-semibold text-ink">{t('list.empty')}</Text>
      <Text className="mt-[7px] text-center text-[13px] leading-[19.5px] text-muted">
        {t('list.emptyHint')}
      </Text>
      {/* Outlined rather than filled: it is the only thing to do on this screen,
          but it is still an invitation and not the app insisting. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/add')}
        className="mt-6 rounded-full border-[1.5px] border-cherry px-6 py-[11px] active:opacity-70"
      >
        <Text className="text-[14px] font-semibold text-cherry">{t('list.emptyCta')}</Text>
      </Pressable>
    </View>
  );
}

export default function ListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selected, clear } = useCategoryFilter();
  const {
    places,
    isResolved,
    isUserLocation,
    access,
    enableLocation,
    isPending,
    isError,
    isRefetching,
    fetchedAt,
    refetch,
  } = useVisiblePlaces();
  // Only once the device has answered: saying "distances are from downtown"
  // while the prompt is still up would be a claim we can't yet make.
  const showOriginNote = isResolved && !isUserLocation;
  const masthead = (
    <Masthead showOriginNote={showOriginNote} access={access} onEnable={enableLocation} />
  );
  // One section, because a section header is the list's own word for "the part
  // that pins". The key is what keeps the chip row mounted across a refilter.
  const sections = useMemo(() => [{ key: 'places', data: places }], [places]);

  // A refilter from the pinned chips starts the new list at its top. The list is
  // nearest first, and left where it was it would open on whatever the shorter
  // list happens to have at that depth — usually its far end. To the foot of
  // the masthead, not to zero: that is exactly where the bar pins, so the chips
  // don't move under the finger that is still choosing among them. Above the pin
  // there is nothing to correct, and the masthead stays.
  //
  // By the height measured here rather than `scrollToLocation`: the list keeps no
  // frame for a sticky header's cell and sends that to zero.
  const list = useRef<SectionList<PlaceWithDistance>>(null);
  const mastheadHeight = useRef(0);
  const offset = useRef(0);
  useEffect(() => {
    if (offset.current > mastheadHeight.current) {
      list.current?.getScrollResponder()?.scrollTo({ y: mastheadHeight.current, animated: false });
    }
  }, [selected]);

  if (isPending || isError) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        {masthead}
        <FilterBar />
        {isPending ? (
          <Loading label={t('list.loading')} />
        ) : (
          <LoadFailed label={t('browse.error')} onRetry={refetch} />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <SectionList
        ref={list}
        sections={sections}
        keyExtractor={(place) => place.id}
        ListHeaderComponent={
          <View onLayout={(event) => (mastheadHeight.current = event.nativeEvent.layout.height)}>
            {masthead}
          </View>
        }
        onScroll={(event) => (offset.current = event.nativeEvent.contentOffset.y)}
        // No count over the true empty: the hora already says there is nothing.
        renderSectionHeader={() => (
          <FilterBar
            count={places.length > 0 || selected.size > 0 ? places.length : undefined}
          />
        )}
        // Android's default is off.
        stickySectionHeadersEnabled
        renderItem={({ item }) => (
          <View className="mx-[18px] mb-3">
            <PlaceRow
              place={item}
              fetchedAt={fetchedAt}
              onPress={() => router.push({ pathname: '/place/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        // The footer, not `ListEmptyComponent`: a section's header counts as an
        // item, so a list that still shows its chips is never empty — and the
        // chips are how you get out of the first of these two.
        ListFooterComponent={
          places.length > 0 ? null : selected.size > 0 ? (
            // An empty list means two different things, and telling the user
            // which one saves them wondering where their places went.
            // This one comes with the way out, as the Map's does: the pinned
            // row's Clear is small and up by the chips, and the eye is here.
            <ScreenNotice>
              <Text className="text-[15px] text-ink">{t('filters.noMatch')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={clear}
                className="mt-1 min-h-[44px] justify-center rounded-full border-[1.5px] border-cherry px-6 py-[11px] active:opacity-70"
              >
                <Text className="text-[14px] font-semibold text-cherry">{t('filters.clear')}</Text>
              </Pressable>
            </ScreenNotice>
          ) : (
            <EmptyInvitation />
          )
        }
        // `flexGrow` on both so the empty invitation can centre itself in what's
        // left below the header; a list with rows in it is already taller than this.
        ListFooterComponentStyle={{ flexGrow: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    </SafeAreaView>
  );
}
