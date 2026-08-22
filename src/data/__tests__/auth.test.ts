/**
 * The auth seam's own logic, with Supabase mocked out: what the app does with
 * each answer the service can give. The answers themselves — that sign-up
 * really returns a session, that the session really survives a restart — are
 * the integration suite's job (`auth.integration.test.ts`).
 */
import { AuthError } from '@supabase/supabase-js';

import { AuthProblem, currentUser, onAuthChange, signIn, signOut, signUp } from '../auth';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('../supabase') as {
  supabase: {
    auth: {
      signUp: jest.Mock;
      signInWithPassword: jest.Mock;
      signOut: jest.Mock;
      getSession: jest.Mock;
      onAuthStateChange: jest.Mock;
    };
  };
};

const user = { id: 'u1', email: 'ana@example.com', identities: [{ id: 'i1' }] };
const session = { access_token: 'token', user };

/** What Supabase returns for a code we have words for. */
function apiError(code: string) {
  return new AuthError('whatever the server said', 400, code);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('signIn', () => {
  it('signs in with the address as typed, trimmed', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null });

    await signIn('  ana@example.com ', 'parola123');

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'parola123',
    });
  });

  it('reports a wrong password as invalid credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: apiError('invalid_credentials'),
    });

    await expect(signIn('ana@example.com', 'wrong')).rejects.toMatchObject({
      reason: 'invalidCredentials',
    });
  });

  it('reports an unconfirmed address as its own problem', async () => {
    // Only reachable with confirmations turned back on, which is where this
    // project is heading before launch — "wrong password" would be a lie.
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: apiError('email_not_confirmed'),
    });

    await expect(signIn('ana@example.com', 'parola123')).rejects.toMatchObject({
      reason: 'emailNotConfirmed',
    });
  });

  it('reports a dead connection as offline rather than as a bad password', async () => {
    // `AuthRetryableFetchError` carries no code — the network never got an
    // answer to code — and telling someone their password is wrong when their
    // phone is on a dead train is the worst thing this screen could say.
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new AuthError('Failed to fetch', 0, undefined),
    });

    await expect(signIn('ana@example.com', 'parola123')).rejects.toMatchObject({
      reason: 'offline',
    });
  });
});

describe('signUp', () => {
  it('signs the new account straight in when the project confirms addresses itself', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session, user }, error: null });

    await expect(signUp('ana@example.com', 'parola123')).resolves.toBe('signedIn');
  });

  it('asks for the confirmation email when no session comes back', async () => {
    // The project setting can be flipped from the dashboard, so the client has
    // to be able to say "go and check your inbox" without a code change.
    supabase.auth.signUp.mockResolvedValue({ data: { session: null, user }, error: null });

    await expect(signUp('ana@example.com', 'parola123')).resolves.toBe('confirmationRequired');
  });

  it('reports an address that already has an account', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: apiError('user_already_exists'),
    });

    await expect(signUp('ana@example.com', 'parola123')).rejects.toMatchObject({
      reason: 'emailTaken',
    });
  });

  it('reports the identity-less user Supabase returns instead of admitting the address is taken', async () => {
    // With confirmations on, Supabase answers a duplicate sign-up with a
    // success-shaped user carrying no identities, so that a stranger can't
    // enumerate who has an account. Read as "confirmation sent", it would leave
    // someone waiting for an email that never comes.
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: { ...user, identities: [] } },
      error: null,
    });

    await expect(signUp('ana@example.com', 'parola123')).rejects.toMatchObject({
      reason: 'emailTaken',
    });
  });

  it('reports a password the project considers weak', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: apiError('weak_password'),
    });

    await expect(signUp('ana@example.com', 'abc')).rejects.toMatchObject({
      reason: 'weakPassword',
    });
  });

  it('reports an address the server rejects as malformed', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: apiError('email_address_invalid'),
    });

    await expect(signUp('ana@', 'parola123')).rejects.toMatchObject({
      reason: 'emailInvalid',
    });
  });

  it('reports too many attempts as its own problem', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: apiError('over_email_send_rate_limit'),
    });

    await expect(signUp('ana@example.com', 'parola123')).rejects.toMatchObject({
      reason: 'rateLimited',
    });
  });

  it('falls back to the unknown reason for a code it has no words for', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: apiError('hook_timeout'),
    });

    const problem = await signUp('ana@example.com', 'parola123').catch((error) => error);

    expect(problem).toBeInstanceOf(AuthProblem);
    expect(problem.reason).toBe('unknown');
    // The server's own words survive for the log, even though the screen shows
    // the app's.
    expect(problem.message).toContain('whatever the server said');
  });
});

describe('signOut', () => {
  it('signs out', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('reports a sign-out that left the session on the device', async () => {
    // The only failure worth a word to the user: supabase-js answers "there was
    // nothing to revoke" with success, and on any other failure it drops the
    // local session before returning the error — so an error reaching here
    // means the client couldn't even read the session it was asked to end.
    supabase.auth.signOut.mockResolvedValue({ error: new AuthError('Failed to fetch', 0) });

    await expect(signOut()).rejects.toMatchObject({ reason: 'offline' });
  });
});

describe('currentUser', () => {
  it('reads back the stored session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    await expect(currentUser()).resolves.toEqual({ id: 'u1', email: 'ana@example.com' });
  });

  it('is nobody when there is no stored session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(currentUser()).resolves.toBeNull();
  });

  it('is nobody when the stored session cannot be read', async () => {
    // A corrupt or unreadable store is an anonymous app, not a broken one:
    // browsing needs no account, so there is nothing here worth an error screen.
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: apiError('bad_jwt'),
    });

    await expect(currentUser()).resolves.toBeNull();
  });
});

describe('onAuthChange', () => {
  it('reports the user on every change, and unsubscribes', () => {
    const unsubscribe = jest.fn();
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
    const listener = jest.fn();

    const stop = onAuthChange(listener);
    const [emit] = supabase.auth.onAuthStateChange.mock.calls[0] as [
      (event: string, session: unknown) => void,
    ];

    emit('SIGNED_IN', session);
    expect(listener).toHaveBeenCalledWith({ id: 'u1', email: 'ana@example.com' });

    emit('SIGNED_OUT', null);
    expect(listener).toHaveBeenCalledWith(null);

    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
