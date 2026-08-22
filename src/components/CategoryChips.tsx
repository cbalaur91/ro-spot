import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text } from 'react-native';

import type { PlaceCategory } from '@/data/places';
import { Diamond } from '@/motifs/Diamond';
import { CATEGORIES, useCategoryFilter } from '@/state/categoryFilter';
import { categoryColor, colors } from '@/theme';

/**
 * A chip is a pill. Off, it is a hairline outline with its label in the
 * category's own thread, so the colour code is legible before you commit to it;
 * on, it fills with cherry and takes a small surface diamond, so the filter that
 * is doing something never looks like the ones that aren't.
 */
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
      className="flex-row items-center gap-1.5 rounded-full border px-[13px] py-1.5 active:opacity-70"
      style={{
        borderColor: isOn ? colors.cherry : colors.line,
        backgroundColor: isOn ? colors.cherry : 'transparent',
      }}
    >
      {isOn ? <Diamond size={6} tint={colors.surface} /> : null}
      <Text
        className={isOn ? 'text-[12px] font-semibold' : 'text-[12px] font-medium'}
        style={{ color: isOn ? colors.surface : tint }}
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
      contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingVertical: 12 }}
    >
      {CATEGORIES.map((category) => (
        <Chip key={category} category={category} />
      ))}
    </ScrollView>
  );
}
