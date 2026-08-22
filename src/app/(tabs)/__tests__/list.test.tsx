import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { SEEDED_APPROVED_PLACE } from '@/data/fixtures';
import { DEFAULT_ORIGIN } from '@/geo';
import i18n from '@/i18n';
import { CategoryFilterProvider } from '@/state/categoryFilter';

import ListScreen from '../list';

jest.mock('@/data/places', () => ({ fetchApprovedPlaces: jest.fn() }));
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));

// `mock`-prefixed so Jest lets the factory close over it.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockPush = jest.fn();

const { fetchApprovedPlaces } = jest.requireMock('@/data/places') as {
  fetchApprovedPlaces: jest.Mock;
};
const { useOrigin } = jest.requireMock('@/hooks/useOrigin') as { useOrigin: jest.Mock };

const seededPlace = { ...SEEDED_APPROVED_PLACE, created_at: '2026-08-21T00:00:00Z' };

// Near, then far, in the order the query returns them — so passing the ordering
// assertion takes an actual sort, not luck.
const bakery = {
  ...seededPlace,
  id: 'bakery',
  name: 'Cofetăria Bucur',
  address: '100 Woodward Ave, Detroit, MI',
  category: 'food_drink' as const,
  lat: 42.34,
  lng: -83.05,
};
const notary = {
  ...seededPlace,
  id: 'notary',
  name: 'Notariat Român',
  address: '1 Main St, Midland, MI',
  category: 'services' as const,
  lat: 43.5,
  lng: -84.5,
};

let queryClient: QueryClient;

// `render` is async in @testing-library/react-native 14.
async function renderScreen(ui: ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CategoryFilterProvider>{ui}</CategoryFilterProvider>
    </QueryClientProvider>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  // `gcTime: 0` — react-query's default gc timer outlives the test run and Jest
  // waits on it.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  useOrigin.mockReturnValue({
    origin: DEFAULT_ORIGIN,
    isResolved: true,
    isUserLocation: true,
  });
  await i18n.changeLanguage('en');
});

afterEach(() => {
  queryClient.clear();
});

describe('List tab', () => {
  it('renders an approved place from the data module', async () => {
    fetchApprovedPlaces.mockResolvedValue([seededPlace]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText(seededPlace.name)).toBeTruthy();
    expect(screen.getByText(seededPlace.address)).toBeTruthy();
    // Twice over: once as the chip that filters to it, once as the row's eyebrow.
    expect(screen.getAllByText('Historic')).toHaveLength(2);
  });

  it('translates chrome and category labels into Romanian', async () => {
    fetchApprovedPlaces.mockResolvedValue([seededPlace]);
    await i18n.changeLanguage('ro');

    await renderScreen(<ListScreen />);

    // User content is shown as written, never translated.
    expect(await screen.findByText(seededPlace.name)).toBeTruthy();
    expect(screen.getAllByText('Istoric')).toHaveLength(2);
    expect(screen.getByText('Locuri românești din Statele Unite')).toBeTruthy();
  });

  it('orders places by real distance, nearest first', async () => {
    // Returned farthest-first, so the rendered order can only come from a sort.
    fetchApprovedPlaces.mockResolvedValue([notary, seededPlace, bakery]);

    await renderScreen(<ListScreen />);

    await screen.findByText(bakery.name);
    // `getAllByText` returns matches in tree order, which is render order.
    const names = screen
      .getAllByText(/^(Cofetăria|St\. George|Notariat)/)
      .map((node) => node.children[0]);

    expect(names).toEqual([bakery.name, seededPlace.name, notary.name]);
  });

  it('shows each place its distance from the user', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery, notary]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('0.6 mi')).toBeTruthy();
    expect(screen.getByText('109 mi')).toBeTruthy();
  });

  it('writes the decimal the way the locale writes it', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery]);
    await i18n.changeLanguage('ro');

    await renderScreen(<ListScreen />);

    // Romanian uses a comma; the number is formatted by the locale, not by the
    // helper that decided how many digits to keep.
    expect(await screen.findByText('0,6 mi')).toBeTruthy();
  });

  it('says where distances are measured from when location was refused', async () => {
    useOrigin.mockReturnValue({
      origin: DEFAULT_ORIGIN,
      isResolved: true,
      isUserLocation: false,
    });
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);

    expect(
      await screen.findByText(
        'Distances are from downtown Detroit. Turn on location to measure from where you are.'
      )
    ).toBeTruthy();
  });

  it('stays quiet about the origin while the permission prompt is still up', async () => {
    useOrigin.mockReturnValue({
      origin: DEFAULT_ORIGIN,
      isResolved: false,
      isUserLocation: false,
    });
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);

    await screen.findByText(bakery.name);
    expect(screen.queryByText(/Distances are from downtown Detroit/)).toBeNull();
  });

  it('keeps quiet about the origin once the device has placed the user', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);

    await screen.findByText(bakery.name);
    expect(screen.queryByText(/Distances are from downtown Detroit/)).toBeNull();
  });

  it('narrows to the selected chip', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery, notary]);

    await renderScreen(<ListScreen />);
    await screen.findByText(bakery.name);

    await userEvent.press(screen.getByRole('button', { name: 'Services' }));

    expect(screen.queryByText(bakery.name)).toBeNull();
    expect(screen.getByText(notary.name)).toBeTruthy();
  });

  it('distinguishes an over-filtered list from an empty one', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);
    await screen.findByText(bakery.name);

    await userEvent.press(screen.getByRole('button', { name: 'Services' }));

    expect(screen.getByText('No places match these filters.')).toBeTruthy();
    expect(screen.queryByText('No places yet.')).toBeNull();
  });

  it('invites a first submission when there is nothing to show', async () => {
    fetchApprovedPlaces.mockResolvedValue([]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('No places yet.')).toBeTruthy();
    expect(screen.getByText('Approved places show up here.')).toBeTruthy();
  });

  it('opens a place when its row is tapped', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);
    await userEvent.press(await screen.findByText(bakery.name));

    // The id, not the index: the list is sorted by distance, so the row's
    // position is not a stable name for the place it shows.
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: bakery.id },
    });
  });

  it('offers a retry when loading fails', async () => {
    fetchApprovedPlaces.mockRejectedValue(new Error('offline'));

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('Something went wrong loading places.')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
  });
});
