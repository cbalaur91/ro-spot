// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "src/data/database.types.ts"],
  },
  {
    // Jest's globals are injected by the runner, not imported.
    files: ["**/__tests__/**", "jest.setup.js"],
    languageOptions: {
      globals: {
        afterAll: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
      },
    },
  },
]);
