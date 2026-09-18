import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const CACHE_PATH = resolve(rootDir, "data/power-rankings/limitedgrades-powered-cache.json");
const MASTER_CARDS_PATH = resolve(rootDir, "data/cards/master-cards.json");
const LIMITED_GRADES_URL = "https://www.limitedgrades.com/powered";

export interface CompactLimitedGradesCard {
  readonly name: string;
  readonly grade: string;
  readonly score: number;
  readonly winrate: number | null;
  readonly gameCount: number;
  readonly takenAt: number | null;
  readonly drawnWinrate: number | null;
  readonly openingHandWinrate: number | null;
}

export interface LimitedGradesPayload {
  readonly capturedAt: string;
  readonly sourceUrl: string;
  readonly cardCount: number;
  readonly cards: readonly CompactLimitedGradesCard[];
}

export interface AuditedDiscrepancyItem {
  readonly name: string;
  readonly slug: string;
  readonly powerScore: number;
  readonly tier: string;
  readonly fit: string;
  readonly grade: string;
  readonly winrate: number | null;
  readonly takenAt: number | null;
  readonly severity?: "CRITIQUE" | "ÉLEVÉ" | "MOYEN" | "FAIBLE";
  readonly diagnosis?: string;
  readonly recommendedAction?: string;
}

export interface VintageAuditResults {
  readonly capturedAt: string;
  readonly cubeKey: string;
  readonly totalCardsCompared: number;
  readonly knownCalibratedTraps: readonly AuditedDiscrepancyItem[];
  readonly criticalOverrated: readonly AuditedDiscrepancyItem[];
  readonly moderateOverrated: readonly AuditedDiscrepancyItem[];
  readonly criticalUnderrated: readonly AuditedDiscrepancyItem[];
  readonly alignedTopStaples: readonly AuditedDiscrepancyItem[];
}

export interface AuditOptions {
  readonly cubeKey?: string;
  readonly offline?: boolean;
  readonly forceRefresh?: boolean;
  readonly specificCard?: string | null;
}

interface RawLgAllStats {
  readonly grade?: string;
  readonly score?: number;
  readonly winrate?: number;
  readonly gameCount?: number;
}

interface RawLgOverallStats {
  readonly takenAt?: number;
  readonly drawnWinrate?: number;
  readonly openingHandWinrate?: number;
}

interface RawLgCard {
  readonly name: string;
  readonly stats?: {
    readonly all?: RawLgAllStats;
    readonly ub?: RawLgAllStats;
  };
  readonly overallStats?: RawLgOverallStats;
}

interface MasterCardsDocument {
  readonly cards: Record<
    string,
    {
      readonly name: string;
      readonly slug: string;
      readonly presentInCubes: readonly string[];
      readonly powerScore?: { readonly score: number };
      readonly cubeAnalyses?: Record<string, { readonly tier?: string; readonly fit?: string }>;
    }
  >;
}

export function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export async function loadLimitedGradesData(
  options: AuditOptions = {},
): Promise<LimitedGradesPayload> {
  const { offline = false, forceRefresh = false } = options;

  if (!offline && !forceRefresh && existsSync(CACHE_PATH)) {
    try {
      const cacheStat = readFileSync(CACHE_PATH, "utf8");
      const parsed = JSON.parse(cacheStat) as LimitedGradesPayload;
      const cacheAgeHours = (Date.now() - new Date(parsed.capturedAt).getTime()) / (1000 * 60 * 60);
      if (cacheAgeHours < 24 && parsed.cards.length > 0) {
        return parsed;
      }
    } catch {
      // Fall through to live fetch if cache parsing fails
    }
  }

  if (offline) {
    if (!existsSync(CACHE_PATH)) {
      throw new Error(`Mode hors-ligne demandé mais aucun cache trouvé à ${CACHE_PATH}`);
    }
    return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as LimitedGradesPayload;
  }

  try {
    const res = await fetch(LIMITED_GRADES_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (DraftMaster Card Power Auditor)" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${String(res.status)} ${res.statusText}`);
    }
    const html = await res.text();
    const match = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(
      html,
    );
    const rawJson = match?.[1];
    if (!rawJson) {
      throw new Error(
        "Impossible de trouver le payload __NEXT_DATA__ dans la page de limitedgrades",
      );
    }

    const nextData = JSON.parse(rawJson) as {
      readonly props?: { readonly pageProps?: { readonly cards?: readonly RawLgCard[] } };
    };
    const rawCards = nextData.props?.pageProps?.cards ?? [];

    const compactCards: CompactLimitedGradesCard[] = rawCards.map((c) => {
      const allStats = c.stats?.all ?? c.stats?.ub ?? {};
      return {
        name: c.name,
        grade: allStats.grade ?? "N/A",
        score: allStats.score ?? 0,
        winrate:
          typeof allStats.winrate === "number" ? Math.round(allStats.winrate * 1000) / 10 : null,
        gameCount: allStats.gameCount ?? 0,
        takenAt:
          typeof c.overallStats?.takenAt === "number"
            ? Math.round(c.overallStats.takenAt * 100) / 100
            : null,
        drawnWinrate:
          typeof c.overallStats?.drawnWinrate === "number"
            ? Math.round(c.overallStats.drawnWinrate * 1000) / 10
            : null,
        openingHandWinrate:
          typeof c.overallStats?.openingHandWinrate === "number"
            ? Math.round(c.overallStats.openingHandWinrate * 1000) / 10
            : null,
      };
    });

    const payload: LimitedGradesPayload = {
      capturedAt: new Date().toISOString(),
      sourceUrl: LIMITED_GRADES_URL,
      cardCount: compactCards.length,
      cards: compactCards,
    };

    writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
    return payload;
  } catch (err) {
    if (existsSync(CACHE_PATH)) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `⚠️ Échec de la récupération distante (${msg}). Utilisation du cache local : ${CACHE_PATH}`,
      );
      return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as LimitedGradesPayload;
    }
    throw err;
  }
}

export async function runVintageGradesAudit(
  options: AuditOptions = {},
): Promise<VintageAuditResults> {
  const { cubeKey = "nico_candyshop", offline = false, specificCard = null } = options;

  const lgData = await loadLimitedGradesData({ offline });
  const masterCardsDoc = JSON.parse(readFileSync(MASTER_CARDS_PATH, "utf8")) as MasterCardsDocument;

  const lgMap = new Map<string, CompactLimitedGradesCard>();
  for (const c of lgData.cards) {
    lgMap.set(normalizeCardName(c.name), c);
  }

  const knownCalibratedTraps: AuditedDiscrepancyItem[] = [];
  const criticalOverrated: AuditedDiscrepancyItem[] = [];
  const moderateOverrated: AuditedDiscrepancyItem[] = [];
  const criticalUnderrated: AuditedDiscrepancyItem[] = [];
  const alignedTopStaples: AuditedDiscrepancyItem[] = [];
  let totalCardsCompared = 0;

  const cardsToCheck = Object.values(masterCardsDoc.cards).filter((card) => {
    if (specificCard) {
      return normalizeCardName(card.name) === normalizeCardName(specificCard);
    }
    if (cubeKey === "all") return true;
    return card.presentInCubes.includes(cubeKey);
  });

  for (const card of cardsToCheck) {
    const lg = lgMap.get(normalizeCardName(card.name));
    if (!lg) continue;

    totalCardsCompared++;

    const powerScore = card.powerScore?.score ?? 0;
    const analysis = card.cubeAnalyses?.[cubeKey] ?? Object.values(card.cubeAnalyses ?? {})[0];
    const tier = analysis?.tier ?? "N/A";
    const fit = analysis?.fit ?? "N/A";
    const grade = lg.grade;
    const winrate = lg.winrate;
    const takenAt = lg.takenAt;

    const item: AuditedDiscrepancyItem = {
      name: card.name,
      slug: card.slug,
      powerScore,
      tier,
      fit,
      grade,
      winrate,
      takenAt,
    };

    if (
      (grade === "F" || grade === "D-") &&
      (fit === "trap" || ((tier === "C" || tier === "F") && powerScore <= 20))
    ) {
      knownCalibratedTraps.push({
        ...item,
        severity: "FAIBLE",
        diagnosis: `Piège de draft empirique correctement identifié et calibré (Tier ${tier}, Score ${powerScore.toFixed(1)}, fit: "${fit}")`,
      });
    } else if (
      (grade === "F" || grade === "D-") &&
      (powerScore >= 38 || tier === "S" || tier.startsWith("A"))
    ) {
      criticalOverrated.push({
        ...item,
        severity: grade === "F" ? "CRITIQUE" : "ÉLEVÉ",
        diagnosis:
          grade === "F"
            ? `Piège de draft avéré (Winrate ${String(winrate)}%, Grade F sur 17lands) surcoté en Tier ${tier} (Score ${powerScore.toFixed(1)})`
            : `Sous-performance empirique (Winrate ${String(winrate)}%, Grade ${grade}) pour un Tier ${tier} (Score ${powerScore.toFixed(1)})`,
        recommendedAction:
          grade === "F"
            ? 'Reclassifier en fit: "trap", ajuster le Power Score à <= 15 et avertir dans la pédagogie.'
            : 'Reclassifier en Tier B / fit: "support" avec score ajusté.',
      });
    } else if (
      (grade === "D" || grade === "D+") &&
      (powerScore >= 38 || tier === "S" || tier.startsWith("A"))
    ) {
      moderateOverrated.push({
        ...item,
        severity: "MOYEN",
        diagnosis: `Enabler ou carte étroite (Winrate ${String(winrate)}%, Grade ${grade}) notée en Tier ${tier} (Score ${powerScore.toFixed(1)})`,
        recommendedAction:
          "Considérer un reclassement en Tier A ou B (rôle de niche/combo plutôt que staple universel).",
      });
    } else if (
      (grade === "A+" || grade === "A") &&
      (powerScore < 30 ||
        tier === "B" ||
        tier === "C" ||
        tier === "D" ||
        tier.startsWith("D") ||
        tier === "F")
    ) {
      criticalUnderrated.push({
        ...item,
        severity: "ÉLEVÉ",
        diagnosis: `Bombe ou top staple (Winrate ${String(winrate)}%, Grade ${grade}) sous-notée en Tier ${tier} (Score ${powerScore.toFixed(1)})`,
        recommendedAction: "Rehausser en Tier A ou S avec Power Score >= 38.",
      });
    } else if (
      (grade === "A+" || grade === "A" || grade === "A-") &&
      powerScore >= 45 &&
      (tier === "S" || tier === "A+")
    ) {
      alignedTopStaples.push(item);
    }
  }

  knownCalibratedTraps.sort((a, b) => (a.winrate ?? 0) - (b.winrate ?? 0));
  criticalOverrated.sort((a, b) => b.powerScore - a.powerScore);
  moderateOverrated.sort((a, b) => b.powerScore - a.powerScore);
  criticalUnderrated.sort((a, b) => a.powerScore - b.powerScore);
  alignedTopStaples.sort((a, b) => b.powerScore - a.powerScore);

  return {
    capturedAt: lgData.capturedAt,
    cubeKey,
    totalCardsCompared,
    knownCalibratedTraps,
    criticalOverrated,
    moderateOverrated,
    criticalUnderrated,
    alignedTopStaples,
  };
}

export function formatAuditCliReport(results: VintageAuditResults): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════════════════════════");
  lines.push("🔍 AUDIT DE COHÉRENCE VINTAGE CUBE (DraftMaster vs 17lands / limitedgrades.com)");
  lines.push(`📅 Données 17lands capturées : ${results.capturedAt}`);
  lines.push(
    `🎯 Cube ciblé : ${results.cubeKey} | Cartes comparées : ${String(results.totalCardsCompared)}`,
  );
  lines.push(
    "═══════════════════════════════════════════════════════════════════════════════════\n",
  );

  if (results.knownCalibratedTraps.length > 0) {
    lines.push(
      `🛡️ PIÈGES DE DRAFT CONFIRMÉS ET CALIBRÉS (${String(results.knownCalibratedTraps.length)}) :`,
    );
    lines.push(
      "-----------------------------------------------------------------------------------",
    );
    for (const c of results.knownCalibratedTraps) {
      lines.push(
        `  ✔ ${c.name.padEnd(26)} : Score ${c.powerScore.toFixed(1)} (Tier ${c.tier}, fit: ${c.fit}) <=> 17lands Grade ${c.grade} (${String(c.winrate)}% WR)`,
      );
    }
    lines.push("");
  }

  if (results.criticalOverrated.length > 0) {
    lines.push(
      `🚨 CARTES AVEC PUISSANCE SURÉVALUÉE (NON CALIBRÉES) (${String(results.criticalOverrated.length)}) :`,
    );
    lines.push(
      "-----------------------------------------------------------------------------------",
    );
    for (const c of results.criticalOverrated) {
      lines.push(`• [${c.severity ?? "ATTENTION"}] ${c.name.toUpperCase()}`);
      lines.push(
        `  - DraftMaster : Score ${c.powerScore.toFixed(1)} | Tier ${c.tier} | Fit: ${c.fit}`,
      );
      lines.push(
        `  - 17lands     : Grade ${c.grade} | Winrate: ${String(c.winrate)}% | ALSA (Pick moyen): ${String(c.takenAt)}`,
      );
      lines.push(`  - Diagnostic  : ${c.diagnosis ?? ""}`);
      lines.push(`  - Action rec. : ${c.recommendedAction ?? ""}`);
      lines.push("");
    }
  } else {
    lines.push("✅ Aucune surévaluation critique détectée.\n");
  }

  if (results.moderateOverrated.length > 0) {
    lines.push(
      `⚠️ CARTES ÉTROITES OU ENABLERS SURNOTÉS (${String(results.moderateOverrated.length)}) :`,
    );
    lines.push(
      "-----------------------------------------------------------------------------------",
    );
    for (const c of results.moderateOverrated) {
      lines.push(
        `• ${c.name.padEnd(28)} : Score ${c.powerScore.toFixed(1)} (Tier ${c.tier}) vs 17lands: Grade ${c.grade} (WR: ${String(c.winrate)}%, ALSA: ${String(c.takenAt)})`,
      );
    }
    lines.push("");
  }

  if (results.criticalUnderrated.length > 0) {
    lines.push(
      `📈 CARTES SOUS-ÉVALUÉES DANS DRAFTMASTER (${String(results.criticalUnderrated.length)}) :`,
    );
    lines.push(
      "-----------------------------------------------------------------------------------",
    );
    for (const c of results.criticalUnderrated) {
      lines.push(
        `• ${c.name.padEnd(28)} : Score ${c.powerScore.toFixed(1)} (Tier ${c.tier}) vs 17lands: Grade ${c.grade} (WR: ${String(c.winrate)}%)`,
      );
    }
    lines.push("");
  } else {
    lines.push(
      "✅ Aucune sous-évaluation critique détectée (toutes les bombes Grade A+ sont reconnues).\n",
    );
  }

  lines.push(
    `✨ EXEMPLES DE STAPLES PARFAITEMENT ALIGNÉS (${String(results.alignedTopStaples.length)} confirmés) :`,
  );
  for (const c of results.alignedTopStaples.slice(0, 8)) {
    lines.push(
      `  ✔ ${c.name.padEnd(26)} : Score ${c.powerScore.toFixed(1)} (Tier ${c.tier}) <=> 17lands Grade ${c.grade} (${String(c.winrate)}%)`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const offlineMode = args.includes("--offline");
  const strictMode = args.includes("--strict");

  let cubeKey = "nico_candyshop";
  const cubeIdx = args.indexOf("--cube");
  const nextCubeArg = cubeIdx !== -1 ? args[cubeIdx + 1] : undefined;
  if (nextCubeArg) {
    cubeKey = nextCubeArg;
  }

  let specificCard: string | null = null;
  const cardIdx = args.indexOf("--card");
  const nextCardArg = cardIdx !== -1 ? args[cardIdx + 1] : undefined;
  if (nextCardArg) {
    specificCard = nextCardArg;
  } else {
    const pos = args.find(
      (a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1]?.startsWith("--")),
    );
    if (pos) specificCard = pos;
  }

  try {
    const results = await runVintageGradesAudit({
      cubeKey,
      offline: offlineMode,
      specificCard,
    });

    if (jsonMode) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(formatAuditCliReport(results));
    }

    if (strictMode && results.criticalOverrated.length > 0) {
      process.exit(1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Erreur lors de l'audit Vintage :", msg);
    process.exit(1);
  }
}

if (process.argv[1]?.includes("audit-vintage-grades")) {
  void main();
}
