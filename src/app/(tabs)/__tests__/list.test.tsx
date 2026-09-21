import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { SEED_PHOTO_PATHS, SEEDED_APPROVED_PLACE } from '@/data/fixtures';
import { DEFAULT_ORIGIN } from '@/geo';
import i18n from '@/i18n';
import { directionsUrl } from '@/links';
import { CategoryFilterProvider } from '@/state/categoryFilter';

import ListScreen from '../list';

jest.mock('@/data/places', () => ({
  fetchApprovedPlaces: jest.fn(),
  // The real one asks the Supabase client for a public URL; what the row owes is
  // that whatever comes back reaches the image, not how it was spelled.
  placePhotoUrl: (path: string) => `https://cdn.test/place-photos/${path}`,
}));
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));

// `expo-image` is a native module. React Native's own Image takes the same
// `source` and `onError`, and the id is how a test finds a picture that — being
// inside a labelled button — has no role or name of its own.
jest.mock('expo-image', () => {
  const { Image } = jest.requireActual('react-native');
  return { Image: (props: object) => <Image testID="thumbnail" {...props} /> };
});

// `mock`-prefixed so Jest lets the factory close over it.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockPush = jest.fn();

const { fetchApprovedPlaces } = jest.requireMock('@/data/places') as {
  fetchApprovedPlaces: jest.Mock;
};
const { useOrigin } = jest.requireMock('@/hooks/useOrigin') as { useOrigin: jest.Mock };

const seededPlace = {
  ...SEEDED_APPROVED_PLACE,
  // Photographed here, so the thumbnail has something to show.
  photo_paths: SEED_PHOTO_PATHS,
  created_at: '2026-08-21T00:00:00Z',
};

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
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await i18n.changeLanguage('en');
});

afterEach(() => {
  queryClient.clear();
  jest.restoreAllMocks();
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
    // A filter the user set is not an invitation to submit — the CTA belongs to
    // the empty dataset only.
    expect(screen.queryByRole('button', { name: 'Add the first place' })).toBeNull();
    // And the way back out of it is still on the screen.
    expect(screen.getByRole('button', { name: 'Services' })).toBeTruthy();
  });

  it('invites a first submission when there is nothing to show', async () => {
    fetchApprovedPlaces.mockResolvedValue([]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('No places yet.')).toBeTruthy();
    expect(screen.getByText('Approved places show up here — the hora needs dancers.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add the first place' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Services' })).toBeTruthy();
  });

  it('offers a way out of a list the chips emptied, and back to every place', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);
    await screen.findByText(bakery.name);
    await userEvent.press(screen.getByRole('button', { name: 'Services' }));

    // One in the pinned row, one in the notice.
    const clears = screen.getAllByRole('button', { name: 'Clear filters' });
    expect(clears).toHaveLength(2);

    await userEvent.press(clears[1]);

    expect(screen.getByText(bakery.name)).toBeTruthy();
    expect(screen.queryByText('No places match these filters.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Services' })).not.toBeSelected();
  });

  it('offers no clear when no chip is on, not even on the true empty', async () => {
    fetchApprovedPlaces.mockResolvedValue([]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('No places yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    // Nor a count: the hora already says there is nothing.
    expect(screen.queryByText('0 places')).toBeNull();
  });

  it('clears every chip from the pinned row while places still show', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery, notary]);

    await renderScreen(<ListScreen />);
    await screen.findByText(bakery.name);
    await userEvent.press(screen.getByRole('button', { name: 'Services' }));
    await userEvent.press(screen.getByRole('button', { name: 'Historic' }));

    await userEvent.press(screen.getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByText(bakery.name)).toBeTruthy();
    expect(screen.getByText(notary.name)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Services' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Historic' })).not.toBeSelected();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('counts what the chips left', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery, notary]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('2 places')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Services' }));
    expect(screen.getByText('1 place')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Historic' }));
    // Services or Historic: still the notary alone.
    expect(screen.getByText('1 place')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Services' }));
    expect(screen.getByText('0 places')).toBeTruthy();
  });

  it.each([
    [1, '1 loc'],
    [2, '2 locuri'],
    [19, '19 locuri'],
    [20, '20 de locuri'],
    [101, '101 locuri'],
  ])('counts %i in Romanian as “%s”', async (total, label) => {
    fetchApprovedPlaces.mockResolvedValue(
      Array.from({ length: total }, (_, i) => ({ ...bakery, id: `p${i}`, name: `Loc ${i}` }))
    );
    await i18n.changeLanguage('ro');

    await renderScreen(<ListScreen />);

    expect(await screen.findByText(label)).toBeTruthy();
  });

  it('counts every result, not only the rows on screen', async () => {
    fetchApprovedPlaces.mockResolvedValue(
      Array.from({ length: 40 }, (_, i) => ({ ...bakery, id: `p${i}`, name: `Place ${i}` }))
    );

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('40 places')).toBeTruthy();
  });

  it('announces the count, and only the count, as it changes', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery, notary]);

    await renderScreen(<ListScreen />);

    await screen.findByText('2 places');
    await userEvent.press(screen.getByRole('button', { name: 'Services' }));

    const live = screen.container.queryAll(
      (node) => node.props.accessibilityLiveRegion === 'polite'
    );
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveTextContent('1 place');
  });

  it('counts nothing while the places are still on their way', async () => {
    fetchApprovedPlaces.mockReturnValue(new Promise(() => {}));

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('Loading places')).toBeTruthy();
    expect(screen.queryByText(/\d+ places?$/)).toBeNull();
  });

  it('counts nothing when the places never arrived', async () => {
    fetchApprovedPlaces.mockRejectedValue(new Error('offline'));

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('Something went wrong loading places.')).toBeTruthy();
    expect(screen.queryByText(/\d+ places?$/)).toBeNull();
  });

  it('sends the first submission to the Add tab', async () => {
    fetchApprovedPlaces.mockResolvedValue([]);

    await renderScreen(<ListScreen />);
    await userEvent.press(await screen.findByRole('button', { name: 'Add the first place' }));

    expect(mockPush).toHaveBeenCalledWith('/add');
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

  it("shows the place's first photograph", async () => {
    fetchApprovedPlaces.mockResolvedValue([seededPlace]);

    await renderScreen(<ListScreen />);

    const thumbnail = await screen.findByTestId('thumbnail');
    expect(thumbnail.props.source.uri).toBe('https://cdn.test/place-photos/seed/st-george-1.jpg');
  });

  it('asks again for a photograph that failed, once the list is refreshed', async () => {
    fetchApprovedPlaces.mockResolvedValue([seededPlace]);

    await renderScreen(<ListScreen />);
    fireEvent(await screen.findByTestId('thumbnail'), 'error');
    await waitFor(() => expect(screen.queryByTestId('thumbnail')).toBeNull());

    // A refetch inside the same millisecond would look like the same fetch.
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000);
    await act(() => queryClient.refetchQueries());

    expect(await screen.findByTestId('thumbnail')).toBeTruthy();
  });

  it('pins the filter bar on Android, where a section header does not stick by default', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);
    await screen.findByText(bakery.name);

    // Two scroll views: the chips' own, which is horizontal, and the list.
    const [list] = screen.container.queryAll(
      (node) => node.type === 'RCTScrollView' && !node.props.horizontal
    );
    // 0 is the masthead; 1 is the band and the chips.
    expect(list.props.stickyHeaderIndices).toEqual([1]);
  });

  it('keeps the ways out of the app beside the row, not inside it', async () => {
    fetchApprovedPlaces.mockResolvedValue([{ ...bakery, phone: '(313) 555-1234' }]);

    await renderScreen(<ListScreen />);

    // A link inside a button is one a screen reader cannot reach.
    const row = await screen.findByRole('button', { name: /Cofetăria Bucur/ });
    expect(within(row).queryByRole('link')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('draws no image for a place nobody has photographed', async () => {
    fetchApprovedPlaces.mockResolvedValue([{ ...seededPlace, photo_paths: [] }]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText(seededPlace.name)).toBeTruthy();
    expect(screen.queryByTestId('thumbnail')).toBeNull();
  });

  it('stops showing a photograph that fails to load', async () => {
    fetchApprovedPlaces.mockResolvedValue([seededPlace]);

    await renderScreen(<ListScreen />);
    fireEvent(await screen.findByTestId('thumbnail'), 'error');

    await waitFor(() => expect(screen.queryByTestId('thumbnail')).toBeNull());
  });

  it('shows the description, and keeps it out of what the row is called', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText(bakery.description)).toBeTruthy();
    // Somebody else wrote it, at whatever length they liked: a screen reader gets
    // what the row said before there was one.
    expect(
      screen.getByRole('button', {
        name: 'Food & Drink, Cofetăria Bucur, 100 Woodward Ave, Detroit, MI, 0.6 mi',
      })
    ).toBeTruthy();
  });

  it('hands the way there to the maps app, without opening the place', async () => {
    fetchApprovedPlaces.mockResolvedValue([bakery, notary]);

    await renderScreen(<ListScreen />);
    // Named with the place: two links both called "Directions" are one link.
    await userEvent.press(await screen.findByRole('link', { name: 'Directions to Cofetăria Bucur' }));

    expect(Linking.openURL).toHaveBeenCalledWith(directionsUrl(bakery, Platform.OS));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('dials a place that gave a number, without opening the place', async () => {
    fetchApprovedPlaces.mockResolvedValue([{ ...bakery, phone: '(313) 555-1234' }]);

    await renderScreen(<ListScreen />);
    await userEvent.press(await screen.findByRole('link', { name: 'Call Cofetăria Bucur' }));

    expect(Linking.openURL).toHaveBeenCalledWith('tel:3135551234');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('offers no call where there is nothing to dial', async () => {
    fetchApprovedPlaces.mockResolvedValue([
      bakery,
      // A phone field is a text box, and people write in it.
      { ...notary, phone: 'open 7 days' },
    ]);

    await renderScreen(<ListScreen />);

    expect(await screen.findAllByRole('link', { name: /^Directions to/ })).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /^Call/ })).toBeNull();
  });

  it('says so when the device has nothing to open a link with', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    fetchApprovedPlaces.mockResolvedValue([bakery]);

    await renderScreen(<ListScreen />);
    await userEvent.press(await screen.findByRole('link', { name: 'Directions to Cofetăria Bucur' }));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('This device has nothing that can open that link.')
    );
  });

  it('names the actions in Romanian', async () => {
    await i18n.changeLanguage('ro');
    fetchApprovedPlaces.mockResolvedValue([{ ...bakery, phone: '(313) 555-1234' }]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByRole('link', { name: 'Traseu până la Cofetăria Bucur' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sună la Cofetăria Bucur' })).toBeTruthy();
    expect(screen.getByText('Traseu')).toBeTruthy();
    expect(screen.getByText('Sună')).toBeTruthy();
  });

  it('offers a retry when loading fails', async () => {
    fetchApprovedPlaces.mockRejectedValue(new Error('offline'));

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('Something went wrong loading places.')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
  });
});
