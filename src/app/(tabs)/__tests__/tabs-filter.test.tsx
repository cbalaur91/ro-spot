import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { View } from 'react-native';

import { SEEDED_APPROVED_PLACE } from '@/data/fixtures';
import { DEFAULT_ORIGIN } from '@/geo';
import i18n from '@/i18n';
import { CategoryFilterProvider } from '@/state/categoryFilter';

import MapScreen from '../index';
import ListScreen from '../list';

// Both tabs mounted under one provider, as the tab layout mounts them: the tabs
// stay alive side by side, and the chips are one selection above both.

jest.mock('@/data/places', () => ({
  fetchApprovedPlaces: jest.fn(),
  placePhotoUrl: (path: string) => `https://cdn.test/place-photos/${path}`,
}));
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo-image', () => {
  const { Image } = jest.requireActual('react-native');
  return { Image: (props: object) => <Image {...props} /> };
});
jest.mock('react-native-maps', () => {
  const { View: RNView } = jest.requireActual('react-native');
  const { useImperativeHandle } = jest.requireActual('react');
  // The camera is driven through the ref, and nothing here watches it.
  const MockMapView = ({ children, ref, ...props }: any) => {
    useImperativeHandle(ref, () => ({ animateToRegion: () => {} }));
    return <RNView {...props}>{children}</RNView>;
  };
  const MockMarker = ({ children, ...props }: any) => (
    <RNView testID="marker" {...props}>
      {children}
    </RNView>
  );
  return { __esModule: true, default: MockMapView, Marker: MockMarker, PROVIDER_DEFAULT: 'default' };
});

const { fetchApprovedPlaces } = jest.requireMock('@/data/places') as {
  fetchApprovedPlaces: jest.Mock;
};
const { useOrigin } = jest.requireMock('@/hooks/useOrigin') as { useOrigin: jest.Mock };

const place = { ...SEEDED_APPROVED_PLACE, created_at: '2026-08-21T00:00:00Z' };

let queryClient: QueryClient;

beforeEach(async () => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  fetchApprovedPlaces.mockResolvedValue([place]);
  useOrigin.mockReturnValue({ origin: DEFAULT_ORIGIN, isResolved: true, isUserLocation: true });
  await i18n.changeLanguage('en');
});

afterEach(() => {
  queryClient.clear();
});

async function renderTabs() {
  await render(
    <QueryClientProvider client={queryClient}>
      <CategoryFilterProvider>
        <View testID="map-tab">
          <MapScreen />
        </View>
        <View testID="list-tab">
          <ListScreen />
        </View>
      </CategoryFilterProvider>
    </QueryClientProvider>
  );
  await screen.findAllByText(place.name);
  return {
    map: within(screen.getByTestId('map-tab')),
    list: within(screen.getByTestId('list-tab')),
  };
}

describe('Clearing the chips', () => {
  it('clears the List when the Map is cleared', async () => {
    const { map, list } = await renderTabs();
    await userEvent.press(list.getByRole('button', { name: 'Services' }));
    expect(map.getByRole('button', { name: 'Services' })).toBeSelected();

    await userEvent.press(map.getByRole('button', { name: 'Clear filters' }));

    expect(list.getByRole('button', { name: 'Services' })).not.toBeSelected();
    expect(list.getByText(place.name)).toBeTruthy();
    expect(list.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('clears the Map when the List is cleared', async () => {
    const { map, list } = await renderTabs();
    await userEvent.press(map.getByRole('button', { name: 'Services' }));

    // The pinned row's, the first of the List's two.
    await userEvent.press(list.getAllByRole('button', { name: 'Clear filters' })[0]);

    expect(map.getByRole('button', { name: 'Services' })).not.toBeSelected();
    expect(map.getAllByTestId('marker')).toHaveLength(1);
    expect(map.queryByText('No places match these filters.')).toBeNull();
  });
});
