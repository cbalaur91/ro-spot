import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/theme';

/**
 * What a screen shows in place of its content: a short centred column, held to
 * the same gutter as everything else.
 */
export function ScreenNotice({ children }: { children: React.ReactNode }) {
  return <View className="items-center gap-3 px-6 py-16">{children}</View>;
}

export function Loading({ label }: { label: string }) {
  return (
    <ScreenNotice>
      <ActivityIndicator color={colors.cherry} />
      <Text className="text-[13px] text-muted">{label}</Text>
    </ScreenNotice>
  );
}

/**
 * A read that didn't arrive, and the offer to try again.
 *
 * One component rather than one per screen: the List and the detail screen fail
 * for the same reason and can do nothing about it but ask again, so they should
 * not look like two different problems.
 */
export function LoadFailed({ label, onRetry }: { label: string; onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <ScreenNotice>
      <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
      <Text className="text-center text-[15px] text-ink">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="mt-1 rounded-full bg-cherry px-6 py-3 active:opacity-80"
      >
        <Text className="text-[14px] font-semibold text-surface">{t('actions.retry')}</Text>
      </Pressable>
    </ScreenNotice>
  );
}
