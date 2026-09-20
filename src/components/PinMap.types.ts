import type { Coords } from '@/geo';

/** Shared by both halves of the platform split, as `PlacesMap.types.ts` is. */
export type PinMapProps = {
  /** Where the pin stands now. */
  coords: Coords;
  /**
   * Whether the pin starts on the address itself. A found address opens at
   * street level, where an entrance can be marked; one that wasn't opens wide,
   * because the pin is standing in for it and has a way to travel.
   */
  found: boolean;
  /** The category's thread, so the pin is the one the map will draw once approved. */
  tint: string;
  onChange: (coords: Coords) => void;
};
