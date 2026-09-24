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
- [ ] 10. Auth flows: email/password ✅ (#5); Google native + Apple flag deferred 2026-09-19 (#6, needs phone + OAuth client) → verify: sign up/in/out on Android device; session persists across restarts
- [x] 11. Submission form (#7, device pass owed): fields → geocode → draggable pin → photo pick + compress (≤5, ~1600px) → upload → insert pending → verify: place appears `pending` in dashboard, invisible in app; flipping to `approved` makes it appear
- [ ] 12. Own-place edit → back to pending; duplicate-proximity flag on insert → verify: edited place disappears from public view until re-approved
- [ ] 13. Profile screen: my places (with status), language toggle, sign out, delete account → verify: deletion via a throwaway account

## Phase 4 — Ship-readiness
- [ ] 14. Sentry wired into dev build → verify: test crash appears in Sentry dashboard
- [ ] 15. i18n completeness pass (all UI strings RO+EN) → verify: no hardcoded strings on any screen in either locale
- [ ] 16. Privacy policy page (hosted) + linked in app → verify: URL loads from the app
- [x] 17. Seed Metro Detroit places (owner provides 10–20; script inserts as approved) → verified: pins render on Detroit map (#11, 6 places by owner's call)

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

## Issue #7 — Submit a place

Covers Phase 3 step 11 and the insert half of Phase 1 steps 4–5. #6 (native Google / Apple flag)
was deferred on 2026-09-19 — it needs a phone and a Google OAuth client; email/password unblocks
this. Environment unchanged: no emulator, no Docker. This slice is verified in the **web preview
driven by a headless browser** against the real `rospot` project, plus Jest and the Android export.

Flow: Add tab → (anonymous: sign-in invitation) → form (§4.10 + optional phone / website / social)
→ "Continue" geocodes the address → pin step (draggable marker on native; web stand-in shows the
coordinates, no drag) → "Submit for review" compresses, uploads, inserts → done state.

- [x] A. Migration: `places` insert policy for `authenticated` (`author_id = auth.uid()`,
      `status = 'pending'`, ≥1 `photo_paths`, each exactly `<uid>/<file>.jpg`); storage policy on
      `place-photos` — authenticated **insert only** inside own `<uid>/` folder (no select/delete:
      a photo behind an approved place can't be swapped after the moderator saw it)
      → verify: `supabase db push --linked` applies; types regenerate with no diff beyond expected
- [x] B. Integration suite `submissions.integration.test.ts` (TDD against the real project):
      authed insert lands pending and is invisible to anon; insert claiming `approved` or another
      author is refused; anon insert refused; authed upload to own folder OK, to another folder
      refused, anon upload refused; flipping to approved (service role) makes it publicly readable
      → verify: red before the migration, green after; throwaway user + rows + objects deleted
- [x] C. `src/submission.ts` — pure `validateDraft` (DB length limits, category, 1–5 photos,
      optional links must pass `telUrl` / `webUrl`) and `fitWithin` (1600px longest edge), TDD
      → verify: unit suite, incl. never upscaling and zero / six photos
- [x] D. `src/data/submissions.ts` — `submitPlace(draft)`: upload each photo to
      `<uid>/<uuid>.jpg`, insert pending. No cleanup of uploads on a failed insert — that needs a delete policy,
      see above; flagged below
      → verify: covered by B through the app's own function, not a second copy of the query
- [x] E. `src/photos.ts` (expo-image-picker + expo-image-manipulator → ≤1600px JPEG ~80%) and
      `geocodeAddress` (expo-location `geocodeAsync`, `null` on no result / unsupported)
      → verify: unit tests with the native modules mocked; installs via `npx expo install`
- [x] F. `PinMap.native.tsx` (draggable rhomb marker) + `PinMap.tsx` web stand-in
      → verify: `onDragEnd` reports coordinates (mocked map); web bundle has no react-native-maps
- [x] G. `src/app/(tabs)/add.tsx` — anonymous invitation, form, pin step, done state; RO + EN copy
      → verify: component suite — gate, per-field problems, single-select category, photo floor /
      ceiling, geocode miss falls back to the origin with a notice, submit passes final dragged
      coordinates + address text, busy pill can't double-submit, failure keeps the draft
- [x] H. `docs/DESIGN.md` — move §4.10 to Built, record the pin step, optional fields and any
      divergence in §5; retire ComingSoon if orphaned (flag, don't silently delete)
- [x] I. Gates: `bun run typecheck`, `bun run lint`, `npm test`, `npx expo export --platform android`
- [x] J. Web end-to-end (headless chromium over CDP, run under node): sign in as a throwaway user,
      fill the form, attach a photo, submit → row is `pending` via service role, absent from the
      List; flip to `approved` → appears in the List; then delete row, objects, user
- [x] K. `/code-review`, fix, commit

### Review — #7

Shipped: the Add tab. Anonymous → sign-in invitation; signed in → the §4.5 form (five canvas
fields + optional phone / website / social), "Continue to the map" geocodes on the device, the
pin step (drag or tap; origin + a notice when the geocoder misses), "Submit for review"
compresses-then-uploads photos to `<uid>/` and inserts `pending`, then a hora done state.
`ComingSoon` had no users left and is gone. #6 was deferred first (needs a phone + a Google
OAuth client) and relabelled `ready-for-human`.

**Verified.** 297 tests / 24 suites green (was 253 / 18), typecheck + lint clean, Android bundle
exports. Integration suite against the real `rospot`: submission lands pending under its
author, invisible to `fetchApprovedPlaces` / `fetchPlace`, visible through both once approved;
refused — arriving approved or rejected, someone else's `author_id`, no photo, a borrowed
photo path, a `../` path, anonymous insert, upload outside own folder. **Web end-to-end in
headless chromium** (throwaway script, deleted): gate → sign in → problems → fill + file
chooser → pin → submit → row `pending`, author correct, a 3200×2400 source stored as a
1600×1200 `image/jpeg`, absent from the List, present after flipping to `approved`; user, row
and objects deleted after. Screens read against DESIGN at 390×844.

**Review found, and fixed:**
- **The photo-path check was a prefix match.** `<uid>/../seed/x.jpg` passed `like '<uid>/%'`
  and resolves to another place's photo. Now a whole-path regex, with a test that was red
  first. The migration was uncommitted, so it was rewritten and re-applied (policies dropped,
  `migration repair --status reverted`, pushed again) rather than followed by a corrective one.
- **Android's geocoder throws without location permission** (expo-location checks it; iOS
  doesn't), so anyone who refused the browse prompt would always miss. `geocodeAddress` asks
  again first.
- **Compression trusted the picker's width/height, which may be 0** → full-size upload → over
  the bucket's 5 MB. It decodes first and sizes from the decoded image.
- **A drag landing after the send could resurrect the pin step** (stale `step` closure). The
  update is functional and guarded.
- **The draft survived sign-out.** `Submission` is keyed by user id now.
- **The pin step re-read `draft.photos`** though it claimed to send what was checked; the
  step carries the photos. `addPhotos` appended to a stale list; functional now.
- `toFixed` on the web pin's coordinates (→ i18next formatter); the 36 measure restored in
  §3; group labels (Category, Photos) are spoken, since nothing else names the group.

**Considered and declined:** sharing `Invitation` with Profile and the done column with
`EmptyInvitation` (two users each, different copy and CTA — same call as #5's `PrimaryPill`);
`PlaceSubmission = DraftFields & …` (would point `src/data` at a UI module).

**Not done, and why:**
- **Nothing on a device** — picker, manipulator, geocoder, draggable marker and `fetch(file://)`
  are proven only through mocks and the web build. Rides with #21. *(Done 2026-09-20 — see the device pass below.)*
- **Orphaned uploads** when an insert fails after its photos went up, and on retry. Cleaning
  up needs a delete policy this slice deliberately withholds; #10's account deletion clears
  the folder. No per-user upload cap either — worth an issue before public launch.
- **`accessibilityLiveRegion` is Android-only**, here as on sign-in; iOS announcements are a
  standing gap for the i18n/a11y pass (#13).
- **HORA's rule was widened** (§2): empty List and the Add done state, the two ends of one
  sentence. Flagged for the owner — revert to a rhomb + star band if it reads as too much.

## Device pass — 2026-09-20 (emulator dev build + owner's phone)

First time anything ran off the web. Setup is a machine fact, recorded in
`~/.claude/rules/wsl-environment.md`: Windows AVD `rospot` driven from WSL over `adb.exe`, a
local `assembleDebug` APK (no Expo account), our own Maps key from `.env`. Expo Go on Android
cannot show the map (see lessons), so the owner's phone proved everything *but* the map.

**Passed on the emulator, against the live project:** Map tiles, location prompt, rhomb pins,
callout → detail, nearest-place card; List; sign-in, sign-out, session surviving a force-stop;
Add — sign-in gate, all five validation messages, gallery photo pick, on-device geocode, tap
and hold-drag of the pin (the stored row carried the dragged coordinates), the missed-address
fallback (wide view, pin at the user's origin, cherry notice), submit → `pending` row with the
photo in the author's folder, hora confirmation, draft discarded on sign-out; Romanian via
per-app locale. Test users, rows and photos were deleted afterwards.

**Found and fixed (#23):** the map card covered the Google logo; a found address opened the pin
step at metro zoom. **Owner's calls:** the hora stays on the done state; its clipped first
dancer is the band contract (§2), left alone.

**Still not on a device:** detail-screen links (dialer / browser), photo compression on a real
large photo (the emulator's test image was small), camera-sourced photos, anything iOS. The
APK is x86_64-only — the owner's phone needs an arm64 build. #21 can close on the map evidence
above once the owner agrees.

## Issue #8 — My places, author edit re-enters review, duplicate flag

Covers Phase 3 step 12 and the "my places" block of step 13. Verified in Jest (unit + component),
integration suites against the live `rospot` project, and the Android export.

- [x] A. Migration `your_places`: author select-own policy; column-level `update` grant to
      `authenticated` (content columns only — never `status`, `author_id`, `created_at`); author
      update policy (own row, ≥1 photo, own-folder paths); `before update` trigger that sets
      `status = 'pending'` for any client-role edit; `pg_trgm` + `unaccent`; helper
      `places_look_alike(name, lat, lng, name, lat, lng)` (≤150 m haversine and trigram
      similarity ≥ 0.45 on unaccented lower-case names — threshold measured on 11 real-shaped
      pairs); moderator-only `place_duplicate_flags` table (RLS on, no policies) filled by a
      `security definer` after-insert trigger → verified: suite red first (17 failures), then
      `supabase db push --linked` applied and `gen types` regenerated
- [x] B. Integration suite `your-places.integration.test.ts`: author reads own pending, a stranger
      doesn't; author edit of an approved place → pending, gone from `fetchApprovedPlaces` /
      `fetchPlace`; author can't write `status` directly, can't edit another's place; moderator
      approval is not reset by the trigger; helper table-driven (`admin.rpc`); a near similarly-named
      insert gets a flag against the seed, a far or differently-named one doesn't; flags invisible
      to the author → verified: 24 assertions green against `rospot`, throwaway users, rows and
      objects deleted
- [x] C. `src/data/submissions.ts`: `fetchMyPlaces()`, `updatePlace(id, edit)` (kept paths +
      new JPEGs, uploads shared with `submitPlace`, throws when 0 rows updated) → verify: via B
- [x] D. Pure helpers, TDD: `locality(address)` for the card line; `draftFromPlace(place)`;
      `DraftPhoto` gains an optional stored `path` → verify: unit tests
- [x] E. Extract the Add form + pin step into `src/components/PlaceEditor.tsx`; Add keeps gate +
      done → verified: the Add suite's 13 assertions are unchanged; its render helper gained a
      `QueryClientProvider`, which the submit-time cache invalidation genuinely needs
- [x] F. `useMyPlaces()` + Profile "Your places" block (§4.8 cards, PENDING / APPROVED / REJECTED
      badges, loading / failed / empty); Add invalidates it on submit → verify: profile suite
- [x] G. `src/app/edit/[id].tsx`: prefilled editor, unchanged address skips the geocode and keeps
      the pin, save → invalidate + back → verify: component suite (kept paths, re-pending copy)
- [x] H. RO + EN copy; `badgeRejected` token (theme + tailwind); DESIGN.md §4.8 / new edit
      screen / §5 → verify: palette test, both-locale assertions
- [x] I. Gates → verified: `bun run typecheck` and `bun run lint` clean, `npm test` 347 green
      (was 310), `npx expo export --platform android` bundles at 5.4MB
- [x] J. Emulator pass on the AVD `rospot` against the live project → verified: submit → the card
      appears under YOUR PLACES as PENDING with no restart; moderator approval (as `postgres`) is
      *not* re-pended by the trigger and reads APPROVED; the card opens the prefilled edit form
      with its stored photo; an untouched address skips the geocoder; save → PENDING again and the
      place is gone from the List in the same session; `rejected` reads NOT ACCEPTED in its cherry
      tint. Screenshots in `~/.cache/rospot-shots/`. Test place and photo deleted; the emulator's
      standing account was kept
- [ ] K. `/code-review`, fix, commit

### Review — #8 (2026-09-20)

Shipped: "your places" on the Profile tab with a status badge per submission, an edit screen
that is the Add form prefilled, and a moderator-facing duplicate hint. 347 tests green (was
310), typecheck and lint clean, the Android bundle exports, and the whole flow was driven on
the `rospot` emulator against the live project.

**The rules are the database's.** An author's edit re-enters review because `authenticated`
holds no `update` privilege on `status` (a column-level grant lists exactly the content
columns) and a `before update` trigger writes `pending` for any edit arriving as a client
role. The trigger skips `postgres` and `service_role`, so the moderator's approval in the
dashboard is not undone by the same rule — which the suite asserts both ways. The client
could be wrong about all of this and the queue would still hold.

**The duplicate hint is a table, not a column.** `place_duplicate_flags` has RLS on and no
policy, so no client role can read it at all; `select *` is how every screen reads a place,
and a hint about somebody else's pending submission is not the submitter's business. An
after-insert `security definer` trigger fills it, because the submitter cannot see what they
might be duplicating — another pending submission is invisible to them, which is exactly the
case worth flagging. Similarity is `pg_trgm` over unaccented lower case at 0.45, and the
threshold is a measurement rather than a guess: five pairs that are the same place said
differently score 0.53–1.00, five pairs that are different places at one address score
0.00–0.33, and the suite is that table.

**One form, two screens.** `PlaceEditor` is the Add tab's form and pin step, lifted out
whole; the tab keeps its gate and its done state, and the edit screen supplies a header, a
pill and what to do after the save. A photo already in the bucket travels back as its path
rather than being downloaded and re-uploaded to end up where it already is, which is the one
thing `DraftPhoto` gained. An address nobody touched skips the geocoder — geocoding it again
would move a place that only had its description fixed.

Deviations and things still owed:
- **Approval doesn't reach a running app.** The Profile tab refetches when the app starts, on
  submit and on save, but a place approved while the app is open keeps reading PENDING until
  the next launch. Worth an app-state refetch if it bothers anyone; not worth polling.
- **Removed photos stay in the bucket.** There is still no delete policy on purpose (#7), so
  an edit that drops a photo orphans the object until account deletion (#10) clears the
  folder.
- **The duplicate check runs on insert only**, as the issue asks. An edit that renames a place
  onto somebody else's is not flagged — the moderator sees it again anyway.

Changed after the two-axis code review:
- **An edit aimed at somebody else's place used to upload first and refuse afterwards**, and
  uploads cannot be taken back — there is no delete policy. `updatePlace` now reads the row's
  author before the photos go up. The policy is still what decides; this only spares the
  bucket the litter.
- **A moderator-facing view**, `place_duplicate_review`: the flags table carries two ids,
  which is all the trigger knows, and a hint that has to be joined by hand for every row is a
  hint nobody reads. The view is `security_invoker`, so it is not a way around the policies
  under it, and it is revoked from both client roles anyway.
- **The cache invalidations are no longer awaited.** A save that landed was being reported as
  a failure if the refetch behind it was slow or came back an error.
- **`onSaved` moved out of the save's `try`**: navigating away is not part of saving, and a
  throw from it was drawn as "the place was not saved".
- `fetchMyPlaces` and `signedInUserId` read the session through one function now.

Reviewed and deliberately kept:
- **The unit test for the similarity helper is the integration suite's table.** The helper is
  SQL — `pg_trgm` over `unaccent` — and the only honest unit test for it runs against a
  database. A TypeScript reimplementation to test in Jest would be a second algorithm that
  can drift from the one the trigger actually calls. The cost is real and known: a clone
  without credentials has no coverage of the 0.45 threshold.
- **The 1–5 photo ceiling is not in the update policy** because it is already a table
  constraint (`places_photo_paths_max`, from the photos migration), which no policy can be
  written around. Only the floor of one is policy-side, because a seeded place may have none.
- **`src/address.ts` is not scope creep**: DESIGN §4.8 specifies the card as a name over a
  locality, and the row carries an address.
- **The form's copy stays under `add.*`.** The edit screen *is* the Add form (§4.9); giving
  the shared fields a second namespace would be two places to change one label.
- **The edit screen reads its place out of "your places"** rather than fetching by id. It is
  reached from a card on that list, so the rows are already there; a deep link to
  `/edit/<id>` fetches the author's places once, which is the same query the Profile tab
  makes anyway.

Follow-ups worth an issue:
- A place approved while the app is open keeps reading PENDING until the next launch. An
  app-state refetch would fix it; polling would not be worth it.
- `flag_duplicate_place` scans every place per insert — the similarity call is not sargable.
  Fine at seed scale, and the place to look if submissions ever get slow.
- The duplicate check is insert-only, so renaming a place onto somebody else's is not
  flagged. The moderator sees the edit again regardless.
- `return_place_to_review()` is the one function in the migration without a
  `revoke execute` — harmless for a trigger function, inconsistent with the file's hygiene.

## List card — thumbnail, description, quick actions, pinned chips (unticketed, owner's ask 2026-09-20)

Four changes to the List tab, asked for by the owner in one go. No new dependency and no native
rebuild: `expo-image`, RN `Linking` and Ionicons are already in the installed debug APK, and the
list rows already carry `description`, `photo_paths`, `phone`, `lat`, `lng`.

Decided with the owner before starting: Directions / Call sit in a **labelled footer row** under a
hairline (cards grow to ~162dp, ~3.7 a screen, in exchange for actions that say what they do), and
the emulator pass may seed **8 temporary approved rows** in the live project, deleted by constant
id afterwards. The chips pin; the wordmark does not shrink on scroll — the preamble of DESIGN.md allows no
animation beyond a photograph's fade.

- [x] A. `directionsUrl(coords, os)` in `src/links.ts`, test first → verified: 4 unit tests; Google
      `dir` URL everywhere but iOS, Apple Maps there, always to the coordinates
- [x] B. `actions.directions` / `directionsTo` / `call` / `callPlace` in both locales → verified:
      RO assertion in D, and `Traseu` / `Sună` read on the emulator
- [x] C. `PlaceRow`: 72px thumbnail (outline-rhomb tile when there is no photo or it fails), the
      distance pill in the eyebrow row, a one-line description, a body `Pressable` with an explicit
      label and a sibling footer of link actions; `list.tsx`: `Masthead` + `FilterBar`, a
      single-section `SectionList` with the band and chips as its sticky header, empty states in
      the list footer → verified: the 13 existing list tests passed unchanged
- [x] D. List suite: thumbnail uri, no-photo tile, failed photo and its retry on refetch,
      description, row label, Directions / Call open the right URL and don't navigate, links are
      siblings of the row, Call hidden for a null or un-dialable phone, a failed hand-off alerts,
      the bar pins on Android (mutation-checked: fails without the prop), chips survive both
      empties, RO labels → verified: 26 in the suite
- [x] E. DESIGN.md preamble, §1, §2, §3 (Card, new Thumbnail and Card action, Pills,
      Accessibility), §4.2, §4.3, §5 → verified: read against the shipped classes by a reviewer
- [x] F. Gates → verified: `bun run typecheck` and `bun run lint` clean, `npm test` 363 green
      (was 347), `npx expo export --platform android` bundles at 5.4MB
- [x] G. Four-lens review (correctness, a11y, DESIGN.md, tests), each finding adversarially
      verified → verified: 8 confirmed and fixed, 5 refuted, a11y lens clean; gates re-run
- [x] H. Emulator pass on the AVD `rospot` with 8 temporary approved rows → verified: below

### Review — List card (2026-09-20)

Shipped: every List card shows its first photograph, a line of its description, and a foot with
Directions and — where the phone field holds a number — Call; the band and chips pin under the
status bar while the masthead scrolls away. Cards went from ~100dp to ~140–150dp, so about four
to a screen where there were six: the owner chose the labelled foot knowing that.

**Verified on the emulator, against the live project:** thumbnail, outline tile for a place with
no photo and for one whose path points at nothing, one-line description, pills in one column;
the bar pins opaque with cards passing under it; a pinned chip filters; the chips scroll sideways
while pinned (forced with 1.7× text in Romanian) and keep their offset across a refilter, so the
bar does not remount; the over-filtered notice keeps its chips and offers no CTA; Directions
hands `https://www.google.com/maps/dir/?api=1&destination=…` to Google Maps, which opened a
route; Call hands `tel:3135550142` and `tel:+12485550117` to the dialer, prefilled; back from
both lands on the List at the same scroll depth with no detail pushed; "open 7 days" gets no
Call; the body opens the detail screen; Romanian at 1.3× text holds (`Traseu`, `Sună`,
`4,7 mi`); a very long name, address and description clamp to 2 / 2 / 1 lines. Screenshots in
`~/.cache/rospot-shots/` (`list-before`, `list-top`, `list-pinned`, `list-nomatch`,
`directions-gmaps`, `dialer`, `list-ro-large-top`, `list-pinned-hscroll`, `list-refilter-top`,
`list-after-cleanup`). The 8 fixture rows were deleted by constant id; approved rows and
duplicate flags are back to baseline (St. George and the owner's "Test"; 0 flags); the standing
account, the per-app locale and the font scale were left as found.

**Decisions worth knowing:**
- **The card's two press targets are siblings.** A link inside a button is unreachable on
  VoiceOver, so the body is a `Pressable` and the foot sits beside it. The body carries an
  explicit label — category, name, address, distance — because its own text now includes up to
  2000 characters somebody else wrote.
- **Both empties moved to the list footer.** A section's header counts as an item, so
  `ListEmptyComponent` never fires while the chips are on screen, and the chips are the way out
  of the over-filtered empty.
- **A refilter from the pinned bar scrolls to the foot of the masthead** — where the bar pins —
  so the nearest place is first and the chips don't move under the finger.
- **A failed thumbnail is remembered per fetch, not for good.** The tab never unmounts, so
  pull-to-refresh is how a photo that timed out gets asked for again.

Changed after the review:
- `rounded-lg` is 7 on a device (NativeWind's rem is 14), so the tile and the photograph
  differed by a pixel; both take one `borderRadius: 8` literal now.
- `scrollToLocation` sent the refilter to offset zero — the list keeps no frame for a sticky
  header's cell. Replaced by `scrollTo` the measured masthead height; caught on the emulator.
- `Diamond.tsx`'s comment and §2 / §5 of DESIGN.md said things the change had made untrue.
- Three tests that could not fail: the sticky bar, the chips in both empties, links-as-siblings.

**Considered and declined:** a wordmark that shrinks on scroll (DESIGN.md allows no animation);
icon-only actions (owner chose labels); `geo:` and `canOpenURL` (Android makes an app declare
the scheme before it may ask, and an `https` URL always has a handler).

Noticed, not done: a tap on a pinned chip *during* a fling only stops the fling — Android's own
behaviour for any scroll view, not a hit-test fault. The pull-to-refresh spinner was not caught
in a screenshot, though the refresh itself is how the fixtures appeared.

Follow-ups worth an issue:
- The detail screen has no Directions link; the card now does.
- Thumbnails load the full-size JPEG. Fine at seed scale; an upload-time thumbnail is the fix.
- The gallery's hand-drawn rhombs can move to `Diamond`'s outline form when that file is touched.
- The owner's approved "Test" place (Grosse Ile) is live in the project.

## Issue #9 — Report a problem on a listing

Seams agreed in the ticket: the `reports` table's policies (integration suite against
`rospot`), `reportPlace` in `src/data/`, and the report screen (component tests).

- [x] A. Migration: `reports` (place, reporter, optional note ≤1000, created_at); RLS on,
      insert-only for `authenticated` as themselves, only against a place they can see; no
      select policy → verify: `supabase db push --linked` applies; types regenerated
- [x] B. `reportPlace(placeId, note)` + `reports.integration.test.ts` → verify: signed-in
      insert lands with place/reporter/note; anon refused; reporting as someone else refused;
      no client can read reports (not even their own); pending place refused
- [x] C. `/report/[id]` screen, TDD: anonymous → sign-in invitation; signed in → optional
      note + "Send report"; failure keeps the note; done state → verify: component tests RO+EN
- [x] D. Detail screen: outlined "Report a problem" pill at the foot of the body → verify:
      detail test asserts it pushes `/report/[id]`
- [x] E. DESIGN.md (§4.4, new §4.10, §5 divergence retired) → verify: read through
- [x] F. Gates: typecheck, lint, `npm test`, android export; emulator screenshots of the
      pill, the invitation, the form and the done state; a real report row written then deleted
- [x] G. `/code-review`, fix, commit

Done 2026-09-20. `npm test` 383 green (incl. 9 report-suite assertions against `rospot`),
typecheck + lint clean, Android bundle carries the screen. Emulator pass: pill at the foot of
the detail body, form, sent state, signed-out invitation, and sign-in returning to the form;
one real row written (place, reporter, note) and deleted. Screens in `~/.cache/rospot-shots/report-*.png`.

Decisions: a `/report/[id]` route (not a sheet) so an anonymous reporter has something to
come back to after sign-in; reporters can't read even their own reports (stricter than the
ticket); a report only lands on a place the reporter can see; `FormHeader`/`Field`/`Input`/
`PrimaryPill` moved to `src/components/Form.tsx` so the report screen doesn't import a map.

Review fixes: blank-note normalising lives in `reportPlace` only; two misleading test
names/docs. Kept: third copy of the invitation column (Add/Profile already duplicate it —
worth one shared component later); no rate limit or per-person uniqueness on reports (v1).

Found in passing: the emulator test account's password in auto-memory didn't match
Supabase; reset it to the documented one via the admin API.

## Issue #29 — Tapping a pin selects the place on the Map card

Seams: `PlacesMap` props (`selectedId`, `onSelect`) and the Map screen's card, both through
the existing mocked-`react-native-maps` screen suite.

- [x] A. Before screenshots on the emulator (EN, RO, large text) → verify: pins + card captured
- [x] B. Screen tests first: no title/description/callout; pin press selects without camera
      move (`moveOnMarkerPress={false}`); card follows nearest until a pick; pick survives
      re-sort; removed pick falls back to nearest; no results clears; label + hint; RO strings
      → verify: new tests fail on main's code
- [x] C. Selection state in `index.tsx`, `SelectedPlace` card, `PlacesMap` props (the web
      stand-in takes `_props`, so it needs no change) → verify: suite green, typecheck clean
- [x] D. Pin: 25/3 selected, 17/2 otherwise, raised zIndex, fixed marker box so Android's
      bitmap never clips the rotated rhomb or moves its tip → verify: emulator screenshot
- [x] E. DESIGN.md §4.1 + §5 departure → verify: read against the code
- [x] F. Gates: typecheck, lint, `npm test`, android export → verify: all green
- [x] G. Emulator pass EN/RO/large text + TalkBack on the card → verify: after screenshots
- [x] H. `/code-review`, fix, commit, PR

Done 2026-09-21. `npm test` 407 green, typecheck + lint clean, Android bundle exports. Emulator
(EN, RO, font 1.3): tap selects and grows the pin, card follows, camera stays; seven swaps
without a stale image; empty-map tap and pan keep the pick; a chip that removes it falls back
to the nearest; the card opens details. Shots `~/.cache/rospot-shots/29-*.png`.

**Found on the emulator:** the first cut kept one marker per place and changed the rhomb
inside a fixed box — Android never redrew it, so the tapped pin stayed small. The marker's
`key` now carries the selection (see lessons). **Decided:** a pick removed by a chip or a
refresh is forgotten, not parked. **Not fully verified:** TalkBack's spoken hint — adb taps
activate rather than focus under TalkBack; the card's content-desc was read from the UI dump,
and the pins read "Map Marker" (the List is the accessible route, per the ticket). The
selected pin's 1–3px of shadow under its tip is cut at the bitmap's edge — barely visible.
iOS unverified (`moveOnMarkerPress` is Android-only; Apple Maps doesn't recentre anyway).

## Issue #31 — Clear filters and a result count

Seams: `CategoryFilterProvider` (new `clear`), the List and Map screen suites, and a new
two-tab suite that mounts both screens under one provider.

- [x] A. Before screenshots on the emulator (EN, RO, large text); check Hermes has
      `Intl.PluralRules` (i18next plurals need it) → verify: shots captured, plural resolves
- [x] B. Tests first: count + plurals EN/RO (1/2/20), hidden while pending and on error,
      polite live region on the count only; Clear only while a chip is on; filtered-empty
      Clear on both tabs, true-empty unchanged; Map header count-free; clearing on one tab
      clears the other → verify: new tests fail on main's code
- [x] C. `clear()` on the filter; result row in the List's pinned block; Clear in both
      filtered-empty states; EN + RO strings → verify: suite green, typecheck clean
- [x] D. DESIGN.md recipe (result row) + §4.1/§4.2/§4.3 + §5 if departing → verify: read against code
- [x] E. Gates: typecheck, lint, `npm test`, android export → verify: all green
- [x] F. Emulator pass EN/RO/font 1.3 → verify: after screenshots
- [x] G. `/code-review`, fix, commit, PR with screenshots

Done 2026-09-21. `npm test` 429 green, typecheck + lint clean, Android bundle exports. Emulator
(EN, RO, font 1.3 and 2.0): count + Clear in the pinned row, Clear on both filtered empties,
clearing on the Map clears the List; Clear 44.2dp, notice pill 44.6dp, no overlap with the
chips. Shots `~/.cache/rospot-shots/31-*.png`.

**Found on the emulator:** Hermes has no `Intl.PluralRules` — Romanian read "2 de locuri"
until the `intl-pluralrules` polyfill (see lessons). **Pre-existing, not fixed here:** a chip
changed on the List while the Map is in the background leaves the removed places as default
red Google pins on the Map — reproduced on `main`'s code; needs its own issue. **Decided:** no
count over the true empty (the hora already says so); the List's filtered empty has two Clears
(row + notice pill). **Not verified:** iOS (no live regions there; the count isn't announced).

## Issue #32 — Compact no-photos header and photo failure recovery on place details

Seams: the place detail screen suite (`src/app/place/__tests__/[id].test.tsx`) drives the
gallery through `expo-image`'s `onError`; the migration is proven by `places.rls.test.ts`
and `photos.storage.test.ts` against the live row.

- [x] A. Before screenshots on the emulator (cathedral with photos; a no-photos place) →
      verify: shots captured
- [x] B. Tests first: compact header for no photos (Back in flow, no floating chip), a
      failed page shows "Photo unavailable" + Retry and keeps its page, retry remounts it,
      all failed → compact header with failure copy + Retry that retries all, gallery
      position + failures reset on a new path sequence; EN + RO → verify: fail on main's code
- [x] C. Migration emptying the cathedral's placeholder paths (guarded on id + exact array);
      fixture + integration tests follow the row → verify: `supabase db push`, integration green
- [x] D. Implement: `PhotoGallery` failure pages (failed set lifted to the screen), compact header, Back chip
      floating only over a hero, key the body on place + paths → verify: suite green, typecheck
- [x] E. DESIGN.md §3/§4.4/§2 rhomb table + §5 → verify: read against code
- [x] F. Gates: typecheck, lint, `npm test`, android export → verify: all green
- [x] G. Emulator pass EN/RO/font 1.0+2.0 → verify: after screenshots
- [x] H. `/code-review`, fix, commit, PR with screenshots

Done 2026-09-21. `npm test` green (475 incl. RLS/storage integration), typecheck + lint clean,
Android bundle exports. Migration pushed: the cathedral's `photo_paths` is `{}` on the live
project. Emulator EN 1.0 and RO 2.0: no-photos header, one failed page (kept its page, page
marks at 2), all failed with Retry; no overlap. Shots `~/.cache/rospot-shots/32-*.png`.

**Found on the emulator:** the live "Test" place's only photo is a 14-byte `File not found`
text object served as `image/jpeg` — the submission upload stored an error body instead of
the photo (`readPhoto` doesn't check `response.ok`?). Pre-existing, needs its own issue.
**Decided:** loading/error/not-found also put Back in the flow; the chip still floats over a
loading or failed gallery page (the hero is the gallery). **Not verified:** iOS; that a
per-page retry re-requests over the network (a fresh `expo-image` mount is what the test proves).

## Issue #34 — Let users enable location after a denial or failure

Entry points (owner, 2026-09-21): a "Use my location" pill above Detroit on the Map, and an
action under the List's fallback-origin note. Seams: `useOrigin` suite (expo-location +
AppState + Linking mocked), map and list screen suites (useOrigin mocked).

- [x] A. Tests first: `LocationProvider` shares one origin; `enableLocation` re-asks when the
      OS can, opens Settings when it can't (`canAskAgain: false`), retries a failed fix,
      re-checks silently on return to foreground → verify: fail on main's hook
- [x] B. Implement provider in `useOrigin.tsx`, mount at root → verify: suite green, typecheck
- [x] C. Map: "Use my location" / "Location settings" pill on fallback; a fix it asked for
      recentres → verify: map suite
- [x] D. List: "Use my location" / "Open settings" under the fallback note → verify: list suite, EN+RO
- [x] E. DESIGN.md §4.1/§4.2 (drop "never asks again") → verify: read against code
- [x] F. Gates: typecheck, lint, `npm test`, android export → verify: all green
- [~] G. Emulator pass: deny → retry → grant; deny twice → Settings → return → verify: screenshots
- [x] H. `/code-review`, fix, commit

Done 2026-09-21 (uncommitted→committed on `34-enable-location`). Unit suites 453/453, full
`npm test` 512/512 before the review fixes (integration then hit the Supabase sign-up rate
limit on re-runs — unrelated), typecheck + lint clean, Android export OK.
**Emulator, passed:** denied → Map shows "Use my location" above Detroit, List shows the
action under the note; tap re-prompts; second denial flips to "Location settings"; tap opens
system Settings. Shots `~/.cache/rospot-shots/34-*.png`.
**Emulator, not verified:** the fix itself — the `rospot` AVD never delivers a position to
`getCurrentPositionAsync` (times out even on a cold launch with permission granted, i.e.
main's path too), so "return from Settings → measured from you" and the Map recentre are
proven by tests only. Needs a device pass (#21).
**Review fixes:** a press during the silent re-check is queued, not dropped; fixes time out
after 15 s; one control map instead of three `access` switches; stale fixtures updated.
**Accepted:** a retry briefly un-resolves the origin app-wide (List note hides, detail
distance hides) — honest while the device is being asked; Settings-without-grant leaves the
Map's recentre outstanding until a fix or a touch (documented in DESIGN §4.1).

## Issue #10 — In-app account deletion

Seams: `deleteAccount()` in `src/data/auth.ts` (unit, supabase mocked); Edge Function
`supabase/functions/delete-account` (integration suite against `rospot`, throwaway account);
Profile tab suite (`@/data/auth` mocked). Places, reports and duplicate flags already cascade
from `auth.users`; photos under `<uid>/` in `place-photos` do not — the function removes them
first (retry-safe order: a failed user delete leaves an account that can try again).

- [x] A. Unit tests first: `deleteAccount` invokes the function, then clears the local session;
      a failed call throws and keeps the session → verify: fail, then pass
- [x] B. Edge Function: caller from the bearer token, photos then user; `verify_jwt = false`
      (checks the token itself) → verify: deployed with `--use-api`
- [x] C. Integration: throwaway account with a pending place, photos and a report → delete →
      sign-in fails, rows/photos gone; no token → 401 → verify: suite green
- [x] D. Profile: quiet "Delete account" under Sign out; inline confirm step; failure message
      → verify: profile suite EN+RO
- [x] E. DESIGN.md §4.8 moved from "not built" to built → verify: read against code
- [x] F. Gates: typecheck, lint, `npm test`, android export → verify: all green
- [x] G. Emulator pass with a throwaway account (never the standing one) → verify: screenshots
- [x] H. `/code-review`, fix, commit

Done 2026-09-21 on `10-account-deletion`. Function deployed to `rospot` (`--use-api`,
`verify_jwt = false`, token checked via `auth.getUser`). Integration 7/7 live; emulator pass
with throwaway `emu-delete-10@rospot.test`: confirm card → delete → invitation; re-sign-in
refused; admin check found no user/places/files. Shots `~/.cache/rospot-shots/10-*.png`.
Standing account signed back in.
**Review fixes:** order is places → photos → user (a failure never leaves public places with
broken photos); a token whose user is gone gets 410 and the app finishes signing out (lost
200 no longer loops "try again"); nested folders swept; Map/List/detail caches invalidated;
card title takes TalkBack focus (not verified with TalkBack on the AVD).
**Decided:** approved places go with their author ("owned data"), not only pending ones.
**Flagged, not done:** the text-button shape (`py-[13px] … text-[13.5px] font-semibold`) now
recurs 4× in Profile with no §3 recipe; other devices keep a working access token ≤1 h.

## Issue #11 — Metro Detroit seed script

Owner-approved list (2026-09-21, researched from parish directories, press and the businesses'
own sites): Bar Gabi, Bucharest Grill (Jefferson, one pin for the chain), Holy Trinity (Troy),
St. Nicholas (Troy), Descent of the Holy Spirit (Warren), Sts. Peter & Paul (Dearborn Heights).
St. George stays as its migration left it. Photos: none yet (owner's call) — the script uploads
whatever lands in `assets/seed-photos/<slug>/` on a later run.

Seams: `scripts/seed/plan.ts` (pure: data + photo listing → rows + uploads, validated);
`scripts/seed/metro-detroit.ts` (data, fixed ids); `scripts/seed-metro-detroit.ts` (IO: storage
upsert, then PostgREST upsert on `id` with the service key).

- [x] A. Tests first: plan maps places → approved rows with `author_id` null; photos sorted into
      `seed/<slug>/<file>`; rejects >5 photos, non-`.jpg`, duplicate ids/slugs → verify: fail, then pass
- [x] B. Data file + tests: ids unique and clear of St. George, coords inside Michigan → verify: suite
- [x] C. IO script; run twice → verify: 6 rows, second run changes nothing (count by id)
- [x] D. RLS suite: anon reads every seeded id → verify: integration green
- [x] E. Gates: typecheck, lint, `npm test` → verify: all green
- [x] F. Emulator: Detroit map shows the pins → verify: screenshot
- [x] G. `/code-review`, fix, commit

Done 2026-09-21 on `11-metro-detroit-seed`. `bun scripts/seed-metro-detroit.ts` run against
`rospot`: 6 approved rows, once each after repeated runs, no duplicate flags. `npm test`
555/555, typecheck + lint clean. Emulator: Map shows all 7 seeded pins around Detroit; the
detail screen shows the no-photos state and working contact rows. Shot
`~/.cache/rospot-shots/11-map-1.png`.
**Review fixes:** status is set only on insert (a re-run rewrites fields and photos but
never re-approves a place the moderator hid — proven by hiding Bar Gabi, re-running,
restoring); the script finds `assets/seed-photos` from its own path and skips dotfiles and
subfolders; the RLS check compares whole lists so a miss names the place; re-run rules
(empty folder empties the gallery, renamed photos leave objects behind, replace a photo
under a new name, a dropped place is left alone) are in the script header.
**Accepted:** the RLS suite now also asserts the seed has run on the project — a deploy
check, deliberately; the `seed/<slug>/<file>` layout supersedes the flat one sketched in the
photos migration comment (noted in `plan.ts`, migration left as applied).
**Flagged, not done:** an approved place named "Test" (9157 Dallas Dr, Grosse Ile, authored
2026-09-20) is live on the map — owner to delete or reject. No photos yet: drop JPEGs into
`assets/seed-photos/<slug>/` and re-run.

## Issue #13 — i18n completeness pass (Romanian + English)

Audit first (every non-test file in `src/`): the app already routed every drawn string,
placeholder, label and tab title through `t()`, and the RO/EN key sets matched (RO adds only
the `_few` plurals). What was missing was the toggle, and a few strings built in code.

- [x] A. `setLanguage` / `restoreLanguage` / `resolveDeviceLanguage` in `src/i18n`, TDD →
      verified: 13 tests — device-language order, a stored choice beating the device, a
      garbage stored value ignored, and storage that throws on read or write never blocking
- [x] B. Root layout holds the splash screen until the stored choice is back → verified:
      3 tests; the screen is never drawn in English when Romanian was chosen
- [x] C. Profile language block (DESIGN §4.8) for signed-in *and* anonymous → verified: 4 tests
      (radios, live switch of the whole tab, persisted value, endonyms in both locales)
- [x] D. `map.error` / `list.error` → one `browse.error`; List card's accessible name through
      `list.card` like `map.card`; iOS tab labels via `tabs.a11y` instead of the navigator's
      English "tab, 1 of 4" → verified: list + new tab-bar suites
- [x] E. Emulator pass → verified: toggle switches every tab live (tab bar, List chips,
      `1,4 mi`); radios report `checked`; choice survives force-stop; app locale `ro-RO` with
      nothing stored opens Romanian, English device opens English; English chosen on a
      Romanian device wins after restart; anonymous layout; font scale 2.0 holds
- [x] F. Gates → verified: typecheck, lint, `npm test` 577 green, Android bundle 5.5MB
- [x] G. `/code-review` (standards + spec) and fixes → verified: language halves re-measured on
      the emulator at 38dp + 3 slop (the first cut's slop reached outside the pill, where
      Android drops the touch); anonymous Profile now scrolls at enlarged text; DESIGN §4.8
      wording, `tabs.accessibilityLabel` rename, splash assertion read at module load

Left for later (flagged in the PR): iOS permission prompts in `app.config.ts` are
English-only (needs `locales` in the Expo config; unverifiable without an iOS build); the
sign-in submit has no accessible name while busy; map markers are unlabelled.
