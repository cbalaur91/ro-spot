import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceRow } from '@/components/PlaceRow';
import { fetchApprovedPlaces } from '@/data/places';
import { colors } from '@/theme';

function Header() {
  const { t } = useTranslation();

  return (
    <View className="px-9 pb-6 pt-2">
      {/* The wordmark is a name, not copy — it stays the same in both locales. */}
      <Text className="text-[32px] font-bold tracking-tight text-ink">
        <Text className="text-cherry">Ro</Text>Spot
      </Text>
      <Text className="mt-1 text-[13px] text-muted">{t('list.subtitle')}</Text>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="items-center gap-3 px-9 py-16">{children}</View>;
}

export default function ListScreen() {
  const { t } = useTranslation();
  const places = useQuery({
    queryKey: ['places', 'approved'],
    queryFn: fetchApprovedPlaces,
  });

  if (places.isPending || places.isError) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Header />
        {places.isPending ? (
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
              onPress={() => places.refetch()}
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
        data={places.data}
        keyExtractor={(place) => place.id}
        ListHeaderComponent={Header}
        renderItem={({ item }) => <PlaceRow place={item} />}
        ListEmptyComponent={
          <Centered>
            <Text className="text-[15px] text-ink">{t('list.empty')}</Text>
            <Text className="text-[13px] text-muted">{t('list.emptyHint')}</Text>
          </Centered>
        }
        refreshing={places.isRefetching}
        onRefresh={places.refetch}
      />
    </SafeAreaView>
  );
}
