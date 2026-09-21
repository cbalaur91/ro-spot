-- The duplicate hint, in the words a moderator decides on.
--
-- `place_duplicate_flags` carries two ids, which is all the trigger knows and
-- all the rule needs. A moderator reading it in the dashboard needs the names
-- and the addresses, and writing that join by hand for every flagged row is how
-- a hint becomes something nobody looks at.
--
-- `security_invoker = on`: the view is not a way around the policies on the
-- tables under it. The moderator reads it as `postgres`, which owns those tables
-- and sees everything; a client role that somehow reached it would get the same
-- nothing the flags table already gives them.
create view public.place_duplicate_review
with (security_invoker = on) as
select
  flag.place_id,
  submitted.name as submitted_name,
  submitted.address as submitted_address,
  submitted.status as submitted_status,
  submitted.created_at as submitted_at,
  flag.similar_place_id,
  existing.name as similar_name,
  existing.address as similar_address,
  existing.status as similar_status,
  round(flag.distance_m::numeric, 1) as distance_m,
  round(flag.name_similarity::numeric, 2) as name_similarity
from public.place_duplicate_flags as flag
join public.places as submitted on submitted.id = flag.place_id
join public.places as existing on existing.id = flag.similar_place_id
order by submitted.created_at desc;

comment on view public.place_duplicate_review is
  'Moderator-facing: each flagged submission next to the place it may be a copy of, with both names and addresses.';

revoke all on public.place_duplicate_review from anon, authenticated;
