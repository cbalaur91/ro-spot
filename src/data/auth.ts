import type { AuthError, Session, User } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Who is signed in, as the rest of the app needs to know them. Supabase's own
 * user object carries a dozen fields no screen has a use for; narrowing here
 * keeps the session state small enough to compare and to test.
 */
export type AuthUser = {
  id: string;
  /** Null only for accounts that arrived without one — none exist in v1. */
  email: string | null;
};

/**
 * The things that can go wrong with a sign-in, in the app's own words rather
 * than the server's.
 *
 * The list is short on purpose: it is exactly the set of answers the UI says
 * something different about. Everything else is `unknown` and gets one honest
 * apology, because a message that repeats a server string in English to a
 * Romanian speaker is not a better message.
 */
export type AuthProblemReason =
  | 'invalidCredentials'
  | 'emailTaken'
  | 'emailInvalid'
  | 'weakPassword'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'offline'
  | 'unknown';

/** A failed auth call, carrying the reason a screen chooses its words from. */
export class AuthProblem extends Error {
  readonly reason: AuthProblemReason;

  constructor(reason: AuthProblemReason, message: string) {
    super(message);
    this.name = 'AuthProblem';
    this.reason = reason;
  }
}

/**
 * Supabase's error codes, mapped onto the reasons above.
 *
 * A code the map doesn't name is `unknown` rather than a guess — the server
 * grows codes faster than this app grows screens, and inventing a translation
 * for one of them is how a user gets told the wrong thing confidently.
 */
const REASON_BY_CODE: Readonly<Record<string, AuthProblemReason>> = {
  invalid_credentials: 'invalidCredentials',
  email_exists: 'emailTaken',
  user_already_exists: 'emailTaken',
  email_address_invalid: 'emailInvalid',
  weak_password: 'weakPassword',
  email_not_confirmed: 'emailNotConfirmed',
  over_request_rate_limit: 'rateLimited',
  over_email_send_rate_limit: 'rateLimited',
};

function problemFrom(error: AuthError): AuthProblem {
  // A fetch that never got an answer has no code to read — the request didn't
  // reach the server that would have set one. Saying "wrong password" to a
  // phone with no signal is the worst thing this screen could say.
  const reason = error.code
    ? (REASON_BY_CODE[error.code] ?? 'unknown')
    : 'offline';

  // The server's own words stay on the error for the log; the screen reads
  // `reason` and says something the user can act on.
  return new AuthProblem(reason, error.message);
}

function toAuthUser(session: Session | null): AuthUser | null {
  return session ? { id: session.user.id, email: session.user.email ?? null } : null;
}

/** What a sign-up left behind: a session, or an email on its way. */
export type SignUpOutcome = 'signedIn' | 'confirmationRequired';

/**
 * Supabase hides "that address already has an account" behind a success: with
 * email confirmations on, a duplicate sign-up returns a user with no identities
 * rather than an error, so that a stranger can't enumerate who has an account.
 *
 * The app has to see through it anyway — read as "confirmation sent", it leaves
 * someone waiting for an email that is never going to arrive.
 */
function isMaskedDuplicate(user: User | null): boolean {
  return Boolean(user && user.identities?.length === 0);
}

/**
 * Create an account.
 *
 * Whether the new account is signed in already or has to confirm its address
 * first is the project's setting, not the client's — `rospot` confirms them
 * itself today, and both answers are handled so that turning confirmations back
 * on before launch needs no code change here.
 */
export async function signUp(email: string, password: string): Promise<SignUpOutcome> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) throw problemFrom(error);
  if (isMaskedDuplicate(data.user)) {
    throw new AuthProblem('emailTaken', 'Sign-up returned a user with no identities.');
  }

  return data.session ? 'signedIn' : 'confirmationRequired';
}

/** Sign in to an existing account. */
export async function signIn(email: string, password: string): Promise<void> {
  // Trimmed here rather than in the screen: a keyboard that capitalises and a
  // paste that brings a space are the same mistake, and every caller of this
  // seam wants the same forgiveness.
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw problemFrom(error);
}

/**
 * Sign out.
 *
 * Narrower than it looks. supabase-js already answers "there was no session to
 * revoke" — a missing session, a 401, a 403, a 404 — with success, and on any
 * other failure it drops the local session *before* returning the error. So a
 * throw from here means the session is still on the device, which is the only
 * case where a screen has anything to tell the user.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) throw problemFrom(error);
}

/**
 * Whoever the stored session belongs to, or nobody.
 *
 * A store that can't be read is nobody rather than a failure: browsing needs no
 * account, so an unreadable session is an anonymous app and not a broken one.
 */
export async function currentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getSession();

  return error ? null : toAuthUser(data.session);
}

/**
 * Every later change of who is signed in — a sign-in, a sign-out, a token
 * refreshed in the background. Returns the unsubscribe.
 */
export function onAuthChange(listener: (user: AuthUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(toAuthUser(session));
  });

  return () => data.subscription.unsubscribe();
}
