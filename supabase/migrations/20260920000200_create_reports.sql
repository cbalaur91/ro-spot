-- Reports (#9): "Report a problem" on a place. A signed-in person says something
-- is wrong with a listing, optionally in their own words; the moderator reads it
-- in the dashboard. Nobody else reads it — not other users, not the reporter.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  -- Cascades with the account: account deletion (#10) takes a person's reports
  -- with it, as it takes their places.
  reporter_id uuid not null references auth.users (id) on delete cascade,
  -- Optional: one tap is a report. When there are words, there are some — a
  -- note of spaces is no note, and the client sends null for it.
  note text check (note is null or char_length(trim(note)) between 1 and 1000),
  created_at timestamptz not null default now()
);

comment on table public.reports is
  'Problems users reported on a place. Moderator-facing: clients may insert their own, and no client may read any.';

-- The moderator reads a place's reports together, newest first.
create index reports_place_id_created_at_idx on public.reports (place_id, created_at desc);

alter table public.reports enable row level security;

-- Insert only, and only the columns a report is made of: `id` and `created_at`
-- are the database's to decide. No select, update or delete privilege at all —
-- a report is written once and read by the moderator, whose dashboard role is
-- not bound by these grants.
revoke all on table public.reports from anon, authenticated;

grant insert (place_id, reporter_id, note) on public.reports to authenticated;

-- As yourself, and about a place you can see. The `exists` runs under the
-- reporter's own policies on `places`, so it admits approved places and the
-- reporter's own — and a pending place somebody else submitted is refused the
-- same way a made-up id is, rather than by a foreign-key error that would
-- confirm it exists.
create policy "Signed-in users report places they can see, as themselves"
  on public.reports
  for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.places where places.id = reports.place_id)
  );
