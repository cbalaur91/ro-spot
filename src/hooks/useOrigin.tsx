import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { DEFAULT_ORIGIN, type Coords } from '@/geo';

type Position = {
  /** Where distances are measured from — the device, or Metro Detroit. */
  origin: Coords;
  /** True once the device answered; false while the prompt is still up. */
  isResolved: boolean;
  /** False when we're using the fallback, so screens can say so. */
  isUserLocation: boolean;
  /**
   * What `enableLocation` will do from the fallback: ask again (or retry a
   * failed fix), or open Settings, because the OS no longer shows the prompt —
   * Android after repeated denials, iOS after the first.
   */
  access: 'ask' | 'settings';
};

export type Origin = Position & {
  /** The user asking for their location after all. Does nothing useful once there's a fix. */
  enableLocation: () => void;
};

const OriginContext = createContext<Origin | null>(null);

/**
 * How long a fix gets before the answer is "no fix". The OS call has no timeout
 * of its own, and one that never settles would leave a retry spinning forever.
 */
export const FIX_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Location timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * One answer from the device: the fix, or why there isn't one. `ask` shows the
 * prompt; without it, this only reads what the OS already knows.
 */
async function readLocation(
  ask: boolean
): Promise<{ access: Position['access']; origin?: Coords }> {
  try {
    const permission = ask
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    if (!permission.granted) return { access: permission.canAskAgain ? 'ask' : 'settings' };

    // Granted, with the device's location switched off, is the common way a
    // fix fails. Android can offer to switch it on in place — only when the
    // user asked, never as a surprise on the way back into the app.
    if (ask && Platform.OS === 'android' && !(await Location.hasServicesEnabledAsync())) {
      await Location.enableNetworkProviderAsync();
    }

    const { coords } = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      FIX_TIMEOUT_MS
    );
    return { access: 'ask', origin: { lat: coords.latitude, lng: coords.longitude } };
  } catch {
    // A radio left off, a device that never gets a fix — the same answer as a
    // denial: keep the fallback and let people browse. Asking again is still
    // the way out.
    return { access: 'ask' };
  }
}

/**
 * Asks for foreground location and reports where to measure from, for the
 * whole app — so a user who turns location on from the Map finds the List,
 * the details and the editor measuring from them too.
 *
 * Browsing never waits on this and never fails because of it: the fallback
 * origin is there from the first render, and a denial or a dead GPS just
 * leaves it in place. `isUserLocation` is what a screen checks before promising
 * the user that "nearest" means nearest to *them*; `enableLocation` is how the
 * user gets out of the fallback without restarting the app. Until there is a
 * fix, coming back to the app re-checks, silently, so a permission granted in
 * Settings takes effect on return. (Taking it away kills the app on both
 * platforms, so a fix never outlives the permission.)
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<Position>({
    origin: DEFAULT_ORIGIN,
    isResolved: false,
    isUserLocation: false,
    access: 'ask',
  });
  // One question at a time: Android backgrounds the app behind its own prompt,
  // and the return from that must not start a second one alongside it. A press
  // that lands mid-question is kept, not dropped — it runs when that one ends.
  const busy = useRef(false);
  const askQueued = useRef(false);
  const active = useRef(true);
  const hasFix = useRef(false);

  const locate = useCallback((ask: boolean) => {
    function run(ask: boolean) {
      if (busy.current) {
        if (ask) askQueued.current = true;
        return;
      }
      busy.current = true;

      void readLocation(ask).then(({ access, origin }) => {
        busy.current = false;
        if (!active.current) return;

        const queued = askQueued.current;
        askQueued.current = false;
        if (queued && !origin) {
          run(true);
          return;
        }

        if (origin) hasFix.current = true;
        setPosition((current) =>
          origin
            ? { origin, isResolved: true, isUserLocation: true, access }
            : { ...current, isResolved: true, access }
        );
      });
    }

    run(ask);
  }, []);

  useEffect(() => {
    active.current = true;
    locate(true);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !hasFix.current) locate(false);
    });

    return () => {
      active.current = false;
      subscription.remove();
    };
  }, [locate]);

  const enableLocation = useCallback(() => {
    if (position.access === 'settings') {
      // The way back is the foreground check above.
      void Linking.openSettings();
      return;
    }
    setPosition((current) => ({ ...current, isResolved: false }));
    locate(true);
  }, [locate, position.access]);

  const value = useMemo(() => ({ ...position, enableLocation }), [position, enableLocation]);

  return <OriginContext.Provider value={value}>{children}</OriginContext.Provider>;
}

export function useOrigin(): Origin {
  const origin = useContext(OriginContext);

  if (!origin) {
    throw new Error('useOrigin must be used inside a LocationProvider');
  }

  return origin;
}
