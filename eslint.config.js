import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".agents/**",
      ".specify/**",
      ".scratch/**",
      "agent/**",
      "build/**",
      "coverage/**",
      "data/**/*.json",
      "dist/**",
      "node_modules/**",
    ],
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "*.config.ts"],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    files: ["*.config.js", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
    },
  },
);
