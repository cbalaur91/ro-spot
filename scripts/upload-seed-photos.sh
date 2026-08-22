#!/usr/bin/env bash
#
# Uploads every JPEG in assets/seed-photos/ to the `seed/` folder of the
# `place-photos` bucket, under the same filename.
#
# The paths those objects end up at are written into `places.photo_paths` by
# `supabase/migrations/20260821000300_seed_walking_skeleton_photos.sql`. The
# migration is only half the seed — without this script the rows point at
# objects that were never uploaded, and the gallery renders broken images. Run
# it once per environment, after `supabase db push`:
#
#   ./scripts/upload-seed-photos.sh
#
# Needs SUPABASE_SERVICE_ROLE_KEY: the bucket is public to read and closed to
# write, so seeding it is a server-side job.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a && . ./.env && set +a

: "${EXPO_PUBLIC_SUPABASE_URL:?missing from .env}"
: "${SUPABASE_SERVICE_ROLE_KEY:?missing from .env}"

for photo in assets/seed-photos/*.jpg; do
  name=$(basename "$photo")
  # `x-upsert` so re-running after a photo is replaced updates it in place
  # rather than failing on the existing object.
  status=$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST "$EXPO_PUBLIC_SUPABASE_URL/storage/v1/object/place-photos/seed/$name" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H 'Content-Type: image/jpeg' \
    -H 'x-upsert: true' \
    --data-binary "@$photo")

  if [ "$status" != '200' ]; then
    echo "seed/$name failed with HTTP $status" >&2
    exit 1
  fi
  echo "seed/$name"
done
