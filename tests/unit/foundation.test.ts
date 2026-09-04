import { readConfigureGlobal } from "fast-check";
import { describe, expect, it } from "vitest";

describe("tooling foundation", () => {
  it("runs tests on the supported Node.js major version", () => {
    expect(process.versions.node).toMatch(/^24\./u);
  });

  it("loads the shared fast-check parameters", () => {
    expect(readConfigureGlobal()).toMatchObject({
      interruptAfterTimeLimit: 10_000,
      markInterruptAsFailure: true,
      numRuns: 100,
    });
  });
});
