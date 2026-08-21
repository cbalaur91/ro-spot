require('dotenv').config({ quiet: true });

// The RLS suite talks to the real `rospot` project. Without credentials it can't
// even load — `src/data/supabase.ts` fails fast on a missing key — so the
// decision to run it belongs here rather than in a `describe.skip` inside it.
const RLS_SUITE = '<rootDir>/src/data/__tests__/places.rls.test.ts';

const hasSupabaseCredentials = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!hasSupabaseCredentials) {
  console.warn(
    '\n⚠  Skipping the RLS integration suite — no Supabase credentials.\n' +
      '   Copy .env.example to .env and fill it in to run it.\n'
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
    : ['/node_modules/', RLS_SUITE],
  // The RLS suite makes real round trips to Supabase; 5s is tight for a cold
  // connection from WSL2.
  testTimeout: 30000,
};
