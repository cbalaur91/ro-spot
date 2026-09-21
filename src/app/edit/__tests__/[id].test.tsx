import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { DEFAULT_ORIGIN } from '@/geo';
import i18n from '@/i18n';
import { SessionProvider } from '@/state/session';

import EditPlaceScreen from '../[id]';

// The session is real over a mocked auth seam, as the Profile and Add suites
// have it: the screen is only reachable signed in.
jest.mock('@/data/auth', () => ({ currentUser: jest.fn(), onAuthChange: jest.fn() }));
jest.mock('@/data/submissions', () => ({ fetchMyPlaces: jest.fn(), updatePlace: jest.fn() }));
// The bucket's URL builder, which would otherwise drag a Supabase client in.
jest.mock('@/data/places', () => ({ placePhotoUrl: (path: string) => `https://cdn/${path}` }));
jest.mock('@/photos', () => ({ pickPhotos: jest.fn(), readPhoto: jest.fn() }));
jest.mock('@/geocode', () => ({ geocodeAddress: jest.fn() }));
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));

// `mock`-prefixed so Jest lets the factories close over them.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => ({ id: mockRouteId }),
}));

// The map is a native view with nothing to render under Jest. The stand-in
// keeps the one thing the screen depends on: where the pin ended up.
jest.mock('@/components/PinMap', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    PinMap: ({ coords, onChange }: any) => (
      <Pressable accessibilityRole="button" onPress={() => onChange({ lat: 42.5, lng: -83.3 })}>
        <Text>{`pin at ${coords.lat},${coords.lng}`}</Text>
      </Pressable>
    ),
  };
});

const mockBack = jest.fn();
let mockRouteId = 'p1';

const { currentUser, onAuthChange } = jest.requireMock('@/data/auth') as Record<string, jest.Mock>;
const { fetchMyPlaces, updatePlace } = jest.requireMock('@/data/submissions') as Record<
  string,
  jest.Mock
>;
const { pickPhotos, readPhoto } = jest.requireMock('@/photos') as Record<string, jest.Mock>;
const { geocodeAddress } = jest.requireMock('@/geocode') as Record<string, jest.Mock>;
const { useOrigin } = jest.requireMock('@/hooks/useOrigin') as Record<string, jest.Mock>;

const ana = { id: 'u1', email: 'ana.pop@example.com' };

const casa = {
  id: 'p1',
  name: 'Casa Românească',
  category: 'food_drink',
  description: 'Sarmale like at home.',
  address: '1 Main St, Southfield, MI 48075',
  lat: 42.4576,
  lng: -83.2409,
  status: 'approved',
  author_id: 'u1',
  phone: null,
  website: null,
  social_url: null,
  photo_paths: ['u1/one.jpg'],
  created_at: '2026-09-01T00:00:00Z',
};

const BYTES = new ArrayBuffer(4);

let queryClient: QueryClient;

async function renderScreen() {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <EditPlaceScreen />
      </SessionProvider>
    </QueryClientProvider>
  );
  return view;
}

/** Through the form, onto the pin step — the step that saves. */
async function toThePin(label = 'Continue to the map') {
  const user = userEvent.setup();
  await user.press(await screen.findByRole('button', { name: label }));
  return user;
}

beforeEach(async () => {
  jest.clearAllMocks();
  // `gcTime: 0` — react-query's default gc timer outlives the test run.
  queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  mockRouteId = 'p1';
  onAuthChange.mockReturnValue(jest.fn());
  currentUser.mockResolvedValue(ana);
  useOrigin.mockReturnValue({ origin: DEFAULT_ORIGIN, isResolved: true, isUserLocation: false });
  geocodeAddress.mockResolvedValue({ lat: 42.1, lng: -83.1 });
  fetchMyPlaces.mockResolvedValue([casa]);
  updatePlace.mockResolvedValue(undefined);
  pickPhotos.mockResolvedValue([{ uri: 'file:///new.jpg' }]);
  readPhoto.mockResolvedValue(BYTES);
  await i18n.changeLanguage('en');
});

describe('Editing your place', () => {
  it('opens the form on the place as it stands, and says what saving does', async () => {
    await renderScreen();

    expect(await screen.findByText('Saving sends it back for review')).toBeOnTheScreen();
    expect(screen.getByLabelText('Name').props.value).toBe('Casa Românească');
    expect(screen.getByLabelText('Address').props.value).toBe('1 Main St, Southfield, MI 48075');
    expect(screen.getByLabelText('Description').props.value).toBe('Sarmale like at home.');
    expect(screen.getByRole('button', { name: 'Food & Drink' }).props.accessibilityState).toMatchObject(
      { selected: true }
    );
    // The photo it already has is there to be kept or removed, not re-picked.
    expect(screen.getByRole('button', { name: 'Remove photo 1' })).toBeOnTheScreen();
  });

  it('keeps the pin where the author left it when the address is untouched', async () => {
    await renderScreen();
    await toThePin();

    expect(await screen.findByText('pin at 42.4576,-83.2409')).toBeOnTheScreen();
    // Geocoding an address nobody edited would move a place that only had its
    // description fixed.
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  it('looks the address up again once it changes', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await user.clear(await screen.findByLabelText('Address'));
    await user.type(screen.getByLabelText('Address'), '9 Other St, Detroit, MI');
    await toThePin();

    expect(geocodeAddress).toHaveBeenCalledWith('9 Other St, Detroit, MI');
    expect(await screen.findByText('pin at 42.1,-83.1')).toBeOnTheScreen();
  });

  it('saves the edit, sending kept photos as paths and new ones as bytes', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await user.clear(await screen.findByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Casa Bună');
    await user.press(screen.getByRole('button', { name: 'Add photos' }));
    await toThePin();
    await user.press(await screen.findByRole('button', { name: 'Save and send for review' }));

    await waitFor(() => expect(updatePlace).toHaveBeenCalled());
    expect(updatePlace).toHaveBeenCalledWith('p1', {
      name: 'Casa Bună',
      category: 'food_drink',
      description: 'Sarmale like at home.',
      address: '1 Main St, Southfield, MI 48075',
      lat: 42.4576,
      lng: -83.2409,
      phone: null,
      website: null,
      socialUrl: null,
      // The one it arrived with, then the one just chosen.
      photos: ['u1/one.jpg', BYTES],
    });
    // Back to the card that was pressed; the Profile tab reads the place again
    // and shows it waiting.
    expect(mockBack).toHaveBeenCalled();
  });

  it('sends the pin where it was dragged to', async () => {
    await renderScreen();
    const user = await toThePin();
    await user.press(await screen.findByText('pin at 42.4576,-83.2409'));
    await user.press(screen.getByRole('button', { name: 'Save and send for review' }));

    await waitFor(() => expect(updatePlace).toHaveBeenCalled());
    expect(updatePlace.mock.calls[0][1]).toMatchObject({ lat: 42.5, lng: -83.3 });
  });

  it('keeps the edit when the save fails', async () => {
    updatePlace.mockRejectedValue(new Error('offline'));

    await renderScreen();
    const user = await toThePin();
    await user.press(await screen.findByRole('button', { name: 'Save and send for review' }));

    expect(
      await screen.findByText('The place was not saved. Check your connection and try again.')
    ).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();

    // And the form is still behind the pin step, with the words that were typed.
    await user.press(screen.getByLabelText('Edit details'));
    expect(screen.getByLabelText('Name').props.value).toBe('Casa Românească');
  });

  it('says so plainly when the place is not the author’s to edit', async () => {
    mockRouteId = 'somebody-elses';

    await renderScreen();

    expect(await screen.findByText('This place isn’t yours to edit.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('offers to try again when the read fails', async () => {
    fetchMyPlaces.mockRejectedValueOnce(new Error('offline'));

    await renderScreen();

    expect(await screen.findByText('This place could not be loaded.')).toBeOnTheScreen();

    fetchMyPlaces.mockResolvedValue([casa]);
    await userEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByLabelText('Name')).toBeOnTheScreen();
  });

  it('speaks Romanian', async () => {
    await i18n.changeLanguage('ro');

    await renderScreen();

    expect(await screen.findByText('Modifică locul tău')).toBeOnTheScreen();
    await toThePin('Mai departe, la hartă');
    expect(
      await screen.findByRole('button', { name: 'Salvează și trimite spre verificare' })
    ).toBeOnTheScreen();
  });
});
