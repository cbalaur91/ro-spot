require('dotenv').config({ quiet: true });

// These suites talk to the real `rospot` project. Without credentials they can't
// even load — `src/data/supabase.ts` fails fast on a missing key — so the
// decision to run them belongs here rather than in a `describe.skip` inside them.
const INTEGRATION_SUITES = [
  '<rootDir>/src/data/__tests__/places.rls.test.ts',
  '<rootDir>/src/data/__tests__/photos.storage.test.ts',
  '<rootDir>/src/data/__tests__/auth.integration.test.ts',
  '<rootDir>/src/data/__tests__/submissions.integration.test.ts',
];

const hasSupabaseCredentials = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!hasSupabaseCredentials) {
  console.warn(
    '\n⚠  Skipping the Supabase integration suites — no credentials.\n' +
      '   Copy .env.example to .env and fill it in to run them.\n'
  );
}

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: hasSupabaseCredentials
    ? ['/node_modules/']
    : ['/node_modules/', ...INTEGRATION_SUITES],
  // They make real round trips to Supabase; 5s is tight for a cold connection
  // from WSL2.
  testTimeout: 30000,
};
