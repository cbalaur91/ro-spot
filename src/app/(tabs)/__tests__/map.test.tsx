import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { DEFAULT_ORIGIN } from '@/geo';
import i18n from '@/i18n';
import { CategoryFilterProvider } from '@/state/categoryFilter';

import MapScreen from '../index';

jest.mock('@/data/places', () => ({ fetchApprovedPlaces: jest.fn() }));
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));

// `react-native-maps` is a native module with nothing to render under Jest.
// The stand-in keeps the props the screen actually depends on observable.
jest.mock('react-native-maps', () => {
  const { View: RNView } = jest.requireActual('react-native');
  const MockMapView = ({ children, ...props }: any) => (
    <RNView testID="map" {...props}>
      {children}
    </RNView>
  );
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

async function renderScreen(ui: ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CategoryFilterProvider>{ui}</CategoryFilterProvider>
    </QueryClientProvider>
  );
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

  it('anchors each pin at the foot of its stem, not at the rhomboid', async () => {
    await renderScreen(<MapScreen />);

    const [marker] = await screen.findAllByTestId('marker');
    expect(marker.props.anchor).toEqual({ x: 0.5, y: 1 });
  });

  it('names each place on its pin', async () => {
    await renderScreen(<MapScreen />);

    const markers = await screen.findAllByTestId('marker');
    expect(markers.map((marker) => marker.props.title).sort()).toEqual([
      'Bakery',
      'Cathedral',
    ]);
  });

  it('drops the pins the chips filter out', async () => {
    await renderScreen(<MapScreen />);
    expect(await screen.findAllByTestId('marker')).toHaveLength(2);

    // `userEvent.press`, not `fireEvent.press`: under RN 0.86 the latter never
    // reaches a Pressable's handler.
    await userEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));

    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(1);
    expect(markers[0].props.title).toBe('Bakery');
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
  });

  it('offers a retry when the places never arrive', async () => {
    fetchApprovedPlaces.mockRejectedValue(new Error('offline'));

    await renderScreen(<MapScreen />);

    expect(await screen.findByText('Places could not be loaded.')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('hides the user dot until the device has actually placed them', async () => {
    await renderScreen(<MapScreen />);

    expect((await screen.findByTestId('map')).props.showsUserLocation).toBe(false);
  });
});
