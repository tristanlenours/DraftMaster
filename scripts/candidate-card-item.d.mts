export const MIN_RELIABLE_PICK_COUNT: number;

export function cardNameToSlug(name: string): string;

export function classifyRoles(input: {
  readonly tags: readonly string[];
  readonly types: readonly string[];
  readonly cmc: number;
  readonly isLand: boolean;
  readonly producesColors: readonly string[];
  readonly score: number;
}): string[];

export function scoreFromElo(
  calibrationBlocks: readonly {
    readonly inputMin: number;
    readonly inputMax: number;
    readonly score: number;
  }[],
  elo: number,
): number;

export function buildCandidateItem(
  evidence: Record<string, unknown>,
  scryfall: Record<string, unknown>,
  options: { readonly score: number; readonly summary: string; readonly updatedAt: string },
): Record<string, unknown>;

export function extractCubeCobraCard(html: string): Record<string, unknown> | undefined;
