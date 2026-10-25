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
    // Modules talk to the draft engine through src/draft/index.ts only.
    files: ["src/**/*.ts"],
    ignores: ["src/draft/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/draft/internal/*"],
              message: "Import from src/draft/index.ts instead of draft internals.",
            },
          ],
        },
      ],
    },
  },
  {
    // The deterministic domain never reaches up into orchestration, adapters or products.
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/coach-advice/*",
                "**/companion/*",
                "**/bots/*",
                "**/bots/**",
                "**/solo-draft/*",
                "**/multiplayer-draft/*",
                "**/tournaments/*",
                "**/deck-lab/*",
                "**/storage/*",
                "**/web/*",
                "**/draft/internal/*",
              ],
              allowTypeImports: true,
              message: "Domain code must stay free of orchestration and adapter dependencies.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/companion/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/prefer-regexp-exec": "off",
      "@typescript-eslint/consistent-generic-constructors": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
    },
  },
  {
    // Browser views and server/data scripts: syntax-aware rules without type information.
    files: ["*.config.js", "scripts/**/*.mjs", "src/web/**/*.js", "src/companion/web/**/*.js"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
);
