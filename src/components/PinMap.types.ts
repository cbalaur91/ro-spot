import type { Coords } from '@/geo';

/** Shared by both halves of the platform split, as `PlacesMap.types.ts` is. */
export type PinMapProps = {
  /** Where the pin stands now. */
  coords: Coords;
  /** The category's thread, so the pin is the one the map will draw once approved. */
  tint: string;
  onChange: (coords: Coords) => void;
};
