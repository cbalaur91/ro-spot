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
