---
name: analyzing-cubes
description: Deep foundational analysis of Magic cubes to discover archetypes, classify key/support/bridge cards, and compile archetype synergy profiles. Use when onboarding a cube, auditing or enriching cube-meta.json and archetype-synergy-v1.json, or fixing draft/deck evaluation blind spots caused by incomplete cube metadata.
---

# Foundational Cube Analysis (`analyzing-cubes`)

DraftMaster separates **Cold Foundational Intelligence** (offline, deep structural analysis performed by frontier reasoning models) from **Hot Runtime Execution** (fast, deterministic pick/deck engines and lightweight tactical models like `Jev`, `Gemini Flash`, or `DeepSeek V4.1 Flash`). Downstream draft coaching, *Rate my deck*, and *Pimp my deck* are only as accurate as the secondary matter compiled by this skill.

---

## Step 1 — Cross-Source Inventory & Integrity Audit

Audit `data/cubes/<cubeKey>/cubecobra-raw.json`, the active snapshot (`loadActiveCubeSnapshot`), and `data/cards/master-cards.json` before touching archetypes:

1. **Snapshot & Archive Intersection**: compute the exact set of `oracleId`s present in the cube's active snapshot and `cubecobra-raw.json`.
2. **Canonical Name Resolution**: map every `entry.details.oracle_id` in `cubecobra-raw.json` to `master-cards.json` so Universes Beyond / Secret Lair flavor names (`Hadoken` $\rightarrow$ `Lightning Bolt`, `Valley of Gorgoroth` $\rightarrow$ `Wasteland`, `Balin's Tomb` $\rightarrow$ `Ancient Tomb`, `Mina Harker` $\rightarrow$ `Thalia, Guardian of Thraben`, `The Party Tree` $\rightarrow$ `The Great Henge`) resolve to their canonical Oracle identity while preserving `entry.details.name` for archive provenance checks.
3. **Purge Stale References**: remove any `oracleId` in `cube-meta.json` (`keyCards` / `supportCards`) that is missing from the active snapshot or `cubecobra-raw.json` (e.g., substituted Artifact Bridges or stale UUIDs).

**Completion criterion**: 0 unresolved or out-of-snapshot `oracleId`s across `cube-meta.json` and `cubecobra-raw.json`.

---

## Step 2 — Structural Archetype & Glue Discovery

Mine all four structural signals across the full cube card pool instead of relying on surface guild names:

1. **Owner Tags (`entry.tags` in `cubecobra-raw.json`)**: extract every curator tag (`human`, `goblin`, `tribal`, `multi`, `colourEnabler`, `versatile`, etc.) to uncover the cube designer's explicit packages (such as 5-Color Chromatic / Domain or Clone packages).
2. **Oracle Text Pattern Mining**: scan `oracle_text` (excluding self-name and protection/hate clauses like `Victim of Night` or `Crux of Fate`) for:
   - Explicit tribal payoffs (`\b(?:goblin|vampire|elf|elves|werewolf|wolf|angel|cleric|dragon|human|wizard)s?\b`),
   - Universal tribal engines (`"choose a creature type"`, `"changeling"`),
   - Combo & engine bricks (reanimation spells, discard outlets, cheat-into-play enablers, blink effects, storm rituals/wheels, land recursion, artifact sacrifice/welders).
3. **Subtype & Curve-Color Density**: measure creature subtype counts, mana-fixing infrastructure (Fetchlands, Duals, Shocklands, Triomes, Vivid lands, chromatic rocks), and low-curve threat/interaction density.
4. **Macro-Theater Coverage**: verify that interactive pillars (**Aggro / Initiative**, **Tempo / Disruption**, **Midrange / Attrition**, **Control**, and **5-Color Chromatic / Legends** when supported by fixing) are represented alongside linear/combo or tribal archetypes.
5. **Universal Glue & Bridges**: in synergy/tribal cubes, catalogue every universal bridge card (Changelings, Shapeshifter Clones, `Roaming Throne`, `Coat of Arms`, `Kindred Discovery`, `Black Market Connections`, `Metallic Mimic`, `Adaptive Automaton`, `Cavern of Souls`, `Unclaimed Territory`, `Mutavault`) so they feed every compatible archetype.

**Completion criterion**: Every supported macro-theater, linear combo, tribe, and universal glue package in the cube is mapped to a concrete archetype ID with verified in-cube cards.

---

## Step 3 — Functional Brick & Role Classification (`cube-meta.json` & `archetype-synergy-v1.json`)

Classify cards into strict functional roles and `requiredFamilies` so runtime engines never confuse a pile of generic goodstuff or isolated enablers with a functional deck:

1. **`keyCards` (`strength: "key"`, 5–10 per archetype)**:
   - Reserve `keyCards` for true archetype payoffs, lords, combo pieces, and signature engines (`roles: ["payoff" | "enabler" | "combo_piece"]`).
   - Keep generic mana fixers (Duals, Shocklands, Fetchlands, Bridges) and generic off-plan staples out of `keyCards`.
2. **`supportCards` (`strength: "support"`, 12–25 per archetype)**:
   - Include enablers, outlets, tutors, critical-mass bodies (`density`), archetype-specific interaction, and dedicated mana/fixing supports.
3. **Multi-Brick `requiredFamilies` in `archetype-synergy-v1.json`**:
   - Define 2 to 3 mandatory functional families per archetype (e.g., `outlet` + `reanimation` + `target` for Reanimator; `payoff` + `support` + `density` for Tribal; `threat` + `disruption` for Tempo; `fodder` + `enabler` + `payoff` for Artifacts).
   - Keep pure fast-mana rocks (`Black Lotus`, `Moxen`) in `fodder`/`mana` support families so a raw Power Nine pile without an enabler and payoff cannot score high archetype synergy.
4. **Anti-Pollution Filtering on Broad Subtypes**:
   - When auto-assigning `density` by creature subtype for broad types like `Human` or `Wizard`, explicitly exclude cards locked into incompatible plans or colors (e.g., RG Werewolf Humans like `Tovolar, Dire Overlord` or BB attrition creatures like `Nekrataal` / `Ophiomancer` from Selesnya/White Humans; pure Black Vampire/Zombie Wizards from Izzet Wizards).

**Completion criterion**: `data/cubes/<cubeKey>/cube-meta.json` validates against `validateCubeMetaJson` and `scripts/build-archetype-synergy-profiles.mjs` compiles `data/cubes/<cubeKey>/archetype-synergy-v1.json` with 0 schema or semantic errors.

---

## Step 4 — Secondary Matter Compilation & Verification

Propagate the foundational cube intelligence into all runtime catalogs and verify non-regression:

1. Compile synergy profiles:
   ```bash
   node scripts/build-archetype-synergy-profiles.mjs
   ```
2. Synchronize card items, `master-cards.json` (`relativeTier`, `metaRole`, `metaBonus`, `cubeAnalyses[cubeKey].archetypes`), `cube.json`, `cube-suggestions.json`, and `power-ranking-v1.json`:
   ```bash
   node --experimental-strip-types scripts/sync-data-models.mjs
   ```
3. Verify coach data integrity and test witnesses:
   ```bash
   npx vitest run tests/unit/cubes/ tests/unit/cards/ tests/unit/deck-lab/ tests/integration/coaching/
   ```

**Completion criterion**: All 4 commands exit 0 with zero catalog/ranking/profile drift.
