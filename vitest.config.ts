import { configDefaults, defineConfig } from "vitest/config";

const performanceTests = [
  "tests/integration/performance.test.ts",
  "tests/integration/tournament-management-performance.test.ts",
];

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/**/*.d.ts", "src/companion/**"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 65,
        functions: 85,
        lines: 80,
        statements: 80,
      },
    },
    exclude: [...configDefaults.exclude, ...performanceTests],
    include: ["tests/{unit,contract,integration,e2e}/**/*.test.ts"],
    passWithNoTests: false,
    setupFiles: ["tests/setup/fast-check.ts"],
  },
});
