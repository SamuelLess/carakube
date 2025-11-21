import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import preferArrowPlugin from "eslint-plugin-prefer-arrow";
import { defineConfig, globalIgnores } from "eslint/config";

const jsRules = {
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    eqeqeq: ["error", "always"],
    "no-implicit-coercion": "error",
    "prefer-const": "error",
    curly: ["error", "all"],
  },
};

const tsRules = {
  plugins: {
    "prefer-arrow": preferArrowPlugin,
  },
  rules: {
    "prefer-arrow/prefer-arrow-functions": [
      "error",
      {
        classPropertiesAllowed: false,
        disallowPrototype: true,
        singleReturnOnly: false,
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "@typescript-eslint/no-unused-expressions": [
      "error",
      {
        allowTernary: true,
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  jsRules,
  tsRules,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  eslintConfigPrettier,
]);

export default eslintConfig;
