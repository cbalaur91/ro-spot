import { act, renderHook, waitFor } from '@testing-library/react-native';

import { SessionProvider, useSession } from '../session';

jest.mock('@/data/auth', () => ({
  currentUser: jest.fn(),
  onAuthChange: jest.fn(),
}));

const { currentUser, onAuthChange } = jest.requireMock('@/data/auth') as {
  currentUser: jest.Mock;
  onAuthChange: jest.Mock;
};

const ana = { id: 'u1', email: 'ana@example.com' };

/**
 * The listener the provider handed to `onAuthChange`, called the way Supabase
 * calls it — from outside React, which is what `act` is standing in for here.
 */
async function emitAuthChange(user: unknown) {
  const [listener] = onAuthChange.mock.calls[0] as [(user: unknown) => void];
  await act(async () => {
    listener(user);
  });
}

const unsubscribe = jest.fn();

function wrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/** A read that never answers, so what the hook shows can only be its own state. */
const neverResolves = () => new Promise(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  onAuthChange.mockReturnValue(unsubscribe);
});

describe('useSession', () => {
  it('reads the stored session back on mount — the restart', async () => {
    currentUser.mockResolvedValue(ana);

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.user).toEqual(ana));
    expect(result.current.isLoading).toBe(false);
  });

  it('is nobody once the store answers with nothing', async () => {
    currentUser.mockResolvedValue(null);

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('is loading until the store answers', async () => {
    // The Profile tab draws a different screen for each answer, and drawing the
    // anonymous one first would flash "sign in" at someone who already is.
    currentUser.mockImplementation(neverResolves);

    const { result } = await renderHook(() => useSession(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('follows a sign-in and a sign-out', async () => {
    currentUser.mockResolvedValue(null);

    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await emitAuthChange(ana);
    await waitFor(() => expect(result.current.user).toEqual(ana));

    await emitAuthChange(null);
    await waitFor(() => expect(result.current.user).toBeNull());
  });

  it('lets a sign-in that lands mid-read stand', async () => {
    // The stored-session read and the subscription race on a cold start. The
    // read is the older answer, so it must not overwrite the newer one — that
    // would sign a user back out a moment after they signed in.
    let answerTheRead = (_user: unknown) => {};
    currentUser.mockImplementation(() => new Promise((resolve) => (answerTheRead = resolve)));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await emitAuthChange(ana);
    await waitFor(() => expect(result.current.user).toEqual(ana));

    answerTheRead(null);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(ana);
  });

  it('stops listening when the provider goes away', async () => {
    currentUser.mockResolvedValue(null);

    const { unmount } = await renderHook(() => useSession(), { wrapper });
    await unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('refuses to be used without a provider', async () => {
    currentUser.mockResolvedValue(null);
    // React logs the thrown render error; the test is about the message.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useSession())).rejects.toThrow('SessionProvider');

    consoleError.mockRestore();
  });
});
