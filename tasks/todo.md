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

---

## Issue #17 — «Ie» restyle 3/6: List empty state — the hora needs dancers

Parent spec: #14, blocked-by #16 (closed). Scope is the *unfiltered* empty branch only.

- [x] 1. Test first: the unfiltered-empty List shows the new hint and a CTA, and pressing the CTA (`await userEvent.press()`) routes to the Add tab → verify: the two new assertions fail against today's screen, for the right reason
- [x] 2. Test first: the filtered-empty branch keeps `filters.noMatch` and grows *no* CTA → verify: added to the existing "distinguishes an over-filtered list" case, red before the change is guarded
- [x] 3. Rewrite `list.emptyHint` and add `list.emptyCta` in both locales → verify: `en`/`ro` key sets stay identical; the Romanian reads as Romanian, not as a translation
- [x] 4. `EmptyInvitation` in `list.tsx`: hora band across the notice's 40px measure, 17px semibold ink line, 13px/1.5 muted hint, outlined cherry pill CTA → verify: the two new tests pass; the canvas's own numbers (26/7/24px stack, 1.5px border, 11×24 padding) are the ones in the code
- [x] 5. Full gate → verify: `bun run typecheck`, `bun run lint`, `npm test` green; every other List assertion untouched

### Review — issue #17

Shipped: the true-empty List as an invitation. The hora band dances across the notice,
"No places yet." is promoted to 17px semibold ink, the hint names what the band is showing
("Approved places show up here — the hora needs dancers." / "Locurile aprobate apar aici —
hora are nevoie de dansatori."), and an outlined cherry pill sends the user to the Add tab.
The filtered-empty branch is untouched and still says only that nothing matched.

**Verified.** 200 tests green (was 199 — one new case for the CTA's destination), typecheck
and lint clean, the Android bundle exports. Checked in the browser at 390×844 against the
canvas: the block centres in the space below the star band, the band runs the notice's full
40px measure, and the CTA reads as an outline rather than a demand. The populated List was
screenshotted before and after the `flexGrow` change and is pixel-identical, which is the
proof that centring the empty state costs the non-empty one nothing.

**Decisions worth knowing:**
- **`flexGrow: 1` on the content container, not a fixed top padding.** The canvas centres the
  block in what's left below the header; a `py-16` block hangs from the top instead. `flexGrow`
  is the only way a `ListEmptyComponent` can have the leftover space to centre in, and a list
  with rows in it is already taller than the container, so nothing else moves.
- **The block sits at 40px, not the app's 24px gutter.** It is one column of centred text and
  the canvas sets it that way; the gutter is for full-width content.
- **The band is stretched, not given a width.** `Band` documented `width` as the escape hatch
  for callers whose parent doesn't size them; a notice that is 40px inside an unknown list
  width has no number to pass. `Band.tsx`'s doc now names `self-stretch` as the other way out,
  so the next centred caller doesn't rediscover it.
- **Two copy strings changed, as the ticket allows, and no others.** `list.emptyHint` was
  rewritten and `list.emptyCta` added; both locales carry both, and the key sets stay
  symmetric (36 keys each, asserted by hand this slice).

**Not done, and why:**
- **Nothing asserts the hora band is *absent* from the filtered branch**, only the CTA. Under
  Jest `onLayout` never fires, so `Band` renders an empty view whatever branch it is in — an
  absence assertion would pass even if the band were there. The CTA carries the branch instead.
- `ScreenNotice` is still not shared with `EmptyInvitation`: its `gap-3` fights the canvas's
  explicit 26/7/24 stack, so reusing it would mean parameterising the gap away.

## Issue #18 — «Ie» restyle 4/6: Map tab — stacked header, diamond pins, nearest-place card

Parent spec: #14, blocked-by #16 (closed). The map's overlays become a stacked column, and
the one new behaviour in the whole restyle — a nearest-place card — lands here.

- [x] 1. Test first: with places on the map, a bottom card names the nearest one and pressing it (`await userEvent.press()`) routes to that place's detail → verify: red against today's screen, for the absence of the card and not for a query typo
- [x] 2. Test first: an empty dataset shows the empty notice and *no* card → verify: red only once the card exists; the notice copy assertion stays byte-identical
- [x] 3. Stack the screen: header row (22px wordmark + 11px cherry diamond at the 24px gutter), `StarBand height={14}`, chips, then the map filling the rest → verify: `PlacesMap` no longer sits under an absolute header; existing provider/marker tests still pass
- [x] 4. `Pin` becomes a 13px tinted diamond with a 2px surface border and the canvas's shadow, stem dropped → verify: marker `anchor` stays `{x:.5,y:1}`, `tracksViewChanges` untouched, map suite green unchanged
- [x] 5. Bottom-card recipe (`MapCard`): 10px star-band strip over a padded body, shared by the nearest-place card and both notices → verify: `map.error` + retry and the two empty strings unchanged, card hidden whenever a notice shows
- [x] 6. Web stub cosmetic pass: diamond on a map-tint field, copy untouched → verify: `map.webUnsupported*` byte-identical in both locales
- [x] 7. Full gate → verify: `bun run typecheck`, `bun run lint`, `npm test` green; `npx expo export --platform android` bundles

### Review — issue #18

Shipped: the Map tab in the «Ie» language. The header no longer floats over the map — wordmark,
star band and chips stack above it and the map takes what's left. Pins are the language's rhomb
in the category's tint with a pale ring and a little shadow, the stem dropped now that the
marker's anchor puts the rhomb's own lower vertex on the coordinate. At the foot of the map, one
card recipe (a 10px strip of the star band over a padded body) carries all three things the map
can't say itself: the nearest place — the restyle's one piece of new behaviour, a whole-card
button onto that place's detail — the filter that emptied it, or the places that never arrived.

**Verified.** 203 tests green (was 200; three new — the card names the nearest place, opens it,
and is absent from an empty dataset), typecheck and lint clean, the Android bundle exports. The
existing map assertions are byte-identical: only one test *title* changed, the one that still
described a stem. Screenshotted in the browser at 390×844 against the canvas — the stack, the
band, the card and its star strip all land on the canvas's numbers.

**Decisions worth knowing:**
- **The pin is `size={17}`, not 13.** The canvas has no `box-sizing` reset, so its `13px` pin
  with a `2px` border is a 13px core inside a 17px rhomb. React Native is border-box: copying
  the 13 across would have made the pin *smaller* than the one it replaced. Recorded in
  `lessons.md`.
- **`MapCard` is `bg-surface`, breaking `theme.ts`'s "cards sit on white".** That rule is about
  lifting a card off the app's warm ground; this card sits on map tiles, where the app's own
  paper is what does the lifting. The exception is stated at the constant.
- **The shadow is the caller's value.** `Diamond` grew `borderWidth` and `shadow`, but `shadow`
  takes the CSS value rather than a boolean: what a rhomb has to rise off is not something the
  rhomb knows. The card's own shadow is `colors.ink` at 12%, not a second spelling of `#171310`.
- **The distance is bare, not in the List's parchment pill.** A pill is for a column of numbers
  that has to line up; there is one number here.

**Not done, and why:**
- **The pins have not been seen on a device.** No emulator on this machine, and the Android
  custom-marker first-paint risk the parent issue flags is exactly what a `boxShadow` on a
  marker could trip. `tracksViewChanges` is left on, as the ticket requires. Owed before #14
  closes.
- **`NearestPlace` repeats `PlaceRow`'s eyebrow/name/address vocabulary rather than sharing a
  component.** The two cards share a language, not a layout — different chrome, bullet, distance
  treatment and leading — and folding them together would drag the List into a Map ticket.
  Consolidation belongs to the design-reference slice (6/6), which is where the recipes get
  written down.
- **Nothing tests "the card hides while an error notice shows" for the error-with-cached-rows
  case.** The screen's single if/else chain is what guarantees it; a test there would be testing
  a ternary, and the only way to reach that state is a refetch failure the Map has no gesture for.
- **The card states a fallback-origin distance without the List's caveat.** The canvas puts no
  note on this card, and the ticket lists the card's four fields exactly.


---

## Issue #19 — «Ie» restyle 5/6: Place detail — full-bleed hero, stitched body, rail retirement

Parent spec: #14, blocked-by #16 (closed). The last surface still in the pre-«Ie» rail language,
and with it the rail itself.

- [x] 1. Test first: with the origin resolved, the address line carries the distance and the plain address node survives → verify: red on today's screen for the missing distance, green once the line is two text nodes rather than one concatenated string
- [x] 2. Test first: while the origin is unresolved, no distance is stated → verify: red only once the distance exists at all
- [x] 3. Add the origin-hook mock stanza to the detail suite (the one the List and Map suites use) → verify: the fourteen existing assertions run byte-identical
- [x] 4. Full-bleed hero: gallery at the screen's width from y=0, 32px circular surface back chip overlaid top-left inside a top-edge `SafeAreaView` (no `useSafeAreaInsets` — it needs a provider the suite doesn't mount) → verify: back button role + label unchanged, `Back` press still calls `router.back()`
- [x] 5. Stitched body at the 22px gutter: category eyebrow → 23px name → address · distance → `StarBand height={10}` divider → description → verify: reading order matches the canvas, distance only when `isResolved`
- [x] 6. Contact rows: hairline-separated rows replacing the rungs, accessibility contract byte-identical (link role, `label: value`, two-line truncation) → verify: the four contact tests pass untouched
- [x] 7. Not-found state takes the shared `Diamond`, copy untouched → verify: both not-found strings byte-identical
- [x] 8. Delete `src/components/Column.tsx` → verify: `grep -rn "components/Column" src/` finds nothing (the detail screen keeps a `GUTTER` of its own — 22px, its body's inset, not the rail's 36)
- [x] 9. Full gate → verify: `bun run typecheck`, `bun run lint`, `npm test` green; `npx expo export --platform android` bundles; screen seen in the web preview

### Review — issue #19

Shipped: the Place detail in the «Ie» language, and the rail retired with it. The photographs
run full-bleed from the top of the screen with a 32px surface chip floating over them; below,
one column of prose at a 22px gutter reads in the canvas's order — category eyebrow, 23px name,
address with the distance appended, a 10px star band, the description — and the contact fields
land as hairline-separated rows. `src/components/Column.tsx` had no importers left and is gone.

**Verified.** 205 tests green (was 203; two new — the distance appears once the origin resolves,
and is absent until it does), typecheck and lint clean, the Android bundle exports. The suite's twelve
existing tests are byte-identical; the only addition is the origin-hook mock stanza the List
and Map suites already use. Screenshotted headless at 390×844: the loaded
screen, the same screen with all three contact rows stubbed in, and the not-found state.

**Decisions worth knowing:**
- **The address line is two text nodes, not one string.** `<Text>{address}</Text>` and a nested
  `<Text> · 13 mi</Text>` inside one line of type. Concatenating them would have read the same
  and cost the suite its plain-address assertion — the line is one measure of text, but the
  address and the measurement are two different claims.
- **The back chip takes its inset from a top-edge `SafeAreaView`, not `useSafeAreaInsets`.** The
  hook throws without a provider mounted above it, and this screen is pushed onto a stack — the
  chip should not depend on who mounted it. It is also what keeps the suite provider-free.
- **`PageMarks` is centred (the one change to `PhotoGallery`).** The ticket calls the gallery
  unchanged, and its photos and paging are. But the marks were aligned to a 36px gutter that
  this restyle deleted, and left them glued to the screen's left edge under a full-bleed hero.
  Centring is the only alignment a full-bleed gallery has.
- **Contact rows separate with a top hairline rather than a bottom one**, so the first row's rule
  doubles as the line under the description and the block needs no divider of its own.
- **The back chip's touch target is padding, not `hitSlop`.** The chip hangs off an absolutely
  positioned, content-sized `SafeAreaView`, and Android clips touch at a parent's bounds — slop
  outside it would be slop that isn't there. 6px of padding around the 32px chip makes the
  target the 44 it should be, inside the parent that carries it.
- **The suite gains two tests as well as the mock stanza.** The ticket asked for one addition and
  no assertion changes; no existing assertion moved, but the acceptance criterion "distance
  absent while unresolved" needed something to prove it, and a criterion with no test behind it
  is a claim. The twelve existing tests are untouched.

**Not done, and why:**
- **No photo thumbnail strip and no "Report a problem" button**, both in the canvas — recorded as
  out of scope in #14 (no reporting backend).
- **Not seen on a device.** No emulator here; the web preview and the Android bundle export are
  the checks this machine can make. The full-bleed hero under a notch is the thing to look at in
  Expo Go — owed before #14 closes, with the map pins.
- **The star band divider ends mid-stitch at the right.** That is the band's own contract (it
  overdraws a tile and clips) and matches the header's edge-to-edge run, so it is left alone
  rather than special-cased into a centred short band.

## #20 — «Ie» restyle 6/6: make the design binding

Docs only; no code changes. The reference documents what shipped, not what was mocked.

1. [x] `docs/DESIGN.md` — source-of-truth pointer, palette table (token → hex → role, all eight «Ie»
   tokens), motif inventory + usage rules, component recipes as implemented, per-screen guidance for
   the six built surfaces and the four unbuilt ones, recorded divergences
   → verify: every number and hex in it traced back to the file it comes from; the four unbuilt
   screens traced to the Direction B canvas
2. [x] `CLAUDE.md` — a short section making the reference binding on UI/UX work, and saying where the
   motif components live → verify: it points at `docs/DESIGN.md` and the canvas, and doesn't repeat
   the reference
3. [x] `docs/adr/0001-…` — Direction B adopted, motifs procedural rather than bundled, the
   `react-native-svg` consequence → verify: follows `ADR-FORMAT.md` (sequential number, short, only
   the sections that earn their place)
4. [x] Gates → verify: `bun run typecheck`, `bun run lint`, `npm test` all green (docs shouldn't move
   them, and if they do that's the finding)
5. [x] Read the reference against the live app in the web preview → verify: List, empty List,
   detail, ComingSoon match what the recipes claim

### Review — #20

`docs/DESIGN.md` (six sections), a `## Design` section in `CLAUDE.md`, and
`docs/adr/0001-direction-b-ie-design-language.md`. No code changed.

**Verified.** 205 tests green, typecheck and lint clean — the same numbers as before, which is
what a docs-only ticket should move. Every hex, size and class in the reference was read out of
the file it comes from rather than out of the canvas: the shipped screens are documented as
shipped (the detail eyebrow is 11px in the app and 10.5 in the mock; the reference says 11).
The four unbuilt screens are the canvas's numbers, ported content-box → border-box. Read back
against the running web preview at 390×844 — List, ComingSoon, Place detail and the Map
stand-in with its nearest-place card all match what §4 claims.

**Decisions worth knowing:**
- **The reference outranks the canvas for a shipped screen, and the canvas outranks it for an
  unshipped one.** Stated in both documents. Without a rule, "the design says X" means whichever
  of the two the reader happened to open, and the divergences in §5 would read as drift.
- **§5 records three divergences the ticket didn't list**: the map card is `surface` rather than
  white, the photo page marks are centred, and the detail keeps its contact rows (the canvas
  draws none, but they are v1 spec fields). Each was a deliberate call in an earlier slice with
  nowhere to live until now.
- **The four unbuilt screens are specified in the app's own units**, not the canvas's CSS —
  classes and RN values, with the content-box → border-box warning attached to §2 rather than
  repeated per screen. A specification a builder has to re-derive is a mock with extra steps.
- **`goldDark`, `badgePending`, `badgeApproved` and `mapShade` are documented as reserved.**
  They are in the palette and used by nothing today; the reference says which unbuilt screen
  each is for, so the next reader doesn't delete them as dead.
- **The ADR corrects a claim rather than repeating one.** `react-native-svg` was not already in
  the tree — `react-native-maps` declares no such dependency — so the ADR states it as the one
  dependency the restyle added and names the Jest consequence.

**Review found, and fixed:**
- **The band table's "Alignment" column conflated two things.** `StarBand` never passes
  `align` — a short star band is positioned centred by its parent and still tiles from the
  left. The column is now "Width", and the distinction is spelled out.
- **The 12px/200px Onboarding band was specified in §4.7 but missing from the §2 inventory**,
  so a builder reading the inventory would not have found it.
- **Three numbers were wrong**: the map card's foot inset is 12, not 14; its press dim is
  `active:opacity-90`, not 80; and the "labelled with the place's name" rule is the map
  card's — a List row carries no explicit label and reads its own text.
- **`assets/github.md` doesn't map the eight mocked screens** — its screen map predates the
  restyle. Described as the sync record it is.
- **CLAUDE.md's third paragraph restated the Architecture bullet forty lines above it.** Cut
  to the two rules that were actually new.
- **The ADR's bespoke H2 is now `## Considered Options`**, which is what it was — bundled
  rasters, and why they lose.

**Not done, and why:**
- **The four unbuilt screens stay in the reference** though they duplicate a canvas the
  document itself calls authoritative for them. #20 asks for them by name and lists what each
  must carry; a builder shouldn't have to read CSS to build a React Native screen.
- **The List's true-empty state was not photographed.** It needs a dataset with no approved
  places; the seeded project has some. Its recipe is read off `EmptyInvitation` and its
  behaviour is covered by the List suite.
- **Nothing on a device.** Same as the earlier slices — the pins and the map card still owe an
  Expo Go pass before #14 closes.

## Issue #5 — Auth: email/password with persistent session

Covers the email/password half of Phase 3 step 10. Native Google and the Apple flag are #6;
"your places", the language toggle and account deletion are #8 / #13 / #10 — Profile gets the
identity and sign-out halves of §4.10 only, shaped so the rest slots in.

Environment constraints unchanged (no emulator, no Docker): device is proven by an Android
bundle export plus component tests, and the auth contract by an integration suite against the
real `rospot` project.

Decided with the owner before starting: **`mailer_autoconfirm` is on** for the `rospot` project,
so sign-up returns a session immediately. The client still handles the no-session answer, so
turning confirmations back on before public launch needs no code change.

- [x] A. `src/data/auth.ts` — the auth half of the data seam (`signUp`, `signIn`, `signOut`,
      `currentUser`, `onAuthChange`), with a pure `authProblem` mapping Supabase's error codes to
      the app's own reasons, TDD → verify: unit suite covers each reason, including the
      already-registered answer Supabase gives when confirmations are on (a user with no identities)
- [x] B. `src/state/session.tsx` — `SessionProvider` / `useSession`, mounted in the root layout,
      TDD → verify: hook suite shows the stored session read back on mount, `isLoading` until it
      answers, and the subscription updating on sign-in and sign-out
- [x] C. `src/motifs/Bird.tsx` — the pasăre as a component, since nothing outside `src/motifs/`
      draws a motif → verify: renders at the grid's own 4:3, mirrored on request
- [x] D. `src/app/sign-in.tsx` — §4.8 minus the provider buttons (#6) and the password reset (no
      email delivery in v1 yet), one screen toggling sign-in / create-account → verify: component
      suite covers success → back, each failure reason's message, and the mode toggle
- [x] E. `src/app/(tabs)/profile.tsx` — §4.10's identity block and sign-out when signed in, the
      invitation when not → verify: component suite covers both states and that sign-out signs out
- [x] F. i18n `auth.*` / `profile.*` in RO and EN → verify: no literal UI copy in either screen
- [x] G. `src/data/__tests__/auth.integration.test.ts` — real project: sign-up returns a session
      (autoconfirm), sign-in works, a second client on the same storage recovers the session
      (the restart), sign-out clears it; throwaway user deleted by the service role afterwards
      → verify: gated in `jest.config.js` like the other integration suites
- [x] H. `docs/DESIGN.md` — move §4.8 and the built half of §4.10 into "Built", record what
      shipped and what was deferred → verify: every number in them read out of the code
- [x] I. Gates + review → verify: `bun run typecheck`, `bun run lint`, `npm test`,
      `npx expo export --platform android`, then `/code-review`

### Review — #5

`src/data/auth.ts` and its two suites, `src/state/session.tsx`, `src/app/sign-in.tsx`,
a rewritten `src/app/(tabs)/profile.tsx`, `src/motifs/Bird.tsx`, `auth.*` / `profile.*` copy
in both locales, and `docs/DESIGN.md` §4.7–§4.8 moved into "Built".

**Verified.** 253 tests green across 18 suites (24 new), typecheck and lint clean, and
`npx expo export --platform android` bundles. The integration suite ran against the real
`rospot` project: sign-up came back with a session, a second client found that session
through the storage adapter, a duplicate sign-up and a wrong password were refused, and
sign-out then sign-in worked. The throwaway account was deleted afterwards — the project's
auth user list is empty again.

**Decisions worth knowing:**
- **`mailer_autoconfirm` is on for the `rospot` project**, decided with the owner before any
  code. Sign-up returns a session immediately, so nothing waits on an inbox the built-in
  SMTP could only deliver to a team address anyway. The client still handles the
  confirmation answer, and the integration suite asserts the setting rather than assuming
  it, so flipping it back before public launch fails loudly instead of quietly.
- **Supabase's error codes stop at the data seam.** `AuthProblem` carries one of eight
  reasons and the screen reads `auth.errors.<reason>`; the server's English survives on the
  error for the log. A code the map doesn't name is `unknown`, not a guess.
- **The identity-less user is read as "address taken".** With confirmations on, Supabase
  answers a duplicate sign-up with a success-shaped user carrying no identities so that
  nobody can enumerate accounts. Taken at face value it would leave someone waiting for an
  email that is never sent.
- **The session provider settles the cold-start race.** The stored-session read and the
  auth subscription can both answer; the read is the older answer, so once anything newer
  has arrived it may only clear the loading flag. Otherwise a sign-in that lands mid-read
  signs the user back out a moment later.
- **A component test mocks `@/data/auth` including the `AuthProblem` class.** `requireActual`
  would pull in `src/data/supabase.ts`, which fails fast without credentials — a screen test
  that needs a Supabase key is a screen test that breaks a fresh clone.
- **The Profile tab waits for the stored session rather than drawing the invitation first.**
  Otherwise every visit flashes "sign in" at someone who already is.

**Review found, and fixed:**
- **The sign-out failure story was fiction.** `signOut` special-cased `session_not_found`,
  and the screen claimed a failed sign-out "leaves the user signed in". supabase-js answers
  a missing session and 401/403/404 with success, and on any other failure it drops the
  local session *before* returning the error. The special case was dead code, and the real
  message covers only the case where the client couldn't read the session at all. Code,
  test names and §4.8 all now say that.
- **`validation_failed → emailInvalid` contradicted the file's own rule.** It is Supabase's
  catch-all for a malformed request body, so it could tell someone their address is wrong
  when it isn't. Dropped; `email_address_invalid` still maps.
- **The Profile avatar drew a rhomb outside `src/motifs/`.** `Diamond` gained `radius` and
  children instead — documented in §2's rhomb table as the one rhomb big enough to carry
  content.
- **Three touch targets were under 44**: sign-out (`py-1`), the sign-in mode toggle (no
  padding at all) and the back chip (`p-2.5` around a 22px icon is 42, against a §4.7 that
  claimed 44). All padding, not `hitSlop`.
- **The field labels were all caps**, which a screen reader spells out letter by letter —
  and they are only ever read, never drawn. Sentence-case now, with the reason recorded.
- **`isSignedIn` had no consumer** outside its own test: `user !== null` stored twice.
- **`leave()` meant two opposite things** in two files — leaving the screen, and leaving the
  account. The Profile one is `leaveAccount`.
- **The integration test overclaimed.** Two clients in one Jest process share the
  AsyncStorage mock, so it proves the storage-adapter round trip the restart depends on, not
  a cold start. The comment says that now.
- **§3's Measures table never got the 28 gutter** §4.7 cites.

**Considered and declined:**
- **Extracting a shared `PrimaryPill`.** The recipe is written three times, but the third is
  in `ScreenState.tsx`, which this ticket doesn't touch, and the instances differ in
  padding, label size and a busy state. Splitting them into one component with three
  variants trades duplication for speculative generality; the recipe is already documented
  in §3.
- **De-duplicating the two test-local `emitAuthChange` helpers.** They are four lines of
  scaffolding over two different mocks, and a shared test util would couple two suites that
  have no other reason to move together.

**Not done, and why:**
- **Nothing on a device.** Same as every slice on this machine: no emulator, no Docker. The
  Android bundle export and the suites are the checks available. Sign-up, sign-in, sign-out
  and the restart are owed an Expo Go pass on the owner's phone — the restart especially,
  since the strongest proof here is a storage round trip rather than a cold start. That
  check rides along with #21's map verification.
- **No provider buttons, no divider, no "Forgot password?"** — #6 and the SMTP that makes a
  reset deliverable. Recorded as divergences in §5, with where each goes when it lands.
- **Profile's "your places", language toggle and delete account** stay in #8, #13 and #10.
  §4.8 carries their recipes and says where they slot in.
- **The Add tab still gates nothing.** Story 12's "prompted to sign in only at that moment"
  is #7's, and the tab is still `ComingSoon`.
