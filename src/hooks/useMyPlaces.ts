import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Place } from '@/data/places';
import { fetchMyPlaces } from '@/data/submissions';
import { useSession } from '@/state/session';

export type MyPlaces = {
  places: Place[];
  /** True only while there is nothing at all to draw. */
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * Everything the signed-in person has submitted, newest first.
 *
 * Keyed by who is signed in, so the next person on this device is not shown the
 * last one's places out of the cache — and not asked for at all while nobody
 * is: the Profile tab draws the invitation then, and an anonymous read would
 * only come back empty.
 */
export function useMyPlaces(): MyPlaces {
  const { user } = useSession();

  const query = useQuery({
    queryKey: ['places', 'mine', user?.id],
    queryFn: fetchMyPlaces,
    enabled: Boolean(user),
  });

  const { refetch } = query;

  return {
    places: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    // Wrapped for the same reason `usePlace` wraps it: `onPress` hands its
    // callback a gesture event, which react-query would read as options.
    refetch: useCallback(() => void refetch(), [refetch]),
  };
}
