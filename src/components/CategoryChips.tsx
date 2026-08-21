import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { PlaceCategory } from '@/data/places';
import { CATEGORIES, useCategoryFilter } from '@/state/categoryFilter';
import { categoryColor, colors } from '@/theme';

/**
 * The rhomboid from the list gutter, at chip size. Hollow when the chip is off
 * — the colour code is legible before you commit to it — solid when it's on.
 */
function Rhomboid({ tint, filled }: { tint: string; filled: boolean }) {
  return (
    <View
      className="h-2 w-2 rotate-45"
      style={
        filled
          ? { backgroundColor: tint }
          : { borderWidth: 1, borderColor: tint, backgroundColor: 'transparent' }
      }
    />
  );
}

function Chip({ category }: { category: PlaceCategory }) {
  const { t } = useTranslation();
  const { selected, toggle } = useCategoryFilter();
  const tint = categoryColor[category];
  const isOn = selected.has(category);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isOn }}
      onPress={() => toggle(category)}
      className="flex-row items-center gap-2 rounded-[3px] border px-3 py-2 active:opacity-70"
      style={{
        borderColor: isOn ? tint : colors.line,
        // 0x14 ≈ 8% — enough to read as "on" against the warm surface without
        // competing with the solid rhomboid.
        backgroundColor: isOn ? `${tint}14` : 'transparent',
      }}
    >
      <Rhomboid tint={tint} filled={isOn} />
      <Text
        className="text-[11px] font-semibold uppercase tracking-[1.5px]"
        style={{ color: isOn ? tint : colors.muted }}
      >
        {t(`categories.${category}`)}
      </Text>
    </Pressable>
  );
}

/**
 * One row of chips, shared by the Map and List tabs — they read the same
 * selection, so switching tabs keeps whatever you filtered to. No chip on means
 * everything is shown, which is why there is no "All" chip to get out of sync.
 */
export function CategoryChips() {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      accessibilityLabel={t('filters.label')}
      showsHorizontalScrollIndicator={false}
      // A ScrollView's content container takes plain values, as the navigator
      // options in `theme.ts` do.
      contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 36, paddingVertical: 12 }}
    >
      {CATEGORIES.map((category) => (
        <Chip key={category} category={category} />
      ))}
    </ScrollView>
  );
}
