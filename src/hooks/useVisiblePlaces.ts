import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { fetchApprovedPlaces, type Place } from '@/data/places';
import { nearestFirst, type Coords } from '@/geo';
import { useCategoryFilter } from '@/state/categoryFilter';

import { useOrigin, type Origin } from './useOrigin';

/** A place with the distance the list was ordered by already worked out. */
export type PlaceWithDistance = Place & { miles: number };

export type VisiblePlaces = {
  places: PlaceWithDistance[];
  origin: Coords;
  /** False until the device has answered the permission prompt one way or another. */
  isResolved: boolean;
  /** False while distances are measured from the fallback, not the device. */
  isUserLocation: boolean;
  /** How the user gets out of the fallback — see `useOrigin`. */
  access: Origin['access'];
  enableLocation: () => void;
  isPending: boolean;
  isError: boolean;
  isRefetching: boolean;
  /** When the rows last arrived. Changes with every refetch, which is what a row can retry on. */
  fetchedAt: number;
  refetch: () => void;
};

/**
 * What the Map and List tabs both render: approved places, narrowed to the
 * selected chips, nearest first.
 *
 * Having one hook rather than two queries is what makes the tabs agree —
 * they can't drift apart because there is only one answer, and react-query
 * hands both of them the same cached rows.
 */
export function useVisiblePlaces(): VisiblePlaces {
  const { origin, isResolved, isUserLocation, access, enableLocation } = useOrigin();
  const { matches } = useCategoryFilter();

  const query = useQuery({
    queryKey: ['places', 'approved'],
    queryFn: fetchApprovedPlaces,
  });

  const rows = query.data;
  const places = useMemo(
    () => nearestFirst((rows ?? []).filter((place) => matches(place.category)), origin),
    [rows, matches, origin]
  );

  const { refetch } = query;

  return {
    places,
    origin,
    isResolved,
    isUserLocation,
    access,
    enableLocation,
    isPending: query.isPending,
    isError: query.isError,
    isRefetching: query.isRefetching,
    fetchedAt: query.dataUpdatedAt,
    // Wrapped, not passed through: `onPress` and `onRefresh` both hand their
    // callback an argument, and react-query would read a gesture event as its
    // `RefetchOptions`.
    refetch: useCallback(() => void refetch(), [refetch]),
  };
}
