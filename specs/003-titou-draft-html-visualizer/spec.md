# Feature Specification: Visualiseur HTML Interactif 17Lands et Répartition des 360 Cartes du Draft Titou

**Feature Branch**: `003-titou-draft-html-visualizer`

**Created**: 2026-09-06

**Status**: Implemented / Verified

**Input**: User descriptions :

1. _"Qu'est-ce qu'il faudrait pour simuler un draft du titou tribal cube ? J'aimerais générer des html avec 1 résumé des picks pour chacun des 8 bots. Il me faudrait aussi, comme pour 17 lands, un parcours avec chacun des 45 écrans avec les cartes disponibles et le choix fait. Justifier la décision à chaque fois. Il faudrait aussi avoir le deck final (23 cartes) avec l'analyse du score sur les 3 axes. Il me faut un seed pour pouvoir refaire ce draft après avoir customisé l'algo de sélection des cartes."_
2. _"Pb. qd je suis sur le P1P1 de titou, je n'arrive pas à passer au pick suivant."_
3. _"J'aimerais un autre fichier HTML qui me permette de voir les 360 cartes du draft réparties avec les 8 paquets de 15 du premier tour, puis les 8x15 du second, etc Pour ce draft 42."_
4. _"Ajouter les stats sur l'ouverture de bombes, enlever les choix de picks de ce fichier, retracer qui a drafté quoi à quel moment et pourquoi avec le dynamicScore et les biais des bots, et remplacer le bot Tristan par le Rockeur."_

---

## Alignement Domaine & Terminologie (CONTEXT.md)

- **Titou Tribal Cube** : Snapshot officiel et scellé (`data/cubes/titou_tribal/2026-02-24.1.json`) contenant 545 instances de cartes Magic.
- **Graine Déterministe (`seed`)** : Entier signé 32-bit (ex: `42`) garantissant la reproductibilité au bit près du tirage des 360 cartes et des 360 décisions des 8 participants.
- **Parcours 17Lands** : Navigation pas-à-pas à travers les 45 écrans successifs du draft (3 packs $\times$ 15 picks), reproduisant l'expérience standard de revue de draft compétitif sur 17Lands.
- **Pack / Booster Initial** : L'un des 24 paquets de 15 cartes distribués au départ du draft (8 au Tour 1, 8 au Tour 2, 8 au Tour 3).
- **Bombe** : Identité de carte classée dans les 5 % supérieurs du Cube selon `powerScore.score`. Le seuil inclut toutes les égalités ; une bombe reste donc une bombe quel que soit le contexte ou son `dynamicScore` pendant le draft.
- **Trace de Décision** : Preuve produite par la politique au moment du choix : `dynamicScore`, détail du coaching, contributions des biais, `policyScore`, probabilité Softmax, rang, température et tirage aléatoire déterministe.
- **Deck Final (23/17)** : Composition standard de Limited à 40 cartes, découpée en 23 cartes actives (sorts) et 17 terrains optimisés.
- **Axes de deck** : Les cinq dimensions normalisées sur 100 affichées sans agrégation masquée : **Puissance**, **Synergie**, **Courbe**, **Mana** et **Interaction**.

---

## User Scenarios & Testing

### User Story 1 - Simulation Détaillée et Déterministe de la Table (Priority: P1)

Un joueur ou théoricien du Cube souhaite simuler un draft complet à 8 bots (Le Rockeur au siège 0 + 7 amis dont Titou, le créateur du cube) avec une graine fixe (ex: `42`). Le moteur doit enregistrer l'intégralité des 45 étapes de chaque bot, les cartes offertes dans chaque booster, la preuve algorithmique de chaque choix, et la composition du deck final. Tristan reste un joueur humain dans l'application produit et ne doit pas être présenté comme un bot dans ce rapport autonome.

**Why this priority**: C'est le socle fondamental sur lequel reposent la traçabilité, la relecture pédagogique et l'auditabilité des décisions.

**Independent Test**: Exécuter `runDetailedDraftSimulation({ seed: 42 })` et vérifier que les 8 participants possèdent chacun 45 étapes valides, avec 15 cartes au P1, 14 cartes au P2, jusqu'à 1 carte au P15, et un deck final de 40 cartes (23 sorts + 17 terrains).

**Acceptance Scenarios**:

1. **Given** la graine 42 et le snapshot Titou, **When** la simulation est exécutée, **Then** elle s'achève en moins de 200 ms et génère 360 décisions (8 joueurs $\times$ 45 picks).
2. **Given** deux simulations lancées avec la même graine, **When** les résultats sont comparés, **Then** les 360 choix et les 8 decks finaux sont strictement identiques.
3. **Given** le Siège 7 (Titou, créateur du cube), **When** son premier choix est évalué, **Then** Titou sélectionne _Tundra_ (terrain bicolore de fixation majeure) avec une justification contextuelle expliquant son orientation vers Azorius / Contrôle.
4. **Given** n'importe laquelle des 360 décisions, **When** sa trace est inspectée, **Then** elle se relie à un événement `CardPicked` canonique par `eventSequence`, `boosterId`, siège, pack, pick et carte choisie.
5. **Given** une politique de bot, **When** elle choisit une carte, **Then** les scores et biais affichés proviennent du résultat de cette politique et ne sont pas recalculés indépendamment après le choix.

---

### User Story 2 - Parcours 17Lands Interactif avec Navigation Persistante (Priority: P1)

L'utilisateur ouvre le fichier HTML `reports/draft-titou-seed-42.html` directement dans son navigateur (`file:///...`). Il explore les 45 écrans de choix du bot sélectionné (avec Titou mis en avant par défaut), voit les cartes du booster classées par rang de pertinence, lit la justification du choix et visualise l'évolution de son pool. En faisant défiler la page, les contrôles de navigation restent visibles et accessibles à tout moment.

**Why this priority**: Permet une analyse visuelle immédiate, ergonomique et sans friction, sans nécessiter de serveur web ni de connexion Internet.

**Independent Test**: Charger le document HTML généré ; vérifier la présence des contrôles persistants (`stepper-sticky-bar`), de la pilule flottante basse (`floating-nav-pill`), des chevrons latéraux (`side-nav-btn`), de la sélection par défaut de Titou (Siège 7), et des raccourcis clavier (`←` et `→`).

**Acceptance Scenarios**:

1. **Given** l'ouverture de l'onglet Walkthrough, **When** la page est chargée, **Then** le profil de **Titou (Siège 7)** est actif par défaut et présente son choix P1P1 (_Tundra_).
2. **Given** un défilement vertical vers le bas pour observer les 15 cartes du booster, **When** l'utilisateur regarde le bas de page, **Then** la barre de commande supérieure reste fixée en haut (`position: sticky`), la pilule flottante reste centrée en bas, et le bouton `Suivant ▶` permet d'avancer d'un simple clic sans remonter la page.
3. **Given** l'appui sur la touche `Flèche Droite` ou `Espace`, **When** le focus n'est pas sur un champ texte, **Then** l'écran avance immédiatement au pick suivant sans rechargement de page ni scroll parasite.
4. **Given** l'onglet « Table des 8 Bots », **When** l'utilisateur clique sur « Explorer les 45 Picks de Titou », **Then** l'application bascule automatiquement sur le parcours 17Lands configuré sur le Siège 7.
5. **Given** l'onglet « Fil du draft », **When** l'utilisateur avance d'un tour, **Then** les huit choix simultanés affichent leur `dynamicScore`, leur `policyScore`, leur probabilité, leurs biais et leur séquence de journal.

---

### User Story 3 - Visualiseur de la Répartition des 360 Cartes en 24 Boosters (Priority: P1)

L'utilisateur consulte un second fichier HTML autonome (`reports/draft-titou-seed-42-boosters.html`) présentant la totalité des 360 cartes distribuées lors du draft 42, réparties selon les 24 boosters initiaux distribués à la table (8 pour le Tour 1, 8 pour le Tour 2, 8 pour le Tour 3).

**Why this priority**: Permet à l'organisateur du draft de vérifier exclusivement la distribution initiale des cartes et l'équilibre de puissance des ouvertures, sans mélanger cette vue avec les décisions de draft.

**Independent Test**: Exécuter `generateBoosterDistributionHtml` sur le rapport de draft 42 et vérifier la présence des 24 boosters de 15 cartes, des statistiques de bombes, du tableau de bord et du filtre en direct, ainsi que l'absence de données ou rubans de pick.

**Acceptance Scenarios**:

1. **Given** le rapport généré, **When** les paquets sont examinés, **Then** il y a exactement 24 boosters de 15 cartes (soit 360 cartes au total sans aucun doublon d'instance).
2. **Given** la définition « top 5 % », **When** le Cube est classé par identité canonique, **Then** toutes les égalités au score seuil sont incluses et chaque instance distribuée d'une identité éligible porte le ruban `BOMBE`.
3. **Given** l'en-tête du rapport, **When** l'utilisateur consulte le tableau de bord, **Then** il visualise la répartition par couleur (W, U, B, R, G, Multi, Incolore, Terrains) et l'histogramme de la courbe de mana (CMC 0 à 6+).
4. **Given** le champ de recherche, **When** l'utilisateur tape un nom de carte (ex: _Ancient Tomb_), **Then** seuls les paquets contenant cette carte restent visibles avec la carte mise en valeur.
5. **Given** les deux fichiers HTML générés, **When** l'utilisateur clique sur le lien d'en-tête correspondant, **Then** il bascule directement de l'un à l'autre via des liens relatifs locaux.
6. **Given** le rapport des boosters, **When** son HTML et ses données embarquées sont audités, **Then** ils ne contiennent ni `P1 PICK`, ni `p1PickCardInstanceId`, ni `p1PickCardName`.

---

### User Story 4 - Présentation et Scoring du Deck Final (23/17) (Priority: P2)

Dans l'onglet « Deck Final », l'utilisateur visualise pour le bot sélectionné (Titou par défaut) le deck de 40 cartes optimisé (23 sorts + 17 terrains), la réserve (sideboard de 22 cartes), le Score de deck sur 100, la décomposition sur les cinq Axes de deck et la preuve détaillée des contributions, ainsi que les forces et faiblesses du deck.

**Why this priority**: Permet de valider la viabilité compétitive du build issu de l'algorithme de sélection et d'orienter le coaching.

**Acceptance Scenarios**:

1. **Given** le deck de Titou au terme des 45 picks, **When** l'onglet Deck est affiché, **Then** les cartes sont classées par colonnes de coût converti de mana (CMC 1, 2, 3, 4, 5+ et Terrains).
2. **Given** l'évaluation d'un deck final, **When** l'onglet Deck est affiché, **Then** l'archétype et le score global sont accompagnés des cinq jauges Puissance, Synergie, Courbe, Mana et Interaction, sans agrégation « Régularité » cachant trois axes.
3. **Given** un score global affiché, **When** l'utilisateur consulte son audit, **Then** le rapport expose la version et le sens du score, chaque contribution pondérée, la distribution de puissance et les bombes, les packages stratégiques, la courbe imprimée et effective, les sources de mana et le profil d'interaction adapté au plan.

---

## Architecture & Contrats de Données

### 1. Structure de Données Étendue (`src/simulation/detailed-simulation.ts`)

```typescript
export interface InitialDealtBooster {
  readonly boosterId: string; // "pack:1:seat:0" ... "pack:3:seat:7"
  readonly packNumber: 1 | 2 | 3;
  readonly originSeatId: SeatId; // 0..7
  readonly originBotName: string;
  readonly cards: readonly EnrichedCard[]; // 15 cartes enrichies
}

export interface PickWalkthroughStep {
  readonly packNumber: 1 | 2 | 3;
  readonly pickNumber: number;
  readonly seatId: SeatId;
  readonly boosterId: string;
  readonly eventSequence: number;
  readonly decisionTrace: PickDecisionTrace;
  readonly pickedCardInstanceId: string;
}

export interface DetailedDraftReport {
  readonly schemaVersion: 2;
  readonly cubeKey: string;
  readonly seed: number;
  readonly bombDefinition: CubeBombDefinition;
  readonly draftReport: DraftReport; // journal canonique + digest fonctionnel
  readonly seats: readonly SeatDraftSummary[];
  readonly initialBoosters?: readonly InitialDealtBooster[] | undefined;
}
```

### 2. Modules et Fichiers Implémentés

| Fichier                                                                                                                         | Rôle & Responsabilité                                                                                                        |
| :------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| [`src/simulation/detailed-simulation.ts`](file:///e:/SecondBrain/DraftMaster/src/simulation/detailed-simulation.ts)             | Moteur de simulation multi-bots 45 picks, capture de l'événement `BoostersDealt`, calcul des justifications et decks finaux. |
| [`src/simulation/html-report-generator.ts`](file:///e:/SecondBrain/DraftMaster/src/simulation/html-report-generator.ts)         | Générateur du rapport interactif 17Lands (Table des 8 bots, Walkthrough 45 écrans sticky/flottant, Deck final).              |
| [`src/simulation/booster-distribution-html.ts`](file:///e:/SecondBrain/DraftMaster/src/simulation/booster-distribution-html.ts) | Générateur du visualiseur des 360 cartes réparties en 24 boosters (statistiques, filtres, recherche en direct).              |
| [`scripts/simulate-html-report.ts`](file:///e:/SecondBrain/DraftMaster/scripts/simulate-html-report.ts)                         | Point d'entrée CLI (`npm run simulate:html -- --seed 42`) générant les deux artefacts HTML.                                  |

---

## Preuve de Vérification & Métriques de Qualité

### 1. Tests Automatisés (Vitest & V8 Coverage)

- `tests/unit/simulation/detailed-simulation.test.ts` : validation du déterminisme, de la conservation des 45 cartes par siège, de la complétude des 24 boosters initiaux et des 360 instances uniques.
- `tests/unit/simulation/html-report-generator.test.ts` : validation de la structure HTML 17Lands, des contrôles persistants, de la pilule flottante et du siège 7 par défaut.
- `tests/unit/simulation/booster-distribution-html.test.ts` : validation de la structure HTML des 360 cartes, des 24 paquets, des badges P1 et des filtres.

### 2. Porte de Qualité Globale (`npm run check`)

```bash
> npm run check
✔ format:check (Prettier) : 0 erreur de style
✔ lint (ESLint)           : 0 avertissement, 0 erreur
✔ typecheck (tsc)         : 0 erreur de typage
✔ vitest                  : 45 suites de tests passées, 236 tests passés (100% succès)
✔ V8 Coverage             : 85.27% stmts, 74.40% branch, 89.68% funcs, 86.59% lines
✔ reports:verify          : schéma v2, 24 boosters, 21 bombes et 360 décisions tracées
```

### 3. Artefacts Générés

1. **Rapport 17Lands & Decks** : `reports/draft-titou-seed-42.html` (9,15 Mo, schéma v2, journal et traces embarqués).
2. **Visualiseur des 360 Cartes** : `reports/draft-titou-seed-42-boosters.html` (9,12 Mo, statistiques de bombes et aucun choix de pick).
