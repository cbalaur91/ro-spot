import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { StarBand } from '@/motifs/Band';
import type { DraftProblem } from '@/submission';
import { colors } from '@/theme';

/*
 * The form parts every writing screen shares — the Add tab and the edit screen
 * through `PlaceEditor`, and the report screen directly. Apart from the editor
 * so that a screen with one text field doesn't import a map to get it.
 */

/** The page header every step keeps, and the band under it. */
export function FormHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle: string;
  back?: { label: string; onPress: () => void };
}) {
  return (
    <>
      <View className="flex-row items-center px-6 pb-3 pt-2">
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={back.label}
            onPress={back.onPress}
            // 11 around a 22px icon is the 44 target; the negative margin keeps
            // the chevron's ink, not its padding, on the gutter.
            className="-ml-[11px] p-[11px] active:opacity-70"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-[24px] font-bold tracking-[-0.4px] text-ink">{title}</Text>
          <Text className="text-[12.5px] text-muted" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
      <StarBand height={14} />
    </>
  );
}

/**
 * A label over a control, and under it whatever is wrong with what's in it.
 *
 * The label is drawn in the form-label mark. Over a text input it is hidden from
 * screen readers — the input carries the same words as its own accessible name,
 * and a field announced twice is worse than once. Over a group (the chips, the
 * photo tiles) nothing else says what the group is, so there it is `spoken`.
 */
export function Field({
  label,
  suffix,
  problem,
  hint,
  spoken = false,
  children,
}: {
  label: string;
  spoken?: boolean;
  suffix?: string;
  problem?: DraftProblem;
  hint?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-1.5">
      <Text
        accessibilityElementsHidden={!spoken}
        importantForAccessibility={spoken ? 'auto' : 'no'}
        // Sentence-case for the reader; the class uppercases only what is drawn.
        accessibilityLabel={suffix ? `${label}, ${suffix}` : label}
        className="text-[11px] font-semibold uppercase tracking-[0.8px] text-ink"
      >
        {label}
        {suffix ? (
          <Text className="font-normal normal-case tracking-normal text-muted">{` · ${suffix}`}</Text>
        ) : null}
      </Text>
      {children}
      {problem ? (
        <Text accessibilityLiveRegion="polite" className="text-[11.5px] text-cherry">
          {t(`add.problems.${problem}`)}
        </Text>
      ) : hint ? (
        <Text className="text-[11.5px] text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

/** The 10px-radius white input, as on the sign-in screen. */
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      className="rounded-[10px] border border-line bg-card px-[13px] py-[11px] text-[13.5px] text-ink"
      {...props}
    />
  );
}

/** The pill that closes a step, busy while its step is in flight. */
export function PrimaryPill({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      className="items-center rounded-full bg-cherry py-3 active:opacity-80"
    >
      {busy ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <Text className="text-[14px] font-semibold text-surface">{label}</Text>
      )}
    </Pressable>
  );
}
