import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePlace } from '../usePlace';

jest.mock('@/data/places', () => ({ fetchPlace: jest.fn() }));

const { fetchPlace } = jest.requireMock('@/data/places') as { fetchPlace: jest.Mock };

const cathedral = {
  id: 'a',
  name: 'Cathedral',
  category: 'historic',
  lat: 42.4576,
  lng: -83.2409,
};

/** A fetch that stays in flight, so what the hook shows can only be the cache. */
const neverResolves = () => new Promise(() => {});

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  // `gcTime: 0` — react-query's default gc timer outlives the test run.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});

afterEach(() => {
  queryClient.clear();
});

describe('usePlace', () => {
  it('fetches the place by id', async () => {
    fetchPlace.mockResolvedValue(cathedral);

    const { result } = await renderHook(() => usePlace('a'), { wrapper });

    await waitFor(() => expect(result.current.place).toEqual(cathedral));
    expect(fetchPlace).toHaveBeenCalledWith('a');
  });

  it('draws immediately from the row the browse query already loaded', async () => {
    // Arriving from the list or the map, the row is in hand before the screen
    // mounts. Waiting on a second round trip for it would be a spinner over
    // something we could already show.
    queryClient.setQueryData(['places', 'approved'], [cathedral]);
    fetchPlace.mockImplementation(neverResolves);

    const { result } = await renderHook(() => usePlace('a'), { wrapper });

    expect(result.current.isPending).toBe(false);
    expect(result.current.place).toEqual(cathedral);
  });

  it('waits when the cached browse rows hold no such place', async () => {
    // A deep link, or a cold start: the cache is warm but not with this id, and
    // seeding from it would draw the wrong place.
    queryClient.setQueryData(['places', 'approved'], [cathedral]);
    fetchPlace.mockImplementation(neverResolves);

    const { result } = await renderHook(() => usePlace('b'), { wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.place).toBeNull();
  });

  it('reports a place the public may not see as no place at all', async () => {
    fetchPlace.mockResolvedValue(null);

    const { result } = await renderHook(() => usePlace('pending'), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.place).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('reports a failed read as an error, not as a missing place', async () => {
    fetchPlace.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => usePlace('a'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.place).toBeNull();
  });
});
