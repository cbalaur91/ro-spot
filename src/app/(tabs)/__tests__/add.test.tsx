import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { DEFAULT_ORIGIN } from '@/geo';
import i18n from '@/i18n';
import { SessionProvider } from '@/state/session';

import AddScreen from '../add';

// The real `SessionProvider` over a mocked data seam, as the Profile suite does:
// the gate is the session, and a mocked `useSession` would test the mock.
jest.mock('@/data/auth', () => ({ currentUser: jest.fn(), onAuthChange: jest.fn() }));
jest.mock('@/data/submissions', () => ({ submitPlace: jest.fn() }));
jest.mock('@/photos', () => ({ pickPhotos: jest.fn(), readPhoto: jest.fn() }));
jest.mock('@/geocode', () => ({ geocodeAddress: jest.fn() }));
jest.mock('@/hooks/useOrigin', () => ({ useOrigin: jest.fn() }));

// `mock`-prefixed so Jest lets the factory close over it.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockPush = jest.fn();

// The map is a native view with nothing to render under Jest. The stand-in
// keeps the one thing the screen depends on: a pin that reports where it was put.
jest.mock('@/components/PinMap', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    PinMap: ({ coords, onChange }: any) => (
      <Pressable accessibilityRole="button" onPress={() => onChange(mockDraggedTo)}>
        <Text>{`pin at ${coords.lat},${coords.lng}`}</Text>
      </Pressable>
    ),
  };
});

const mockDraggedTo = { lat: 42.5, lng: -83.3 };

const { currentUser, onAuthChange } = jest.requireMock('@/data/auth') as Record<string, jest.Mock>;
const { submitPlace } = jest.requireMock('@/data/submissions') as Record<string, jest.Mock>;
const { pickPhotos, readPhoto } = jest.requireMock('@/photos') as Record<string, jest.Mock>;
const { geocodeAddress } = jest.requireMock('@/geocode') as Record<string, jest.Mock>;
const { useOrigin } = jest.requireMock('@/hooks/useOrigin') as Record<string, jest.Mock>;

const ana = { id: 'u1', email: 'ana.pop@example.com' };
const GEOCODED = { lat: 42.4576, lng: -83.2409 };
const photo = (n: number) => ({ uri: `file:///photo-${n}.jpg` });
const BYTES = new ArrayBuffer(4);

let queryClient: QueryClient;

/**
 * The tab as the app mounts it: the session above it, the query cache around
 * it — the screen tells the cache when a submission lands.
 */
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}

async function renderSignedIn() {
  currentUser.mockResolvedValue(ana);
  await render(
    <Providers>
      <AddScreen />
    </Providers>
  );
  await screen.findByText('Add a place');
  await screen.findByLabelText('Name');
}

/** Everything the form requires, typed and picked the way a person would. */
async function fillRequired() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Name'), 'Casa Românească');
  await user.press(screen.getByRole('button', { name: 'Food & Drink' }));
  await user.type(screen.getByLabelText('Address'), ' 1 Main St, Detroit ');
  await user.type(screen.getByLabelText('Description'), 'Sarmale like at home.');
  await user.press(screen.getByRole('button', { name: 'Add photos' }));
  return user;
}

beforeEach(async () => {
  jest.clearAllMocks();
  // `gcTime: 0` — react-query's default gc timer outlives the test run.
  queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  onAuthChange.mockReturnValue(jest.fn());
  useOrigin.mockReturnValue({ origin: DEFAULT_ORIGIN, isResolved: true, isUserLocation: false });
  geocodeAddress.mockResolvedValue(GEOCODED);
  pickPhotos.mockResolvedValue([photo(1)]);
  readPhoto.mockResolvedValue(BYTES);
  submitPlace.mockResolvedValue(undefined);
  await i18n.changeLanguage('en');
});

describe('Add tab, anonymous', () => {
  it('asks for a sign-in instead of showing the form', async () => {
    currentUser.mockResolvedValue(null);
    await render(
      <Providers>
        <AddScreen />
      </Providers>
    );

    expect(await screen.findByText('Adding a place needs an account.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Name')).toBeNull();

    await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('says so in Romanian too', async () => {
    await i18n.changeLanguage('ro');
    currentUser.mockResolvedValue(null);
    await render(
      <Providers>
        <AddScreen />
      </Providers>
    );

    expect(await screen.findByText('Ca să adaugi un loc ai nevoie de cont.')).toBeOnTheScreen();
  });
});

describe('Add tab, the form', () => {
  it('names what is missing and goes nowhere', async () => {
    await renderSignedIn();

    await userEvent.press(screen.getByRole('button', { name: 'Continue to the map' }));

    expect(screen.getByText('Give the place a name.')).toBeOnTheScreen();
    expect(screen.getByText('Choose a category.')).toBeOnTheScreen();
    expect(screen.getByText('Add the address.')).toBeOnTheScreen();
    expect(screen.getByText('Say a few words about the place.')).toBeOnTheScreen();
    expect(screen.getByText('Add at least one photo.')).toBeOnTheScreen();
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  it('holds one category at a time', async () => {
    await renderSignedIn();

    await userEvent.press(screen.getByRole('button', { name: 'Historic' }));
    await userEvent.press(screen.getByRole('button', { name: 'Services' }));

    expect(screen.getByRole('button', { name: 'Historic' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Services' })).toBeSelected();
  });

  it('asks the picker only for the room that is left, and stops offering at five', async () => {
    await renderSignedIn();

    pickPhotos.mockResolvedValueOnce([photo(1), photo(2)]);
    await userEvent.press(screen.getByRole('button', { name: 'Add photos' }));
    expect(pickPhotos).toHaveBeenLastCalledWith(5);

    pickPhotos.mockResolvedValueOnce([photo(3), photo(4), photo(5)]);
    await userEvent.press(screen.getByRole('button', { name: 'Add photos' }));
    expect(pickPhotos).toHaveBeenLastCalledWith(3);

    expect(screen.queryByRole('button', { name: 'Add photos' })).toBeNull();

    await userEvent.press(screen.getByRole('button', { name: 'Remove photo 2' }));
    expect(screen.getByRole('button', { name: 'Add photos' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove photo 5' })).toBeNull();
  });

  it('refuses a phone number nobody could dial', async () => {
    await renderSignedIn();
    const user = await fillRequired();
    await user.press(screen.getByRole('button', { name: 'Add contact details, optional' }));
    await user.type(screen.getByLabelText('Phone (optional)'), 'open 7 days');

    await user.press(screen.getByRole('button', { name: 'Continue to the map' }));

    expect(screen.getByText('That doesn’t look like a phone number.')).toBeOnTheScreen();
    expect(geocodeAddress).not.toHaveBeenCalled();
  });
});

describe('Add tab, contact details', () => {
  const button = (name: string | RegExp) => screen.getByRole('button', { name });

  it('starts folded away under one toggle, after the photos', async () => {
    await renderSignedIn();

    expect(screen.queryByLabelText('Phone (optional)')).toBeNull();
    expect(screen.queryByLabelText('Website (optional)')).toBeNull();
    expect(screen.queryByLabelText('Social page (optional)')).toBeNull();
    expect(button('Add contact details, optional')).toBeCollapsed();
    expect(screen.getByText('Step 1 of 2 — Place details')).toBeOnTheScreen();

    // The required fields, their photos, then the toggle, then Continue.
    const buttons = screen.getAllByRole('button').map((node) => node.props.accessibilityLabel);
    expect(buttons.slice(-3)).toEqual([
      'Add photos',
      'Add contact details, optional',
      'Continue to the map',
    ]);
  });

  it('opens, counts what is written, and keeps it through a collapse', async () => {
    await renderSignedIn();
    const user = userEvent.setup();

    await user.press(button('Add contact details, optional'));
    expect(button('Add contact details, optional')).toBeExpanded();

    await user.type(screen.getByLabelText('Phone (optional)'), 'not a number');
    await user.type(screen.getByLabelText('Website (optional)'), '   ');
    expect(button('Contact details, 1 added')).toBeOnTheScreen();
    expect(screen.getByText('Contact details · 1 added')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Social page (optional)'), 'facebook.com/casa');
    await user.press(button('Contact details, 2 added'));
    expect(screen.queryByLabelText('Phone (optional)')).toBeNull();
    expect(button('Contact details, 2 added')).toBeCollapsed();

    await user.press(button('Contact details, 2 added'));
    expect(screen.getByLabelText('Phone (optional)').props.value).toBe('not a number');
    expect(screen.getByLabelText('Social page (optional)').props.value).toBe('facebook.com/casa');
  });

  it('says it is empty again once cleared, without folding away', async () => {
    await renderSignedIn();
    const user = userEvent.setup();

    await user.press(button('Add contact details, optional'));
    await user.type(screen.getByLabelText('Phone (optional)'), '313');
    await user.clear(screen.getByLabelText('Phone (optional)'));

    expect(button('Add contact details, optional')).toBeExpanded();
    expect(screen.getByLabelText('Phone (optional)')).toBeOnTheScreen();
  });

  it('opens itself when Continue finds a problem inside it', async () => {
    await renderSignedIn();
    const user = await fillRequired();
    await user.press(button('Add contact details, optional'));
    await user.type(screen.getByLabelText('Website (optional)'), 'not a site');
    await user.press(button('Contact details, 1 added'));

    await user.press(button('Continue to the map'));

    expect(button('Contact details, 1 added')).toBeExpanded();
    expect(screen.getByText('That doesn’t look like a web address.')).toBeOnTheScreen();
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  it('comes back from the pin as it was left', async () => {
    await renderSignedIn();
    const user = await fillRequired();
    await user.press(button('Add contact details, optional'));
    await user.type(screen.getByLabelText('Phone (optional)'), '(313) 555-0100');

    await user.press(button('Continue to the map'));
    await screen.findByText('Confirm the pin');
    expect(screen.getByText('Step 2 of 2 — Confirm location')).toBeOnTheScreen();
    await user.press(button('Edit details'));

    expect(button('Contact details, 1 added')).toBeExpanded();
    expect(screen.getByLabelText('Phone (optional)').props.value).toBe('(313) 555-0100');
    expect(screen.getByText('Step 1 of 2 — Place details')).toBeOnTheScreen();
  });

  it('counts in Romanian', async () => {
    await i18n.changeLanguage('ro');
    currentUser.mockResolvedValue(ana);
    await render(
      <Providers>
        <AddScreen />
      </Providers>
    );
    const user = userEvent.setup();

    await user.press(await screen.findByRole('button', { name: 'Adaugă date de contact, opțional' }));
    expect(screen.getByText('Pasul 1 din 2 — Detaliile locului')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Telefon (opțional)'), '313');
    expect(button('Date de contact, 1 câmp completat')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Site web (opțional)'), 'casa.ro');
    expect(button('Date de contact, 2 câmpuri completate')).toBeOnTheScreen();
  });
});

describe('Add tab, the draft', () => {
  it('does not outlive the session that wrote it', async () => {
    await renderSignedIn();
    await userEvent.type(screen.getByLabelText('Name'), 'Casa Românească');

    // What the Supabase client reports from outside React: one person leaves,
    // another signs in on the same device.
    const [listener] = onAuthChange.mock.calls[0] as [(user: unknown) => void];
    await act(async () => listener(null));
    await act(async () => listener({ id: 'u2', email: 'ion@example.com' }));

    expect(screen.getByLabelText('Name').props.value).toBe('');
  });
});

describe('Add tab, the pin', () => {
  async function reachThePin() {
    await renderSignedIn();
    const user = await fillRequired();
    await user.press(screen.getByRole('button', { name: 'Continue to the map' }));
    await screen.findByText('Confirm the pin');
    return user;
  }

  it('puts the pin where the address geocodes to', async () => {
    await reachThePin();

    expect(geocodeAddress).toHaveBeenCalledWith('1 Main St, Detroit');
    expect(screen.getByText(`pin at ${GEOCODED.lat},${GEOCODED.lng}`)).toBeOnTheScreen();
    expect(screen.queryByText(/didn’t come up/)).toBeNull();
  });

  it('starts from the origin, and says why, when the address can’t be found', async () => {
    geocodeAddress.mockResolvedValue(null);
    await reachThePin();

    expect(
      screen.getByText(`pin at ${DEFAULT_ORIGIN.lat},${DEFAULT_ORIGIN.lng}`)
    ).toBeOnTheScreen();
    expect(screen.getByText(/didn’t come up on the map/)).toBeOnTheScreen();
  });

  it('sends the address as typed and the pin as finally placed', async () => {
    const user = await reachThePin();

    await user.press(screen.getByText(/^pin at/));
    await user.press(screen.getByRole('button', { name: 'Submit for review' }));

    await screen.findByText('Sent for review.');
    expect(submitPlace).toHaveBeenCalledTimes(1);
    expect(submitPlace).toHaveBeenCalledWith({
      name: 'Casa Românească',
      category: 'food_drink',
      address: '1 Main St, Detroit',
      description: 'Sarmale like at home.',
      phone: null,
      website: null,
      socialUrl: null,
      ...mockDraggedTo,
      photos: [BYTES],
    });
  });

  it('offers a clean form after a submission', async () => {
    const user = await reachThePin();
    await user.press(screen.getByRole('button', { name: 'Submit for review' }));

    await user.press(await screen.findByRole('button', { name: 'Add another place' }));

    expect(screen.getByLabelText('Name').props.value).toBe('');
    expect(screen.queryByRole('button', { name: 'Remove photo 1' })).toBeNull();
  });

  it('sends once, however many times the pill is pressed', async () => {
    let finish!: () => void;
    submitPlace.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const user = await reachThePin();

    await user.press(screen.getByRole('button', { name: 'Submit for review' }));
    await user.press(screen.getByRole('button', { name: 'Submit for review' }));
    finish();

    await screen.findByText('Sent for review.');
    expect(submitPlace).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft when the submission fails', async () => {
    submitPlace.mockRejectedValue(new Error('offline'));
    const user = await reachThePin();

    await user.press(screen.getByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(screen.getByText(/wasn’t sent/)).toBeOnTheScreen());

    await user.press(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByLabelText('Name').props.value).toBe('Casa Românească');
    expect(screen.getByRole('button', { name: 'Remove photo 1' })).toBeOnTheScreen();
  });
});
