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
  /** How much of the map's foot the screen covers, in points. */
  footInset: number;
  /** The place the card at the map's foot is showing; its pin is drawn larger. */
  selectedId: string | undefined;
  /** A pin was tapped. The screen decides what that selects. */
  onSelect: (id: string) => void;
};
