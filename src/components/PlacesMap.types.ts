import type { Coords } from '@/geo';
import type { PlaceWithDistance } from '@/hooks/useVisiblePlaces';

/**
 * Shared by both halves of the platform split so the web stand-in can't drift
 * from the map it stands in for.
 */
export type PlacesMapProps = {
  places: PlaceWithDistance[];
  origin: Coords;
  isUserLocation: boolean;
};
