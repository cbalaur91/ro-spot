-- Submissions: the first writes anyone but the owner may make.
--
-- Pre-moderation is enforced here rather than in the client. A signed-in person
-- may add a place only as themselves and only as `pending`; there is still no
-- update policy, so approving it remains the moderator's job in the dashboard.

create policy "Signed-in users submit pending places as themselves"
  on public.places
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'pending'
    -- The spec's floor of one photo lives here, not in a table constraint: an
    -- owner-seeded place may exist before its photos do, a submission may not.
    and coalesce(array_length(photo_paths, 1), 0) >= 1
    -- Every path is one file directly inside the submitter's own folder, so a row
    -- can't borrow another place's photos. A whole-path match rather than a
    -- prefix: `<uid>/../seed/x.jpg` starts the right way and resolves elsewhere.
    and not exists (
      select 1
      from unnest(photo_paths) as photo_path
      where photo_path !~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]+\.jpg$')
    )
  );

-- The folder is the handle: `<author_id>/<file>.jpg`, as the bucket migration
-- promised. Insert only — no select, update or delete, so a photo behind an
-- approved place can't be swapped or removed after the moderator looked at it.
-- Public reads don't consult these policies at all (the bucket is public).
create policy "Signed-in users upload place photos into their own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'place-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
