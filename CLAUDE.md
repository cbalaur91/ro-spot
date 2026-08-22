# RoSpot

Community map of Romanian places in the US. Expo (React Native) mobile app for iOS + Android, Supabase backend (project `rospot`, `us-east-2`).

## Commands

```sh
bun install              # dependencies (use `npx expo install <pkg>` for anything Expo resolves)
bun run typecheck        # tsc --noEmit
bun run lint             # eslint .
npm test                 # Jest — see the note below, `bun run test` does not work
bun run start            # dev server; open in Expo Go
bun run web              # browser preview — the fastest loop on WSL2, where there's no emulator
npx expo export --platform android   # bundles for Android; the closest thing to a boot check without a device
```

**Tests run under `npm`, not `bun`.** `bun run` puts a `node` shim on PATH that is Bun
itself, and Jest cannot run on Bun's runtime. On this machine Bun is a snap, so its
confinement also hides the real Node — installing Bun natively (`curl -fsSL
https://bun.sh/install | bash`) would not fix Jest-on-Bun, but it would let a wrapper
find Node. Until then, `npm test`.

`npm test` runs the RLS integration suite only when `.env` has Supabase credentials;
without them `jest.config.js` drops that file and warns. Everything else still runs.

Web is a **dev convenience, not a release target** — v1 ships iOS + Android. Expect the
Map tab to be Android/iOS-only once `react-native-maps` lands.

Supabase migrations go through the CLI with `SUPABASE_ACCESS_TOKEN` from `.env`:
`supabase db push --linked`, then regenerate types into `src/data/database.types.ts`
with `supabase gen types typescript --linked --schema public`.

## Architecture

- `src/app/` — Expo Router routes. `(tabs)` holds Map / List / Add / Profile.
- `src/data/` — **the only place that touches supabase-js.** Screens and hooks import
  functions from here, never the client, so the query surface stays auditable against
  the RLS policies. `src/data/__tests__/places.rls.test.ts` asserts the policies against
  the real project (no Docker on this machine, so there is no local stack).
- `src/i18n/` — Romanian and English, device locale by default. All UI copy lives here;
  user-submitted content is shown as written.
- `src/motifs/` — the «Ie» cross-stitch language: pure grid geometry (`stitch.ts`), the
  pixel grids ported from the design canvas (`grids.ts`), and the components that draw
  them. The grids are data copied from `assets/RoSpot Motifs.dc.html`, so edit the canvas,
  not them.
- `src/theme.ts` — palette, mirrored in `tailwind.config.js` because navigator options
  take plain values rather than NativeWind classes.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on cbalaur91/ro-spot (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
