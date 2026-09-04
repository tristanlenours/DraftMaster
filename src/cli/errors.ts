export const CLI_EXIT_CODES = {
  SUCCESS: 0,
  UNEXPECTED: 1,
  INVALID_ARGUMENTS: 2,
  SNAPSHOT_FAILURE: 3,
  DRAFT_REJECTED: 4,
  REPORT_OR_INVARIANT_FAILURE: 5,
} as const;

export type CliExitCode = (typeof CLI_EXIT_CODES)[keyof typeof CLI_EXIT_CODES];

export interface CliFailure {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export function reportCliFailure(stderr: (message: string) => void, failure: CliFailure): void {
  stderr(
    JSON.stringify({
      code: failure.code,
      message: failure.message,
      details: failure.details ?? {},
    }),
  );
}
