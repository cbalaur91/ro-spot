import type { Ref } from 'react';

import type { Coords, Region } from '@/geo';
import type { PlaceWithDistance } from '@/hooks/useVisiblePlaces';

/** The camera, as the screen drives it. */
export type PlacesMapHandle = {
  /** Move to a region, centred on what the card leaves visible. */
  show: (region: Region) => void;
  /** Move so every point sits clear of the map's edges and of the whole foot. */
  fit: (points: Coords[]) => void;
};

/**
 * Shared by both halves of the platform split so the web stand-in can't drift
 * from the map it stands in for.
 */
export type PlacesMapProps = {
  ref?: Ref<PlacesMapHandle>;
  places: PlaceWithDistance[];
  isUserLocation: boolean;
  /**
   * How much of the map's foot the card covers, in points — the map's own
   * padding, so its logo stands above the card.
   */
  footInset: number;
  /** How much the whole foot covers, controls included. A fit keeps clear of it. */
  fitInset: number;
  /** The place the card at the map's foot is showing; its pin is drawn larger. */
  selectedId: string | undefined;
  /** A pin was tapped. The screen decides what that selects. */
  onSelect: (id: string) => void;
  /** The map is up and laid out, so it can take camera moves. */
  onReady: () => void;
  /** The user moved the map themselves — a pan, a pinch — not the camera. */
  onGesture: () => void;
};
