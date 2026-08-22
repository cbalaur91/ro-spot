import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchPlace, type Place } from '@/data/places';

export type PlaceDetail = {
  /** Null once we know there is no such place the public may see. */
  place: Place | null;
  /** True only while there is nothing at all to draw. */
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * One place by id, for the detail screen.
 *
 * The row is usually already in the cache — you get here by tapping it in a list
 * or on the map — so the browse query seeds this one and the screen draws
 * immediately, then quietly reconciles with a fresh read. Deep links and cold
 * starts find nothing to seed with and fall back to the spinner.
 */
export function usePlace(id: string): PlaceDetail {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['place', id],
    queryFn: () => fetchPlace(id),
    placeholderData: () =>
      queryClient
        .getQueryData<Place[]>(['places', 'approved'])
        ?.find((place) => place.id === id),
  });

  const { refetch } = query;

  return {
    place: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    // Wrapped for the same reason `useVisiblePlaces` wraps it: `onPress` hands
    // its callback a gesture event, which react-query would read as options.
    refetch: useCallback(() => void refetch(), [refetch]),
  };
}
