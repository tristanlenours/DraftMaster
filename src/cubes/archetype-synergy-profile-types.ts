import type { DeckSynergyProfile } from "../domain/coaching/types.ts";

export type ArchetypeRole =
  | "payoff"
  | "enabler"
  | "body"
  | "bridge"
  | "fixer"
  | "combo_piece"
  | "outlet"
  | "target"
  | "mana"
  | "velocity"
  | "interaction"
  | "fodder"
  | "recursion";

export type ArchetypeEvidenceSource =
  "owner_tag" | "owner_description" | "oracle_rule" | "curated_inference";

export interface ArchetypeCardEvidence {
  readonly source: ArchetypeEvidenceSource;
  readonly detail: string;
}

export interface ArchetypeCardRoleDefinition {
  readonly oracleId: string;
  readonly name: string;
  readonly strength: "key" | "support";
  readonly roles: readonly ArchetypeRole[];
  readonly families: readonly string[];
  readonly evidence: readonly ArchetypeCardEvidence[];
  readonly confidence: "A" | "B" | "C" | "D";
}

export interface ArchetypeRequiredFamilyDefinition {
  readonly id: string;
  readonly name: string;
  readonly minimum: number;
}

export interface ArchetypeSynergyDefinition {
  readonly id: string;
  readonly name: string;
  readonly targetPoints: number;
  readonly requiredFamilies: readonly ArchetypeRequiredFamilyDefinition[];
  readonly cards: readonly ArchetypeCardRoleDefinition[];
}

export interface ArchetypeSynergyProfileDocument {
  readonly schemaVersion: 1;
  readonly modelVersion: "archetype-synergy@1";
  readonly cubeKey: string;
  readonly cubeSnapshotId: string;
  readonly archetypes: readonly ArchetypeSynergyDefinition[];
}

export interface LoadedArchetypeSynergyProfile {
  readonly document: ArchetypeSynergyProfileDocument;
  readonly evaluationProfile: DeckSynergyProfile;
}
