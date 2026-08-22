import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Alert, Linking } from 'react-native';

import { SEEDED_APPROVED_PLACE } from '@/data/fixtures';
import i18n from '@/i18n';

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

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a' }),
  // `mock`-prefixed so Jest lets the factory close over them.
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const { fetchPlace } = jest.requireMock('@/data/places') as { fetchPlace: jest.Mock };

const cathedral = {
  ...SEEDED_APPROVED_PLACE,
  id: 'a',
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

  it('says so when a place has no photos yet', async () => {
    fetchPlace.mockResolvedValue({ ...cathedral, photo_paths: [] });

    await renderScreen(<PlaceDetailScreen />);

    expect(await screen.findByText('No photos of this place yet.')).toBeTruthy();
    expect(screen.queryAllByRole('image')).toHaveLength(0);
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
});
