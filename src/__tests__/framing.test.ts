import { closestFraming, fitRegion } from '../framing';
import { DEFAULT_ORIGIN, distanceMiles, nearbyRegion, nearestFirst } from '../geo';

const DEVICE = { lat: 42.4576, lng: -83.2409 };

// Places strung out north of the device, one every ~7 miles.
const places = (count: number, from = DEVICE) =>
  nearestFirst(
    Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      lat: from.lat + 0.1 * (i + 1),
      lng: from.lng,
    })),
    from
  );

// A point `miles` due north of `from` — a degree of latitude is ~69.05 miles.
const northOf = (from: { lat: number; lng: number }, miles: number) => ({
  lat: from.lat + miles / 69.05,
  lng: from.lng,
});

describe('closestFraming', () => {
  it('fits the nearest five and says which they are', () => {
    const framing = closestFraming(places(8), DEVICE, false);

    expect(framing?.ids).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
    expect(framing?.camera).toEqual({
      fit: places(5).map(({ lat, lng }) => ({ lat, lng })),
    });
  });

  it('fits every place when there are fewer than five', () => {
    expect(closestFraming(places(3), DEVICE, false)?.ids).toEqual(['p0', 'p1', 'p2']);
  });

  it('has nothing to frame without places', () => {
    expect(closestFraming([], DEVICE, true)).toBeNull();
  });

  it('includes the device when the nearest place is close enough', () => {
    const framing = closestFraming(places(2), DEVICE, true);

    expect(framing?.camera).toEqual({
      fit: [DEVICE, ...places(2).map(({ lat, lng }) => ({ lat, lng }))],
    });
  });

  it('never includes the Detroit fallback', () => {
    const framing = closestFraming(places(2, DEFAULT_ORIGIN), DEFAULT_ORIGIN, false);

    expect(framing?.camera).toEqual({
      fit: places(2, DEFAULT_ORIGIN).map(({ lat, lng }) => ({ lat, lng })),
    });
  });

  it('includes the device at exactly fifty miles, and not just past it', () => {
    const at = (miles: number) =>
      nearestFirst([{ id: 'far', ...northOf(DEVICE, miles) }], DEVICE).map((place) => ({
        ...place,
        // Pin the measured distance, so the test is about the boundary rather
        // than about how many decimals of a degree make fifty miles.
        miles,
      }));

    expect(closestFraming(at(50), DEVICE, true)?.camera).toEqual({
      fit: [DEVICE, northOf(DEVICE, 50)],
    });
    expect(closestFraming(at(50.01), DEVICE, true)?.camera).toEqual({
      region: nearbyRegion(northOf(DEVICE, 50.01)),
    });
  });

  it('zooms to the neighbourhood around a single place with no device beside it', () => {
    const [only] = places(1);

    expect(closestFraming([only], DEVICE, false)).toEqual({
      ids: ['p0'],
      camera: { region: nearbyRegion(only) },
    });
  });

  it('fits a single place together with the device', () => {
    const [only] = places(1);

    expect(closestFraming([only], DEVICE, true)?.camera).toEqual({
      fit: [DEVICE, { lat: only.lat, lng: only.lng }],
    });
  });
});

describe('fitRegion', () => {
  const viewport = { width: 400, height: 600 };
  const insets = { top: 50, right: 30, bottom: 150, left: 30 };

  // Where a coordinate lands in the viewport once the region fills it — the
  // map's own projection, Web Mercator, which is what Google fits bounds in.
  const mercator = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  function project(
    region: ReturnType<typeof fitRegion>,
    point: { lat: number; lng: number }
  ) {
    const north = mercator(region.latitude + region.latitudeDelta / 2);
    const south = mercator(region.latitude - region.latitudeDelta / 2);
    const west = region.longitude - region.longitudeDelta / 2;
    return {
      x: ((point.lng - west) / region.longitudeDelta) * viewport.width,
      y: ((north - mercator(point.lat)) / (north - south)) * viewport.height,
    };
  }

  const points = [DEVICE, northOf(DEVICE, 20), { lat: DEVICE.lat + 0.1, lng: -83.6 }];

  it('keeps every point inside the insets', () => {
    const region = fitRegion(points, viewport, insets);

    for (const point of points) {
      const { x, y } = project(region, point);
      expect(x).toBeGreaterThanOrEqual(insets.left - 0.5);
      expect(x).toBeLessThanOrEqual(viewport.width - insets.right + 0.5);
      expect(y).toBeGreaterThanOrEqual(insets.top - 0.5);
      expect(y).toBeLessThanOrEqual(viewport.height - insets.bottom + 0.5);
    }
  });

  it('is as tight as the insets allow on the constraining side', () => {
    const region = fitRegion(points, viewport, insets);
    const ys = points.map((point) => project(region, point).y);
    const xs = points.map((point) => project(region, point).x);

    const tightY =
      Math.abs(Math.min(...ys) - insets.top) < 0.5 &&
      Math.abs(Math.max(...ys) - (viewport.height - insets.bottom)) < 0.5;
    const tightX =
      Math.abs(Math.min(...xs) - insets.left) < 0.5 &&
      Math.abs(Math.max(...xs) - (viewport.width - insets.right)) < 0.5;
    expect(tightX || tightY).toBe(true);
  });

  it('matches the viewport shape, so fitting the region adds no slack of its own', () => {
    const region = fitRegion(points, viewport, insets);
    const north = mercator(region.latitude + region.latitudeDelta / 2);
    const south = mercator(region.latitude - region.latitudeDelta / 2);
    const lngSpan = (region.longitudeDelta * Math.PI) / 180;

    expect((north - south) / lngSpan).toBeCloseTo(viewport.height / viewport.width, 6);
  });

  it('stops zooming in on points that sit on top of each other', () => {
    const region = fitRegion([DEVICE, DEVICE], viewport, insets);

    expect(region.longitudeDelta).toBeGreaterThan(0.005);
    expect(project(region, DEVICE).x).toBeCloseTo(
      insets.left + (viewport.width - insets.left - insets.right) / 2,
      3
    );
  });

  it('stays sane for points far apart', () => {
    const cleveland = { lat: 41.4993, lng: -81.6944 };
    expect(distanceMiles(DEVICE, cleveland)).toBeGreaterThan(100);

    const region = fitRegion([DEVICE, cleveland], viewport, insets);
    const { x } = project(region, cleveland);
    expect(x).toBeLessThanOrEqual(viewport.width - insets.right + 0.5);
  });
});
