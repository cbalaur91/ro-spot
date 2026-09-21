-- Takes the generated placeholder photos off the seeded cathedral.
--
-- `20260821000300_seed_walking_skeleton_photos.sql` gave it two RoSpot
-- placeholders so the gallery had real objects to load. The detail screen now
-- has a state for a place nobody has photographed yet, and a placeholder that
-- says "photo placeholder" is worse than that state: it reads as a photograph of
-- nothing. The objects stay in the bucket — the storage suite still reads them.
--
-- Data only. Guarded on the id *and* on the array still being exactly the two
-- placeholders, so a row the owner has since given real photographs is left
-- alone, and running it twice changes nothing.

update public.places
set photo_paths = '{}'
where id = '00000000-0000-4000-8000-000000000001'
  and photo_paths = array['seed/st-george-1.jpg', 'seed/st-george-2.jpg'];
