# Lessons

- Run Jest with `npm test`, not `bun run test`: bun here is a snap, so `bun run` swaps `node` for Bun (Jest dies in stack-utils) and its confinement hides the real Node in `~/.nvm`.
- In Jest, polyfill `fetch` with `node-fetch`, not `undici`: undici's gzip decompression never settles under Jest, so any response big enough for Supabase to compress becomes a silent test timeout.
- Pin Jest with `npx expo install --dev jest jest-expo`, not `bun add -d jest`: bare installs pull Jest 30 against jest-expo's Jest 29 and the runtime fails before any test runs.
- `supabase projects api-keys` masks secret keys unless `--reveal` is passed; the masked value looks like a valid key and fails with "Invalid API key".
- Migrations carry real content only — a test fixture in a migration is permanent schema history applied to every environment; let the suite create and delete its own rows.
- Gate integration suites in `jest.config.js` (via `testPathIgnorePatterns`), not `describe.skip`: a module that fails fast on missing env never reaches the guard inside the file.
