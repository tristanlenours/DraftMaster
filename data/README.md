# Architecture et Gestion des Données de DraftMaster

Ce document détaille l'organisation, le fonctionnement et le cycle de vie des données au sein de DraftMaster.

Conformément à la philosophie du projet (*« On s'occupe du fond et on verra la forme plus tard »*), le modèle de données sépare rigoureusement la source de vérité unitaire, les schémas de validation formels, et les bundles dérivés utilisés par les applications clientes (CLI, simulateur, interface Web).

---

## 1. Vue d'Ensemble & Arborescence

```
data/
├── schemas/                          # Schémas JSON stricts (Draft 2020-12)
│   ├── card.schema.json              # Contrat d'un document unitaire de carte
│   ├── cube.schema.json              # Contrat d'un document unitaire de cube
│   ├── cube-snapshot.schema.json     # Contrat des snapshots figés historiques
│   └── master-catalog.schema.json    # Contrat du catalogue bundle
│
├── cards/
│   ├── items/                        # ⭐ SOURCE DE VÉRITÉ : 1 fichier JSON par carte
│   │   ├── adeline-resplendent-cathar.json
│   │   ├── mother-of-runes.json
│   │   ├── lightning-bolt.json
│   │   └── ... (560+ fichiers)
│   ├── images/                       # Cache local des illustrations (optionnel)
│   └── master-cards.json             # 📦 BUNDLE COMPILÉ (généré automatiquement via data:sync)
├── power-rankings/
│   ├── untapped-reference-v1.json     # Ancres vérifiées du classement 1–55
│   ├── cubecobra-calibration-v1.json  # Méthode et validation de la calibration
│   └── power-ranking-v1.json          # Classement versionné et provenance par carte
│
└── cubes/                            # Configuration et snapshots des cubes communautaires
    ├── titou_tribal/                 # Cube Tribal & Chromatique (Titou)
    │   ├── cube.json                 # ⭐ SOURCE DE VÉRITÉ : caractéristiques & index
    │   ├── cube-meta.json            # Métadonnées d'archétypes et axes techniques
    │   └── 2026-02-24.1.json         # Snapshot figé historique (545 cartes)
    ├── nico_candyshop/               # Vintage Powered Cube (Nico)
    │   ├── cube.json
    │   └── cube-meta.json
    └── hugues_pauper/                # Pauper Cube (Hugues)
        ├── cube.json
        └── cube-meta.json
```

---

## 2. Rôles des Fichiers : Source de Vérité vs Bundle Dérivé

### A. La Source de Vérité : `data/cards/items/<slug>.json`
Chaque carte de l'écosystème possède son propre fichier indépendant, nommé d'après son slug kebab-case (ex: `adeline-resplendent-cathar.json`).

**Pourquoi 1 fichier par carte ?**
- **Historique Git propre et lisible** : chaque commit n'affecte que la carte modifiée.
- **Zéro conflit de fusion (merge conflicts)** : deux contributeurs ou deux agents peuvent enrichir des cartes distinctes sans collision.
- **Validation unitaire instantanée** : chaque fichier est testé individuellement par rapport à `card.schema.json`.

### B. Le Bundle Compilé : `data/cards/master-cards.json`
`master-cards.json` **n'est pas une source de vérité manuelle**, mais un artefact généré automatiquement :
- Il rassemble l'ensemble des 560+ fichiers de `data/cards/items/` en un dictionnaire unique indexé par `oracleId`.
- **Rôle principal** : permettre à l'interface web (`npm run web`) et aux benchmarks en mémoire de charger tout le catalogue en **une seule opération réseau/disque**, sans déclencher 560 requêtes HTTP individuelles.
- **Règle d'or** : ne modifiez jamais directement `master-cards.json`. Modifiez le fichier de la carte dans `items/`, puis lancez `npm run data:sync`.

---

## 3. Spécification des Documents

### A. Structure d'un fichier Carte (`data/schemas/card.schema.json`)

Chaque fichier de `data/cards/items/` doit respecter les champs requis :

```json
{
  "schemaVersion": 1,
  "slug": "adeline-resplendent-cathar",
  "name": "Adeline, Resplendent Cathar",
  "oracleId": "38515f89-348b-4cf3-b7bd-1f6fe4ce2fba",
  "manaCost": "{1}{W}{W}",
  "cmc": 3,
  "colors": ["W"],
  "colorIdentity": ["W"],
  "typeLine": "Legendary Creature — Human Knight",
  "types": ["Legendary", "Creature"],
  "subtypes": ["Human", "Knight"],
  "oracleText": "Vigilance\nAdeline's power is equal to...",
  "keywords": ["Vigilance"],
  "power": "*",
  "toughness": "4",
  "isLand": false,
  "producesColors": [],

  "image": {
    "url": "https://api.scryfall.com/cards/named?exact=Adeline%2C%20Resplendent%20Cathar&format=image",
    "localPath": "data/cards/images/adeline-resplendent-cathar.jpg",
    "artCropUrl": "https://api.scryfall.com/cards/named?exact=Adeline%2C%20Resplendent%20Cathar&format=image&version=art_crop"
  },

  "powerScore": {
    "score": 41,
    "source": "untapped",
    "rawSourceScore": 41,
    "harmonizationDegree": "native",
    "confidence": 1.0,
    "updatedAt": "2026-09-05T09:29:17.541Z"
  },

  "presentInCubes": ["titou_tribal"],

  "objectiveAnalysis": {
    "summary": "Moteur agressif majeur avec vigilance et endurance élevée.",
    "roles": ["bomb", "beater", "synergy_payoff"],
    "floorRating": 7.5,
    "ceilingRating": 9.2,
    "tempoImpact": "high",
    "quadrantStrengths": {
      "opening": 4.5,
      "developing": 4.8,
      "parity": 4.2,
      "behind": 3.2
    }
  },

  "cubeAnalyses": {
    "titou_tribal": {
      "cubeKey": "titou_tribal",
      "fit": "build_around",
      "tier": "S",
      "archetypes": ["titou:tribal_humans"],
      "synergyTags": ["tribe:human", "aggro", "tokens", "counters"],
      "scoreModifier": 5,
      "analysis": "Menace absolue de l'archétype Humains. Chaque attaque génère un attaquant humain.",
      "keyPairs": ["Champion of the Parish", "Thalia's Lieutenant"],
      "pedagogy": {
        "howToPlay": "Jouer au Tour 3 en courbe dès qu'une créature est prête à attaquer.",
        "keySynergies": [
          {
            "cardName": "Thalia's Lieutenant",
            "synergyType": "Moteur Croisé",
            "description": "Le jeton créé déclenche le marqueur du Lieutenant."
          }
        ],
        "archetypeFit": [
          {
            "colors": ["W"],
            "archetype": "Tribal Humains",
            "grade": "S",
            "winrateOrScore": "65.0 %",
            "comment": "Pilier et P1P1 incontournable."
          }
        ]
      }
    }
  }
}
```

#### Règles impératives pour les Tiers :
- Les Tiers de cartes sont **strictement simplifiés** sur l'échelle : **`S`**, **`A`**, **`B`**, **`C`**, **`D`**.
- Aucun sous-grade (`+` ou `-`) n'est accepté par le validateur de schéma.

---

### B. Structure d'un fichier Cube (`data/schemas/cube.schema.json`)

Chaque cube dispose d'un document `cube.json` contenant ses caractéristiques fondamentales et son index complet :

```json
{
  "schemaVersion": 1,
  "cubeKey": "titou_tribal",
  "name": "Titou's Tribal and Chromatic Cube",
  "owner": "eltitou007",
  "activeSnapshotId": "titou_tribal@2026-02-24.1",
  "cardCount": 545,
  "powerTier": "synergy_unpowered",
  "pacing": "midrange_attrition",
  "description": "Format centré sur les synergies de types de créatures et seigneurs.",
  "fundamentalTurn": {
    "targetTurn": 4,
    "criticalWindow": "T3-T5",
    "pacingDescription": "Format synergique articulé sur les créatures. Le T4 marque la masse critique.",
    "deckExpectation": "Développer sa courbe T1-T3 pour rentabiliser un seigneur au T4."
  },
  "technicalAxes": {
    "speedIndex": 5.8,
    "interactionDensityPercentage": 16,
    "averageCmcEstimate": 3.1,
    "fixingQuality": "rainbow_tribal",
    "comboPotential": "high_synergy_engine"
  },
  "philosophy": "Exploration des familles de créatures dans un format convivial et riche en couleurs.",
  "dominantMechanics": ["Tribal", "Lifegain", "Blink", "+1/+1 Counters", "Graveyard"],
  "fixingDensityPercentage": 14.5,
  "archetypes": [ ... ],
  "scoringProfile": { ... },
  "cardIndex": [
    {
      "slug": "adeline-resplendent-cathar",
      "name": "Adeline, Resplendent Cathar",
      "oracleId": "38515f89-348b-4cf3-b7bd-1f6fe4ce2fba",
      "tier": "S",
      "fit": "build_around",
      "scoreModifier": 5
    }
  ]
}
```

---

## 4. Workflow d'Édition & Commandes Utiles

Le score absolu est reconstruit avec `npm run power:rebuild:apply`, puis propagé au bundle avec `npm run data:sync`. Les tiers et modificateurs de cube ne doivent pas être ajoutés au `powerScore` : ils décrivent le contexte d'un cube et servent aux futures évaluations dynamiques.

### A. Modifier ou Enrichir une Carte
1. Ouvrez son fichier dans `data/cards/items/<slug>.json`.
2. Ajustez les informations (texte, rôle, tier dans un cube, conseils de jeu, synergies).
3. Lancez la synchronisation et la validation :
   ```bash
   npm run data:sync
   npm test
   ```

### B. Ajouter une Nouvelle Carte
1. Créez un nouveau fichier `data/cards/items/<slug>.json` conforme au schéma.
2. Indiquez dans `presentInCubes` les cubes où elle figure, ainsi que son bloc `cubeAnalyses.<cubeKey>`.
3. Lancez `npm run data:sync` pour l'intégrer au bundle et aux index de cubes.

### C. Modifier les Caractéristiques d'un Cube
1. Modifiez `data/cubes/<cubeKey>/cube-meta.json` (ou directement `cube.json`).
2. Lancez `npm run data:sync` pour recalculer les index et harmoniser les documents.

---

## 5. Gestion des Versions & Évolutions Futures

Pour faire évoluer les formats sans casser les outils existants :

### A. Évolution des Schémas (`schemaVersion`)
Chaque document porte un entier `schemaVersion: 1`. Lors d'une future évolution majeure du modèle (ex: ajout de métriques vidéo, nouvelles catégories de synergies) :
1. Créez une nouvelle révision du schéma sous `data/schemas/` (ex: `card-v2.schema.json`).
2. Incrémentez `schemaVersion: 2` sur les documents cibles.
3. Écrivez un script de migration unitaire dans `scripts/migrations/` capable de transformer les documents v1 en v2 de manière idempotente.
4. Mettez à jour le validateur TypeScript (`src/cards/card-catalog.ts`).

### B. Versioning des Snapshots de Cubes
Lorsqu'un créateur met à jour la liste physique de son cube (ex: retrait et ajout de cartes) :
- Les snapshots historiques restent figés et immuables sous la nomenclature : `<cubeKey>@YYYY-MM-DD.<rev>` (ex: `titou_tribal@2026-02-24.1`).
- Le fichier `2026-02-24.1.json` garantit que les sessions de draft passées et les replays déterministes restent auditables à l'identique pour l'éternité (vérification par empreinte SHA-256 RFC 8785).
- Un nouveau snapshot est créé pour la nouvelle version du cube, et `activeSnapshotId` dans `cube.json` pointe vers cette nouvelle version.

---

## 6. Commandes de Contrôle Qualité

- `npm run data:sync` : Compile les fichiers unitaires `items/*.json` vers `master-cards.json` et reconstruit les index `cube.json`.
- `npm test` : Valide l'intégralité des fichiers JSON contre leurs schémas avec Ajv, et exécute les 38 suites de tests unitaires et d'intégration.
- `npm run check` : Exécute l'intégralité du quality gate (Prettier, ESLint, TypeScript `tsc --noEmit`, Vitest et couverture V8).
