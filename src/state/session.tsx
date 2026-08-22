import { createContext, useContext, useEffect, useState } from 'react';

import { type AuthUser, currentUser, onAuthChange } from '@/data/auth';

type SessionState = {
  /** Null when nobody is signed in — which is most of the app's users. */
  user: AuthUser | null;
  /**
   * True until the stored session has been read back off the device. Screens
   * that draw a different thing for each answer wait for it rather than
   * flashing the anonymous one at someone who is already signed in.
   */
  isLoading: boolean;
};

const SessionContext = createContext<SessionState | null>(null);

/**
 * Who is signed in, for the whole app.
 *
 * The session itself lives in Supabase's client and on the device (supabase-js
 * persists it through AsyncStorage and refreshes it on its own) — this is only
 * the part of it React needs to re-render on. That is why restart-persistence
 * takes no code here beyond reading the store once on mount.
 *
 * It sits above the tabs rather than inside them because the sign-in screen is
 * pushed onto the root stack, outside the tab navigator.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ user: null, isLoading: true });

  useEffect(() => {
    // The stored-session read and the subscription race on a cold start: a
    // sign-in can land while the read is still in flight. The read holds the
    // older answer, so once anything newer has arrived it may only stop the
    // loading state — writing its user would sign someone back out.
    let answered = false;

    function settle(user: AuthUser | null) {
      answered = true;
      setState({ user, isLoading: false });
    }

    const stop = onAuthChange(settle);

    void currentUser().then((user) => {
      if (answered) {
        setState((current) => ({ ...current, isLoading: false }));
        return;
      }
      settle(user);
    });

    return stop;
  }, []);

  // The state object is the context value as it stands: it only ever changes
  // when who is signed in changes, so there is nothing to memoise around it.
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error('useSession must be used inside a SessionProvider');
  }

  return session;
}
