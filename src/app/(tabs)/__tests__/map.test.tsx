import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { DEFAULT_ORIGIN, DEFAULT_REGION, nearbyRegion } from '@/geo';
import type { Origin } from '@/hooks/useOrigin';
import i18n from '@/i18n';
import { CategoryFilterProvider } from '@/state/categoryFilter';

import MapScreen from '../index';

jest.mock('@/data/places', () => ({ fetchApprovedPlaces: jest.fn() }));
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));

// `mock`-prefixed so Jest lets the factory close over it.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockPush = jest.fn();
const mockAnimateToRegion = jest.fn();
let mockMapReadsReady = true;
const mockMapSize = { width: 400, height: 700 };

// `react-native-maps` is a native module with nothing to render under Jest.
// The stand-in keeps the props the screen actually depends on observable.
jest.mock('react-native-maps', () => {
  const { View: RNView } = jest.requireActual('react-native');
  const { useEffect, useImperativeHandle } = jest.requireActual('react');
  // The camera is the one thing the screen drives through the ref.
  const MockMapView = ({ children, ref, ...props }: any) => {
    useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }));
    // A laid-out map that reports ready, as the native one does once its SDK
    // is up — unless a test wants to hold it back and say when.
    useEffect(() => {
      props.onLayout?.({ nativeEvent: { layout: { x: 0, y: 0, ...mockMapSize } } });
      if (mockMapReadsReady) props.onMapReady?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <RNView testID="map" {...props}>
        {children}
      </RNView>
    );
  };
  const MockMarker = ({ children, ...props }: any) => (
    <RNView testID="marker" {...props}>
      {children}
    </RNView>
  );

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    PROVIDER_DEFAULT: 'default',
  };
});

const { fetchApprovedPlaces } = jest.requireMock('@/data/places') as {
  fetchApprovedPlaces: jest.Mock;
};
const { useOrigin } = jest.requireMock('@/hooks/useOrigin') as { useOrigin: jest.Mock };

const cathedral = {
  id: 'a',
  name: 'Cathedral',
  address: 'Southfield MI',
  category: 'historic',
  lat: 42.4576,
  lng: -83.2409,
};
const bakery = {
  id: 'b',
  name: 'Bakery',
  address: 'Detroit MI',
  category: 'food_drink',
  lat: 42.34,
  lng: -83.05,
};

let queryClient: QueryClient;

function wrap(ui: ReactElement) {
  return (
    <QueryClientProvider client={queryClient}>
      <CategoryFilterProvider>{ui}</CategoryFilterProvider>
    </QueryClientProvider>
  );
}

async function renderScreen(ui: ReactElement) {
  return render(wrap(ui));
}

type Fixture = typeof cathedral;

// What a screen reader hears on the card: the place, then where it is.
const cardLabel = (place: Fixture) =>
  `${place.name}, ${i18n.t(`categories.${place.category}`)}, ${place.address}`;

const card = (place: Fixture) => screen.getByRole('button', { name: cardLabel(place) });

// By identifier, not by position: the pins come out nearest-first.
const marker = (id: string) =>
  screen.getAllByTestId('marker').find((pin) => pin.props.identifier === id)!;

/** The rhomb inside a pin's fixed box, under the view that stands it on the box's foot. */
const rhomb = (id: string) => {
  const [stand] = within(marker(id)).getByTestId('pin').children as any[];
  return StyleSheet.flatten(stand.children[0].props.style);
};

async function pressPin(id: string) {
  await screen.findAllByTestId('marker');
  await act(async () => marker(id).props.onPress());
}

beforeEach(async () => {
  jest.clearAllMocks();
  // See the note in useVisiblePlaces.test — the default gc timer outlives the run.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  mockMapReadsReady = true;
  fetchApprovedPlaces.mockResolvedValue([cathedral, bakery]);
  useOrigin.mockReturnValue({
    origin: DEFAULT_ORIGIN,
    isResolved: true,
    isUserLocation: false,
    access: 'ask',
    enableLocation: jest.fn(),
  });
  await i18n.changeLanguage('en');
});

afterEach(() => {
  queryClient.clear();
});

describe('Map tab', () => {
  it('drops one pin per approved place', async () => {
    await renderScreen(<MapScreen />);

    expect(await screen.findAllByTestId('marker')).toHaveLength(2);
  });

  it('asks for the platform-native provider', async () => {
    await renderScreen(<MapScreen />);

    expect((await screen.findByTestId('map')).props.provider).toBe('default');
  });

  it('anchors each pin at the foot of the rhomb, not at its centre', async () => {
    await renderScreen(<MapScreen />);

    const [marker] = await screen.findAllByTestId('marker');
    expect(marker.props.anchor).toEqual({ x: 0.5, y: 1 });
  });

  it("gives each pin its place's id", async () => {
    await renderScreen(<MapScreen />);

    const markers = await screen.findAllByTestId('marker');
    expect(markers.map((marker) => marker.props.identifier).sort()).toEqual([
      cathedral.id,
      bakery.id,
    ].sort());
  });

  it('draws no native callout: the card is what a pin opens', async () => {
    await renderScreen(<MapScreen />);

    for (const marker of await screen.findAllByTestId('marker')) {
      expect(marker.props.title).toBeUndefined();
      expect(marker.props.description).toBeUndefined();
      expect(marker.props.onCalloutPress).toBeUndefined();
    }
  });

  it('selects a place from its pin without moving the camera or leaving the map', async () => {
    await renderScreen(<MapScreen />);

    await pressPin(cathedral.id);

    expect(card(cathedral)).toBeTruthy();
    expect(screen.queryByRole('button', { name: cardLabel(bakery) })).toBeNull();
    // Android recentres on a marker press unless told not to.
    expect(screen.getByTestId('map').props.moveOnMarkerPress).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('grows the selected pin and lifts it over the rest', async () => {
    await renderScreen(<MapScreen />);

    await pressPin(cathedral.id);

    expect(marker(cathedral.id).props.zIndex).toBeGreaterThan(
      marker(bakery.id).props.zIndex ?? 0
    );
    expect(rhomb(cathedral.id)).toMatchObject({ width: 25, height: 25, borderWidth: 3 });
    expect(rhomb(bakery.id)).toMatchObject({ width: 17, height: 17, borderWidth: 2 });
  });

  it('marks the nearest pin as selected before anything is picked', async () => {
    await renderScreen(<MapScreen />);
    await screen.findAllByTestId('marker');

    expect(rhomb(bakery.id)).toMatchObject({ width: 25 });
    expect(rhomb(cathedral.id)).toMatchObject({ width: 17 });
  });

  it('keeps the pin box one size, so the marker image and its foot never move', async () => {
    await renderScreen(<MapScreen />);
    await screen.findAllByTestId('marker');

    const box = (id: string) =>
      StyleSheet.flatten(within(marker(id)).getByTestId('pin').props.style);
    expect(box(bakery.id)).toEqual(box(cathedral.id));
    expect(marker(bakery.id).props.anchor).toEqual(marker(cathedral.id).props.anchor);
  });

  it('mounts a fresh marker when a pin changes size', async () => {
    await renderScreen(<MapScreen />);
    await screen.findAllByTestId('marker');
    const before = { picked: marker(cathedral.id), dropped: marker(bakery.id) };

    await pressPin(cathedral.id);

    // Android snapshots a marker's view once and won't redraw it for a change
    // inside a box that keeps its size; a new marker is a new snapshot.
    expect(marker(cathedral.id)).not.toBe(before.picked);
    expect(marker(bakery.id)).not.toBe(before.dropped);
  });

  it('keeps the selection through an empty-map tap and a pan', async () => {
    await renderScreen(<MapScreen />);
    await pressPin(cathedral.id);

    const map = screen.getByTestId('map');
    await act(async () => {
      map.props.onPress?.({ nativeEvent: { coordinate: { latitude: 42, longitude: -83 } } });
      map.props.onRegionChangeComplete?.({
        latitude: 42,
        longitude: -83,
        latitudeDelta: 1,
        longitudeDelta: 1,
      });
    });

    expect(card(cathedral)).toBeTruthy();
  });

  it('follows the nearest place until a pin is picked', async () => {
    const { rerender } = await renderScreen(<MapScreen />);
    expect(await screen.findByRole('button', { name: cardLabel(bakery) })).toBeTruthy();

    // Location resolves next to the cathedral and the list re-sorts under it.
    useOrigin.mockReturnValue({
      ...DENIED,
      origin: { lat: cathedral.lat, lng: cathedral.lng },
    });
    await rerender(wrap(<MapScreen />));

    expect(card(cathedral)).toBeTruthy();
  });

  it('keeps a picked place through a re-sort', async () => {
    const { rerender } = await renderScreen(<MapScreen />);
    await pressPin(bakery.id);

    useOrigin.mockReturnValue({
      ...DENIED,
      origin: { lat: cathedral.lat, lng: cathedral.lng },
    });
    await rerender(wrap(<MapScreen />));

    // The cathedral is nearest now, but the bakery is the one that was asked for.
    expect(card(bakery)).toBeTruthy();
  });

  it('falls back to the nearest remaining place when a filter removes the pick', async () => {
    await renderScreen(<MapScreen />);
    await pressPin(cathedral.id);

    await userEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
    expect(card(bakery)).toBeTruthy();

    // The pick is forgotten, not parked: lifting the filter doesn't bring it back.
    await userEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
    expect(card(bakery)).toBeTruthy();
  });

  it('falls back to the nearest remaining place when a refresh removes the pick', async () => {
    await renderScreen(<MapScreen />);
    await pressPin(cathedral.id);

    fetchApprovedPlaces.mockResolvedValue([bakery]);
    await act(() => queryClient.refetchQueries());

    expect(card(bakery)).toBeTruthy();
  });

  it('clears the selection and the card when nothing is left', async () => {
    await renderScreen(<MapScreen />);
    await pressPin(cathedral.id);

    await userEvent.press(screen.getByRole('button', { name: 'Services' }));

    expect(screen.queryAllByTestId('marker')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: cardLabel(cathedral) })).toBeNull();
    expect(screen.queryByRole('button', { name: cardLabel(bakery) })).toBeNull();
  });

  it('says what the card is and what it does', async () => {
    await renderScreen(<MapScreen />);

    const button = await screen.findByRole('button', {
      name: 'Bakery, Food & Drink, Detroit MI',
    });
    expect(button.props.accessibilityHint).toBe('Opens place details');
  });

  it('says what the card is and what it does in Romanian', async () => {
    await i18n.changeLanguage('ro');
    await renderScreen(<MapScreen />);

    const button = await screen.findByRole('button', {
      name: 'Bakery, Mâncare și băutură, Detroit MI',
    });
    expect(button.props.accessibilityHint).toBe('Deschide detaliile locului');
  });

  it('opens the picked place from the card', async () => {
    await renderScreen(<MapScreen />);
    await pressPin(cathedral.id);

    await userEvent.press(card(cathedral));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: cathedral.id },
    });
  });

  it('drops the pins the chips filter out', async () => {
    await renderScreen(<MapScreen />);
    expect(await screen.findAllByTestId('marker')).toHaveLength(2);

    // `userEvent.press`, not `fireEvent.press`: under RN 0.86 the latter never
    // reaches a Pressable's handler.
    await userEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));

    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(1);
    expect(markers[0].props.identifier).toBe(bakery.id);
  });

  it('blames the chips only when the chips are what emptied the map', async () => {
    await renderScreen(<MapScreen />);
    await screen.findAllByTestId('marker');

    // Both places are historic/food_drink, so filtering to Services empties it.
    await userEvent.press(screen.getByRole('button', { name: 'Services' }));

    expect(screen.getByText('No places match these filters.')).toBeTruthy();
  });

  it('does not blame the chips for a dataset that is simply empty', async () => {
    fetchApprovedPlaces.mockResolvedValue([]);

    await renderScreen(<MapScreen />);

    expect(await screen.findByText('No places on the map yet.')).toBeTruthy();
    expect(screen.queryByText('No places match these filters.')).toBeNull();
    // Nothing is filtered, so there is nothing to clear.
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('clears a filter that emptied the map in one tap', async () => {
    await renderScreen(<MapScreen />);
    await screen.findAllByTestId('marker');
    await userEvent.press(screen.getByRole('button', { name: 'Services' }));

    await userEvent.press(screen.getByRole('button', { name: 'Clear filters' }));

    expect(screen.getAllByTestId('marker')).toHaveLength(2);
    expect(screen.queryByText('No places match these filters.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Services' })).not.toBeSelected();
  });

  it('offers the clear in Romanian', async () => {
    await i18n.changeLanguage('ro');
    await renderScreen(<MapScreen />);
    await screen.findAllByTestId('marker');
    await userEvent.press(screen.getByRole('button', { name: 'Servicii' }));

    expect(screen.getByRole('button', { name: 'Șterge filtrele' })).toBeTruthy();
  });

  it('keeps the header free of a count, filtered or not', async () => {
    await renderScreen(<MapScreen />);
    await screen.findAllByTestId('marker');
    expect(screen.queryByText(/\d+ places?$/)).toBeNull();

    await userEvent.press(screen.getByRole('button', { name: 'Historic' }));

    expect(screen.queryByText(/\d+ places?$/)).toBeNull();
    // A chip on is no reason for a clear while the map still has pins on it.
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('offers a retry when the places never arrive', async () => {
    fetchApprovedPlaces.mockRejectedValue(new Error('offline'));

    await renderScreen(<MapScreen />);

    expect(await screen.findByText('Places could not be loaded.')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('carries the nearest place at the foot of the map', async () => {
    await renderScreen(<MapScreen />);

    // The bakery is downtown and the cathedral is out in Southfield: the card
    // is the nearest place, not the first one the query happened to return.
    const nearest = await screen.findByRole('button', { name: cardLabel(bakery) });
    expect(within(nearest).getByText(bakery.address)).toBeTruthy();
    expect(screen.queryByRole('button', { name: cardLabel(cathedral) })).toBeNull();
  });

  it('opens the nearest place from its card', async () => {
    await renderScreen(<MapScreen />);

    await userEvent.press(await screen.findByRole('button', { name: cardLabel(bakery) }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: bakery.id },
    });
  });

  it('has no nearest place to show when there are no places', async () => {
    fetchApprovedPlaces.mockResolvedValue([]);

    await renderScreen(<MapScreen />);

    // The notice has the foot of the map to itself.
    expect(await screen.findByText('No places on the map yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: cardLabel(bakery) })).toBeNull();
  });

  it('hides the user dot until the device has actually placed them', async () => {
    await renderScreen(<MapScreen />);

    expect((await screen.findByTestId('map')).props.showsUserLocation).toBe(false);
  });
});

// Somewhere north-west of the fallback, so a frame around the device can't be
// mistaken for one around downtown Detroit.
const DEVICE = { lat: 42.4734, lng: -83.2219 };
const mockEnable = jest.fn();
const LOCATION = { access: 'ask' as Origin['access'], enableLocation: mockEnable };
const FIX = { ...LOCATION, origin: DEVICE, isResolved: true, isUserLocation: true };
const DENIED = { ...LOCATION, origin: DEFAULT_ORIGIN, isResolved: true, isUserLocation: false };
const LOCATING = { ...LOCATION, origin: DEFAULT_ORIGIN, isResolved: false, isUserLocation: false };
// Denied for good: the OS won't prompt again, so the way on is Settings.
const BLOCKED = { ...DENIED, access: 'settings' as const };

// Eight historic places strung north of the device, ~3.5 miles apart, and a
// bakery just south of it — the nearest place of all.
const churches = Array.from({ length: 8 }, (_, i) => ({
  id: `h${i + 1}`,
  name: `Church ${i + 1}`,
  address: `${i + 1} Main St`,
  category: 'historic',
  lat: DEVICE.lat + 0.05 * (i + 1),
  lng: DEVICE.lng,
}));
const corner = {
  id: 'f1',
  name: 'Corner Bakery',
  address: '1 Elm St',
  category: 'food_drink',
  lat: DEVICE.lat - 0.02,
  lng: DEVICE.lng,
};

type Point = { lat: number; lng: number };
type CameraRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const cameraMoves = () => mockAnimateToRegion.mock.calls.map(([region]) => region as CameraRegion);
const lastCamera = () => cameraMoves().at(-1)!;

// Android turns a region into bounds as centre ± half the delta.
const contains = (region: CameraRegion, point: Point) =>
  Math.abs(point.lat - region.latitude) <= region.latitudeDelta / 2 &&
  Math.abs(point.lng - region.longitude) <= region.longitudeDelta / 2;

const framedIds = (region: CameraRegion) =>
  [corner, ...churches].filter((place) => contains(region, place)).map((place) => place.id);

const control = (name: string) => screen.getByRole('button', { name });
const CLOSEST = 'Show the closest places on the map';
const MY_LOCATION = 'Show my location on the map';
const DETROIT = 'Show Metro Detroit on the map';
const ENABLE = 'Turn on location to measure distances from where you are';
const SETTINGS = 'Open settings to turn on location for RoSpot';

// The card and the foot around it as a device lays them out: a card 100 tall,
// the controls and their gap above it.
async function measureFoot() {
  await fireEvent(screen.getByTestId('map-card'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 120, width: 372, height: 100 } },
  });
  await fireEvent(screen.getByTestId('map-foot'), 'layout', {
    nativeEvent: { layout: { x: 14, y: 368, width: 372, height: 220 } },
  });
}

async function settle() {
  // The pins are there once the places are, and the foot is measured after.
  await screen.findAllByTestId('marker');
  await measureFoot();
}

describe('Map framing and controls', () => {
  beforeEach(() => {
    fetchApprovedPlaces.mockResolvedValue([corner, ...churches]);
    useOrigin.mockReturnValue(FIX);
  });

  async function relocate(state: typeof FIX, rerender: (ui: ReactElement) => Promise<void>) {
    useOrigin.mockReturnValue(state);
    await rerender(wrap(<MapScreen />));
  }

  it('opens framed on the nearest five and the device beside them', async () => {
    await renderScreen(<MapScreen />);
    await settle();

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
    expect(framedIds(lastCamera())).toEqual(['f1', 'h1', 'h2', 'h3', 'h4']);
    expect(contains(lastCamera(), DEVICE)).toBe(true);
  });

  it('leaves the device out when the nearest place is more than fifty miles off', async () => {
    // ~100 miles south.
    useOrigin.mockReturnValue({ ...FIX, origin: { lat: DEVICE.lat - 1.45, lng: DEVICE.lng } });
    await renderScreen(<MapScreen />);
    await settle();

    expect(framedIds(lastCamera())).toEqual(['f1', 'h1', 'h2', 'h3', 'h4']);
    expect(contains(lastCamera(), { lat: DEVICE.lat - 1.45, lng: DEVICE.lng })).toBe(false);
  });

  it('zooms to the neighbourhood of a single result', async () => {
    useOrigin.mockReturnValue(DENIED);
    fetchApprovedPlaces.mockResolvedValue([corner]);
    await renderScreen(<MapScreen />);
    await settle();

    expect(lastCamera()).toEqual(nearbyRegion(corner));
  });

  it('moves nothing and offers no Closest places without results', async () => {
    fetchApprovedPlaces.mockResolvedValue([]);
    await renderScreen(<MapScreen />);
    await screen.findByText('No places on the map yet.');

    expect(mockAnimateToRegion).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: CLOSEST })).toBeNull();
  });

  it('waits for the map before framing, and frames once it is ready', async () => {
    mockMapReadsReady = false;
    await renderScreen(<MapScreen />);
    await settle();
    expect(mockAnimateToRegion).not.toHaveBeenCalled();

    await act(async () => screen.getByTestId('map').props.onMapReady());

    expect(framedIds(lastCamera())).toEqual(['f1', 'h1', 'h2', 'h3', 'h4']);
  });

  it('waits for the card to be measured before the opening frame', async () => {
    await renderScreen(<MapScreen />);
    await screen.findAllByTestId('marker');
    // The places are in, but the card they brought hasn't been laid out: a fit
    // now would clear a foot of nothing.
    expect(mockAnimateToRegion).not.toHaveBeenCalled();

    await measureFoot();

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
  });

  it('never frames once Detroit was pressed before the map was ready', async () => {
    mockMapReadsReady = false;
    useOrigin.mockReturnValue(DENIED);
    await renderScreen(<MapScreen />);
    await settle();
    await userEvent.press(control(DETROIT));
    const moves = mockAnimateToRegion.mock.calls.length;

    await act(async () => screen.getByTestId('map').props.onMapReady());

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(moves);
  });

  it('waits for location without an interim move, then frames once', async () => {
    useOrigin.mockReturnValue(LOCATING);
    const { rerender } = await renderScreen(<MapScreen />);
    await settle();
    expect(mockAnimateToRegion).not.toHaveBeenCalled();

    await relocate(FIX, rerender);
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);

    // A later location change is not a reason to move the map again.
    await relocate({ ...FIX, origin: DEFAULT_ORIGIN }, rerender);
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a pan', () => screen.getByTestId('map').props.onPanDrag()],
    [
      'a gesture the map reports',
      () =>
        screen
          .getByTestId('map')
          .props.onRegionChangeStart({ ...DEFAULT_REGION }, { isGesture: true }),
    ],
    ['a pin picked before the fix', () => marker('h7').props.onPress()],
    ['a press on Closest places', () => userEvent.press(control(CLOSEST))],
  ])('never frames on a fix that arrives after %s', async (_, interact) => {
    useOrigin.mockReturnValue(LOCATING);
    const { rerender } = await renderScreen(<MapScreen />);
    await settle();
    await act(async () => {
      await interact();
    });
    const moves = mockAnimateToRegion.mock.calls.length;

    await relocate(FIX, rerender);

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(moves);
  });

  it('keeps the pin picked before the fix selected once the fix arrives', async () => {
    useOrigin.mockReturnValue(LOCATING);
    const { rerender } = await renderScreen(<MapScreen />);
    await pressPin('h7');

    await relocate(FIX, rerender);

    expect(card(churches[6])).toBeTruthy();
  });

  it("doesn't count the camera's own moves as the user's", async () => {
    useOrigin.mockReturnValue(LOCATING);
    const { rerender } = await renderScreen(<MapScreen />);
    await settle();
    await act(async () =>
      screen
        .getByTestId('map')
        .props.onRegionChangeStart({ ...DEFAULT_REGION }, { isGesture: false })
    );

    await relocate(FIX, rerender);

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
  });

  it("doesn't let a press on the disabled location button cancel the framing", async () => {
    useOrigin.mockReturnValue(LOCATING);
    const { rerender } = await renderScreen(<MapScreen />);
    await settle();
    await userEvent.press(control('Finding your location'));

    await relocate(FIX, rerender);

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
  });

  it('never moves the camera for a background refresh', async () => {
    await renderScreen(<MapScreen />);
    await settle();

    fetchApprovedPlaces.mockResolvedValue([...churches]);
    await act(() => queryClient.refetchQueries());

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
  });

  it('reframes on the button, keeping a selection that is among the five', async () => {
    await renderScreen(<MapScreen />);
    await settle();
    await pressPin('h3');
    // The user wandered off.
    await act(async () => screen.getByTestId('map').props.onPanDrag());

    await userEvent.press(control(CLOSEST));

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(2);
    expect(framedIds(lastCamera())).toEqual(['f1', 'h1', 'h2', 'h3', 'h4']);
    expect(card(churches[2])).toBeTruthy();
  });

  it('selects the nearest when the button frames the selection out', async () => {
    await renderScreen(<MapScreen />);
    await pressPin('h8');

    await userEvent.press(control(CLOSEST));

    expect(card(corner)).toBeTruthy();
  });

  it('reframes on a chip and moves the selection to the nearest when it falls outside', async () => {
    await renderScreen(<MapScreen />);
    await settle();
    await userEvent.press(screen.getByRole('button', { name: 'Historic' }));
    // The five nearest churches and not the sixth. The bakery just south of the
    // device may fall inside the frame's clearance; it isn't one of the five.
    expect(framedIds(lastCamera())).toEqual(
      expect.arrayContaining(['h1', 'h2', 'h3', 'h4', 'h5'])
    );
    expect(framedIds(lastCamera())).not.toContain('h6');

    // The eighth-nearest church, then a second chip.
    await pressPin('h8');
    await userEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));

    expect(framedIds(lastCamera())).toEqual(['f1', 'h1', 'h2', 'h3', 'h4']);
    expect(card(corner)).toBeTruthy();
  });

  it('keeps a selection a chip change frames in', async () => {
    await renderScreen(<MapScreen />);
    await pressPin('h2');

    await userEvent.press(screen.getByRole('button', { name: 'Historic' }));

    expect(card(churches[1])).toBeTruthy();
  });

  it('recentres on the device from My location and keeps the selection', async () => {
    await renderScreen(<MapScreen />);
    await pressPin('h8');

    await userEvent.press(control(MY_LOCATION));

    expect(lastCamera()).toEqual(nearbyRegion(DEVICE));
    expect(card(churches[7])).toBeTruthy();
    expect(screen.getByText('My location')).toBeTruthy();
  });

  it('shows the location button busy and disabled until location answers', async () => {
    useOrigin.mockReturnValue(LOCATING);
    await renderScreen(<MapScreen />);
    await settle();

    const button = control('Finding your location');
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    expect(within(button).getByText('My location')).toBeTruthy();
  });

  it('offers Detroit, not "my location", when location is off', async () => {
    useOrigin.mockReturnValue(DENIED);
    await renderScreen(<MapScreen />);
    await settle();

    expect(screen.queryByText('My location')).toBeNull();
    expect(within(control(DETROIT)).getByText('Detroit')).toBeTruthy();

    await userEvent.press(control(DETROIT));
    expect(lastCamera()).toEqual(DEFAULT_REGION);
    expect(screen.getByTestId('map').props.showsUserLocation).toBe(false);
  });

  it('frames around the places alone when location is off', async () => {
    useOrigin.mockReturnValue(DENIED);
    await renderScreen(<MapScreen />);
    await settle();

    // Five nearest to downtown Detroit, which the frame doesn't reach for.
    expect(framedIds(lastCamera())).toEqual(['f1', 'h1', 'h2', 'h3', 'h4']);
    expect(contains(lastCamera(), DEFAULT_ORIGIN)).toBe(false);
  });

  it('names the controls in Romanian', async () => {
    await i18n.changeLanguage('ro');
    useOrigin.mockReturnValue(DENIED);
    await renderScreen(<MapScreen />);
    await settle();

    expect(within(control('Arată pe hartă cele mai apropiate locuri')).getByText('Cele mai apropiate')).toBeTruthy();
    expect(within(control('Arată zona Detroit pe hartă')).getByText('Detroit')).toBeTruthy();
  });

  describe('turning location on from the fallback', () => {
    it('offers it above Detroit, and asks when pressed', async () => {
      useOrigin.mockReturnValue(DENIED);
      await renderScreen(<MapScreen />);
      await settle();

      expect(within(control(ENABLE)).getByText('Use my location')).toBeTruthy();
      const labels = screen
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel)
        .filter((label) => [CLOSEST, ENABLE, DETROIT].includes(label));
      expect(labels).toEqual([CLOSEST, ENABLE, DETROIT]);

      await userEvent.press(control(ENABLE));
      expect(mockEnable).toHaveBeenCalledTimes(1);
    });

    it('says Settings when the OS will no longer ask', async () => {
      useOrigin.mockReturnValue(BLOCKED);
      await renderScreen(<MapScreen />);
      await settle();

      expect(within(control(SETTINGS)).getByText('Location settings')).toBeTruthy();
      await userEvent.press(control(SETTINGS));
      expect(mockEnable).toHaveBeenCalledTimes(1);
    });

    it('is not offered with a fix, or while location is still answering', async () => {
      useOrigin.mockReturnValue(FIX);
      const { rerender } = await renderScreen(<MapScreen />);
      await settle();
      expect(screen.queryByRole('button', { name: ENABLE })).toBeNull();

      await relocate(LOCATING, rerender);
      expect(screen.queryByRole('button', { name: ENABLE })).toBeNull();
    });

    it('shows the user where they are once the fix they asked for arrives', async () => {
      useOrigin.mockReturnValue(DENIED);
      const { rerender } = await renderScreen(<MapScreen />);
      await settle();
      await userEvent.press(control(ENABLE));

      await relocate(LOCATING, rerender);
      await relocate(FIX, rerender);

      expect(lastCamera()).toEqual(nearbyRegion(DEVICE));
    });

    it('leaves the camera alone for a fix nobody asked for here', async () => {
      useOrigin.mockReturnValue(DENIED);
      const { rerender } = await renderScreen(<MapScreen />);
      await settle();
      const moves = mockAnimateToRegion.mock.calls.length;

      await relocate(FIX, rerender);

      expect(mockAnimateToRegion).toHaveBeenCalledTimes(moves);
    });

    it('leaves the camera alone when the user moved the map before the fix', async () => {
      useOrigin.mockReturnValue(DENIED);
      const { rerender } = await renderScreen(<MapScreen />);
      await settle();
      await userEvent.press(control(ENABLE));
      await act(async () => screen.getByTestId('map').props.onPanDrag());
      const moves = mockAnimateToRegion.mock.calls.length;

      await relocate(FIX, rerender);

      expect(mockAnimateToRegion).toHaveBeenCalledTimes(moves);
    });

    it('names it in Romanian', async () => {
      await i18n.changeLanguage('ro');
      useOrigin.mockReturnValue(DENIED);
      const { rerender } = await renderScreen(<MapScreen />);
      await settle();

      expect(
        within(control('Activează localizarea ca distanțele să fie măsurate de unde ești')).getByText(
          'Folosește locația mea'
        )
      ).toBeTruthy();

      await relocate(BLOCKED, rerender);
      expect(
        within(control('Deschide setările ca să activezi localizarea pentru RoSpot')).getByText(
          'Setări localizare'
        )
      ).toBeTruthy();
    });
  });

  it('pads the map for the card alone, and fits clear of the controls too', async () => {
    await renderScreen(<MapScreen />);
    await settle();

    // The card and the gap under it: the Google logo stands just above the card.
    expect(screen.getByTestId('map').props.mapPadding.bottom).toBe(112);

    await userEvent.press(control(CLOSEST));

    // The padded viewport is 700 - 112 tall; the controls take the bottom 120
    // of it. The southernmost point framed has to land above them.
    const region = lastCamera();
    const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const north = mercator(region.latitude + region.latitudeDelta / 2);
    const south = mercator(region.latitude - region.latitudeDelta / 2);
    const viewport = mockMapSize.height - 112;
    const y = ((north - mercator(corner.lat)) / (north - south)) * viewport;
    expect(y).toBeLessThanOrEqual(viewport - 120);
    // …and not by a whole second clearance: counted once, not twice.
    expect(y).toBeGreaterThan(viewport - 120 - 40);
  });
});
