import { configureGlobal } from "fast-check";

configureGlobal({
  interruptAfterTimeLimit: 10_000,
  markInterruptAsFailure: true,
  numRuns: 100,
});
