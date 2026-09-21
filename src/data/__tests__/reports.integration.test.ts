/**
 * The report contract, against the real `rospot` project: who may report a
 * place, what a report records, and that nobody but the moderator reads one.
 * The policies are the thing under test, so a mock would only assert that we
 * called the method we called.
 *
 * `jest.config.js` drops this file when the Supabase env is absent.
 */
import { createClient } from '@supabase/supabase-js';

import { signUp } from '../auth';
import type { Database } from '../database.types';
import { SEEDED_APPROVED_PLACE_ID } from '../fixtures';
import { reportPlace } from '../reports';
import { supabase } from '../supabase';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
/** A second signed-in person, on their own client: the shared one holds the reporter. */
const stranger = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A throwaway pair of accounts per run, as the other suites do: two runs of this
// file must not be able to see each other's rows.
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const reporter = { email: `rospot-report-suite-${stamp}@example.com`, password: 'parola-de-proba-123' };
const other = { email: `rospot-report-other-${stamp}@example.com`, password: 'parola-de-proba-123' };

const NOTE = `Closed for good — report suite ${stamp}`;

let reporterId: string;
let otherId: string;
/** A place nobody but the service role can see: pending, and nobody's. */
let pendingPlaceId: string;

/** Every report one account wrote, oldest first, read with the service role. */
async function reportsBy(id: string) {
  const { data } = await admin
    .from('reports')
    .select('*')
    .eq('reporter_id', id)
    .order('created_at', { ascending: true });
  return data ?? [];
}

beforeAll(async () => {
  await signUp(reporter.email, reporter.password);
  const { data } = await supabase.auth.getUser();
  reporterId = data.user!.id;

  const created = await stranger.auth.signUp(other);
  otherId = created.data.user!.id;

  const { data: pending } = await admin
    .from('places')
    .insert({
      name: `Report suite pending ${stamp}`,
      category: 'services',
      description: 'Written by the report suite; deleted when it finishes.',
      address: '1 Test St, Detroit, MI 48226',
      lat: 42.3314,
      lng: -83.0458,
      status: 'pending',
    })
    .select('id')
    .single();
  pendingPlaceId = pending!.id;
}, 60000);

afterAll(async () => {
  supabase.auth.stopAutoRefresh();
  await supabase.auth.signOut();
  await stranger.auth.signOut();

  // Deleting the users cascades to their reports; deleting the place to any
  // report that slipped past the policy onto it.
  await admin.auth.admin.deleteUser(reporterId);
  await admin.auth.admin.deleteUser(otherId);
  await admin.from('places').delete().eq('id', pendingPlaceId);
}, 60000);

describe('reporting a place', () => {
  it('records the place, the reporter and the note', async () => {
    await reportPlace(SEEDED_APPROVED_PLACE_ID, NOTE);

    const reports = await reportsBy(reporterId);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      place_id: SEEDED_APPROVED_PLACE_ID,
      reporter_id: reporterId,
      note: NOTE,
    });
  });

  it('takes one tap: no note is a report too', async () => {
    await reportPlace(SEEDED_APPROVED_PLACE_ID, null);
    // What the screen sends when nothing was typed, or only the space bar.
    await reportPlace(SEEDED_APPROVED_PLACE_ID, '  \n ');

    const reports = await reportsBy(reporterId);
    expect(reports).toHaveLength(3);
    expect(reports[1].note).toBeNull();
    expect(reports[2].note).toBeNull();
  });
});

describe('what the policies refuse', () => {
  it('an anonymous report', async () => {
    const { error } = await anon
      .from('reports')
      .insert({ place_id: SEEDED_APPROVED_PLACE_ID, reporter_id: reporterId });

    expect(error).not.toBeNull();
  });

  it('a report in somebody else’s name', async () => {
    const { error } = await supabase
      .from('reports')
      .insert({ place_id: SEEDED_APPROVED_PLACE_ID, reporter_id: otherId });

    expect(error).not.toBeNull();
    expect(await reportsBy(otherId)).toEqual([]);
  });

  it('a report on a place the reporter cannot see', async () => {
    // Somebody else's pending submission: refused, and refused the same way a
    // made-up id is, so the refusal doesn't confirm the place exists.
    await expect(reportPlace(pendingPlaceId, NOTE)).rejects.toThrow('Failed to report place');
    await expect(
      reportPlace('00000000-0000-4000-8000-00000000dead', NOTE)
    ).rejects.toThrow('Failed to report place');
  });

  it('reading somebody else’s reports', async () => {
    const { data, error } = await stranger.from('reports').select('*');

    // Refused outright — not an empty answer, which a select policy added later
    // could quietly turn into a full one.
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('reading your own, or anyone’s without an account', async () => {
    // The moderator's inbox, not the reporter's: nothing to read back, and no
    // way to learn what else was reported about a place.
    const mine = await supabase.from('reports').select('*');
    expect(mine.error).not.toBeNull();

    const anonymous = await anon.from('reports').select('*');
    expect(anonymous.error).not.toBeNull();
  });

  it('changing or withdrawing a report', async () => {
    const [report] = await reportsBy(reporterId);

    const edited = await supabase.from('reports').update({ note: 'changed' }).eq('id', report.id);
    expect(edited.error).not.toBeNull();

    const withdrawn = await supabase.from('reports').delete().eq('id', report.id);
    expect(withdrawn.error).not.toBeNull();

    expect(await reportsBy(reporterId)).toHaveLength(3);
  });

  it('writes no row for anything it refused', async () => {
    expect(await reportsBy(otherId)).toEqual([]);
    const { data } = await admin.from('reports').select('id').eq('place_id', pendingPlaceId);
    expect(data).toEqual([]);
  });
});
