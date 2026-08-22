/**
 * The auth contract, against the real `rospot` project — the half of this slice
 * that mocks can't prove: that a new account really comes back with a session,
 * that a second client finds the session through the storage adapter rather
 * than through the client that wrote it (the wiring an app restart depends on),
 * and that the server's refusals really arrive as the codes
 * `src/data/auth.ts` maps.
 *
 * It assumes the project confirms addresses itself (`mailer_autoconfirm` on),
 * which is the state the owner chose for the soft launch. Turn confirmations
 * back on before public launch and this suite is where you find out: sign-up
 * will answer `confirmationRequired`, and everything after it needs an inbox.
 *
 * `jest.config.js` drops this file when the Supabase env is absent, so a fresh
 * clone doesn't fail on missing credentials.
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProblem, currentUser, signIn, signOut, signUp } from '../auth';
import type { Database } from '../database.types';
import { supabase } from '../supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A throwaway account per run: two runs must not race over one row, and a
// leftover from a crashed run must not make the next one fail as "taken".
const email = `rospot-auth-suite-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
const password = 'parola-de-proba-123';

afterAll(async () => {
  // The client refreshes tokens on an interval; without this Jest hangs on the
  // open timer after the last assertion.
  supabase.auth.stopAutoRefresh();
  await supabase.auth.signOut();

  const { data } = await admin.auth.admin.listUsers();
  const throwaway = data?.users.find((user) => user.email === email);
  if (throwaway) await admin.auth.admin.deleteUser(throwaway.id);
});

describe('auth against the real project', () => {
  it('signs a new account straight in', async () => {
    // The project's own setting, asserted rather than assumed — the sign-up
    // screen navigates away on this answer and points at an inbox on the other.
    await expect(signUp(email, password)).resolves.toBe('signedIn');
    await expect(currentUser()).resolves.toMatchObject({ email });
  });

  it('keeps the session where a restarted app will find it', async () => {
    // A second client, built the way `src/data/supabase.ts` builds the app's
    // one, finding the session through the storage adapter rather than through
    // the client that wrote it. That is the wiring a cold start depends on —
    // not a cold start itself, which needs a device this machine hasn't got.
    const restarted = createClient<Database>(url, anonKey, {
      auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: false },
    });

    const { data } = await restarted.auth.getSession();

    expect(data.session?.user.email).toBe(email);
  });

  it('refuses a second account on the same address', async () => {
    await expect(signUp(email, password)).rejects.toMatchObject({ reason: 'emailTaken' });
  });

  it('refuses the wrong password', async () => {
    await expect(signIn(email, 'not-the-password')).rejects.toBeInstanceOf(AuthProblem);
    await expect(signIn(email, 'not-the-password')).rejects.toMatchObject({
      reason: 'invalidCredentials',
    });
  });

  it('signs out and back in', async () => {
    await signOut();
    await expect(currentUser()).resolves.toBeNull();

    await signIn(email, password);
    await expect(currentUser()).resolves.toMatchObject({ email });
  });
});
