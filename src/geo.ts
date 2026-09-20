/**
 * Everything RoSpot needs to answer "how far is that, and what's nearest" —
 * deliberately free of `expo-location` so it stays unit-testable. The hook that
 * asks the device where it is lives in `src/hooks/useOrigin.ts`.
 */

export type Coords = { lat: number; lng: number };

/**
 * A region in `react-native-maps`' own vocabulary, so a caller can pass one
 * straight through instead of unpacking it field by field.
 */
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/**
 * Metro Detroit — downtown, roughly. The soft launch seeds this area, so it is
 * both the fallback when we don't know where the user is and the answer to
 * "show me something" for anyone browsing from elsewhere.
 */
export const DEFAULT_ORIGIN: Coords = { lat: 42.3314, lng: -83.0458 };

const regionAround = (coords: Coords, span: number): Region => ({
  latitude: coords.lat,
  longitude: coords.lng,
  latitudeDelta: span,
  longitudeDelta: span,
});

/** Wide enough to hold the metro area and its suburbs. */
export const DEFAULT_REGION = regionAround(DEFAULT_ORIGIN, 0.6);

/** The closer view the map moves to once it knows where the user is. */
export const nearbyRegion = (coords: Coords): Region => regionAround(coords, 0.25);

/** A few blocks — close enough to tell one building's door from the next. */
export const streetRegion = (coords: Coords): Region => regionAround(coords, 0.005);

const EARTH_RADIUS_MILES = 3958.7613;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance in miles. Miles rather than kilometres because every
 * place in the dataset is in the US, where the road signs are.
 */
export function distanceMiles(from: Coords, to: Coords): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  // Haversine. The `sin(dLng / 2)` term is periodic, so the antimeridian needs
  // no special case: 179.5°E to 179.5°W comes out as 1°, not 359°.
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** A rounded distance, and whether the number is a ceiling rather than the figure. */
export type MilesLabel = { value: number; isBelow: boolean };

/**
 * How precisely to state a distance: one decimal while a tenth of a mile still
 * tells you something, none once the journey is long enough for it to be noise,
 * and a ceiling for anything too close to bother measuring.
 *
 * Only the precision is decided here. The words around the number and the digit
 * grouping inside it belong to the locale — see `units.miles` in `src/i18n`.
 */
export function milesLabel(miles: number): MilesLabel {
  if (miles < 0.1) return { value: 0.1, isBelow: true };
  if (miles < 10) return { value: Math.round(miles * 10) / 10, isBelow: false };
  return { value: Math.round(miles), isBelow: false };
}

/**
 * Every item with its distance from `origin` attached, nearest first.
 *
 * One measurement per item rather than one inside the comparator and another
 * for display, so the number a row shows is provably the number it was ordered
 * on. The input is left untouched.
 */
export function nearestFirst<T extends Coords>(
  items: readonly T[],
  origin: Coords
): (T & { miles: number })[] {
  return items
    .map((item) => ({ ...item, miles: distanceMiles(origin, item) }))
    .sort((a, b) => a.miles - b.miles);
}
