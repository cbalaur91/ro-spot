import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import i18n from '@/i18n';
import { SessionProvider } from '@/state/session';

import ProfileScreen from '../profile';

// The real `SessionProvider` over a mocked data seam: the tab's whole job is to
// reflect the session, and a mocked `useSession` would assert that we wrote the
// screen we wrote.
jest.mock('@/data/auth', () => ({
  currentUser: jest.fn(),
  onAuthChange: jest.fn(),
  signOut: jest.fn(),
}));

// `mock`-prefixed so Jest lets the factory close over it.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockPush = jest.fn();

const { currentUser, onAuthChange, signOut } = jest.requireMock('@/data/auth') as {
  currentUser: jest.Mock;
  onAuthChange: jest.Mock;
  signOut: jest.Mock;
};

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

async function renderScreen(ui: ReactElement) {
  return render(<SessionProvider>{ui}</SessionProvider>);
}

beforeEach(async () => {
  jest.clearAllMocks();
  onAuthChange.mockReturnValue(jest.fn());
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
