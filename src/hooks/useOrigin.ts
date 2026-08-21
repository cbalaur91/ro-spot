import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { DEFAULT_ORIGIN, type Coords } from '@/geo';

export type Origin = {
  /** Where distances are measured from — the device, or Metro Detroit. */
  origin: Coords;
  /** True once the device answered; false while the prompt is still up. */
  isResolved: boolean;
  /** False when we're using the fallback, so screens can say so. */
  isUserLocation: boolean;
};

/**
 * Asks once for foreground location and reports where to measure from.
 *
 * Browsing never waits on this and never fails because of it: the fallback
 * origin is returned from the first render, and a denial or a dead GPS just
 * leaves it in place. `isUserLocation` is what a screen checks before promising
 * the user that "nearest" means nearest to *them*.
 */
export function useOrigin(): Origin {
  const [state, setState] = useState<Origin>({
    origin: DEFAULT_ORIGIN,
    isResolved: false,
    isUserLocation: false,
  });

  useEffect(() => {
    let active = true;

    async function locate() {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!granted) return;

        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active) return;

        setState({
          origin: { lat: coords.latitude, lng: coords.longitude },
          isResolved: true,
          isUserLocation: true,
        });
      } catch {
        // A denied prompt, an off radio, a device that never gets a fix — all
        // the same answer here: keep the fallback and let people browse.
      } finally {
        if (active) setState((current) => ({ ...current, isResolved: true }));
      }
    }

    void locate();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
