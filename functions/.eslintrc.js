module.exports = {
  root: true,

  env: {
    es6: true,
    node: true,
  },

  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],

  parser: "@typescript-eslint/parser",

  parserOptions: {
    project: [
      "./tsconfig.json",
      "./tsconfig.dev.json",
    ],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },

  ignorePatterns: [
    "/lib/**/*",
    "/generated/**/*",
  ],

  plugins: ["@typescript-eslint", "import"],

  rules: {
    "quotes": ["error", "double"],

    "import/no-unresolved": "off",

    // TypeScript provides type information, so JSDoc type annotations
    // are unnecessary and Google's JSDoc rules can conflict with TS syntax.
    "require-jsdoc": "off",
    "valid-jsdoc": "off",

    "indent": ["error", 2],

    // Express Router() is a factory function, not a constructor.
    "new-cap": [
      "error",
      {
        "capIsNewExceptions": ["Router"],
      },
    ],
  },
};
