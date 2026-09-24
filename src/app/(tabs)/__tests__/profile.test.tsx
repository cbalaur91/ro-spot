import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { AccessibilityInfo, Linking } from 'react-native';

import type { Place } from '@/data/places';
import i18n, { LANGUAGE_KEY } from '@/i18n';
import { SessionProvider } from '@/state/session';

import ProfileScreen from '../profile';

// The real `SessionProvider` over a mocked data seam: the tab's whole job is to
// reflect the session, and a mocked `useSession` would assert that we wrote the
// screen we wrote.
jest.mock('@/data/auth', () => ({
  currentUser: jest.fn(),
  onAuthChange: jest.fn(),
  signOut: jest.fn(),
  deleteAccount: jest.fn(),
}));

// The same treatment for "your places": the read is the seam, the block under
// test is what the tab makes of what comes back.
jest.mock('@/data/submissions', () => ({ fetchMyPlaces: jest.fn() }));

// `mock`-prefixed so Jest lets the factory close over it.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockPush = jest.fn();

const { currentUser, onAuthChange, signOut, deleteAccount } = jest.requireMock('@/data/auth') as {
  currentUser: jest.Mock;
  onAuthChange: jest.Mock;
  signOut: jest.Mock;
  deleteAccount: jest.Mock;
};

const { fetchMyPlaces } = jest.requireMock('@/data/submissions') as { fetchMyPlaces: jest.Mock };

/** A place of Ana's, as the table hands it over. */
function place(overrides: Partial<Place> = {}): Place {
  return {
    id: 'p1',
    name: 'Casa Românească',
    category: 'food_drink',
    description: 'Sarmale like at home.',
    address: '1 Main St, Southfield, MI 48075',
    lat: 42.4576,
    lng: -83.2409,
    status: 'pending',
    author_id: 'u1',
    phone: null,
    website: null,
    social_url: null,
    photo_paths: ['u1/one.jpg'],
    created_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

const ana = { id: 'u1', email: 'ana.pop@example.com' };

/**
 * What the Supabase client would report after a sign-out — from outside React,
 * which is what `act` stands in for here.
 */
async function emitAuthChange(user: unknown) {
  const [listener] = onAuthChange.mock.calls[0] as [(user: unknown) => void];
  await act(async () => {
    listener(user);
  });
}

let queryClient: QueryClient;

async function renderScreen(ui: ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{ui}</SessionProvider>
    </QueryClientProvider>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  // `gcTime: 0` — react-query's default gc timer outlives the test run.
  queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  onAuthChange.mockReturnValue(jest.fn());
  fetchMyPlaces.mockResolvedValue([]);
  await i18n.changeLanguage('en');
});

describe('Profile tab', () => {
  it('invites an anonymous visitor to sign in, without insisting', async () => {
    currentUser.mockResolvedValue(null);

    await renderScreen(<ProfileScreen />);

    await waitFor(() => expect(screen.getByText('Browsing needs no account.')).toBeOnTheScreen());
    await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('shows who is signed in, read back from the stored session', async () => {
    // This is the restart, as the tab sees it: nothing signed in during this
    // run of the app, and the account is still there.
    currentUser.mockResolvedValue(ana);

    await renderScreen(<ProfileScreen />);

    await waitFor(() => expect(screen.getByText('ana.pop@example.com')).toBeOnTheScreen());
    // The rhomb carries initials taken from the address — there is no name to
    // ask for yet. `includeHidden` because the rhomb is hidden from a screen
    // reader on purpose: it abbreviates the line right next to it.
    expect(screen.getByText('AP', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByText('Browsing needs no account.')).not.toBeOnTheScreen();
  });

  it('waits for the stored session rather than flashing the invitation', async () => {
    currentUser.mockImplementation(() => new Promise(() => {}));

    await renderScreen(<ProfileScreen />);

    expect(screen.getByText('Loading your account')).toBeOnTheScreen();
    expect(screen.queryByText('Browsing needs no account.')).not.toBeOnTheScreen();
  });

  it('signs out, and the tab goes back to the invitation', async () => {
    currentUser.mockResolvedValue(ana);
    signOut.mockResolvedValue(undefined);

    await renderScreen(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('ana.pop@example.com')).toBeOnTheScreen());

    await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalled();

    // The session state is what redraws the tab, not the button — so the
    // client's own notification is what the assertion goes through.
    await emitAuthChange(null);
    await waitFor(() => expect(screen.getByText('Browsing needs no account.')).toBeOnTheScreen());
  });

  it('says so when the sign-out left the session on the device', async () => {
    // The narrow case the seam throws in: supabase-js clears the local session
    // before reporting a failed revocation, so a throw means the session
    // survived and this tab is still the signed-in one. Nothing emits a change
    // here for the same reason.
    currentUser.mockResolvedValue(ana);
    signOut.mockRejectedValue(new Error('Failed to fetch'));

    await renderScreen(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('ana.pop@example.com')).toBeOnTheScreen());

    await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() =>
      expect(screen.getByText('Could not sign you out. Try again.')).toBeOnTheScreen()
    );
    expect(screen.getByText('ana.pop@example.com')).toBeOnTheScreen();
  });

  it('speaks Romanian', async () => {
    await i18n.changeLanguage('ro');
    currentUser.mockResolvedValue(null);

    await renderScreen(<ProfileScreen />);

    await waitFor(() =>
      expect(screen.getByText('Ca să te uiți, nu ai nevoie de cont.')).toBeOnTheScreen()
    );
    expect(screen.getByText('Profil')).toBeOnTheScreen();
  });
});

describe('Profile tab, your places', () => {
  beforeEach(() => {
    currentUser.mockResolvedValue(ana);
  });

  it('lists what you sent in, and what became of each one', async () => {
    fetchMyPlaces.mockResolvedValue([
      place({ id: 'p1', name: 'Casa Românească', status: 'pending' }),
      place({ id: 'p2', name: 'Europa Market', status: 'approved', category: 'services' }),
      place({ id: 'p3', name: 'Dracula’s Bakery', status: 'rejected' }),
    ]);

    await renderScreen(<ProfileScreen />);

    expect(await screen.findByText('Casa Românească')).toBeOnTheScreen();
    expect(screen.getByText('Pending')).toBeOnTheScreen();
    expect(screen.getByText('Approved')).toBeOnTheScreen();
    // Not "Rejected": the word the moderator's decision earns is the softer one.
    expect(screen.getByText('Not accepted')).toBeOnTheScreen();
    // The card says where, not the whole envelope.
    expect(screen.getAllByText('Southfield, MI')).toHaveLength(3);
  });

  it('says the rule before an edit can surprise anybody', async () => {
    fetchMyPlaces.mockResolvedValue([place()]);

    await renderScreen(<ProfileScreen />);

    expect(await screen.findByText('Edit a place and it goes back for review.')).toBeOnTheScreen();
  });

  it('opens a place for editing when its card is pressed', async () => {
    fetchMyPlaces.mockResolvedValue([place({ id: 'p7' })]);

    await renderScreen(<ProfileScreen />);
    await userEvent.press(await screen.findByRole('button', { name: /Casa Românească/ }));

    expect(mockPush).toHaveBeenCalledWith('/edit/p7');
  });

  it('invites a first submission rather than showing an empty box', async () => {
    fetchMyPlaces.mockResolvedValue([]);

    await renderScreen(<ProfileScreen />);

    expect(await screen.findByText('Places you add show up here.')).toBeOnTheScreen();
  });

  it('offers to try again when the read fails', async () => {
    fetchMyPlaces.mockRejectedValueOnce(new Error('offline'));

    await renderScreen(<ProfileScreen />);

    expect(await screen.findByText('Your places could not be loaded.')).toBeOnTheScreen();

    fetchMyPlaces.mockResolvedValue([place()]);
    await userEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Casa Românească')).toBeOnTheScreen();
  });

  it('does not ask for a stranger’s places', async () => {
    // Nobody is signed in, so there is nothing of theirs to read — and asking
    // anonymously would only come back empty.
    currentUser.mockResolvedValue(null);

    await renderScreen(<ProfileScreen />);

    await waitFor(() => expect(screen.getByText('Browsing needs no account.')).toBeOnTheScreen());
    expect(fetchMyPlaces).not.toHaveBeenCalled();
  });

  it('speaks Romanian', async () => {
    await i18n.changeLanguage('ro');
    fetchMyPlaces.mockResolvedValue([place({ status: 'approved' })]);

    await renderScreen(<ProfileScreen />);

    expect(await screen.findByText('Locurile tale')).toBeOnTheScreen();
    expect(screen.getByText('Aprobat')).toBeOnTheScreen();
  });
});

describe('Profile tab, deleting the account', () => {
  beforeEach(() => {
    currentUser.mockResolvedValue(ana);
  });

  async function openConfirmation() {
    await renderScreen(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('ana.pop@example.com')).toBeOnTheScreen());
    await userEvent.press(screen.getByRole('button', { name: 'Delete account' }));
  }

  it('asks first, and says what goes with the account', async () => {
    await openConfirmation();

    expect(screen.getByText('Delete your account?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Your account, the places you added — including any still waiting for review — and their photos are removed for good.'
      )
    ).toBeOnTheScreen();
    // The first press only asks: nothing has been deleted yet.
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('takes a screen reader to the question it just asked', async () => {
    // The link that was pressed is gone, so focus would otherwise land nowhere.
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});

    await openConfirmation();

    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
  });

  it('keeps the account when the person changes their mind', async () => {
    await openConfirmation();

    await userEvent.press(screen.getByRole('button', { name: 'Keep my account' }));

    expect(screen.queryByText('Delete your account?')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeOnTheScreen();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes on the second, explicit press, and the tab goes back to the invitation', async () => {
    deleteAccount.mockResolvedValue(undefined);
    await openConfirmation();

    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    expect(deleteAccount).toHaveBeenCalledTimes(1);

    // As with signing out, the session state redraws the tab, not the button.
    await emitAuthChange(null);
    await waitFor(() => expect(screen.getByText('Browsing needs no account.')).toBeOnTheScreen());
  });

  it('drops what this device remembers of the account’s places', async () => {
    // An approved place goes with its author, so the Map and the List must not
    // keep drawing it from the cache.
    deleteAccount.mockResolvedValue(undefined);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await openConfirmation();

    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['places'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['place'] });
  });

  it('shows the deletion in progress, and cannot be pressed twice', async () => {
    deleteAccount.mockImplementation(() => new Promise(() => {}));
    await openConfirmation();

    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    expect(await screen.findByText('Deleting your account')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Delete my account' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Keep my account' })).not.toBeOnTheScreen();
  });

  it('says so when the deletion failed, and offers it again', async () => {
    deleteAccount.mockRejectedValueOnce(new Error('Failed to delete account'));
    await openConfirmation();

    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    expect(
      await screen.findByText('Your account was not deleted. Check your connection and try again.')
    ).toBeOnTheScreen();
    expect(screen.getByText('ana.pop@example.com')).toBeOnTheScreen();

    deleteAccount.mockResolvedValue(undefined);
    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    expect(deleteAccount).toHaveBeenCalledTimes(2);
  });

  it('speaks Romanian', async () => {
    await i18n.changeLanguage('ro');
    await renderScreen(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('ana.pop@example.com')).toBeOnTheScreen());

    await userEvent.press(screen.getByRole('button', { name: 'Șterge contul' }));

    expect(screen.getByText('Ștergi contul?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Șterge-mi contul' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Păstrează contul' })).toBeOnTheScreen();
  });
});

describe('Profile tab, language', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('says which language the app is in', async () => {
    currentUser.mockResolvedValue(ana);

    await renderScreen(<ProfileScreen />);

    expect(await screen.findByText('Language')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Română' })).not.toBeChecked();
  });

  it('switches the whole tab, and keeps the choice for the next launch', async () => {
    currentUser.mockResolvedValue(ana);
    await renderScreen(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('ana.pop@example.com')).toBeOnTheScreen());

    await userEvent.press(screen.getByRole('radio', { name: 'Română' }));

    // The page redraws in place — the header, the blocks and the way out.
    expect(await screen.findByText('Profil')).toBeOnTheScreen();
    expect(screen.getByText('Limba')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ieși din cont' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Română' })).toBeChecked();
    expect(await AsyncStorage.getItem(LANGUAGE_KEY)).toBe('ro');

    // And back again, from the Romanian page.
    await userEvent.press(screen.getByRole('radio', { name: 'English' }));
    expect(await screen.findByText('Profile')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem(LANGUAGE_KEY)).toBe('en');
  });

  it('names each language in its own words, whatever the app is speaking', async () => {
    await i18n.changeLanguage('ro');
    currentUser.mockResolvedValue(ana);

    await renderScreen(<ProfileScreen />);

    expect(await screen.findByRole('radio', { name: 'English' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Română' })).toBeChecked();
  });

  it('is there for someone who never signs in', async () => {
    // Most people browse without an account, and they read the app too.
    currentUser.mockResolvedValue(null);

    await renderScreen(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Browsing needs no account.')).toBeOnTheScreen());

    await userEvent.press(screen.getByRole('radio', { name: 'Română' }));

    expect(await screen.findByText('Ca să te uiți, nu ai nevoie de cont.')).toBeOnTheScreen();
  });
});

describe('Profile tab, privacy policy', () => {
  const POLICY = 'https://rospot.example/privacy/';
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_PRIVACY_URL = POLICY;
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_PRIVACY_URL;
    openURL.mockRestore();
  });

  it('opens the hosted policy from a signed-in page', async () => {
    currentUser.mockResolvedValue(ana);

    await renderScreen(<ProfileScreen />);

    await userEvent.press(await screen.findByRole('link', { name: 'Privacy policy' }));
    expect(openURL).toHaveBeenCalledWith(`${POLICY}?lang=en`);
  });

  it('is there for someone who never signs in', async () => {
    currentUser.mockResolvedValue(null);

    await renderScreen(<ProfileScreen />);

    await userEvent.press(await screen.findByRole('link', { name: 'Privacy policy' }));
    expect(openURL).toHaveBeenCalledWith(`${POLICY}?lang=en`);
  });

  it('is not offered until the build has somewhere to send it', async () => {
    // A link that can only fail is worse than none: the policy is not
    // published until it has a home.
    delete process.env.EXPO_PUBLIC_PRIVACY_URL;
    currentUser.mockResolvedValue(ana);

    await renderScreen(<ProfileScreen />);

    await waitFor(() => expect(screen.getByText('Language')).toBeOnTheScreen());
    expect(screen.queryByRole('link', { name: 'Privacy policy' })).not.toBeOnTheScreen();
  });

  it('speaks Romanian', async () => {
    await i18n.changeLanguage('ro');
    currentUser.mockResolvedValue(null);

    await renderScreen(<ProfileScreen />);

    // And opens the Romanian page — the policy follows the app's language.
    await userEvent.press(
      await screen.findByRole('link', { name: 'Politica de confidențialitate' })
    );
    expect(openURL).toHaveBeenCalledWith(`${POLICY}?lang=ro`);
  });
});
