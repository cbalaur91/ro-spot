import { render, screen, userEvent } from '@testing-library/react-native';

import i18n from '@/i18n';
import { SessionProvider } from '@/state/session';

import ReportScreen from '../[id]';

// The real `SessionProvider` over a mocked data seam, as the Add and Profile
// suites do: the gate is the session, and a mocked `useSession` would test the mock.
jest.mock('@/data/auth', () => ({ currentUser: jest.fn(), onAuthChange: jest.fn() }));
jest.mock('@/data/reports', () => ({ reportPlace: jest.fn() }));

// `mock`-prefixed so Jest lets the factory close over them.
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'place-1' }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();

const { currentUser, onAuthChange } = jest.requireMock('@/data/auth') as Record<string, jest.Mock>;
const { reportPlace } = jest.requireMock('@/data/reports') as Record<string, jest.Mock>;

const ana = { id: 'u1', email: 'ana.pop@example.com' };

async function renderScreen() {
  await render(
    <SessionProvider>
      <ReportScreen />
    </SessionProvider>
  );
}

async function renderSignedIn() {
  currentUser.mockResolvedValue(ana);
  await renderScreen();
  await screen.findByLabelText('What’s wrong (optional)');
}

beforeEach(async () => {
  jest.clearAllMocks();
  onAuthChange.mockReturnValue(jest.fn());
  reportPlace.mockResolvedValue(undefined);
  await i18n.changeLanguage('en');
});

describe('Report a problem, signed out', () => {
  it('asks for an account before anything else', async () => {
    currentUser.mockResolvedValue(null);

    await renderScreen();

    expect(await screen.findByText('Reporting a problem needs an account.')).toBeTruthy();
    expect(screen.queryByLabelText('What’s wrong (optional)')).toBeNull();

    await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    // Pushed rather than replaced: signing in comes back here, to the form.
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('does not flash the invitation at someone already signed in', async () => {
    // The stored session is still being read.
    currentUser.mockReturnValue(new Promise(() => {}));

    await renderScreen();

    expect(await screen.findByText('Loading your account')).toBeTruthy();
    expect(screen.queryByText('Reporting a problem needs an account.')).toBeNull();
  });

  it('asks in Romanian too', async () => {
    currentUser.mockResolvedValue(null);
    await i18n.changeLanguage('ro');

    await renderScreen();

    expect(await screen.findByText('Ca să raportezi o problemă ai nevoie de un cont.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Intră în cont' })).toBeTruthy();
  });
});

describe('Report a problem, signed in', () => {
  it('sends the place and the note as written', async () => {
    await renderSignedIn();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('What’s wrong (optional)'), 'Closed for good.');
    await user.press(screen.getByRole('button', { name: 'Send report' }));

    expect(reportPlace).toHaveBeenCalledWith('place-1', 'Closed for good.');
    expect(await screen.findByText('Thanks — the moderator will take a look.')).toBeTruthy();
  });

  it('takes one tap: a report needs no words', async () => {
    await renderSignedIn();

    await userEvent.press(screen.getByRole('button', { name: 'Send report' }));

    expect(reportPlace).toHaveBeenCalledWith('place-1', '');
    expect(await screen.findByText('Thanks — the moderator will take a look.')).toBeTruthy();
  });

  it('keeps every word when the send fails, and says so', async () => {
    reportPlace.mockRejectedValueOnce(new Error('Failed to report place: offline'));
    await renderSignedIn();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('What’s wrong (optional)'), 'Wrong address.');
    await user.press(screen.getByRole('button', { name: 'Send report' }));

    expect(
      await screen.findByText('The report wasn’t sent. Check your connection and try again.')
    ).toBeTruthy();
    expect(screen.getByLabelText('What’s wrong (optional)').props.value).toBe('Wrong address.');

    await user.press(screen.getByRole('button', { name: 'Send report' }));
    expect(reportPlace).toHaveBeenLastCalledWith('place-1', 'Wrong address.');
    expect(await screen.findByText('Thanks — the moderator will take a look.')).toBeTruthy();
  });

  it('sends once, however often the pill is pressed while it is sending', async () => {
    let land: () => void = () => {};
    reportPlace.mockReturnValue(new Promise<void>((resolve) => (land = resolve)));
    await renderSignedIn();
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Send report' }));
    await user.press(screen.getByRole('button', { name: 'Send report' }));

    expect(reportPlace).toHaveBeenCalledTimes(1);
    land();
    expect(await screen.findByText('Thanks — the moderator will take a look.')).toBeTruthy();
  });

  it('goes back to the place once it is sent', async () => {
    await renderSignedIn();
    await userEvent.press(screen.getByRole('button', { name: 'Send report' }));

    await userEvent.press(await screen.findByRole('button', { name: 'Back to the place' }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('can be left without sending anything', async () => {
    await renderSignedIn();

    await userEvent.press(screen.getByRole('button', { name: 'Back to the place' }));

    expect(mockBack).toHaveBeenCalled();
    expect(reportPlace).not.toHaveBeenCalled();
  });
});
