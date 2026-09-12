import type { CompanionCard } from "./card-resolver.ts";
import type { MatchState } from "./companion-state.ts";
import {
  detectDraftedTribalContext,
  type TribalDraftContext,
} from "../domain/coaching/tribal-compatibility.ts";

export interface DraftAdvicePromptOptions {
  readonly cubeKey?: string | undefined;
  readonly tribalContext?: TribalDraftContext | undefined;
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
- Ton et style : Varié, naturel, expert et tactique. Adapte ton accroche à la réalité du booster : si c'est un pack moyen ou un pick de fin de booster, sois sobre et pragmatique ('Choix de discipline', 'Pick utilitaire', 'Rien d'extravagant mais solide'). Ne commence JAMAIS systématiquement par 'Pack de folie !' ou 'Jackpot !'. INTERDICTION des répétitions mécaniques d'un pack à l'autre.
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
- Respecte la courbe et le plan de jeu : si le joueur a des 1-drops agressifs et du burn, privilégie le tempo et les bêtes rapides.
- Sois percutant, direct et tactique (1-2 phrases par carte).${
    isMidDraftStart
      ? `\n- BILAN STRATÉGIQUE DU DÉBUT DE TOUR (Pack ${pack} Pick 1) :
  * Analyse le pool actuel : couleurs engagées, archétype initié.
  * Analyse de la courbe de mana : indique s'il faut privilégier des drops 1 et 2 pour baisser la courbe ou chercher des finisseurs.
  * Fixeurs de mana : analyse si la proportion de fixeurs/bilands est bonne ou déficitaire selon le nombre de couleurs (alerte si déficit).
  * Recommande de chercher une carte clé de l'archétype, en ajoutant : 'si on choppe une carte recherchée, c'est bingo !'.
  * Lecture du draft : rappelle d'observer les signaux et couleurs ouvertes au 2e passage des cartes (picks 9+ / roue).`
      : ""
  }
- Réponds STRICTEMENT en format JSON valide respectant cette structure :
{
  "topPick": "Nom exact de la carte recommandée en choix 1",
  "reason": "Explication tactique percutante et vivante du choix principal",
  "alternatives": [
    {
      "name": "Nom exact de la 2e option",
      "reason": "Pourquoi c'est une alternative valide cohérente avec les couleurs"
    }
  ]${
    isMidDraftStart
      ? `,
  "packReview": {
    "summary": "Bilan synthétique du pool et archétype",
    "curveAdvice": "Conseil courbe (ex: baisser la courbe avec des drops 1 et 2)",
    "fixingAdvice": "Conseil fixeurs (ex: proportion équilibrée ou déficit à combler)",
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

  const lands = pool
    .filter((c) => c.isLand)
    .map((c) => `${c.name} (${c.producesColors?.join("/") || "Fixer"})`);
  const poolSummary = pool.map((c) => `${c.name} (${c.manaCost || "Land"})`).join(", ");

  // Sort pack cards by powerScore descending so the LLM evaluates the best candidates first
  const sortedPack = [...packCards].sort((a, b) => (b.powerScore ?? 0) - (a.powerScore ?? 0));

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
${lands.length > 0 ? `Terrains/Fixeurs en pool : ${lands.join(", ")}\n` : ""}${
    tribalCtx.isTribalCube && tribalCtx.isTribalEngaged ? `\n${tribalCtx.promptGuideline}\n` : ""
  }
Booster proposé (${packCards.length} cartes) :
${packCardsDetails}

Donne ta recommandation principale et tes choix secondaires valides.`;

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

export function buildTurnCommentaryPrompt(match: MatchState): {
  system: string;
  user: string;
} {
  const system = `Tu es un commentateur et coach Magic: The Gathering de niveau Pro Tour assistant un joueur en direct pendant son match sur MTG Arena.
Règles strictes :
- Réponds en 2 phrases concises, percutantes et directes en français.
- Phrase 1 : Analyse de la situation (ce que l'adversaire prépare, la menace adverse ou l'état du champ de bataille).
- Phrase 2 : Le coup tactique optimal pour ce tour (quel terrain poser, quelle carte lancer en priorité, attaquer ou conserver du mana/des réponses).`;

  const oppBoardNonLands = match.opponentBattlefield.filter((c) => !c.isLand).map((c) => c.name);
  const oppLands = match.opponentBattlefield.filter((c) => c.isLand).length;
  const myBoardNonLands = match.playerBattlefield.filter((c) => !c.isLand).map((c) => c.name);
  const myLands = match.playerBattlefield.filter((c) => c.isLand).length;

  const oppPlaysText =
    match.opponentRecentPlays.length > 0 ? match.opponentRecentPlays.join(", ") : "Aucun sort joué";

  const handCards =
    match.playerHand
      .map((c) => `${c.name} (${c.manaCost || "Terrain"}, CMC: ${c.cmc})`)
      .join(", ") || "Aucune carte en main";

  const user = `Tour ${match.gameTurn} du joueur (Phase: ${match.phase}).
Adversaire : ${match.opponentName}.
Points de vie : Toi ${match.playerLife} PV | Adversaire ${match.opponentLife} PV.
Derniers sorts joués par l'adversaire : ${oppPlaysText}.
Champ de bataille adverse : ${oppBoardNonLands.length > 0 ? oppBoardNonLands.join(", ") : "Vide (créatures/permanents)"} (${oppLands} terrains).
Ton champ de bataille : ${myBoardNonLands.length > 0 ? myBoardNonLands.join(", ") : "Vide"} (${myLands} terrains).
Cartes en main actuelles (${match.playerHand.length}) :
${handCards}

Donne ta recommandation tactique pour ce Tour ${match.gameTurn}.`;

  return { system, user };
}

export function buildMatchAdvicePrompt(
  match: MatchState,
  question: string,
): { system: string; user: string } {
  const system = `Tu es un arbitre et coach Magic: The Gathering de haut niveau qui assiste un joueur en direct pendant son match sur MTG Arena.
RÈGLES CAPITALES :
- Tu as accès en direct à la main complète du joueur, ses points de vie, le tour exact et l'adversaire.
- NE DIS JAMAIS que tu ne peux pas voir ses cartes : tu as la liste exacte ci-dessous !
- Réponds précisément et de façon concise (2-4 phrases maximum).
- Indique clairement quelle carte jouer, garder en main pour contrer, ou comment engager ses manas.`;

  const handCards =
    match.playerHand
      .map((c) => `- ${c.name} (${c.manaCost || "Terrain"}, CMC: ${c.cmc})`)
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
- Ton champ de bataille : ${myBoard}
- Tes cartes en main actuelles (${match.playerHand.length} cartes) :
${handCards}

Question du joueur : ${question}`;

  return { system, user };
}
