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
