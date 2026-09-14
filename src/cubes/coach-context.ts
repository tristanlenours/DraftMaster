import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CardCatalog } from "../cards/card-catalog.ts";
import type { MasterCatalogCard } from "../cards/types.ts";
import type {
  DeckEvaluationOptions,
  DeckSynergyProfile,
  PackEvaluationContext,
} from "../domain/coaching/types.ts";
import { ArchetypeSynergyProfileRegistry } from "./archetype-synergy-profile.ts";
import { CubeMetaRegistry } from "./cube-meta.ts";
import { loadActiveCubeSnapshot } from "./load-active-snapshot.ts";
import type { CubeSnapshot } from "./validate-snapshot.ts";

export type CoachContextErrorCode =
  | "CONTEXT_FILE_ERROR"
  | "CONTEXT_NOT_READY"
  | "CONTEXT_MISMATCH"
  | "UNRESOLVED_CARD"
  | "INVALID_CARD_FACTS"
  | "POWER_RANKING_DRIFT";

export interface CoachContextError {
  readonly code: CoachContextErrorCode;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export type CoachContextResult<T> =
  | { readonly ok: true; readonly value: Readonly<T> }
  | { readonly ok: false; readonly error: CoachContextError };

export interface CoachContext {
  readonly contextVersion: "coach-context@1";
  readonly cubeKey: string;
  readonly snapshotId: string;
  readonly snapshot: Readonly<CubeSnapshot>;
  readonly catalog: Readonly<CardCatalog>;
  readonly cubeMeta: Readonly<CubeMetaRegistry>;
  readonly synergyProfile?: DeckSynergyProfile | undefined;
  readonly deckEvaluationOptions: DeckEvaluationOptions;
  readonly provenance: {
    readonly snapshotSha256: string;
    readonly snapshotSourceSha256: string;
    readonly profileSourceSha256?: string | undefined;
    readonly archetypeModelVersion?: string | undefined;
    readonly archetypeGeneratorVersion?: string | undefined;
    readonly catalogCardCount: number;
    readonly powerRankingId: string;
  };
}

interface PowerRankingArtifact {
  readonly rankingId: string;
  readonly ranking: readonly {
    readonly oracleId: string;
    readonly name: string;
    readonly score: number;
  }[];
}

function failure(
  code: CoachContextErrorCode,
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): CoachContextResult<never> {
  return { ok: false, error: { code, message, details } };
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function computeBombThreshold(
  snapshot: Readonly<CubeSnapshot>,
  catalog: Readonly<CardCatalog>,
): number {
  const uniqueScores = new Map<string, number>();
  for (const instance of snapshot.cards) {
    const card = catalog.getCardByOracleId(instance.oracleId);
    if (card && !uniqueScores.has(card.oracleId)) {
      uniqueScores.set(card.oracleId, card.powerScore.score);
    }
  }
  const ranked = [...uniqueScores.values()].sort((left, right) => right - left);
  const targetCount = Math.max(1, Math.ceil(ranked.length * 0.05));
  return ranked[targetCount - 1] ?? 55;
}

function validateCardFacts(cards: readonly MasterCatalogCard[]): CoachContextResult<true> {
  const invalidCmc = cards.filter((card) => !Number.isFinite(card.cmc) || card.cmc > 25);
  if (invalidCmc.length > 0) {
    return failure("INVALID_CARD_FACTS", "Le catalogue contient des CMC non plausibles.", {
      cards: invalidCmc.map(({ name, cmc }) => ({ name, cmc })),
    });
  }
  return { ok: true, value: true };
}

function validatePowerRanking(
  artifact: PowerRankingArtifact,
  catalog: Readonly<CardCatalog>,
): CoachContextResult<true> {
  const drift = artifact.ranking.flatMap((entry) => {
    const card = catalog.getCardByOracleId(entry.oracleId);
    return card && card.powerScore.score !== entry.score
      ? [{ name: entry.name, rankingScore: entry.score, catalogScore: card.powerScore.score }]
      : [];
  });
  if (drift.length > 0) {
    return failure("POWER_RANKING_DRIFT", "Le classement de puissance et le catalogue divergent.", {
      drift,
    });
  }
  return { ok: true, value: true };
}

export async function loadCoachContext(
  projectRoot: string,
  cubeKey: string,
): Promise<CoachContextResult<CoachContext>> {
  try {
    const [snapshotResult, catalogResult, cubeMetaResult, rawText, rankingText] = await Promise.all(
      [
        loadActiveCubeSnapshot(projectRoot, cubeKey),
        CardCatalog.fromFile(resolve(projectRoot, "data", "cards", "master-cards.json")),
        CubeMetaRegistry.fromFile(resolve(projectRoot, "data", "cubes", cubeKey, "cube-meta.json")),
        readFile(resolve(projectRoot, "data", "cubes", cubeKey, "cubecobra-raw.json"), "utf8"),
        readFile(resolve(projectRoot, "data", "power-rankings", "power-ranking-v1.json"), "utf8"),
      ],
    );

    if (!cubeMetaResult.ok) {
      return failure(
        "CONTEXT_FILE_ERROR",
        cubeMetaResult.error.message,
        cubeMetaResult.error.details,
      );
    }
    if (cubeMetaResult.value.meta.coachReadiness.status === "blocked") {
      return failure("CONTEXT_NOT_READY", "Le contexte de coaching de ce cube est bloqué.", {
        cubeKey,
        reason: cubeMetaResult.value.meta.coachReadiness.reason,
      });
    }
    if (!snapshotResult.ok) {
      return failure(
        "CONTEXT_FILE_ERROR",
        snapshotResult.error.message,
        snapshotResult.error.details,
      );
    }
    if (!catalogResult.ok) {
      return failure(
        "CONTEXT_FILE_ERROR",
        catalogResult.error.message,
        catalogResult.error.details,
      );
    }

    const snapshot = snapshotResult.value;
    const catalog = catalogResult.value;
    const cubeMeta = cubeMetaResult.value;
    if (
      snapshot.cubeKey !== cubeKey ||
      cubeMeta.cubeKey !== cubeKey ||
      cubeMeta.meta.activeSnapshotId !== snapshot.snapshotId
    ) {
      return failure("CONTEXT_MISMATCH", "Le cube, son meta-profil et son snapshot divergent.", {
        requestedCubeKey: cubeKey,
        snapshotCubeKey: snapshot.cubeKey,
        metaCubeKey: cubeMeta.cubeKey,
        snapshotId: snapshot.snapshotId,
        activeSnapshotId: cubeMeta.meta.activeSnapshotId,
      });
    }

    const unresolved = snapshot.cards.filter(
      (instance) => catalog.getCardByOracleId(instance.oracleId) === undefined,
    );
    if (unresolved.length > 0) {
      return failure(
        "UNRESOLVED_CARD",
        "Des cartes du snapshot ne se résolvent pas par Oracle ID.",
        {
          cards: unresolved.map(({ name, oracleId }) => ({ name, oracleId })),
        },
      );
    }

    const snapshotOracleIds = new Set(snapshot.cards.map(({ oracleId }) => oracleId));
    const missingMetaCards = cubeMeta.meta.archetypes.flatMap((archetype) =>
      [...archetype.keyCards, ...archetype.supportCards]
        .filter((oracleId) => !snapshotOracleIds.has(oracleId))
        .map((oracleId) => ({ archetypeId: archetype.id, oracleId })),
    );
    if (missingMetaCards.length > 0) {
      return failure("CONTEXT_MISMATCH", "Le meta-profil référence des cartes hors snapshot.", {
        cards: missingMetaCards,
      });
    }

    const cubeCards = snapshot.cards.flatMap((instance) => {
      const card = catalog.getCardByOracleId(instance.oracleId);
      return card ? [card] : [];
    });
    const factsResult = validateCardFacts(cubeCards);
    if (!factsResult.ok) return factsResult;

    const ranking = JSON.parse(rankingText) as PowerRankingArtifact;
    const rankingResult = validatePowerRanking(ranking, catalog);
    if (!rankingResult.ok) return rankingResult;

    const profilePath = resolve(projectRoot, "data", "cubes", cubeKey, "archetype-synergy-v1.json");
    const profileResult = await ArchetypeSynergyProfileRegistry.fromFile(profilePath);
    if (cubeMeta.meta.coachReadiness.status === "ready" && !profileResult.ok) {
      return failure("CONTEXT_NOT_READY", "Le profil d'archétypes requis est absent ou invalide.", {
        cubeKey,
        profilePath,
        reason: profileResult.error.message,
      });
    }
    const profile = profileResult.ok ? profileResult.value : undefined;
    if (
      profile &&
      (profile.document.cubeKey !== cubeKey ||
        profile.document.cubeSnapshotId !== snapshot.snapshotId)
    ) {
      return failure("CONTEXT_MISMATCH", "Le profil d'archétypes ne correspond pas au snapshot.", {
        profileCubeKey: profile.document.cubeKey,
        profileSnapshotId: profile.document.cubeSnapshotId,
      });
    }

    const rawDigest = sha256(rawText);
    if (profile && profile.document.provenance.sourceRawSha256 !== rawDigest) {
      return failure(
        "CONTEXT_MISMATCH",
        "Le profil d'archétypes ne correspond pas à son archive source.",
        {
          expected: profile.document.provenance.sourceRawSha256,
          actual: rawDigest,
        },
      );
    }

    const synergyProfile = profile?.evaluationProfile;
    const bombThreshold = computeBombThreshold(snapshot, catalog);
    return {
      ok: true,
      value: {
        contextVersion: "coach-context@1",
        cubeKey,
        snapshotId: snapshot.snapshotId,
        snapshot,
        catalog,
        cubeMeta,
        synergyProfile,
        deckEvaluationOptions: {
          bombThreshold,
          ...(synergyProfile ? { synergyProfile } : {}),
        },
        provenance: {
          snapshotSha256: snapshot.integrity.canonicalSha256,
          snapshotSourceSha256: snapshot.source.rawSha256,
          profileSourceSha256: profile?.document.provenance.sourceRawSha256,
          archetypeModelVersion: profile?.document.modelVersion,
          archetypeGeneratorVersion: profile?.document.provenance.generatorVersion,
          catalogCardCount: catalog.totalCards,
          powerRankingId: ranking.rankingId,
        },
      },
    };
  } catch (error: unknown) {
    return failure("CONTEXT_FILE_ERROR", "Le CoachContext ne peut pas être chargé.", {
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function createPackEvaluationContext(
  context: Readonly<CoachContext>,
  input: Pick<PackEvaluationContext, "packNumber" | "pickNumber" | "offeredCards" | "priorPool">,
): PackEvaluationContext {
  return {
    ...input,
    cubeKey: context.cubeKey,
    catalog: context.catalog,
    cubeMeta: context.cubeMeta,
    synergyProfile: context.synergyProfile,
  };
}
