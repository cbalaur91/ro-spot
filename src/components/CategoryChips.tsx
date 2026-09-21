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
 *
 * What "on" means is the caller's: the filter row turns several on, the Add
 * form's category field exactly one.
 */
export function CategoryChip({
  category,
  isOn,
  onPress,
}: {
  category: PlaceCategory;
  isOn: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const tint = categoryColor[category];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isOn }}
      onPress={onPress}
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

/** The chip as a filter: several may be on, and the Map and List share which. */
function FilterChip({ category }: { category: PlaceCategory }) {
  const { selected, toggle } = useCategoryFilter();

  return (
    <CategoryChip
      category={category}
      isOn={selected.has(category)}
      onPress={() => toggle(category)}
    />
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
        <FilterChip key={category} category={category} />
      ))}
    </ScrollView>
  );
}

/**
 * Every chip off in one tap, for a filter that has emptied the screen or that
 * the user is done with. Bare cherry text rather than a chip: it is not a
 * filter, and a pill beside the chips would read as a fourth one. The height is
 * the 44 a thumb needs; the label is what a screen reader hears.
 */
export function ClearFilters({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[44px] justify-center active:opacity-60"
    >
      <Text className="text-[13px] font-semibold text-cherry">{t('filters.clear')}</Text>
    </Pressable>
  );
}
