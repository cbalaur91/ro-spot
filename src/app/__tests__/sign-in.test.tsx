import { render, screen, userEvent } from '@testing-library/react-native';

import i18n from '@/i18n';

import SignInScreen from '../sign-in';

// The screen reads `reason` off the failure, so the mock has to fail with the
// same shape the real module throws. Mocking the class here rather than
// `requireActual` keeps `src/data/supabase.ts` — and its demand for
// credentials — out of a component test.
jest.mock('@/data/auth', () => {
  class AuthProblem extends Error {
    reason: string;

    constructor(reason: string, message: string) {
      super(message);
      this.reason = reason;
    }
  }

  return { AuthProblem, signIn: jest.fn(), signUp: jest.fn() };
});

// `mock`-prefixed so Jest lets the factory close over them.
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: mockCanGoBack }),
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);

const { AuthProblem, signIn, signUp } = jest.requireMock('@/data/auth') as {
  AuthProblem: new (reason: string, message: string) => Error;
  signIn: jest.Mock;
  signUp: jest.Mock;
};

async function fillCredentials(email = 'ana@example.com', password = 'parola123') {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
}

beforeEach(async () => {
  jest.clearAllMocks();
  // `clearAllMocks` forgets the calls but keeps the return values, and one test
  // needs this one false.
  mockCanGoBack.mockReturnValue(true);
  await i18n.changeLanguage('en');
});

describe('sign-in screen', () => {
  it('signs in and returns to where the user came from', async () => {
    signIn.mockResolvedValue(undefined);
    await render(<SignInScreen />);

    await fillCredentials();
    await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(signIn).toHaveBeenCalledWith('ana@example.com', 'parola123');
    expect(mockBack).toHaveBeenCalled();
  });

  it('goes to the Profile tab when there is nowhere to go back to', async () => {
    // A deep link, or a cold start straight onto this route: `back()` would be
    // a button that does nothing.
    mockCanGoBack.mockReturnValue(false);
    signIn.mockResolvedValue(undefined);
    await render(<SignInScreen />);

    await fillCredentials();
    await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockReplace).toHaveBeenCalledWith('/profile');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('says what went wrong in the app’s own words', async () => {
    signIn.mockRejectedValue(new AuthProblem('invalidCredentials', 'Invalid login credentials'));
    await render(<SignInScreen />);

    await fillCredentials('ana@example.com', 'wrong');
    await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('That email and password don’t go together.')).toBeOnTheScreen();
    // The server's English is for the log, not for the screen.
    expect(screen.queryByText('Invalid login credentials')).not.toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('blames the network rather than the password when the request never lands', async () => {
    signIn.mockRejectedValue(new AuthProblem('offline', 'Failed to fetch'));
    await render(<SignInScreen />);

    await fillCredentials();
    await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      screen.getByText('No answer from the network. Check your connection and try again.')
    ).toBeOnTheScreen();
  });

  it('asks for the fields before asking the server', async () => {
    await render(<SignInScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your email and your password.')).toBeOnTheScreen();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('creates an account in the other mode', async () => {
    signUp.mockResolvedValue('signedIn');
    await render(<SignInScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Create an account' }));
    await fillCredentials();
    await userEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(signUp).toHaveBeenCalledWith('ana@example.com', 'parola123');
    expect(signIn).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('stays put and points at the inbox when the account still has to be confirmed', async () => {
    // The project confirms addresses itself today. The day that switch flips,
    // walking someone into a signed-out app with no explanation is the failure.
    signUp.mockResolvedValue('confirmationRequired');
    await render(<SignInScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Create an account' }));
    await fillCredentials();
    await userEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(
      screen.getByText('Check your inbox to confirm your address, then sign in.')
    ).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    // Back in sign-in mode, which is what they do next.
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
  });

  it('shows the password only when asked', async () => {
    await render(<SignInScreen />);
    const password = screen.getByLabelText('Password');

    expect(password.props.secureTextEntry).toBe(true);

    await userEvent.press(screen.getByRole('button', { name: 'Show' }));

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
  });

  it('takes one submission at a time', async () => {
    // Two taps on a slow connection are two accounts, or two failed sign-ins
    // and a rate limit.
    signIn.mockImplementation(() => new Promise(() => {}));
    await render(<SignInScreen />);

    await fillCredentials();
    // The same control both times: while the request is in flight the pill
    // trades its label for a spinner, so it can no longer be found by name.
    const submit = screen.getByRole('button', { name: 'Sign in' });
    await userEvent.press(submit);
    await userEvent.press(submit);

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
  });

  it('speaks Romanian', async () => {
    await i18n.changeLanguage('ro');
    signIn.mockRejectedValue(new AuthProblem('invalidCredentials', 'Invalid login credentials'));
    await render(<SignInScreen />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Parolă'), 'gresit');
    await userEvent.press(screen.getByRole('button', { name: 'Intră în cont' }));

    expect(screen.getByText('Bine ai revenit')).toBeOnTheScreen();
    expect(screen.getByText('Adresa și parola nu se potrivesc.')).toBeOnTheScreen();
  });
});
