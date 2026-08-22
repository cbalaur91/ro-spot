# Lessons

- Run Jest with `npm test`, not `bun run test`: bun here is a snap, so `bun run` swaps `node` for Bun (Jest dies in stack-utils) and its confinement hides the real Node in `~/.nvm`.
- In Jest, polyfill `fetch` with `node-fetch`, not `undici`: undici's gzip decompression never settles under Jest, so any response big enough for Supabase to compress becomes a silent test timeout.
- Pin Jest with `npx expo install --dev jest jest-expo`, not `bun add -d jest`: bare installs pull Jest 30 against jest-expo's Jest 29 and the runtime fails before any test runs.
- `supabase projects api-keys` masks secret keys unless `--reveal` is passed; the masked value looks like a valid key and fails with "Invalid API key".
- Migrations carry real content only — a test fixture in a migration is permanent schema history applied to every environment; let the suite create and delete its own rows.
- Gate integration suites in `jest.config.js` (via `testPathIgnorePatterns`), not `describe.skip`: a module that fails fast on missing env never reaches the guard inside the file.
- Press a `Pressable` in tests with `await userEvent.press(el)`: under RN 0.86 + RNTL 14, `fireEvent.press` and a synthetic `click` both leave `onPress` uncalled, and the test fails as if the handler were wrong.
- Give test `QueryClient`s `gcTime: 0`: react-query's default five-minute garbage-collection timer keeps the Node process alive, so Jest sits there for five minutes after the last assertion passes.
- `render` and `renderHook` are both async in @testing-library/react-native 14 — an un-awaited `renderHook` returns before `result` exists, and every assertion reads `null`.
- Don't hand `refetch` straight to `onPress`/`onRefresh`: both call their callback with an argument, and react-query reads a gesture event as `RefetchOptions`. Wrap it once at the hook that returns it, not at each call site.
- Make react-query notify synchronously in `jest.setup.js` (`notifyManager.setScheduler((cb) => cb())`): otherwise a batched notification lands after the test that scheduled it and React warns about an update outside `act()` on maybe one run in three.
- Keep number *formatting* in the locale, not in a helper: `toFixed` hard-codes a `.` and Romanian writes `0,6`. A helper should decide precision and hand i18next a number.
- When a screen shows one message for an empty result, ask which empty it means — "nothing matched your filter" and "there is nothing yet" send the user to different places, and a test that mocks an empty result without touching the filter will happily certify the wrong one.
- A view that measures itself with `onLayout` must not take its size from its own children: position the overflowing child absolutely, or each layout pass measures the overflow and grows the next one.
