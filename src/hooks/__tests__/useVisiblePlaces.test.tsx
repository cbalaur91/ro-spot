import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { DEFAULT_ORIGIN } from '@/geo';
import { CategoryFilterProvider, useCategoryFilter } from '@/state/categoryFilter';

import { useVisiblePlaces } from '../useVisiblePlaces';

jest.mock('@/data/places', () => ({ fetchApprovedPlaces: jest.fn() }));
jest.mock('../useOrigin', () => ({ useOrigin: jest.fn() }));

const { fetchApprovedPlaces } = jest.requireMock('@/data/places') as {
  fetchApprovedPlaces: jest.Mock;
};
const { useOrigin } = jest.requireMock('../useOrigin') as { useOrigin: jest.Mock };

// Three places at deliberately unalphabetical distances from downtown Detroit,
// so a distance sort and a name sort can't be confused for one another.
const cathedral = { id: 'a', name: 'Cathedral', category: 'historic', lat: 42.4576, lng: -83.2409 };
const bakery = { id: 'b', name: 'Bakery', category: 'food_drink', lat: 42.34, lng: -83.05 };
const notary = { id: 'c', name: 'Notary', category: 'services', lat: 43.5, lng: -84.5 };
const places = [cathedral, bakery, notary];

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CategoryFilterProvider>{children}</CategoryFilterProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // `gcTime: 0` matters beyond tidiness: react-query's default five-minute
  // garbage-collection timer keeps the Node process alive after the last
  // assertion, and Jest sits on it.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  fetchApprovedPlaces.mockResolvedValue(places);
  useOrigin.mockReturnValue({
    origin: DEFAULT_ORIGIN,
    isResolved: true,
    isUserLocation: true,
  });
});

afterEach(() => {
  queryClient.clear();
});

describe('useVisiblePlaces', () => {
  it('sorts by real distance from the origin, not by name', async () => {
    const { result } = await renderHook(() => useVisiblePlaces(), { wrapper });

    await waitFor(() => expect(result.current.places).toHaveLength(3));
    expect(result.current.places.map((place) => place.id)).toEqual(['b', 'a', 'c']);
  });

  it('carries the distance it sorted by, so screens agree with the order', async () => {
    const { result } = await renderHook(() => useVisiblePlaces(), { wrapper });

    await waitFor(() => expect(result.current.places).toHaveLength(3));
    const [nearest] = result.current.places;
    expect(nearest.miles).toBeCloseTo(0.63, 1);
  });

  it('re-sorts when the origin moves from the fallback to the device', async () => {
    // Somewhere north-west: the notary is now the closest of the three.
    useOrigin.mockReturnValue({
      origin: { lat: 43.6, lng: -84.6 },
      isResolved: true,
      isUserLocation: true,
    });

    const { result } = await renderHook(() => useVisiblePlaces(), { wrapper });

    await waitFor(() => expect(result.current.places).toHaveLength(3));
    expect(result.current.places[0].id).toBe('c');
  });

  it('narrows to the selected chips', async () => {
    const { result } = await renderHook(
      () => ({ visible: useVisiblePlaces(), filter: useCategoryFilter() }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.visible.places).toHaveLength(3));

    await act(async () => {
      result.current.filter.toggle('services');
    });
    await waitFor(() => expect(result.current.visible.places).toHaveLength(1));
    expect(result.current.visible.places[0].id).toBe('c');

    await act(async () => {
      result.current.filter.toggle('food_drink');
    });
    await waitFor(() => expect(result.current.visible.places).toHaveLength(2));
    expect(result.current.visible.places.map((place) => place.id)).toEqual(['b', 'c']);
  });

  it('shows everything again when the last chip is switched off', async () => {
    const { result } = await renderHook(
      () => ({ visible: useVisiblePlaces(), filter: useCategoryFilter() }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.visible.places).toHaveLength(3));

    await act(async () => {
      result.current.filter.toggle('services');
    });
    await waitFor(() => expect(result.current.visible.places).toHaveLength(1));

    await act(async () => {
      result.current.filter.toggle('services');
    });
    await waitFor(() => expect(result.current.visible.places).toHaveLength(3));
  });

  it('reports an empty list rather than undefined while loading', async () => {
    fetchApprovedPlaces.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useVisiblePlaces(), { wrapper });

    expect(result.current.places).toEqual([]);
    expect(result.current.isPending).toBe(true);
  });

  it('surfaces a failed load so the screen can offer a retry', async () => {
    fetchApprovedPlaces.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useVisiblePlaces(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.places).toEqual([]);
  });
});
