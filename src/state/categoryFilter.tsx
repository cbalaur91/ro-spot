import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { PlaceCategory } from '@/data/places';

/** Display order of the chips; also the order the spec names them in. */
export const CATEGORIES: readonly PlaceCategory[] = [
  'historic',
  'food_drink',
  'services',
] as const;

type CategoryFilter = {
  /** Empty means no chip is on, which means everything is shown. */
  selected: ReadonlySet<PlaceCategory>;
  toggle: (category: PlaceCategory) => void;
  /** Every chip off — back to everything, the same empty set the tabs open on. */
  clear: () => void;
  /** The one predicate Map and List both filter with. */
  matches: (category: PlaceCategory) => boolean;
};

const CategoryFilterContext = createContext<CategoryFilter | null>(null);

/**
 * The chips are one selection shared by the Map and List tabs, so switching
 * tabs keeps whatever you filtered to. It lives in the tab layout rather than in
 * either screen because neither owns it.
 */
export function CategoryFilterProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<ReadonlySet<PlaceCategory>>(new Set());

  const toggle = useCallback((category: PlaceCategory) => {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(category)) next.add(category);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const value = useMemo<CategoryFilter>(
    () => ({
      selected,
      toggle,
      clear,
      matches: (category) => selected.size === 0 || selected.has(category),
    }),
    [selected, toggle, clear]
  );

  return (
    <CategoryFilterContext.Provider value={value}>
      {children}
    </CategoryFilterContext.Provider>
  );
}

export function useCategoryFilter(): CategoryFilter {
  const filter = useContext(CategoryFilterContext);

  if (!filter) {
    throw new Error('useCategoryFilter must be used inside a CategoryFilterProvider');
  }

  return filter;
}
