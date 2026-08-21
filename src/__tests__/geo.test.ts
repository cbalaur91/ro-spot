import { DEFAULT_ORIGIN, distanceMiles, milesLabel, nearestFirst } from '../geo';

// Southfield MI (the seeded cathedral) and Cleveland OH. 103.4 miles as the crow
// flies — cross-checked against an independent haversine, not read off the
// implementation.
const SOUTHFIELD = { lat: 42.4576, lng: -83.2409 };
const CLEVELAND = { lat: 41.4993, lng: -81.6944 };

describe('distanceMiles', () => {
  it('measures a known city pair', () => {
    expect(distanceMiles(SOUTHFIELD, CLEVELAND)).toBeCloseTo(103.4, 1);
  });

  it('is zero for a point against itself', () => {
    expect(distanceMiles(SOUTHFIELD, SOUTHFIELD)).toBe(0);
  });

  it('is symmetric', () => {
    expect(distanceMiles(SOUTHFIELD, CLEVELAND)).toBeCloseTo(
      distanceMiles(CLEVELAND, SOUTHFIELD),
      6
    );
  });

  it('handles the antimeridian without going the long way round', () => {
    // 1° of longitude at the equator is ~69 miles, whichever side of ±180 it is.
    expect(distanceMiles({ lat: 0, lng: 179.5 }, { lat: 0, lng: -179.5 })).toBeCloseTo(
      69,
      0
    );
  });
});

describe('milesLabel', () => {
  it('keeps one decimal while the number is small enough to need it', () => {
    expect(milesLabel(0.42)).toEqual({ value: 0.4, isBelow: false });
    expect(milesLabel(9.94)).toEqual({ value: 9.9, isBelow: false });
  });

  it('drops the decimal once it stops carrying information', () => {
    expect(milesLabel(10.4)).toEqual({ value: 10, isBelow: false });
    expect(milesLabel(93.44)).toEqual({ value: 93, isBelow: false });
  });

  it('never claims a distance of zero for somewhere you still have to walk to', () => {
    expect(milesLabel(0.02)).toEqual({ value: 0.1, isBelow: true });
  });

  it('returns a number, leaving the decimal separator to the locale', () => {
    expect(typeof milesLabel(0.42).value).toBe('number');
  });
});

describe('nearestFirst', () => {
  const near = { id: 'near', lat: 42.46, lng: -83.24 };
  const far = { id: 'far', lat: 41.5, lng: -81.69 };
  const middle = { id: 'middle', lat: 42.0, lng: -82.5 };

  it('orders nearest first from the given origin', () => {
    const sorted = nearestFirst([far, near, middle], SOUTHFIELD);

    expect(sorted.map((place) => place.id)).toEqual(['near', 'middle', 'far']);
  });

  it('attaches the distance it ordered by', () => {
    const [first] = nearestFirst([far, near], SOUTHFIELD);

    expect(first.miles).toBeCloseTo(distanceMiles(SOUTHFIELD, near), 6);
  });

  it('leaves the input array untouched', () => {
    const places = [far, near];
    nearestFirst(places, SOUTHFIELD);

    expect(places.map((place) => place.id)).toEqual(['far', 'near']);
  });

  it('measures against Metro Detroit when that is the origin in play', () => {
    const [first] = nearestFirst([far, near], DEFAULT_ORIGIN);

    expect(first.id).toBe('near');
  });
});
