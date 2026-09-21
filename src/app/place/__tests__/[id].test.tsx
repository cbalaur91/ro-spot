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
import { Alert, Dimensions, Linking, Platform, StyleSheet } from 'react-native';

import { SEED_PHOTO_PATHS, SEEDED_APPROVED_PLACE } from '@/data/fixtures';
import { DEFAULT_ORIGIN } from '@/geo';
import i18n from '@/i18n';
import { directionsUrl } from '@/links';

import PlaceDetailScreen from '../[id]';

jest.mock('@/data/places', () => ({
  fetchPlace: jest.fn(),
  // The real one asks supabase-js to build a public URL; what the screen owes is
  // that whatever comes back reaches the image, not how it was spelled.
  placePhotoUrl: (path: string) => `https://cdn.test/place-photos/${path}`,
}));

// `expo-image` is a native module. React Native's own Image takes the same
// `source` / `accessibilityLabel`, which is all the screen asks of it.
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').Image }));

// The screen measures the place from wherever distances are measured from, and
// the real hook asks the device.
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a' }),
  // `mock`-prefixed so Jest lets the factory close over them.
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const { fetchPlace } = jest.requireMock('@/data/places') as { fetchPlace: jest.Mock };
const { useOrigin } = jest.requireMock('@/hooks/useOrigin') as { useOrigin: jest.Mock };

const cathedral = {
  ...SEEDED_APPROVED_PLACE,
  id: 'a',
  // Photographed here, so the gallery has pages to show.
  photo_paths: SEED_PHOTO_PATHS,
  created_at: '2026-08-21T00:00:00Z',
};

let queryClient: QueryClient;

async function renderScreen(ui: ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(async () => {
  jest.clearAllMocks();
  // `gcTime: 0` — react-query's default gc timer outlives the test run.
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

describe('Place detail', () => {
  it('shows every field the spec puts on this screen', async () => {
    fetchPlace.mockResolvedValue(cathedral);

    await renderScreen(<PlaceDetailScreen />);

    expect(await screen.findByText(cathedral.name)).toBeTruthy();
    expect(screen.getByText(cathedral.address)).toBeTruthy();
    expect(screen.getByText(cathedral.description)).toBeTruthy();
    expect(screen.getByText('Historic')).toBeTruthy();
  });

  it('shows user content as written, whatever the app is speaking', async () => {
    fetchPlace.mockResolvedValue(cathedral);
    await i18n.changeLanguage('ro');

    await renderScreen(<PlaceDetailScreen />);

    // The category is chrome and translates; the name and description are the
    // submitter's words and do not.
    expect(await screen.findByText(cathedral.name)).toBeTruthy();
    expect(screen.getByText(cathedral.description)).toBeTruthy();
    expect(screen.getByText('Istoric')).toBeTruthy();
  });

  it('states how far the place is, on the address line', async () => {
    fetchPlace.mockResolvedValue(cathedral);

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    // Appended to the address rather than replacing it: one line says where the
    // place is and how far that is from here.
    expect(screen.getByText('· 13 mi')).toBeTruthy();
    expect(screen.getByText(cathedral.address)).toBeTruthy();
  });

  it('states no distance until it knows where to measure from', async () => {
    // The prompt is still up: the fallback origin is in hand, but it isn't yet
    // an answer, and a distance we can't stand behind is worse than none.
    useOrigin.mockReturnValue({
      origin: DEFAULT_ORIGIN,
      isResolved: false,
      isUserLocation: false,
    });
    fetchPlace.mockResolvedValue(cathedral);

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    expect(screen.queryByText(/mi$/)).toBeNull();
    expect(screen.getByText(cathedral.address)).toBeTruthy();
  });

  it('puts one photo in the gallery for each stored path', async () => {
    fetchPlace.mockResolvedValue(cathedral);

    await renderScreen(<PlaceDetailScreen />);

    const photos = await screen.findAllByRole('image');
    expect(photos.map((photo) => photo.props.source.uri)).toEqual([
      'https://cdn.test/place-photos/seed/st-george-1.jpg',
      'https://cdn.test/place-photos/seed/st-george-2.jpg',
    ]);
    // A gallery a screen reader can't count is a photo that might be the only one.
    expect(screen.getByLabelText('Photo 1 of 2')).toBeTruthy();
  });

  describe('Photos', () => {
    const { width } = Dimensions.get('window');

    /** Which page mark is solid — the page the gallery says you're on. */
    function currentPage() {
      return screen
        .getAllByTestId(/^page-mark-/)
        .findIndex((mark) => mark.props.testID.endsWith('-current'));
    }

    async function swipeTo(page: number) {
      await fireEvent(screen.getByTestId('photo-gallery'), 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: page * width, y: 0 } },
      });
    }

    async function failPhoto(index: number) {
      await fireEvent(screen.getAllByRole('image')[index], 'error', {
        error: 'timed out',
      });
    }

    it('puts the Back chip over the photographs, not in a header', async () => {
      fetchPlace.mockResolvedValue(cathedral);

      await renderScreen(<PlaceDetailScreen />);

      await screen.findAllByRole('image');
      expect(screen.queryByTestId('place-header')).toBeNull();
      expect(screen.getAllByRole('button', { name: 'Back' })).toHaveLength(1);
    });

    it('gives a place with no photos a compact header, Back inside it', async () => {
      fetchPlace.mockResolvedValue({ ...cathedral, photo_paths: [] });

      await renderScreen(<PlaceDetailScreen />);

      const header = await screen.findByTestId('place-header');
      expect(within(header).getByText('No photos of this place yet.')).toBeTruthy();
      // In the header's flow, and the only one: nothing floats over the message.
      expect(within(header).getByRole('button', { name: 'Back' })).toBeTruthy();
      expect(screen.getAllByRole('button', { name: 'Back' })).toHaveLength(1);
      // Nothing to retry: there was never anything to load.
      expect(within(header).queryByRole('button', { name: 'Try again' })).toBeNull();
      expect(screen.queryAllByRole('image')).toHaveLength(0);
      expect(screen.queryByTestId('photo-gallery')).toBeNull();
    });

    it('marks a photo that failed on its own page, and keeps your place', async () => {
      fetchPlace.mockResolvedValue(cathedral);

      await renderScreen(<PlaceDetailScreen />);

      await screen.findAllByRole('image');
      await swipeTo(1);
      await failPhoto(1);

      const failed = screen.getByTestId('photo-failed-2');
      expect(within(failed).getByText('Photo unavailable')).toBeTruthy();
      // The same 4:3 page the photograph would have filled, so nothing shifts.
      expect(StyleSheet.flatten(failed.props.style)).toMatchObject({
        width,
        aspectRatio: 4 / 3,
      });
      expect(screen.getAllByRole('image')).toHaveLength(1);
      expect(currentPage()).toBe(1);
      // The rest of the gallery is still a gallery, not the compact header.
      expect(screen.queryByTestId('place-header')).toBeNull();
    });

    it('asks for a failed photo again when you retry it', async () => {
      fetchPlace.mockResolvedValue(cathedral);

      await renderScreen(<PlaceDetailScreen />);

      await screen.findAllByRole('image');
      await failPhoto(1);
      await userEvent.press(screen.getByRole('button', { name: 'Try photo 2 again' }));

      const photos = screen.getAllByRole('image');
      expect(photos.map((photo) => photo.props.source.uri)).toEqual([
        'https://cdn.test/place-photos/seed/st-george-1.jpg',
        'https://cdn.test/place-photos/seed/st-george-2.jpg',
      ]);
      expect(screen.queryByText('Photo unavailable')).toBeNull();
    });

    it('trades a gallery where every photo failed for the compact header', async () => {
      fetchPlace.mockResolvedValue(cathedral);

      await renderScreen(<PlaceDetailScreen />);

      await screen.findAllByRole('image');
      await failPhoto(0);
      await failPhoto(0);

      const header = await screen.findByTestId('place-header');
      expect(within(header).getByText("The photos of this place didn't load.")).toBeTruthy();
      expect(within(header).getByRole('button', { name: 'Back' })).toBeTruthy();
      expect(screen.queryByTestId('photo-gallery')).toBeNull();

      // One Retry for all of them.
      await userEvent.press(within(header).getByRole('button', { name: 'Try again' }));

      expect(screen.getAllByRole('image')).toHaveLength(2);
      expect(screen.queryByTestId('place-header')).toBeNull();
      expect(screen.queryByText('Photo unavailable')).toBeNull();
    });

    it('starts over when the place comes back with other photos', async () => {
      fetchPlace.mockResolvedValue(cathedral);

      await renderScreen(<PlaceDetailScreen />);

      await screen.findAllByRole('image');
      await swipeTo(1);
      await failPhoto(1);

      // The author edited the place: a new sequence of paths, the same id.
      fetchPlace.mockResolvedValue({
        ...cathedral,
        photo_paths: ['u1/one.jpg', 'u1/two.jpg', 'u1/three.jpg'],
      });
      await act(() => queryClient.refetchQueries());

      await waitFor(() => expect(screen.getAllByRole('image')).toHaveLength(3));
      expect(screen.queryByText('Photo unavailable')).toBeNull();
      expect(currentPage()).toBe(0);
    });

    it('says a photo is unavailable in Romanian too', async () => {
      await i18n.changeLanguage('ro');
      fetchPlace.mockResolvedValue(cathedral);

      await renderScreen(<PlaceDetailScreen />);

      await screen.findAllByRole('image');
      await failPhoto(0);
      expect(screen.getByText('Fotografie indisponibilă')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Încearcă din nou fotografia 1' })
      ).toBeTruthy();

      await failPhoto(0);
      expect(
        await screen.findByText('Fotografiile acestui loc nu s-au încărcat.')
      ).toBeTruthy();
    });

    it('says a place has no photos in Romanian too', async () => {
      await i18n.changeLanguage('ro');
      fetchPlace.mockResolvedValue({ ...cathedral, photo_paths: [] });

      await renderScreen(<PlaceDetailScreen />);

      expect(
        await screen.findByText('Încă nu există fotografii ale acestui loc.')
      ).toBeTruthy();
    });
  });

  it('hides the contact links a place does not have', async () => {
    fetchPlace.mockResolvedValue(cathedral);

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    expect(screen.queryByText('Call')).toBeNull();
    expect(screen.queryByText('Website')).toBeNull();
    expect(screen.queryByText('Social')).toBeNull();
  });

  it('dials the phone number', async () => {
    fetchPlace.mockResolvedValue({ ...cathedral, phone: '(313) 555-1234' });

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    // Shown as the submitter typed it, opened as the dialer needs it.
    expect(screen.getByText('(313) 555-1234')).toBeTruthy();
    await userEvent.press(screen.getByRole('link', { name: 'Call: (313) 555-1234' }));

    expect(Linking.openURL).toHaveBeenCalledWith('tel:3135551234');
  });

  it('opens the website and the social link in the browser', async () => {
    fetchPlace.mockResolvedValue({
      ...cathedral,
      website: 'stgeorgedetroit.org',
      social_url: 'https://facebook.com/stgeorge',
    });

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    await userEvent.press(
      screen.getByRole('link', { name: 'Website: stgeorgedetroit.org' })
    );
    expect(Linking.openURL).toHaveBeenCalledWith('https://stgeorgedetroit.org');

    await userEvent.press(
      screen.getByRole('link', { name: 'Social: https://facebook.com/stgeorge' })
    );
    expect(Linking.openURL).toHaveBeenCalledWith('https://facebook.com/stgeorge');
  });

  it('does not offer a link it cannot open', async () => {
    // Free text in a phone field, and a scheme we would never hand to the OS.
    fetchPlace.mockResolvedValue({
      ...cathedral,
      phone: 'call us!',
      website: 'javascript:alert(1)',
    });

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    expect(screen.queryByText('call us!')).toBeNull();
    expect(screen.queryByText('javascript:alert(1)')).toBeNull();
  });

  it('says something when the device has nothing to open a link with', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    fetchPlace.mockResolvedValue({ ...cathedral, phone: '313-555-1234' });

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    await userEvent.press(screen.getByRole('link', { name: 'Call: 313-555-1234' }));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'This device has nothing that can open that link.'
      )
    );
  });

  it('tells you a place is not here rather than showing an empty screen', async () => {
    fetchPlace.mockResolvedValue(null);

    await renderScreen(<PlaceDetailScreen />);

    expect(await screen.findByText('That place is not here.')).toBeTruthy();
    expect(
      screen.getByText('It may have been removed, or it may still be waiting for review.')
    ).toBeTruthy();
  });

  it('offers a retry when the read fails', async () => {
    fetchPlace.mockRejectedValue(new Error('offline'));

    await renderScreen(<PlaceDetailScreen />);

    expect(
      await screen.findByText('Something went wrong loading this place.')
    ).toBeTruthy();

    fetchPlace.mockResolvedValue(cathedral);
    await userEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(cathedral.name)).toBeTruthy();
  });

  it('goes back the way you came', async () => {
    fetchPlace.mockResolvedValue(cathedral);

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    await userEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('offers to report a problem with the place, signed in or not', async () => {
    fetchPlace.mockResolvedValue(cathedral);

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText(cathedral.name);
    // No session is read here: the report screen asks for one, so that someone
    // who signs in lands back on the report rather than on this page.
    await userEvent.press(screen.getByRole('button', { name: 'Report a problem' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/report/[id]', params: { id: 'a' } });
  });

  describe('Directions and Call', () => {
    // What a pill's icon-and-label pair measures at its natural width, in the
    // copy the screen lays out out of sight to decide between a row and a column.
    // Hidden from a screen reader, which would otherwise hear every action twice.
    async function measure(key: 'directions' | 'call', width: number) {
      const copy = screen.getByTestId(`place-action-measure-${key}`, {
        includeHiddenElements: true,
      });
      await fireEvent(copy, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 44 } },
      });
    }

    async function layOutActions(width: number) {
      await fireEvent(screen.getByTestId('place-actions'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 44 } },
      });
    }

    function direction() {
      return StyleSheet.flatten(screen.getByTestId('place-actions-row').props.style)
        .flexDirection;
    }

    it.each(['ios', 'android'] as const)(
      'routes to the pin in the maps app %s has',
      async (os) => {
        jest.replaceProperty(Platform, 'OS', os);
        fetchPlace.mockResolvedValue(cathedral);

        await renderScreen(<PlaceDetailScreen />);

        // Named with the place, as the List names it.
        await userEvent.press(
          await screen.findByRole('link', { name: `Directions to ${cathedral.name}` })
        );
        expect(Linking.openURL).toHaveBeenCalledWith(directionsUrl(cathedral, os));
      }
    );

    it('offers to call when the number is dialable, beside the phone row', async () => {
      fetchPlace.mockResolvedValue({ ...cathedral, phone: '(313) 555-1234' });

      await renderScreen(<PlaceDetailScreen />);

      await userEvent.press(
        await screen.findByRole('link', { name: `Call ${cathedral.name}` })
      );
      expect(Linking.openURL).toHaveBeenCalledWith('tel:3135551234');
      // The contact row is still there, and still a link.
      expect(screen.getByRole('link', { name: 'Call: (313) 555-1234' })).toBeTruthy();
    });

    it.each([
      ['no number', null],
      ['a number that cannot be dialed', 'call us!'],
    ])('offers no Call for %s', async (_, phone) => {
      fetchPlace.mockResolvedValue({ ...cathedral, phone });

      await renderScreen(<PlaceDetailScreen />);

      await screen.findByRole('link', { name: `Directions to ${cathedral.name}` });
      expect(screen.queryByRole('link', { name: `Call ${cathedral.name}` })).toBeNull();
    });

    it('says something when the device cannot open the route', async () => {
      jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
      fetchPlace.mockResolvedValue(cathedral);

      await renderScreen(<PlaceDetailScreen />);

      await userEvent.press(
        await screen.findByRole('link', { name: `Directions to ${cathedral.name}` })
      );
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          'This device has nothing that can open that link.'
        )
      );
    });

    it('sits the pills side by side while both fit half the width', async () => {
      fetchPlace.mockResolvedValue({ ...cathedral, phone: '313-555-1234' });

      await renderScreen(<PlaceDetailScreen />);

      await screen.findByText(cathedral.name);
      // 330 wide less a 10 gap leaves 160 a pill.
      await layOutActions(330);
      await measure('directions', 150);
      await measure('call', 110);
      expect(direction()).toBe('row');
    });

    it('stacks the pills when either would not fit half the width', async () => {
      fetchPlace.mockResolvedValue({ ...cathedral, phone: '313-555-1234' });

      await renderScreen(<PlaceDetailScreen />);

      await screen.findByText(cathedral.name);
      await layOutActions(330);
      // Enlarged text: Directions outgrows its half, and Call comes down with it.
      await measure('directions', 190);
      await measure('call', 110);
      expect(direction()).toBe('column');

      // …and goes back up when the text comes back down.
      await measure('directions', 150);
      expect(direction()).toBe('row');
    });

    it('measures nothing when Directions is alone, since it has the width', async () => {
      fetchPlace.mockResolvedValue(cathedral);

      await renderScreen(<PlaceDetailScreen />);

      await screen.findByText(cathedral.name);
      expect(
        screen.queryByTestId('place-action-measure-directions', {
          includeHiddenElements: true,
        })
      ).toBeNull();
    });
  });

  it('offers nothing to report on a place that is not here', async () => {
    fetchPlace.mockResolvedValue(null);

    await renderScreen(<PlaceDetailScreen />);

    await screen.findByText('That place is not here.');
    expect(screen.queryByRole('button', { name: 'Report a problem' })).toBeNull();
  });
});
