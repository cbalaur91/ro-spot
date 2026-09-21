import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { DEFAULT_ORIGIN } from '@/geo';
import i18n from '@/i18n';
import { CategoryFilterProvider } from '@/state/categoryFilter';

import MapScreen from '../index';

jest.mock('@/data/places', () => ({ fetchApprovedPlaces: jest.fn() }));
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));

// `mock`-prefixed so Jest lets the factory close over it.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockPush = jest.fn();
const mockAnimateToRegion = jest.fn();

// `react-native-maps` is a native module with nothing to render under Jest.
// The stand-in keeps the props the screen actually depends on observable.
jest.mock('react-native-maps', () => {
  const { View: RNView } = jest.requireActual('react-native');
  const { useImperativeHandle } = jest.requireActual('react');
  // The camera is the one thing the screen drives through the ref.
  const MockMapView = ({ children, ref, ...props }: any) => {
    useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }));
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
  fetchApprovedPlaces.mockResolvedValue([cathedral, bakery]);
  useOrigin.mockReturnValue({
    origin: DEFAULT_ORIGIN,
    isResolved: true,
    isUserLocation: false,
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
      origin: { lat: cathedral.lat, lng: cathedral.lng },
      isResolved: true,
      isUserLocation: false,
    });
    await rerender(wrap(<MapScreen />));

    expect(card(cathedral)).toBeTruthy();
  });

  it('keeps a picked place through a re-sort', async () => {
    const { rerender } = await renderScreen(<MapScreen />);
    await pressPin(bakery.id);

    useOrigin.mockReturnValue({
      origin: { lat: cathedral.lat, lng: cathedral.lng },
      isResolved: true,
      isUserLocation: false,
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

  it('leaves the camera where it is when a fallback changes the selection', async () => {
    useOrigin.mockReturnValue({
      origin: DEFAULT_ORIGIN,
      isResolved: true,
      isUserLocation: true,
    });
    await renderScreen(<MapScreen />);
    await pressPin(cathedral.id);
    // Once, for the location fix.
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);

    await userEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));

    expect(card(bakery)).toBeTruthy();
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
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
