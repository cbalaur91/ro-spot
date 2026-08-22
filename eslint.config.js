// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Generated output, and the runtime the design canvas was exported with:
    // neither is ours to lint.
    ignores: [
      "dist/*",
      ".expo/**",
      "assets/support.js",
      "src/data/database.types.ts",
    ],
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
