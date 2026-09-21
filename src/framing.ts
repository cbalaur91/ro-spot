/**
 * Where the Map points its camera when it frames "what's close" — on first load,
 * when the chips change, and from the Closest places control. Pure, like
 * `geo.ts`, so the rule can be tested without a map.
 */

import { nearbyRegion, type Coords, type Region } from './geo';

/** How many of the nearest places a framing fits. */
export const CLOSEST_COUNT = 5;

/**
 * How near the nearest place has to be before the user's own position joins the
 * fit. Past this, fitting both would frame a state's worth of empty map with a
 * dot at one end.
 */
export const WITH_USER_MILES = 50;

export type Framing = {
  /** The places framed, nearest first — the selection is kept only if it's one of them. */
  ids: string[];
  /** Fit these points, or show this region. */
  camera: { fit: Coords[] } | { region: Region };
};

/**
 * The nearest places, and whether the user stands in the frame with them.
 *
 * `places` must already be nearest-first from `origin`. The origin joins the fit
 * only when it is the device's own fix — the Detroit fallback is where distances
 * are measured from, not where anybody is, and framing it would say otherwise.
 */
export function closestFraming(
  places: readonly (Coords & { id: string; miles: number })[],
  origin: Coords,
  isUserLocation: boolean
): Framing | null {
  const closest = places.slice(0, CLOSEST_COUNT);
  if (closest.length === 0) return null;

  const withUser = isUserLocation && closest[0].miles <= WITH_USER_MILES;
  const ids = closest.map((place) => place.id);

  // One point has no extent to fit; the neighbourhood around it is what the map
  // shows a single place in everywhere else.
  if (closest.length === 1 && !withUser) {
    return { ids, camera: { region: nearbyRegion(closest[0]) } };
  }

  const points = closest.map(({ lat, lng }) => ({ lat, lng }));
  return { ids, camera: { fit: withUser ? [origin, ...points] : points } };
}

export type Size = { width: number; height: number };
export type Insets = { top: number; right: number; bottom: number; left: number };

// The narrowest the map will fit to: two places in one building shouldn't zoom
// it past the street they're on.
const MIN_LONGITUDE_DELTA = 0.01;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;
// Web Mercator, the projection both map SDKs draw in: x is linear in longitude,
// y stretches with latitude.
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + toRadians(lat) / 2));
const latitudeOf = (y: number) => toDegrees(2 * Math.atan(Math.exp(y)) - Math.PI / 2);

/**
 * A region that, filling `viewport`, shows every point inside `insets`.
 *
 * `fitToCoordinates` would do this, but on Android its edge padding is added to
 * the map's own padding and left there, which lifts the Google logo and shifts
 * every later camera move. A region the same shape as the viewport, handed to
 * `animateToRegion`, fits exactly and leaves the padding alone.
 */
export function fitRegion(points: readonly Coords[], viewport: Size, insets: Insets): Region {
  const xs = points.map((point) => toRadians(point.lng));
  const ys = points.map((point) => mercatorY(point.lat));
  const [west, east] = [Math.min(...xs), Math.max(...xs)];
  const [south, north] = [Math.min(...ys), Math.max(...ys)];

  const inner = {
    width: Math.max(1, viewport.width - insets.left - insets.right),
    height: Math.max(1, viewport.height - insets.top - insets.bottom),
  };
  // Radians per point: whichever axis needs more of them sets the zoom.
  const scale = Math.max(
    (east - west) / inner.width,
    (north - south) / inner.height,
    toRadians(MIN_LONGITUDE_DELTA) / viewport.width
  );

  // The points' centre sits at the centre of the inset box, which is off the
  // viewport's centre by half the difference between opposite insets.
  const x = (west + east) / 2 + ((insets.right - insets.left) / 2) * scale;
  const y = (south + north) / 2 + ((insets.top - insets.bottom) / 2) * scale;
  const top = latitudeOf(y + (viewport.height / 2) * scale);
  const bottom = latitudeOf(y - (viewport.height / 2) * scale);

  return {
    latitude: (top + bottom) / 2,
    longitude: toDegrees(x),
    latitudeDelta: top - bottom,
    longitudeDelta: toDegrees(viewport.width * scale),
  };
}
