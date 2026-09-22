import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    include: [
      "tests/integration/performance.test.ts",
      "tests/integration/tournament-management-performance.test.ts",
    ],
    maxWorkers: 1,
    passWithNoTests: false,
    setupFiles: ["tests/setup/fast-check.ts"],
  },
});
