import { configDefaults, defineConfig } from "vitest/config";

const performanceTest = "tests/integration/performance.test.ts";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/**/*.d.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
    },
    exclude: [...configDefaults.exclude, performanceTest],
    include: ["tests/{unit,contract,integration,e2e}/**/*.test.ts"],
    passWithNoTests: false,
    setupFiles: ["tests/setup/fast-check.ts"],
  },
});
