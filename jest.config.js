/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // The RLS suite makes real round trips to Supabase; 5s is tight for a cold
  // connection from WSL2.
  testTimeout: 30000,
};
