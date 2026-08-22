# RoSpot v1 — Build Plan

Spec: `docs/SPEC-v1.md`. Each step ends with its verification before being checked off.

## Phase 0 — Foundation
- [x] 1. Initial commit + push (CLAUDE.md, docs, .gitignore) → verified: `main` pushed, repo live on GitHub
- [x] 2. Scaffold Expo app (bun, TS strict, Expo Router tabs: Map/List/Add/Profile) → verified: `bun run typecheck` clean; app runs in the browser (owner confirmed the List tab). **Android device check still owed** — see issue #2's close note
- [x] 3. Add NativeWind, TanStack Query, supabase-js, i18next scaffolding → verified: typecheck clean; List tab test asserts the same screen in RO and EN. `expo-image` deferred to the photos slice, which is the first consumer

## Phase 1 — Backend
- [ ] 4. Supabase migrations: `places` ✅ (+ both enums); `reports`, `profiles`, storage bucket still to do → verify: `supabase db push` applies cleanly; tables visible in dashboard
- [ ] 5. RLS policies: anon select approved ✅; auth insert pending, author update own → re-pending, reports insert still to do → verify: anon-key query returns only approved rows; write tests against pending rows fail
- [ ] 6. Account-deletion edge function → verify: invoking it removes the auth user + owned data

## Phase 2 — Browse (no auth)
- [ ] 7. Map screen: react-native-maps, user location, pins from approved places, category chips → verify: seeded test rows render + filter on device
- [ ] 8. List screen: distance-sorted, same filter state → verify: order matches real distances
- [ ] 9. Place detail: photo gallery, fields, report button → verify: report writes a `reports` row

## Phase 3 — Contribute (auth)
- [ ] 10. Auth flows: email/password first; Google native; Apple flagged off in Expo Go → verify: sign up/in/out on Android device; session persists across restarts
- [ ] 11. Submission form: fields → geocode → draggable pin → photo pick + compress (≤5, ~1600px) → upload → insert pending → verify: place appears `pending` in dashboard, invisible in app; flipping to `approved` makes it appear
- [ ] 12. Own-place edit → back to pending; duplicate-proximity flag on insert → verify: edited place disappears from public view until re-approved
- [ ] 13. Profile screen: my places (with status), language toggle, sign out, delete account → verify: deletion via a throwaway account

## Phase 4 — Ship-readiness
- [ ] 14. Sentry wired into dev build → verify: test crash appears in Sentry dashboard
- [ ] 15. i18n completeness pass (all UI strings RO+EN) → verify: no hardcoded strings on any screen in either locale
- [ ] 16. Privacy policy page (hosted) + linked in app → verify: URL loads from the app
- [ ] 17. Seed Metro Detroit places (owner provides 10–20; script inserts as approved) → verify: pins render on Detroit map

---

## Issue #2 — Walking skeleton: browse one real place end-to-end

Covers Phase 0 steps 2–3 and the `places` slice of Phase 1 steps 4–5.

Environment constraints (agreed 2026-08-21): no Docker in WSL2 → RLS is proven against the
remote `rospot` project with the real anon key instead of a local stack. No adb/emulator →
"boots on Android" is proven by a successful Android bundle export + component tests, not a
device screenshot.

- [x] A. Scaffold Expo (SDK 57) + Expo Router tabs Map/List/Add/Profile, TS strict, NativeWind → verified: `bun run typecheck` clean, `npx expo export --platform android` produces a 4.9MB Hermes bundle, `npx expo-doctor` 21/21
- [x] B. Migration: `place_category` / `place_status` enums + `places` table + RLS (anon select approved only) → verified: `supabase db push --linked` applied both migrations to `rospot`
- [x] C. Seed one approved + one pending place → verified: service-role read returns both rows (assertion 1 of the RLS suite)
- [x] D. Data-access module (`src/data/`) as the single supabase-js seam → verified: `grep -rn "@supabase/supabase-js" src` matches nothing outside `src/data/`
- [x] E. RLS integration test with the anon key → verified: 4 assertions — pending row invisible by id, unfiltered anon read returns approved only, anon insert rejected
- [x] F. i18n shell (i18next + expo-localization, RO+EN) → verified: List tab test asserts both `Historic` and `Istoric`, and that the place name is never translated
- [x] G. List tab renders the seeded approved place → verified: 10/10 tests green (`npm test`)
- [x] H. Code review (standards + spec axes) and fixes → verified: `bun run lint` clean after adding the gate; fixture moved out of schema history; RLS suite skips cleanly on a credential-less clone
- [x] I. Push to GitHub → verified: `git ls-remote --heads origin` shows `main`

## Issue #3 — Map browse: pins, category chips, distance-sorted list

Covers Phase 2 steps 7 and 8. Same environment constraints as issue #2 (no emulator,
no Docker): Android is proven by a bundle export plus component tests, not a device.

- [x] A. `src/geo.ts` — haversine `distanceMiles`, `formatMiles`, `sortByDistance`, and the
      Metro Detroit fallback origin, TDD → verified: 10 unit tests, including Southfield↔Cleveland
      at 103.4 mi cross-checked against an independent haversine rather than against the code
- [x] B. `useOrigin()` — ask for foreground location, fall back to Metro Detroit on denial
      or error, never block → verified: 4 tests covering granted / denied / no-fix / prompt-still-open
- [x] C. Category filter context in `(tabs)/_layout.tsx` so Map and List read one state
      → verified: pressing a chip on the List tab filters, and the Map tab reads the same context
- [x] D. `useVisiblePlaces()` — one query, filtered by the chips and sorted by distance,
      consumed by both tabs → verified: 7 tests; distance order is asserted against an
      input deliberately returned farthest-first, so a name sort can't pass it
- [x] E. Map tab: `react-native-maps` with `PROVIDER_DEFAULT`, pins tinted by category,
      chips overlaid → verified: 8 tests with the native module mocked (one marker per
      visible place, provider, anchor, filtering); `npx expo export --platform android`
      produces a 5.1MB Hermes bundle containing `AIRMap`
- [x] F. Web fallback for the Map tab → verified: `npx expo export --platform web` compiles
      and the web bundle contains the fallback copy and **zero** references to
      `react-native-maps`, so the browser loop on WSL2 still works
- [x] G. List tab: chips + distance per row → verified: 10 tests — nearest-first order,
      `0.6 mi` / `109 mi` labels, the fallback-origin note appearing only when location was
      refused, and an over-filtered list distinguished from a genuinely empty one
- [x] H. Google Maps Android API key wired through `app.config.ts` from env → verified:
      `npx expo-doctor` 21/21, both exports succeed. **The key itself is still owed by the
      owner** — Android tiles render blank without it (see the deviations below)
- [x] I. Code review (standards + spec) and fixes → verified: 50 tests green, typecheck
      and lint clean, both bundles export (see the review below for what the two axes found)


## Issue #4 — Place detail with photos

Covers Phase 2 step 9's screen half (the "Report a problem" button belongs to issue #9).
Same environment constraints as #2/#3: no emulator, no Docker — Android is proven by a
bundle export plus component tests.

Decisions taken with the owner before starting: photos are a `photo_paths text[]` column
on `places` (not a `place_photos` table), and the seeded cathedral gets a generated
RoSpot placeholder image until issue #11 supplies the owner's real photos.

- [x] A. `src/links.ts` — `telUrl` / `webUrl`, pure and TDD'd → verified: 7 unit tests,
      including that a non-web scheme in a website field is refused rather than prefixed
- [x] B. Migration: `photo_paths text[]` on `places` (≤5, no null entries) + `place-photos`
      bucket, public read, JPEG only → verified: `supabase db push --linked` applied;
      the bucket API reports `"public":true`
- [x] C. Regenerated `src/data/database.types.ts` → verified: `bun run typecheck` clean
- [x] D. Generated placeholder photos, uploaded to `seed/`, migration writes their paths
      → verified: the public URL returns `200 image/jpeg` with no credentials, and an
      anon REST read returns both paths on the seeded row
- [x] E. `fetchPlace(id)` + `placePhotoUrl(path)`; storage integration suite → verified:
      13 integration assertions — a pending place is not reachable by id, a non-UUID id
      reads as missing rather than as an error, every advertised path has an object
      behind it, and anonymous uploads are refused
- [x] F. `usePlace(id)`, seeded from the browse cache → verified: 5 tests, two of them
      against a fetch that never resolves so what is drawn can only have come from cache
- [x] G. Detail screen + `PhotoGallery` (`expo-image`) → verified: 12 tests covering
      every spec field, the no-photo state, absent and unusable links, the dialer and
      browser hand-offs, not-found, and retry
- [x] H. Navigation in from the List row and the map callout → verified: both assert the
      pathname and the id, and the map test asserts the bare pin has no `onPress`
- [x] I. RO + EN for everything new; the duplicate `map.retry` / `list.retry` pair
      collapsed into `actions.retry` → verified: the detail suite runs in both locales
- [x] J. Gates → verified: `bun run typecheck` clean, `bun run lint` clean, `npm test`
      83 green, Android bundle (5.1MB) contains the new screen, web bundle still holds
      zero references to `react-native-maps`. Also rendered in a headless browser
      against the live bucket — the photo loads, the gallery pages, the links render
- [x] K. `/code-review` (standards + spec), fixed what it found, committed → verified:
      84 tests green, typecheck and lint clean, both bundles export, expo-doctor 21/21

## Issue #16 — «Ie» restyle 2/6: List tab

Style-only slice of #14. No new behaviour, so no new seam to TDD: the ticket's own
acceptance criterion is that the existing List / Map / detail suites pass **unchanged**,
which is the strongest available check that this changed style and not behaviour.

- [x] A. `PlaceRow` becomes a stitched card (white, hairline border, 13px radius, 3px
      tint top border, 9px tint diamond, 10px eyebrow, 16px name, 12px address, parchment
      distance pill with tabular numerals) → verify: List suite green unchanged, including
      the ordering test that reads the name as one text node
- [x] B. `CategoryChips` become pills (selected = filled cherry + surface diamond;
      unselected = hairline outline, tint label) → verify: the chip role/selected-state
      assertions in the List and Map suites pass untouched
- [x] C. List header at the 24px gutter: 30px wordmark, subtitle, origin note, full-bleed
      star band, then the chips → verify: header copy assertions unchanged; the band draws
      nothing until layout, so Jest stays SVG-free
- [x] D. Cards at a 12px gap inside an 18px margin; press feedback becomes opacity →
      verify: the row-press navigation test still passes
- [x] E. `ScreenState` adopts the new gutter and pill recipe → verify: loading / error /
      empty copy assertions unchanged in both locales
- [x] F. Gates → verify: `bun run typecheck`, `bun run lint`, `npm test` all green;
      `npx expo export --platform android` bundles; web preview screenshot of the List
- [x] G. `/code-review` (standards + spec) and fixes → verify: gates still green, committed


---

## Review

### Issue #2 — walking skeleton (2026-08-21)

Shipped: Expo SDK 57 + Expo Router four-tab shell, `places` table with both enums and
the anon-read-approved policy, a single `src/data/` seam, the RO/EN i18n shell, and a
List tab rendering the seeded place. 10 tests green, typecheck clean, Android bundle
exports, expo-doctor 21/21.

Also done as part of Phase 0 step 3 (NativeWind, TanStack Query, supabase-js, i18next),
so that step is covered.

Deviations from the issue, agreed before starting:
- **RLS proven against the remote `rospot` project, not a local stack** — no Docker in
  WSL2. The suite reads with the anon key and with the service role key; the delta
  between them *is* the policy. Cost: two fixture rows live in the production table.
- **"Boots on Android" proven by bundle export plus a browser run, not a device** — no
  adb/emulator here. `npx expo export --platform android` compiles every route, and the
  owner confirmed the List tab renders St. George in the browser on 2026-08-21, which
  exercises the whole slice end to end (router → data module → RLS → screen). The
  Android-specific check is still owed and the issue was closed knowing that.

Not built (deliberately out of this slice): `reports` and `profiles` tables, the photos
column and storage bucket, insert/update policies (RLS denies all writes until the
submission slice adds them), and `expo-image`.

Changed after the two-axis code review:
- The pending test fixture no longer ships as a migration. Migrations carry only real
  content; the RLS suite creates its own pending row in `beforeAll` and deletes it in
  `afterAll`, so nothing test-shaped lives in schema history or in the live table. The
  row the first migration had already written was removed from `rospot`.
- Added the missing `lint` gate (`eslint` + `eslint-config-expo`) and fixed what it
  found.
- The list test now builds its fixture from `src/data/fixtures.ts` instead of a second
  copy of the row, which had already drifted.
- `jest.config.js` drops the RLS suite when Supabase credentials are absent, so a fresh
  clone runs the component tests instead of failing at import.
- Flattened the List screen's three-way `<Header />` duplication; typed `ComingSoon`'s
  key to the locale file; dropped unused exports from `places.ts` and `i18n/index.ts`.

Follow-ups worth an issue:
- Replace the seeded cathedral with the owner's real Metro Detroit list.
- Custom fonts — the type scale is deliberate but the faces are still system defaults.
- `jest` prints "a worker process has failed to exit gracefully" from the jest-expo
  preset. Exit code is 0 and `--detectOpenHandles` reports nothing; cosmetic.
- `bun run test` still can't work while Bun is installed as a snap (see CLAUDE.md).

### Issue #3 — map browse (2026-08-21)

Shipped: a `react-native-maps` Map tab with a pin per approved place, category chips
shared by the Map and List tabs, and a List ordered by real distance from the user with
a Metro Detroit fallback when location is refused. 50 tests green (was 45), typecheck and
lint clean, `npx expo-doctor` 21/21, both the Android and web bundles export.

**Design.** The chips, the pins and the list rows all reuse the existing Brâncuși
rhomboid rather than introducing a second visual vocabulary: a chip is a rhomboid plus
its label (hollow when off, solid when on), and a pin is one segment of the list's left
gutter stood on end — the rhomboid on a hairline stem, anchored where the stem meets the
ground. Distance sits on the row's top line opposite the category eyebrow, in the muted
register with tabular figures, because distance is data and not category information.

**Seams.** `src/geo.ts` is pure and knows nothing of `expo-location`; `useOrigin()` owns
the permission prompt; `useVisiblePlaces()` is the single hook both tabs render from, so
they can't disagree about what is visible. The category selection lives in a context
mounted in `(tabs)/_layout.tsx` because neither screen owns it.

Deviations and things still owed:
- **The Android Google Maps API key is not set.** `app.json` became `app.config.ts` so
  the key comes from `GOOGLE_MAPS_ANDROID_API_KEY` in `.env` rather than the repo. Until
  the owner supplies one, Android renders the pins over blank tiles. iOS uses Apple Maps
  and needs no key. This is the one acceptance criterion that cannot be closed here.
- **Not verified on a device**, same constraint as issue #2: the Android proof is a
  successful bundle export whose Hermes output contains `AIRMap`, plus component tests
  against a mocked native module.
- **Locale-aware number formatting is unverified on Hermes.** `units.miles` uses
  i18next's `{{value, number}}` formatter, which needs `Intl.NumberFormat`. Node has it,
  so the "0,6 mi" Romanian test passes; Hermes ships Intl on both platforms, but that is
  read from the docs, not seen running here.

Changed after the two-axis code review (both axes found real defects, not just taste):
- **The Map's empty state was lying.** It said "No places match these filters" whenever
  it had nothing to draw, including on a first run with an empty dataset — and the test
  written for it mocked an empty result with no chip pressed, so it certified the wrong
  branch. The Map now distinguishes the two cases as the List already did, and two tests
  pin both branches.
- **`refetch` was passed straight to `onPress`/`onRefresh`**, which hand their callback an
  argument react-query would read as `RefetchOptions`. Fixed at the seam — the hook now
  returns a wrapper that swallows its caller's argument, so no screen can get it wrong.
- **`formatMiles` held UI copy and a hard `.` decimal separator**, against the rule that
  all UI copy lives in `src/i18n/`. It is now `milesLabel`, which decides only precision;
  the words and the digit grouping come from the locale, so Romanian reads `0,6 mi`.
- **Every distance was computed twice** — once inside the sort comparator, once again to
  display. `nearestFirst` now measures once and sorts on the measurement, so the number a
  row shows is provably the number it was ordered on.
- `useOrigin`'s `isResolved` was set but never read. It has a real consumer now: the
  List's "distances are from downtown Detroit" note would otherwise flash before the
  permission prompt was answered, claiming something we didn't yet know.
- `geo.Region` was documented as "the shape react-native-maps wants" while the map had to
  unpack all four fields. It is that shape now, and `nearbyRegion()` builds the closer
  view the map animates to.
- One shared `filters.noMatch` string replaces the byte-identical `map.empty` /
  `list.filteredEmpty` pair; the chips dropped a wrong `tablist` role over button
  children; the tests import `DEFAULT_ORIGIN` instead of re-typing its coordinates.
- Fixed the root cause of an intermittent `act()` warning: react-query batches observer
  notifications onto a macrotask that can land after the test that scheduled it, so
  `jest.setup.js` now makes it notify synchronously. Four consecutive clean runs.

Reviewed and deliberately kept:
- **The web fallback for the Map tab** was flagged as scope the issue didn't ask for. Kept:
  `react-native-maps` has nothing to draw in a browser, and CLAUDE.md names the browser as
  the fastest loop on this machine — without the fallback that loop breaks on the Map tab.
  The web bundle contains zero references to `react-native-maps`, verified by grep.
- **Per-row distance labels** were flagged likewise. Kept: an order the user can't see the
  basis for reads as arbitrary.
- **Chips are pinned on the Map and scroll with the header on the List.** "Consistently"
  in the acceptance criterion is about what the chips filter, not where they sit, and a
  list header that scrolls is ordinary list behaviour.

Follow-ups worth an issue:
- `map.error` ("Places could not be loaded.") and `list.error` ("Something went wrong
  loading places.") say the same thing two ways, and `map.retry`/`list.retry` are the same
  word twice. Fold them together in the i18n completeness pass (#13).
- Adding a category still needs edits in `theme.ts`, both locale files and `CATEGORIES`.
- The Map tab has no loading indicator — a map with no pins yet is still a map, but if the
  cold query turns out to be slow on a real device this is where to look.

### Issue #4 — place detail with photos (2026-08-21)

Shipped: a `place-photos` bucket with public read, a `photo_paths` column on `places`, and
a detail screen reached from a list row or a map callout — photo gallery, category, name,
address, description, and phone / website / social links that open the dialer or the
browser. 84 tests green (was 50), typecheck and lint clean, `npx expo-doctor` 21/21, both
the Android and web bundles export.

**Design.** The screen is the list row you tapped, unfolded. The column from the list's
left gutter runs down it as a spine, with one rung per thing there is to know about the
place: the first rung solid in the category colour, as the row was, then a hollow notch per
contact link. The photographs are the one thing allowed past the margin — a photo starts at
the 36px gutter and bleeds off the right edge, so the gallery reads as a deck to push
through. No horizontal rules: the column already divides, and adding hairlines too would
have said the same thing twice.

**Seams.** `src/links.ts` is where "what a person typed in a form" becomes "a URL we are
willing to open", and it is pure. `fetchPlace` / `placePhotoUrl` keep the whole photo story
inside `src/data/`; the screen never learns which bucket the photos are in. `usePlace`
seeds itself from the browse query's cache, so arriving from a row draws immediately.

**Photos in the bucket.** The two objects behind the seeded cathedral are generated RoSpot
placeholders, agreed with the owner, and issue #11 replaces them with real photographs.
They are versioned at `assets/seed-photos/` and uploaded by `scripts/upload-seed-photos.sh`
— a migration can write a path but not an object, so the seed is only whole with both.

Verified beyond the tests: the screen was rendered in a headless browser against the live
project, and the photo it drew came out of the real bucket over a URL carrying no
credentials. Still owed, same as #2 and #3: nothing here has run on an Android device.

Changed after the two-axis code review (both axes found real defects):
- **`webUrl` would hand the OS a URL that could only fail.** A website field is a text box,
  so `coming soon` arrives in it — and it became `https://coming soon`. A scheme-less
  string now has to look like a domain, and `telUrl` needs seven digits, so "open 7 days"
  no longer offers to dial `7`.
- **The seeded photos existed only because they had been uploaded by hand.** Rebuilding
  from `supabase/migrations/` left the gallery pointing at objects that were never
  created. The JPEGs are in the repo now, with a script that puts them in the bucket.
- **The bucket migration said `on conflict do nothing`**, so a `place-photos` bucket that
  already existed and was private would have stayed private — the one property the issue
  asks for. It is `do update` now. The migration was edited in place rather than followed
  by a corrective one: it has only ever been applied to a single database, which is already
  in the state the corrected SQL produces (`db push --dry-run` reports nothing pending).
- **The load and error states were duplicated** between the List and the detail screen, and
  the column motif was duplicated between `PlaceRow` and the detail screen's rungs. Both
  are one component now (`ScreenState`, `Column`) — the two screens fail for the same
  reason and should not look like two different problems, and the column is the app's one
  structural motif.
- **`GUTTER` was declared but nothing followed it** — every inset was a literal `pl-9`.
  It now sets the padding the gallery's width is derived from, so the two cannot disagree.

Reviewed and deliberately kept:
- **Collapsing `map.retry` / `list.retry` into `actions.retry`** is work the #3 review
  deferred to the i18n pass (#13). The detail screen needed a retry string, and adding a
  third copy of "Try again" to avoid touching #13's scope would have been worse. Noted on
  #13.
- **A map pin takes two taps to open a place** — the pin shows its callout, the callout
  opens the screen. Pins are small and mis-taps are cheap to make; the callout is the tap
  that means it. Flagged for the owner rather than changed.
- **The `denies anonymous uploads` assertion** tests a write path this issue scoped out.
  Kept: public read is not public write, and that is worth a standing guard.
- **The seed paths appear in both the migration and `src/data/fixtures.ts`** and can't be
  shared across SQL and TypeScript. The drift is caught rather than prevented: the RLS
  suite asserts the live row's `photo_paths` equals the fixture's, and the storage suite
  asserts every path in the fixture has an object behind it.

Follow-ups worth an issue:
- The 1-photo floor from the spec ("photos, required, 1–5") is enforced nowhere yet — the
  check constraint only caps at five. It belongs to the submission form; noted on #7.
- `.expo/types/router.d.ts` lists the `__tests__` files as routes. They are not in the
  exported bundle (checked by grep), so this is cosmetic, but the type surface is wrong.

---

## Issue #15 — «Ie» restyle 1/6: motif system + design tokens

Parent spec: #14. Scope is the foundation only, traced through `ComingSoon`.

- [x] 1. Install `react-native-svg` via `npx expo install` → verify: it lands in `package.json` at an Expo-resolved version and `bun run typecheck` stays clean
- [x] 2. Add the seven new tokens to `src/theme.ts` and mirror them in `tailwind.config.js` → verify: a new pure test converts each theme key to its kebab-case Tailwind key and asserts the two palettes are value-identical
- [x] 3. Port `stitch()` + `mirror()` to `src/motifs/stitch.ts` as pure geometry (structured paths, not a data URI) → verify: unit tests for per-colour path counts, viewBox math, and mirror symmetry, written before the implementation
- [x] 4. Carry BIRD, STAR, HORA over verbatim into `src/motifs/grids.ts` with colour maps keyed to the theme → verify: the same unit tests assert the grids' dimensions (STAR is 11×9) and that every glyph used resolves to a palette value
- [x] 5. `Stitched` grid renderer over react-native-svg → verify: renders in the web preview; Jest never reaches it from a screen test
- [x] 6. `StarBand` (default height 14, 10 for strips, optional fixed width, onLayout-measured, tile = height·11/9, one overdraw tile, clipped) and `HoraBand` (height 58, centred) on the same mechanism → verify: no seams in the web preview at several widths; unmeasured render is an empty fixed-height view
- [x] 7. `Diamond` primitive (size / tint / border) as plain views → verify: used by `ComingSoon`, visible in the web preview
- [x] 8. Tracer: `ComingSoon` becomes cherry diamond + 132×10 star band above the unchanged copy → verify: Add and Profile tabs show it in the browser; no i18n or copy diff
- [x] 9. Full gate → verify: `bun run typecheck`, `bun run lint`, `npm test` all green, and `npx expo export --platform android` bundles with react-native-svg

### Review — issue #15

**What changed.** `src/motifs/` is the new module: `stitch.ts` (pure geometry — `stitch`,
`mirror`, `repeat`), `grids.ts` (BIRD / STAR / HORA carried over character-for-character
from the design canvas, plus the shared thread alphabet), `Motif.tsx` (the react-native-svg
renderer), `Band.tsx` (`StarBand`, `HoraBand`) and `Diamond.tsx`. `src/theme.ts` and
`tailwind.config.js` gained the seven «Ie» tokens; `ComingSoon` is the tracer.

**Decisions worth knowing:**
- **Bands tile the grid, not the SVG.** The spec called for translated copies of one tile
  inside a clipped SVG. Repeating the *rows* and stitching once gets the same picture with
  one path per colour instead of N groups, and needs no `transform` semantics from
  react-native-svg. `repeat()` and `tiling()` are both pure, so where a band starts and how
  many tiles it lays are covered by the geometry tests rather than by looking at it.
- **A fixed-width band draws on its first render.** The spec's "empty fixed-height view
  until layout fires" is the measuring path; a band that was told its width has nothing to
  wait for, and stalling it a frame to preserve an incidental property would be worse. The
  property it was protecting turned out not to be needed — see the react-native-svg note.
- **Tiles are absolutely positioned inside the band.** A band whose parent sizes to its
  content would otherwise measure its own overflow, tile wider, and measure wider again on
  every layout pass.
- **One thread alphabet, not one colour map per motif.** `r`/`b`/`y`/`v` mean the same
  colour in every grid, and path order comes from the grid rather than the map, so a
  superset map is byte-identical to the mock's three.
- **`strokeWidth` is `0.28·cell`, not the mock's `toFixed(1)`.** The rounding there was an
  artifact of serialising the path into a data URI; nothing renders differently at cell 12.
- **`react-native-svg` needs no Jest mock.** The spec flagged a view stand-in as the
  fallback; jest-expo transforms it and a full `ComingSoon` render works as-is.

**Verified:** stitch geometry suite (99 cases) green; `npm test` 12 suites / 198 tests green;
`bun run typecheck` and `bun run lint` clean; `npx expo export` bundles cleanly for both
android and web with react-native-svg in. The rendered `ComingSoon` tree was checked against
the mock: 132×10 clipped band, 12 tiles of 12.222px, viewBox 1584×108, and cell coordinates
(`M2.16 2.16L9.84 9.84…`) identical to the canvas's output.

**Out of scope, flagged rather than done:**
- `eslint.config.js` now ignores `.expo/**` and `assets/support.js`. Both were already
  failing lint before this issue — generated router types, and the runtime the design
  canvas was exported with — and the acceptance criteria ask for lint green. Named the one
  file rather than all of `assets/` so a hand-written asset script would still be linted.
- **`Diamond` and `ColumnSegment` now draw the same rhomboid two ways.** Converging them is
  wasted work: issue #14 deletes the column components in a later slice ("the rail/column
  components that this restyle orphans removed").
- The design canvas itself (`assets/RoSpot Motifs.dc.html` and its exported runtime) is
  still untracked, so the pointers to it from `CLAUDE.md` and `src/motifs/` cite a file the
  repo doesn't carry. Issue #14's design-reference slice is where it belongs — worth
  committing there.
- The motifs are decorative and carry no `accessibilityElementsHidden`. Neither did the
  placeholder's old rhomboid, so this is a standing question for the restyle as a whole
  rather than a regression here.
- The new palette tokens emit no CSS yet: Tailwind only builds classes in use, and the
  screens that use parchment/gold/badges land in slices 2–6. The sync test guards the values
  meanwhile.

### Issue #16 — «Ie» restyle, List tab (2026-08-21)

Shipped: the List tab in the «Ie» language. Place rows are stitched cards — white ground,
hairline border, 13px radius, a 3px band of the category's thread across the top, a 9px
diamond bullet, the category eyebrow, and the distance in a parchment pill with tabular
figures. The header sits at the new 24px gutter under a full-bleed star band, and the
category chips are pills: filled cherry with a surface diamond when on, a hairline outline
with the category's own colour when off. 199 tests green (was 198 — the new palette token
adds one case to the sync suite), typecheck and lint clean, the Android bundle exports.

**The tests did not move.** Every List, Map and detail assertion passed untouched, which is
the only proof available here that this changed style and not behaviour: the name is still
one text node (the ordering test reads it), the chips still carry their button role,
selected state and translated labels, and no copy or i18n key changed.

Verified in the browser rather than on a device, as with every slice so far: the List
renders the band, the pills and the cards against the live seeded place, and pressing a
chip filters to "No places match these filters." with the chip drawn in its selected state.

Deviations, all recorded rather than accidental:
- **The chips stay on the List tab**, where the mock has none — filtering is load-bearing
  and there is nowhere else for it to live on this screen. Carried over from #14.
- **The chips restyle reaches the Map tab too**, because both tabs mount one component. The
  Map's own restyle is the next ticket, so until then its header is pill chips over the old
  layout.
- **`ScreenState`'s gutter moved for every screen that uses it**, the detail screen
  included. #16 asks for the new gutter on the loading, failed and notice states, and they
  are one shared component; the detail screen catches up in its own ticket.
- **Card white is a new palette token** (`card`), not a bare `bg-white`. The mock's card is
  #FFFFFF, and the project requires every colour to live in both palette homes.

Changed after the two-axis code review:
- `bg-white` became the `card` token in `src/theme.ts` and `tailwind.config.js`.
- Wordmark tracking -0.75px to -0.5px, chip padding 7px to 6px, and the address line-height
  from 17px to 15px — each was off the mock's own value.
- Three comments that had stopped being true were corrected: the claim that the card's top
  band is the only inline style (the bullet and the eyebrow take the tint too), the claim
  that one 12px margin does two jobs, and `Column.tsx`'s doc, which still described a list
  row as one of its segments and the 36px gutter as the app's.

Not changed, deliberately: the pill recipe is spelled out in three files rather than
extracted — the parchment data pill, the interactive chip and the cherry CTA share a radius
and little else, and a component that thin would hide more than it saves. Worth revisiting
once the Map card and the Profile badges land.
