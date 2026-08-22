-- Photos for the seeded cathedral.
--
-- These are generated RoSpot placeholders, not photographs. The owner's real
-- Metro Detroit photos arrive with the seed script (issue #11), which replaces
-- this row wholesale; until then they exist so the gallery is exercised against
-- real objects in the bucket rather than against a test fixture.
--
-- The photographs themselves live in `assets/seed-photos/` and are put in the
-- bucket by `scripts/upload-seed-photos.sh`. A migration can write a path but
-- not an object, so this is only half the seed — run the script too, or these
-- paths point at nothing.

update public.places
set photo_paths = array['seed/st-george-1.jpg', 'seed/st-george-2.jpg']
where id = '00000000-0000-4000-8000-000000000001';
