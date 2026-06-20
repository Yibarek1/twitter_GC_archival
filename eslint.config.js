// Flat ESLint config. Correctness-focused (catches undefined refs, redeclares,
// unreachable code, etc.) rather than stylistic — the repo's compact hand-written
// style is intentional, so formatting is left as-is.
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "lib/**",            // vendored Fuse.js + Chart.js (minified)
      "node_modules/**",
      "personal_data*/**",  // private real data + any backup copies (e.g. personal_data.REAL)
      "exports/**",        // raw export stubs (data, not source), gitignored
      "_demo_export/**",   // throwaway wizard-test export (data, not source)
      "data.sample.js",    // generated demo data
      "**/*.local.js",     // gitignored local overrides
    ],
  },
  js.configs.recommended,
  {
    // Browser app (one IIFE, no modules).
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, Fuse: "readonly", Chart: "readonly" },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    // Node CLI scripts + config files (CommonJS).
    files: ["scripts/**/*.js", "*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: { "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] },
  },
  {
    // Tests run in Node, but page.evaluate() callbacks reference browser globals.
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: { "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] },
  },
];
