import type { CompanionCard } from "../companion/card-resolver.ts";
import {
  detectDraftedTribalContext,
  type TribalDraftContext,
} from "../domain/coaching/tribal-compatibility.ts";
import type { CardEvaluation, MidDraftReview } from "../domain/coaching/types.ts";
import type { CubeMetaDefinition } from "../cubes/cube-meta-types.ts";
import type { WheelSignalAnalysis } from "../domain/coaching/wheel-signals.ts";

export interface DraftAdvicePromptOptions {
  readonly cubeKey?: string | undefined;
  readonly cubeMeta?: Readonly<CubeMetaDefinition> | undefined;
  readonly tribalContext?: TribalDraftContext | undefined;
  readonly packReview?: MidDraftReview | undefined;
  readonly candidateEvidence?: readonly Readonly<CardEvaluation>[] | undefined;
  readonly wheelSignals?: WheelSignalAnalysis | undefined;
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
  const cubeMeta = options?.cubeMeta;
  const criticalWindow = cubeMeta?.fundamentalTurn?.criticalWindow ?? "les tours déterminants";
  const pacingDesc = cubeMeta?.fundamentalTurn?.pacingDescription
    ? ` ${cubeMeta.fundamentalTurn.pacingDescription}`
    : "";
  const cubeDescription = cubeMeta
    ? `Cube \"${cubeMeta.name}\" (${cubeMeta.powerTier}, rythme ${cubeMeta.pacing}).${pacingDesc} ${cubeMeta.description ?? ""}`
    : "Contexte de cube non identifié : n'invente ni niveau de puissance, ni extension dominante, ni vitesse de format.";
  const archetypeGuidance =
    cubeMeta && cubeMeta.archetypes.length > 0
      ? `\n- Archétypes du cube : ${cubeMeta.archetypes
          .map((a) => `${a.name} (${a.primaryColors.join("/")})`)
          .join(", ")}`
      : "";

  const system = `Tu es un Coach de Draft Cube Magic de niveau Pro Tour.
Contexte autorisé : ${cubeDescription}
Règles strictes :
- Ton et style : Varié, naturel, passionné, expert et tactique. Adapte ton accroche à la réalité du booster : sois sobre et pragmatique sur les picks utilitaires, mais ultra-enthousiaste dès qu'une opportunité en or ou une bombe se présente ! INTERDICTION des répétitions mécaniques d'un pack à l'autre.
- PROJECTION CONCRÈTE DANS LA FENÊTRE CRITIQUE (${criticalWindow}) :
  Utilise uniquement les cartes réellement présentes dans le pool pour décrire une séquence de jeu plausible.
  Montre précisément comment la carte fluidifie ${criticalWindow}, comble un creux dans la courbe ou protège le plan de jeu.
- ENTHOUSIASME POUR LES BOMBES QUI FONT LE TOUR & SIGNAUX MASSIFS (ROUE / PICKS 7+) :
  Quand une bombe de ton archétype, une carte clé ou un terrain double dans tes couleurs est encore présent tardivement (picks 7-8 et surtout picks 9+ lors du 2e passage / roue) :
  C'est une véritable AUBE et une DINGUERIE ! Réagis avec un enthousiasme communicatif d'expert ("Dinguerie absolue !", "Incroyable : [Nom de la carte] fait tout le tour de table !", "Cadeau de la table !").
  Souligne immédiatement et sans équivoque que c'est le SIGNAL INDISCUTABLE que tes couleurs ou ton archétype sont TOTALEMENT OUVERTS à la table (personne d'autre ne drafte ces couleurs).
- LECTURE DU DRAFT ET COULEURS OUVERTES :
  Observe activement les couleurs qui coulent à flot. Si le joueur doit solidifier un archétype ouvert ou pivoter, guide-le clairement vers la voie la plus prolifique.
- Identifie la MEILLEURE carte selon le classement déterministe fourni, les synergies attestées, la courbe et les couleurs déjà engagées. Le choix principal doit appartenir au TOP 3 déterministe ; tu enrichis l'explication, tu ne remplaces pas le classement par une intuition non sourcée.${archetypeGuidance}
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
      ? `\n- BILAN STRATÉGIQUE DU DÉBUT DE TOUR (Pack ${String(pack)} Pick 1) :
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
  "reason": "Explication tactique du choix principal avec une séquence concrète dans la fenêtre critique du cube",
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
    .map((c) => `${c.name} (${c.producesColors?.length ? c.producesColors.join("/") : "Fixer"})`);
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
  const deterministicEvidence = new Map(
    (options?.candidateEvidence ?? []).map((candidate, index) => [
      candidate.name.toLocaleLowerCase("fr"),
      { candidate, rank: index + 1 },
    ]),
  );

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
  if (options?.wheelSignals) {
    const ws = options.wheelSignals;
    const takenNames = ws.cardsTakenByTable.map(
      (c) => `${c.name} (${c.colors.join("/") || "Incolore"})`,
    );
    const wheeledNames = ws.cardsWheeled.map(
      (c) => `${c.name} (${c.colors.join("/") || "Incolore"})`,
    );
    const initialPickDesc = ws.pickedCardAtInitialPass
      ? `Tu avais choisi ${ws.pickedCardAtInitialPass.name} (${ws.pickedCardAtInitialPass.colors.join("/") || "Incolore"}) au Pick ${String(ws.originalPickNumber)}. `
      : "";
    const openColorsStr = ws.openColors.length > 0 ? ws.openColors.join(", ") : "aucune";
    const contestedColorsStr =
      ws.contestedColors.length > 0 ? ws.contestedColors.join(", ") : "aucune";

    wheelAlert = `\n🔄 ANALYSE DE LA ROUE (Booster P${String(pack)}P${String(ws.originalPickNumber)} revenu au P${String(pack)}P${String(pick)}) :
- ${initialPickDesc}Ce booster a fait le tour complet de la table (7 joueurs sont passés dessus).
- Cartes prises par les 7 autres joueurs (${String(ws.cardsTakenByTable.length)}) : ${takenNames.slice(0, 8).join(", ")}
- Cartes revenues dans ce booster (${String(ws.cardsWheeled.length)}) : ${wheeledNames.join(", ")}
- Lecture des signaux de table : Couleurs ouvertes = [${openColorsStr}] | Couleurs contestées = [${contestedColorsStr}]
-> ${ws.signalSummary}`;
  } else if (isWheel) {
    wheelAlert = `\n🔄 INFO ROUE (Pick ${String(pick)}) : Toutes ces cartes ont fait le tour complet de la table (8 joueurs sont passés dessus).`;
    if (wheeledBombs.length > 0) {
      wheelAlert += `\n🔥 DINGUERIE / CARTE AYANT FAIT LE TOUR : ${wheeledBombs.map((c) => c.name).join(", ")} est encore dans ce pack ! Signal massif que tes couleurs sont grandes ouvertes. Relie ce signal à une séquence plausible dans ${criticalWindow}.`;
    }
  } else if (isLatePick && wheeledBombs.length > 0) {
    wheelAlert = `\n🔥 SIGNAL DE TABLE (Pick ${String(pick)}) : ${wheeledBombs.map((c) => c.name).join(", ")} arrive anormalement tard dans le booster ! Signal très fort que tes couleurs sont ouvertes.`;
  }

  let midDraftReviewSection = "";
  if (isMidDraftStart && options?.packReview) {
    const pr = options.packReview;
    midDraftReviewSection = `\n📊 BILAN STRATÉGIQUE DÉBUT DE PACK ${String(pack)} :
- Archétype profilé : ${pr.archetypeLabel}
- Résumé du pool : ${pr.poolSummary}
- Diagnostic courbe : ${pr.curveAnalysis} (${String(pr.curveStats.oneDrops)} drops 1, ${String(pr.curveStats.twoDrops)} drops 2, ${String(pr.curveStats.threeDrops)} drops 3, ${String(pr.curveStats.fourPlusDrops)} CMC 4+, CMC moyen: ${String(pr.curveStats.avgCmc)})
- Diagnostic fixeurs : ${pr.fixingAnalysis} (${String(pr.fixingStats.fixersCount)} fixeur(s), cible: ${pr.fixingStats.targetRecommendation})
- Priorités à combler :
${pr.priorities.map((p) => `  * ${p}`).join("\n")}
- Conseil lecture de table : ${pr.signalTip}\n`;
  }

  const packCardsDetails = sortedPack
    .map((c, idx) => {
      const details: string[] = [];
      const evidence = deterministicEvidence.get(c.name.toLocaleLowerCase("fr"));
      if (evidence) {
        details.push(`Rang déterministe: ${String(evidence.rank)}`);
        details.push(`Score dynamique: ${String(evidence.candidate.dynamicScore)}`);
      } else if (c.powerScore !== undefined) {
        details.push(`Score: ${String(c.powerScore)}`);
      }
      if (c.tier) details.push(`Tier: ${c.tier}`);
      const tag = details.length > 0 ? ` [${details.join(", ")}]` : "";
      const analysis =
        evidence && idx < 6 ? ` Analyse locale: ${evidence.candidate.explanation}` : "";

      // Only include full Oracle text for top 3 cards to keep prompt compact and fast
      const abilities =
        idx < 3 && c.oracleText ? ` : ${c.oracleText.replace(/\r?\n/g, " ").slice(0, 100)}` : "";
      return `- ${c.name} (${c.manaCost || "Terrain"}, CMC: ${String(c.cmc)}) [${c.typeLine?.length ? c.typeLine : c.isLand ? "Terrain" : "Sort"}]${tag}${abilities}${analysis}`;
    })
    .join("\n");

  const user = `Pack ${String(pack)}, Pick ${String(pick)}.
Deck actuel (${String(pool.length)} cartes) : ${poolSummary || "Aucune (P1P1)"}
Couleurs engagées (sorts et terrains fixeurs) : W:${String(colorCounts.W)}, U:${String(colorCounts.U)}, B:${String(colorCounts.B)}, R:${String(colorCounts.R)}, G:${String(colorCounts.G)}
Courbe actuelle : ${String(oneDrops)} drops 1, ${String(twoDrops)} drops 2, ${String(threeDrops)} drops 3, ${String(fourPlusDrops)} CMC 4+
${poolEnablers.length > 0 ? `Cartes clés / accélérations dans le deck : ${poolEnablers.join(", ")}\n` : ""}${lands.length > 0 ? `Terrains/Fixeurs en pool : ${lands.join(", ")}\n` : ""}${wheelAlert}${midDraftReviewSection}${
    tribalCtx.isTribalCube && tribalCtx.isTribalEngaged ? `\n${tribalCtx.promptGuideline}\n` : ""
  }
Booster proposé (${String(packCards.length)} cartes) :
${packCardsDetails}

Donne ta recommandation principale parmi le top 3 déterministe, avec une projection concrète dans ${criticalWindow}, puis les choix secondaires valides.`;

  return { system, user };
}
