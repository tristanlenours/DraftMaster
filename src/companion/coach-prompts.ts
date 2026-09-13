import type { CompanionCard } from "./card-resolver.ts";
import type { MatchState } from "./companion-state.ts";
import {
  detectDraftedTribalContext,
  type TribalDraftContext,
} from "../domain/coaching/tribal-compatibility.ts";
import type { MidDraftReview } from "../domain/coaching/types.ts";

export interface DraftAdvicePromptOptions {
  readonly cubeKey?: string | undefined;
  readonly tribalContext?: TribalDraftContext | undefined;
  readonly packReview?: MidDraftReview | undefined;
}

export function buildDraftAdvicePrompt(
  packCards: readonly CompanionCard[],
  pool: readonly CompanionCard[],
  pack: number,
  pick: number,
  options?: DraftAdvicePromptOptions,
): { system: string; user: string } {
  const isMidDraftStart = pack >= 2 && pick === 1;
  const tribalCtx = options?.tribalContext ?? detectDraftedTribalContext(pool, options?.cubeKey);

  const system = `Tu es un Coach de Draft Cube Magic (Format Powered / Arena Cube moderne axé sur Modern Horizons 3, tempo agressif, value et synergies fortes) de niveau Pro Tour.
Règles strictes :
- Ton et style : Varié, naturel, passionné, expert et tactique. Adapte ton accroche à la réalité du booster : sois sobre et pragmatique sur les picks utilitaires, mais ultra-enthousiaste dès qu'une opportunité en or ou une bombe se présente ! INTERDICTION des répétitions mécaniques d'un pack à l'autre.
- PROJECTION CONCRÈTE DANS LES PREMIERS TOURS (T1, T2, T3) :
  Les parties de Cube moderne se jouent très souvent sur l'impact décisif des 3 premiers tours.
  Dans tes explications ('reason'), PROJETTE TOUJOURS LE JOUEUR DANS DES SÉQUENCES RÉELLES DE JEU en combinant la carte recommandée avec les accélérations ou cartes clés de son pool (ex: "Départs T1 Lotus ➔ Fable ou T1 Ragavan intouchables sous backup Swords to Plowshares", "T2 Inti ➔ T3 Laelia, la pression est insoutenable pour l'adversaire", "T1 biland dégagé ➔ T2 removal ou menace proactive").
  Montre précisément comment la carte fluidifie les tours déterminants (T1-T3), comble un creux dans la courbe ou verrouille un tempo écrasant.
- ENTHOUSIASME POUR LES BOMBES QUI FONT LE TOUR & SIGNAUX MASSIFS (ROUE / PICKS 7+) :
  Quand une bombe de ton archétype, une carte clé ou un terrain double dans tes couleurs est encore présent tardivement (picks 7-8 et surtout picks 9+ lors du 2e passage / roue) :
  C'est une véritable AUBE et une DINGUERIE ! Réagis avec un enthousiasme communicatif d'expert ("Dinguerie absolue !", "Incroyable : [Nom de la carte] fait tout le tour de table !", "Cadeau de la table !").
  Souligne immédiatement et sans équivoque que c'est le SIGNAL INDISCUTABLE que tes couleurs ou ton archétype sont TOTALEMENT OUVERTS à la table (personne d'autre ne drafte ces couleurs).
- LECTURE DU DRAFT ET COULEURS OUVERTES :
  Observe activement les couleurs qui coulent à flot. Si le joueur doit solidifier un archétype ouvert ou pivoter, guide-le clairement vers la voie la plus prolifique.
- Identifie la MEILLEURE carte (Choix Principal) selon les synergies réelles de texte, la courbe et les couleurs déjà engagées. Privilégie les bombes modernes (MH3/MH2, 1-drops agressifs, créatures avec Évocation, Titans, Planeswalkers ultra-impactants) par rapport aux cartes lentes.
- Terrains-Sorts (MDFC) : Les cartes modales sort/terrain (ex: Spikefield Hazard) sont d'une immense valeur en Cube. Elles combinent interaction précoce (ping anti-1-drop, exil) et terrain sans pénaliser la curve.
- ALTERNATIVES VALIDES & RÈGLE DES COULEURS : Ne propose JAMAIS une carte multicolore qui exige une couleur hors des couleurs du joueur (ex: si le joueur est Blanc/Rouge sans vert, INTERDICTION de proposer une carte Verte/Rouge comme Immerwolf !). Ne propose JAMAIS de fixeur ou terrain hors des couleurs du joueur.${
    tribalCtx.isTribalCube
      ? `\n- RÈGLES STRICTES DE COMPATIBILITÉ TRIBALE (Cube Tribal "${options?.cubeKey ?? "titou_tribal"}") :
  * Si le joueur a commencé à drafter un axe tribal, il faut STRICTEMENT ÉVITER de lui recommander des cartes ou créatures d'une autre tribu non compatible.
  * Tribus COMPATIBLES autorisées sur ce cube :
    1. Gobelins & Dragons (les gobelins proactifs/sacrifices préparent le terrain pour les dragons en bombes et finisseurs).
    2. Humains & Anges (base humaine au sol + anges en menaces aériennes d'impact).
    3. Humains & Sorciers / Wizards (souvent les deux types cumulés, synergie créatures/sorts/tempo).
  * Tribus INCOMPATIBLES : Si le joueur est sur les Gobelins (ou Gobelins/Dragons), INTERDICTION FORMELLE de proposer des Loups/Loups-garous (comme Immerwolf), des Elfes, des Zombies, des Vampires ou des Humains !
  * Si le joueur est sur les Humains (ou Humains/Anges ou Humains/Wizards), INTERDICTION FORMELLE de proposer des Gobelins, des Elfes ou des Zombies !
  * Toute créature ou seigneur d'une tribu rivale incompatible est STRICTEMENT PROSCRITE (ni en Choix Principal, ni en Alternatives).
  * Seules options valides : cartes de la tribu active, cartes d'une tribu compatible autorisée, ou sorts/terrains neutres 'goodstuff' (removal, burn, pioche, fixeurs).`
      : `\n- Format standard (Cube non tribal) : Pas de restriction tribale stricte. Évalue les cartes sur leur qualité intrinsèque, leur curve et leur synergie de couleurs.`
  }
- ANTIDRAFT / HATEPICK (Booster sans carte jouable dans vos couleurs ou picks de fin de booster) :
  * Si aucune carte restante du booster n'entre dans les couleurs du joueur (ex: que des cartes Vertes pour un deck Boros), qualifie explicitement le choix d'ANTIDRAFT ou de HATEPICK !
  * Recommande la meilleure carte / bombe brute en expliquant qu'on la prend uniquement pour priver les adversaires d'une arme dangereuse (ex: "Choix d'antidraft : Tu ne joueras pas cette carte en Boros, mais Titania est une menace dévastatrice pour les joueurs Verts/Terrains à la table. On la coupe pour ne pas avoir à l'affronter en match !").
- Respecte la courbe et le plan de jeu : si le joueur a des 1-drops agressifs et du burn, privilégie le tempo et les bêtes rapides.
- Sois percutant, direct et tactique (1-2 phrases par carte).${
    isMidDraftStart
      ? `\n- BILAN STRATÉGIQUE DU DÉBUT DE TOUR (Pack ${pack} Pick 1) :
  * Analyse le pool actuel : couleurs engagées, archétype initié.
  * Analyse de la courbe de mana : indique s'il faut impérativement baisser la courbe avec des drops 1 et 2 ou chercher des finisseurs.
  * Fixeurs de mana : indique si la proportion de fixeurs/bilands est solide ou s'il y a un déficit urgent à combler.
  * Recommande de chercher une carte clé de l'archétype, en ajoutant : 'si on choppe une carte recherchée, c'est bingo !'.
  * Lecture du draft : rappelle d'observer les signaux et couleurs ouvertes au 2e passage des cartes (picks 9+ / roue).`
      : ""
  }
- Réponds STRICTEMENT en format JSON valide respectant cette structure :
{
  "topPick": "Nom exact de la carte recommandée en choix 1",
  "reason": "Explication tactique vivante du choix principal avec projection concrète dans les tours T1-T3 et séquences avec le pool",
  "alternatives": [
    {
      "name": "Nom exact de la 2e option",
      "reason": "Pourquoi c'est une alternative valide cohérente avec les couleurs et la courbe"
    }
  ]${
    isMidDraftStart
      ? `,
  "packReview": {
    "summary": "Bilan synthétique du pool et archétype",
    "curveAdvice": "Conseil courbe (ex: baisser la courbe avec des drops 1 et 2 proactifs)",
    "fixingAdvice": "Conseil fixeurs (ex: proportion solide ou déficit urgent de bilands)",
    "priorities": ["Priorité 1", "Priorité 2", "Et si on choppe une carte recherchée, c'est bingo !"],
    "signalsTip": "Conseil lecture du draft au 2e passage (roue)"
  }`
      : ""
  }
}`;

  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const c of pool) {
    for (const col of c.colors) {
      if (colorCounts[col] !== undefined) colorCounts[col]++;
    }
    if (c.producesColors) {
      for (const col of c.producesColors) {
        if (colorCounts[col] !== undefined) colorCounts[col]++;
      }
    }
  }

  // Active colors in player's pool (colors with at least 2 picks or highest counts)
  const activeColors = new Set<string>();
  for (const [col, count] of Object.entries(colorCounts)) {
    if (count >= 2) activeColors.add(col);
  }
  if (activeColors.size === 0) {
    for (const [col, count] of Object.entries(colorCounts)) {
      if (count >= 1) activeColors.add(col);
    }
  }

  const lands = pool
    .filter((c) => c.isLand)
    .map((c) => `${c.name} (${c.producesColors?.join("/") || "Fixer"})`);
  const poolSummary = pool.map((c) => `${c.name} (${c.manaCost || "Land"})`).join(", ");

  // Highlight key enablers / bombs for early turn projection (T1-T3)
  const poolEnablers = pool
    .filter(
      (c) =>
        (c.powerScore ?? 0) >= 36 ||
        /lotus|mox|sol ring|fable|ragavan|swords to plowshares|bolt|solitude|grief/i.test(c.name),
    )
    .map((c) => c.name);

  // Curve counts in pool
  const spells = pool.filter((c) => !c.isLand);
  const oneDrops = spells.filter((c) => c.cmc <= 1).length;
  const twoDrops = spells.filter((c) => c.cmc === 2).length;
  const threeDrops = spells.filter((c) => c.cmc === 3).length;
  const fourPlusDrops = spells.filter((c) => c.cmc >= 4).length;

  // Sort pack cards by powerScore descending so the LLM evaluates the best candidates first
  const sortedPack = [...packCards].sort((a, b) => (b.powerScore ?? 0) - (a.powerScore ?? 0));

  // Wheel and late pick detection
  const isWheel = pick >= 9;
  const isLatePick = pick >= 7 && pick < 9;
  const wheeledBombs = sortedPack.filter((c) => {
    const isBomb = (c.powerScore ?? 0) >= 32 || (c.tier && ["S", "A", "A+"].includes(c.tier));
    if (!isBomb) return false;
    if (c.colors.length === 0) return true; // Colorless bomb
    return c.colors.some((col) => activeColors.has(col));
  });

  let wheelAlert = "";
  if (isWheel) {
    wheelAlert = `\n🔄 INFO ROUE (Pick ${pick}) : Toutes ces cartes ont fait le tour complet de la table (8 joueurs sont passés dessus).`;
    if (wheeledBombs.length > 0) {
      wheelAlert += `\n🔥 DINGUERIE / CARTE AYANT FAIT LE TOUR : ${wheeledBombs.map((c) => c.name).join(", ")} est encore dans ce pack ! Signal massif que tes couleurs sont grandes ouvertes. Enthousiasme-toi vivement et projette les sorties explosives T1-T3 avec ton pool !`;
    }
  } else if (isLatePick && wheeledBombs.length > 0) {
    wheelAlert = `\n🔥 SIGNAL DE TABLE (Pick ${pick}) : ${wheeledBombs.map((c) => c.name).join(", ")} arrive anormalement tard dans le booster ! Signal très fort que tes couleurs sont ouvertes.`;
  }

  let midDraftReviewSection = "";
  if (isMidDraftStart && options?.packReview) {
    const pr = options.packReview;
    midDraftReviewSection = `\n📊 BILAN STRATÉGIQUE DÉBUT DE PACK ${pack} :
- Archétype profilé : ${pr.archetypeLabel}
- Résumé du pool : ${pr.poolSummary}
- Diagnostic courbe : ${pr.curveAnalysis} (${pr.curveStats.oneDrops} drops 1, ${pr.curveStats.twoDrops} drops 2, ${pr.curveStats.threeDrops} drops 3, ${pr.curveStats.fourPlusDrops} CMC 4+, CMC moyen: ${pr.curveStats.avgCmc})
- Diagnostic fixeurs : ${pr.fixingAnalysis} (${pr.fixingStats.fixersCount} fixeur(s), cible: ${pr.fixingStats.targetRecommendation})
- Priorités à combler :
${pr.priorities.map((p) => `  * ${p}`).join("\n")}
- Conseil lecture de table : ${pr.signalTip}\n`;
  }

  const packCardsDetails = sortedPack
    .map((c, idx) => {
      const details: string[] = [];
      if (c.powerScore !== undefined) details.push(`Score: ${c.powerScore}`);
      if (c.tier) details.push(`Tier: ${c.tier}`);
      const tag = details.length > 0 ? ` [${details.join(", ")}]` : "";

      // Only include full Oracle text for top 6 cards to keep prompt compact and fast
      const abilities =
        idx < 6 && c.oracleText ? ` : ${c.oracleText.replace(/\r?\n/g, " ").slice(0, 200)}` : "";
      return `- ${c.name} (${c.manaCost || "Terrain"}, CMC: ${c.cmc}) [${c.typeLine || (c.isLand ? "Terrain" : "Sort")}]${tag}${abilities}`;
    })
    .join("\n");

  const user = `Pack ${pack}, Pick ${pick}.
Deck actuel (${pool.length} cartes) : ${poolSummary || "Aucune (P1P1)"}
Couleurs engagées (sorts et terrains fixeurs) : W:${colorCounts.W}, U:${colorCounts.U}, B:${colorCounts.B}, R:${colorCounts.R}, G:${colorCounts.G}
Courbe actuelle : ${oneDrops} drops 1, ${twoDrops} drops 2, ${threeDrops} drops 3, ${fourPlusDrops} CMC 4+
${poolEnablers.length > 0 ? `Cartes clés / accélérations dans le deck : ${poolEnablers.join(", ")}\n` : ""}${lands.length > 0 ? `Terrains/Fixeurs en pool : ${lands.join(", ")}\n` : ""}${wheelAlert}${midDraftReviewSection}${
    tribalCtx.isTribalCube && tribalCtx.isTribalEngaged ? `\n${tribalCtx.promptGuideline}\n` : ""
  }
Booster proposé (${packCards.length} cartes) :
${packCardsDetails}

Donne ta recommandation principale (en te projetant concrètement dans les premiers tours T1-T3 avec le deck actuel) et tes choix secondaires valides.`;

  return { system, user };
}

export function buildDraftSummaryPrompt(pool: readonly CompanionCard[]): {
  system: string;
  user: string;
} {
  const system = `Tu es un expert deckbuilder Magic: The Gathering (Format Cube 40 cartes).
Le draft est terminé. Tu dois recommander la meilleure liste de 40 cartes (23 sorts + 17 terrains) à partir de l'intégralité du pool.
Structure ta réponse en markdown clair avec :
1. L'archétype et le plan de jeu principal
2. Les 23 sorts sélectionnés classés par coût de mana (CMC)
3. La base de 17 terrains détaillée (terrains doubles/utilitaires + terrains de base)
4. Le statut du Compagnon (si applicable)
5. Les cartes notables laissées en réserve (sideboard) et conseils de jeu.`;

  const poolCards = pool
    .map((c) => `- ${c.name} (${c.manaCost || "Terrain"}, CMC: ${c.cmc})`)
    .join("\n");
  const user = `Voici mon pool complet de ${pool.length} cartes draftées :\n${poolCards}\n\nConstruis mon deck optimal de 40 cartes.`;

  return { system, user };
}

const BASIC_LAND_COLORS: Record<string, readonly string[]> = {
  plains: ["W"],
  island: ["U"],
  swamp: ["B"],
  mountain: ["R"],
  forest: ["G"],
  "snow-covered plains": ["W"],
  "snow-covered island": ["U"],
  "snow-covered swamp": ["B"],
  "snow-covered mountain": ["R"],
  "snow-covered forest": ["G"],
};

export function getCardProducedColors(card: CompanionCard): readonly string[] {
  if (card.producesColors && card.producesColors.length > 0) {
    return card.producesColors;
  }
  const lower = card.name.toLowerCase().trim();
  if (BASIC_LAND_COLORS[lower]) {
    return BASIC_LAND_COLORS[lower];
  }
  // Detect verge / dual / fetch lands from modern sets if not explicit in DB
  if (lower.includes("sunbillow verge")) return ["R", "W", "C"];
  if (lower.includes("thornspire verge")) return ["R", "G", "C"];
  if (lower.includes("gloombloom verge")) return ["B", "G", "C"];
  if (lower.includes("floodfarm verge")) return ["W", "U", "C"];
  if (
    lower.includes("sacred foundry") ||
    lower.includes("plateau") ||
    lower.includes("inspiring vantage") ||
    lower.includes("clifftop retreat") ||
    lower.includes("elegant parlor") ||
    lower.includes("needleverge pathway") ||
    lower.includes("sundown pass") ||
    lower.includes("arid mesa")
  ) {
    return ["R", "W"];
  }
  if (
    lower.includes("blood crypt") ||
    lower.includes("badlands") ||
    lower.includes("blightstep pathway") ||
    lower.includes("bloodstained mire")
  ) {
    return ["B", "R"];
  }
  if (
    lower.includes("steam vents") ||
    lower.includes("volcanic island") ||
    lower.includes("spirebluff canal") ||
    lower.includes("scalding tarn")
  ) {
    return ["U", "R"];
  }
  if (
    lower.includes("stomping ground") ||
    lower.includes("taiga") ||
    lower.includes("copperline gorge") ||
    lower.includes("wooded foothills")
  ) {
    return ["R", "G"];
  }
  if (
    lower.includes("tundra") ||
    lower.includes("hallowed fountain") ||
    lower.includes("seachrome coast") ||
    lower.includes("flooded strand")
  ) {
    return ["W", "U"];
  }
  if (
    lower.includes("scrubland") ||
    lower.includes("godless shrine") ||
    lower.includes("concealed courtyard") ||
    lower.includes("marsh flats")
  ) {
    return ["W", "B"];
  }
  if (
    lower.includes("savannah") ||
    lower.includes("temple garden") ||
    lower.includes("razorverge thicket") ||
    lower.includes("windswept heath")
  ) {
    return ["W", "G"];
  }
  if (
    lower.includes("underground sea") ||
    lower.includes("watery grave") ||
    lower.includes("darkslick shores") ||
    lower.includes("polluted delta")
  ) {
    return ["U", "B"];
  }
  if (
    lower.includes("tropical island") ||
    lower.includes("breeding pool") ||
    lower.includes("botanical sanctum") ||
    lower.includes("misty rainforest")
  ) {
    return ["U", "G"];
  }
  if (
    lower.includes("bayou") ||
    lower.includes("overgrown tomb") ||
    lower.includes("blooming marsh") ||
    lower.includes("verdant catacombs")
  ) {
    return ["B", "G"];
  }

  if (card.isLand) {
    return ["C"];
  }
  return [];
}

export function getCardRequiredColors(card: CompanionCard): readonly string[] {
  const req = new Set<string>(card.colors);
  if (card.manaCost) {
    const symbols = card.manaCost.match(/\{([WUBRG])\}/g) || [];
    for (const sym of symbols) {
      const col = sym.replace(/[\{\}]/g, "");
      req.add(col);
    }
  }
  return Array.from(req);
}

export interface HandManaDiagnostic {
  readonly lands: readonly CompanionCard[];
  readonly spells: readonly CompanionCard[];
  readonly fastMana: readonly CompanionCard[];
  readonly landColors: readonly string[];
  readonly requiredColors: readonly string[];
  readonly missingColors: readonly string[];
  readonly strandedSpells: readonly CompanionCard[];
  readonly explosiveLines: readonly string[];
}

export function analyzeHandMana(hand: readonly CompanionCard[]): HandManaDiagnostic {
  const lands = hand.filter((c) => c.isLand);
  const spells = hand.filter((c) => !c.isLand);
  const fastMana = hand.filter(
    (c) =>
      /lotus|mox|sol ring|mana crypt|mana vault|spirit guide|lotus petal/i.test(c.name) ||
      (c.cmc === 0 && !c.isLand && (c.producesColors?.length ?? 0) > 0),
  );

  const landColorsSet = new Set<string>();
  for (const land of lands) {
    for (const col of getCardProducedColors(land)) {
      if (col !== "C") landColorsSet.add(col);
    }
  }
  const landColors = Array.from(landColorsSet);

  const requiredColorsSet = new Set<string>();
  for (const spell of spells) {
    if (fastMana.some((fm) => fm.grpId === spell.grpId)) continue;
    for (const col of getCardRequiredColors(spell)) {
      requiredColorsSet.add(col);
    }
  }
  const requiredColors = Array.from(requiredColorsSet);
  const missingColors = requiredColors.filter((col) => !landColorsSet.has(col));

  const strandedSpells = spells.filter((spell) => {
    if (fastMana.some((fm) => fm.grpId === spell.grpId)) return false;
    const req = getCardRequiredColors(spell);
    return req.some((col) => !landColorsSet.has(col));
  });

  const explosiveLines: string[] = [];
  const hasLotus = fastMana.some((c) => /black lotus/i.test(c.name));
  const hasAncientTomb = lands.some((c) => /ancient tomb/i.test(c.name));
  const threeDrops = spells.filter((c) => c.cmc === 3);

  if (hasLotus) {
    const keyThreeDrop =
      threeDrops.find((c) => /adeline|fable|laelia|preacher|broadside/i.test(c.name)) ||
      threeDrops[0];
    if (keyThreeDrop) {
      explosiveLines.push(
        `Départ T1 ultra-agressif : Poser un terrain + Black Lotus (sacrifié pour 3 manas) ➔ ${keyThreeDrop.name} dès le Tour 1 pour mettre une pression écrasante !`,
      );
    }
  }
  if (hasAncientTomb && threeDrops.length > 0) {
    const peacekeeper = threeDrops.find((c) => /peacekeeper/i.test(c.name));
    if (peacekeeper) {
      explosiveLines.push(
        `Ligne de sécurité Tour 2 : Poser Ancient Tomb ➔ Anointed Peacekeeper ({2}{W}) pour inspecter la main adverse et taxer ses réponses clés (Fury, Solitude, Swords).`,
      );
    }
  }

  return {
    lands,
    spells,
    fastMana,
    landColors,
    requiredColors,
    missingColors,
    strandedSpells,
    explosiveLines,
  };
}

export interface BoardManaDiagnostic {
  readonly lands: readonly CompanionCard[];
  readonly landsListText: string;
  readonly availableColors: readonly string[];
  readonly requiredColorsInHand: readonly string[];
  readonly missingColors: readonly string[];
  readonly strandedSpells: readonly CompanionCard[];
  readonly playableSpells: readonly CompanionCard[];
}

export function analyzeBoardMana(
  playerBattlefield: readonly CompanionCard[],
  playerHand: readonly CompanionCard[],
): BoardManaDiagnostic {
  const lands = playerBattlefield.filter((c) => c.isLand);
  const colorsSet = new Set<string>();

  const landsDescriptions: string[] = [];
  for (const land of lands) {
    const produced = getCardProducedColors(land);
    for (const col of produced) {
      if (col !== "C") colorsSet.add(col);
    }
    const colorLabel = produced.length > 0 ? produced.join("/") : "Incolore {C}";
    landsDescriptions.push(`${land.name} (${colorLabel})`);
  }
  const availableColors = Array.from(colorsSet);

  const handSpells = playerHand.filter((c) => !c.isLand);
  const requiredColorsSet = new Set<string>();
  for (const spell of handSpells) {
    for (const col of getCardRequiredColors(spell)) {
      requiredColorsSet.add(col);
    }
  }
  const requiredColorsInHand = Array.from(requiredColorsSet);
  const missingColors = requiredColorsInHand.filter((col) => !colorsSet.has(col));

  const strandedSpells: CompanionCard[] = [];
  const playableSpells: CompanionCard[] = [];

  for (const spell of handSpells) {
    const req = getCardRequiredColors(spell);
    const isMissingColor = req.some((col) => !colorsSet.has(col));
    if (isMissingColor) {
      strandedSpells.push(spell);
    } else {
      playableSpells.push(spell);
    }
  }

  return {
    lands,
    landsListText: landsDescriptions.join(", ") || "Aucun terrain",
    availableColors,
    requiredColorsInHand,
    missingColors,
    strandedSpells,
    playableSpells,
  };
}

export function detectKeyMatchEvents(match: MatchState): string[] {
  const events: string[] = [];

  const oppPlays = match.opponentRecentPlays;
  const oppBoard = match.opponentBattlefield.map((c) => c.name);

  // 1. The One Ring detection
  const hasTheOneRing =
    oppPlays.some((p) => /the one ring/i.test(p)) || oppBoard.some((b) => /the one ring/i.test(b));
  if (hasTheOneRing) {
    events.push(
      "💍 COUP DE THÉÂTRE / TOPDECK ADVERSE : L'adversaire a posé The One Ring (L'Anneau Unique) ! Il bénéficie de la protection contre tout ce tour-ci et va piocher un nombre exponentiel de cartes.",
    );
  }

  // 2. Evoke elementals & free spells detection
  const evokeElementals = oppPlays.filter((p) => /fury|solitude|grief|subtlety|endurance/i.test(p));
  if (evokeElementals.length > 0) {
    events.push(
      `💥 RÉPONSE CHIRURGICALE EN ÉVOCATION : L'adversaire a joué ${evokeElementals.join(", ")} (Évocation gratuite en pitchant une carte) !`,
    );
  }

  const freeSpells = oppPlays.filter((p) =>
    /force of will|force of negation|daze|mindbreak trap|fire \/\/ ice/i.test(p),
  );
  if (freeSpells.length > 0) {
    events.push(
      `🛡️ CONTRE-SORT GRATUIT ADVERSE : L'adversaire a utilisé ${freeSpells.join(", ")} !`,
    );
  }

  // 3. Player burned fast mana / accelerated play punished
  const playerLotusPlayed = match.playerRecentPlays.some((p) => /black lotus/i.test(p));
  const playerAdelinePlayed = match.playerRecentPlays.some((p) => /adeline/i.test(p));
  const adelineOnBoard = match.playerBattlefield.some((c) => /adeline/i.test(c.name));

  if (
    playerLotusPlayed &&
    playerAdelinePlayed &&
    !adelineOnBoard &&
    evokeElementals.some((e) => /fury/i.test(e))
  ) {
    events.push(
      "⚡ BLOWOUT MAJEUR : Tu as cramé ton Black Lotus pour sortir Adeline Tour 1, mais l'adversaire a immédiatement répondu avec une Fury en évocation pour détruire Adeline ! Ton Lotus est parti et ton plan T1 est anéanti.",
    );
  }

  return events;
}

export function buildOpeningHandPrompt(
  hand: readonly CompanionCard[],
  opponentName: string,
): { system: string; user: string } {
  const diag = analyzeHandMana(hand);

  const system = `Tu es un coach et joueur Magic: The Gathering de niveau Pro Tour assistant le joueur en direct lors de la phase de Mulligan (Format Cube Vintage / Powered / MH3).

Ton et style :
- Parle avec l'authenticité, la passion et l'expertise d'un joueur Pro Tour.
- RÈGLE DES PREMIERS TOURS (T1, T2, T3) : Les parties de Cube se jouent très souvent sur le tempo et l'impact des 3 premiers tours.
- PROJECTION CONCRÈTE DANS LES PREMIERS TOURS :
  1. Identifie immédiatement la ligne de pression maximale (ex: "On peut mettre une grosse pression avec Adeline Tour 1 via Black Lotus pour {W}{W}{W} !").
  2. ANALYSE CRITIQUE DU MANA & COUVERTURE DES COULEURS :
     - Évalue si les terrains en main couvrent toutes les couleurs des sorts en main.
     - Si un accélérateur one-shot (Black Lotus) est sacrifié pour une couleur (Blanc pour Adeline), souligne impérativement qu'il est détruit et ne fournit plus de mana.
     - ALERTE STRUGGLE : Si le joueur se retrouve sans source permanente pour les autres couleurs de sa main (ex: sorts Rouges comme Abrade et Lightning Helix bloqués en main sans aucun terrain rouge), préviens-le clairement : si l'accélération est contrée ou punie (par un removal gratuit comme Fury en evoke, Solitude, Swords), le joueur n'aura plus de mana rouge et va "struggle" sévèrement tant qu'il ne pioche pas de rouge !
  3. LIGNE ALTERNATIVE / SÉCURITÉ : Mentionne la ligne plus mesurée (ex: T1 Plains, T2 Ancient Tomb ➔ Anointed Peacekeeper pour inspecter la main adverse et taxer ses réponses clés avant de s'engager).
  4. VERDICT CLAIR : Keep ou Mulligan net et tranché.

Réponds en français avec un ton direct, vivant et percutant (3 à 4 paragraphes courts bien structurés).`;

  const landsText =
    diag.lands
      .map((c) => `- ${c.name} (${getCardProducedColors(c).join("/") || "Incolore {C}"})`)
      .join("\n") || "Aucun terrain";
  const spellsText =
    diag.spells
      .map(
        (c) =>
          `- ${c.name} (${c.manaCost || "Sort"}, CMC: ${c.cmc}) [Couleurs: ${c.colors.join("/") || "Incolore"}]`,
      )
      .join("\n") || "Aucun sort";

  const missingColorsText =
    diag.missingColors.length > 0
      ? `🚨 COULEURS NON COUVERTES PAR LES TERRAINS : ${diag.missingColors.join(", ")}. Sorts actuellement bloqués sans source permanente : ${diag.strandedSpells.map((s) => s.name).join(", ")}.`
      : "✅ Toutes les couleurs des sorts en main sont couvertes par les terrains.";

  const user = `Match contre ${opponentName}.
Voici ma main de départ de ${hand.length} cartes :

Terrains (${diag.lands.length}) :
${landsText}

Sorts et Accélérateurs (${diag.spells.length}) :
${spellsText}

Bilan Mana :
- Couleurs produites par les terrains : ${diag.landColors.join(", ") || "Incolore uniquement"}
- Couleurs exigées par les sorts : ${diag.requiredColors.join(", ")}
${missingColorsText}
${diag.fastMana.length > 0 ? `- Accélérateur(s) disponible(s) : ${diag.fastMana.map((f) => f.name).join(", ")} (Attention : Black Lotus est sacrifié à l'activation !)\n` : ""}${diag.explosiveLines.length > 0 ? `Ligne explosive détectée :\n${diag.explosiveLines.join("\n")}\n` : ""}
Donne ton évaluation complète : Keep ou Mulligan, la ligne agressive T1-T3, les risques de struggle sur le mana et le séquençage recommandé.`;

  return { system, user };
}

export function buildTurnCommentaryPrompt(match: MatchState): {
  system: string;
  user: string;
} {
  const diag = analyzeBoardMana(match.playerBattlefield, match.playerHand);
  const keyEvents = detectKeyMatchEvents(match);

  const system = `Tu es un commentateur et coach Magic: The Gathering de niveau Pro Tour assistant un joueur en direct pendant son match sur MTG Arena (Format Cube Vintage / MH3).

Règles de ton et d'immersion :
- Parle avec authenticité, passion et franchise d'un vrai joueur Pro Tour.
- RÉACTION ÉMOTIONNELLE AUX COUPS DU SORT ET AUX BLOWOUTS :
  * Si l'adversaire sort une réponse insolente, un topdeck écœurant ou une évocation parfaite (ex: The One Ring en topdeck, Fury en evoke sur notre Adeline Tour 1, Solitude, Force of Will) :
    Réagis avec la vivacité et la franchise d'un joueur pro ("Mais quelle chance insolente !", "The One Ring en topdeck, c'est indécent !", "L'adversaire a la réponse parfaite en évocation !").
  * Ne sois jamais passif ou mécanique : vis la partie avec le joueur !
- DIAGNOSTIC DES RESSOURCES ET DU MANA (ALERTE STRUGGLE & MANA SCREW) :
  * Si le joueur a cramé une accélération (Black Lotus) et se retrouve privé d'une couleur pour ses cartes en main (ex: sorts Rouges Abrade, Lightning Helix, Galvanic Discharge, Fable bloqués sans terrain rouge) :
    Explicite la galère : "Du coup, comme tu as cramé ton Black Lotus pour Adeline, tu n'as plus de mana rouge pour Abrade, Helix ou Fable : le sort s'acharne, tu ne pioches que des sorts rouges et ça struggle tant que tu ne touches pas de terrain rouge !".
  * Si le joueur vient ENFIN de toucher son terrain manquant (ex: Sunbillow Verge débloquant le rouge) :
    Crie "Alléluia !" et souligne que toute la main s'illumine et que la riposte peut commencer !
- PLAN TACTIQUE POUR LE TOUR EN COURS :
  * Prends en compte l'état exact du board (ex: si The One Ring est en jeu, l'adversaire a la protection contre tout, pas de dégâts ce tour).
  * Indique le coup optimal avec le mana RÉELLEMENT disponible (quel terrain poser, quelle carte lancer, attaquer ou temporiser).
- Réponds en 2 à 3 phrases percutantes en français.`;

  const oppBoardNonLands = match.opponentBattlefield.filter((c) => !c.isLand).map((c) => c.name);
  const oppLands = match.opponentBattlefield
    .filter((c) => c.isLand)
    .map((c) => `${c.name} (${getCardProducedColors(c).join("/")})`);
  const myBoardNonLands = match.playerBattlefield.filter((c) => !c.isLand).map((c) => c.name);

  const oppPlaysText =
    match.opponentRecentPlays.length > 0
      ? match.opponentRecentPlays.slice(-6).join(", ")
      : "Aucun sort récent";
  const myPlaysText =
    match.playerRecentPlays.length > 0
      ? match.playerRecentPlays.slice(-6).join(", ")
      : "Aucun sort récent";

  const handCards =
    match.playerHand
      .map((c) => {
        const req = getCardRequiredColors(c);
        const isStranded = req.some((col) => !diag.availableColors.includes(col));
        const status = isStranded ? " [INJOUABLE : manque de couleur]" : " [JOUABLE]";
        return `- ${c.name} (${c.manaCost || "Terrain"}, CMC: ${c.cmc})${status}`;
      })
      .join("\n") || "Aucune carte en main";

  const user = `Tour ${match.gameTurn} du joueur (Phase: ${match.phase}).
Adversaire : ${match.opponentName}.
Points de vie : Toi ${match.playerLife} PV | Adversaire ${match.opponentLife} PV.

Historique récent :
- Derniers sorts joués par l'adversaire : ${oppPlaysText}
- Tes derniers sorts joués : ${myPlaysText}
${keyEvents.length > 0 ? `\nÉVÉNEMENTS MARQUANTS EN COURS :\n${keyEvents.join("\n")}\n` : ""}
Champ de bataille adverse :
- Permanents : ${oppBoardNonLands.length > 0 ? oppBoardNonLands.join(", ") : "Aucun"}
- Terrains : ${oppLands.join(", ") || "Aucun"}

Ton champ de bataille :
- Terrains (${diag.lands.length}) : ${diag.landsListText}
- Couleurs de mana disponibles : ${diag.availableColors.join(", ") || "Incolore uniquement"}
- Créatures/Permanents : ${myBoardNonLands.length > 0 ? myBoardNonLands.join(", ") : "Aucun"}

Tes cartes en main actuelles (${match.playerHand.length} cartes) :
${handCards}
${diag.missingColors.length > 0 ? `\n⚠️ ALERTE MANA : Couleurs manquantes sur le board : ${diag.missingColors.join(", ")}. Sorts bloqués en main : ${diag.strandedSpells.map((s) => s.name).join(", ")}.\n` : ""}
Donne ta réaction d'expert Pro Tour et ta recommandation tactique pour ce Tour ${match.gameTurn}.`;

  return { system, user };
}

export function buildMatchAdvicePrompt(
  match: MatchState,
  question: string,
): { system: string; user: string } {
  const diag = analyzeBoardMana(match.playerBattlefield, match.playerHand);
  const keyEvents = detectKeyMatchEvents(match);

  const system = `Tu es un arbitre et coach Magic: The Gathering de niveau Pro Tour qui assiste un joueur en direct pendant son match sur MTG Arena (Format Cube Vintage / MH3).

RÈGLES CAPITALES :
- Tu as accès en direct à la main complète du joueur, ses points de vie, le tour exact, ses terrains, les sorts joués et l'adversaire.
- NE DIS JAMAIS que tu ne peux pas voir ses cartes ou son état de jeu : tu as TOUT sous les yeux !
- Parle avec franchise, authenticité et passion. Réagis aux coups de chance de l'adversaire (The One Ring en topdeck, Fury en evoke) et aux galères de mana (manque de couleur rouge, sorts bloqués en main).
- Réponds précisément et de façon concise (2-4 phrases maximum).
- Indique clairement quelle carte jouer, quel terrain poser ou comment engager ses manas avec le mana RÉELLEMENT disponible.`;

  const handCards =
    match.playerHand
      .map((c) => {
        const req = getCardRequiredColors(c);
        const isStranded = req.some((col) => !diag.availableColors.includes(col));
        const status = isStranded ? " [INJOUABLE : manque de couleur]" : " [JOUABLE]";
        return `- ${c.name} (${c.manaCost || "Terrain"}, CMC: ${c.cmc})${status}`;
      })
      .join("\n") || "Aucune carte en main";

  const isMyTurn = match.isMyTurn;
  const oppBoard =
    match.opponentBattlefield
      .filter((c) => !c.isLand)
      .map((c) => c.name)
      .join(", ") || "Aucune créature/permanent";
  const myBoard =
    match.playerBattlefield
      .filter((c) => !c.isLand)
      .map((c) => c.name)
      .join(", ") || "Aucun permanent";

  const user = `État de la partie :
- Adversaire : ${match.opponentName}
- Tour : Tour ${match.gameTurn} (Phase: ${match.phase}, ${isMyTurn ? "C'est TON tour" : "Tour adverse"})
- Points de vie : Toi ${match.playerLife} PV | Adversaire ${match.opponentLife} PV
- Champ de bataille adverse : ${oppBoard}
- Ton champ de bataille : ${myBoard} (${diag.landsListText})
- Couleurs de mana disponibles : ${diag.availableColors.join(", ") || "Incolore uniquement"}
${diag.missingColors.length > 0 ? `- ⚠️ Couleurs manquantes pour ta main : ${diag.missingColors.join(", ")} (Sorts bloqués : ${diag.strandedSpells.map((s) => s.name).join(", ")})\n` : ""}${keyEvents.length > 0 ? `- Événements récents : ${keyEvents.join(" | ")}\n` : ""}
- Tes cartes en main actuelles (${match.playerHand.length} cartes) :
${handCards}

Question du joueur : ${question}`;

  return { system, user };
}

export function buildLiveReactionPrompt(
  match: MatchState,
  card: CompanionCard,
): { system: string; user: string } {
  const hasTheOneRing = match.opponentBattlefield.some((c) => /the one ring/i.test(c.name));
  const isOppLowLife = match.opponentLife <= 4;
  const ringDeathDanger = hasTheOneRing && isOppLowLife;

  const system = `Tu es un commentateur et coach Magic: The Gathering de niveau Pro Tour assistant un joueur en direct pendant son match sur MTG Arena.

Ton et réaction :
- Parle avec authenticité, intensité, passion et franchise d'un vrai joueur Pro Tour.
- RÉACTION CHAUDE ET VISCÉRALE AUX BLOWOUTS ET MIRACLES ADVERSES :
  * Si l'adversaire était au bord de la mort (ex: à 2 PV, menacé de mourir sur son propre Anneau Unique à son entretien) et qu'il sort un coup de chance éhonté / topdeck miracle (ex: Together as One en 5 couleurs pour regagner 5 PV, piocher 5 cartes et infliger 5 blessures) :
    Exprime la stupeur et la frustration face à cette chance insolente :
    "Non mais quel chatteux insolent ! Il était quasi mort à 2 PV et allait crever sur son propre Anneau Unique à l'entretien, mais il sort cette merde de Together as One pour remonter à 7 PV et piocher 5 cartes ! Nos chances de gagner viennent de diminuer fortement...".
  * Si l'adversaire sort une évocation gratuite dévastatrice (Fury, Solitude, Grief) ou The One Ring :
    Réagis immédiatement à ce coup dur.
- Réponds en 2 phrases concises, percutantes et directes en français.`;

  const user = `L'adversaire ${match.opponentName} vient de jouer : ${card.name} (${card.manaCost || "Sort"}) !
Points de vie : Toi ${match.playerLife} PV | Adversaire ${match.opponentLife} PV.
${ringDeathDanger ? `⚠️ CONTEXTE CRITIQUE : L'adversaire était à l'agonie (${match.opponentLife} PV) et risquait de mourir sur son propre The One Ring à son entretien !\n` : ""}${card.oracleText ? `Texte de la carte jouée : ${card.oracleText.slice(0, 200)}\n` : ""}
Champ de bataille adverse : ${match.opponentBattlefield.map((c) => c.name).join(", ") || "Aucun"}
Ton champ de bataille : ${match.playerBattlefield.map((c) => c.name).join(", ") || "Aucun"}
Tes cartes en main : ${match.playerHand.map((c) => c.name).join(", ") || "Aucune"}

Réagis immédiatement et à chaud à ce coup de l'adversaire.`;

  return { system, user };
}
