# Drafts de référence

Ce répertoire conserve les fixtures dorées de drafts de référence pour garantir la non-régression et la reproductibilité exacte du moteur de draft.

## Référence : `titou-2026-02-24.1-seed-42.json`

### Paramètres d'entrée
- **Cube Snapshot** : `titou_tribal`
- **Version Snapshot** : `2026-02-24.1`
- **Empreinte canonique SHA-256 du Snapshot** : `81907cb598dfcb2676839bb002f232ab88d407ff5b3f74577f98e7bb6c770c6a`
- **Nombre total de cartes** : 545
- **Version du moteur** : `draft-engine@1.0.0`
- **Système pseudo-aléatoire** :
  - Algorithme : `xoroshiro128plus` (version 1)
  - Implémentation : `pure-rand` (version 8.4.2)
  - Dérivation de seed : `draftmaster-seed-v1`
- **Seed** : `42`
- **Politiques des sièges** : 8 sièges configurés avec la politique `seeded-random` en version `1`
- **Configuration** : 8 sièges, 3 paquets de 15 cartes, rotations gauche/droite/gauche

### Résultat attendu et invariants
- **Empreinte fonctionnelle canonique (`functionalDigest`)** :
  `67a8f0521c3ec5684f8ee55cdf271a801649322621057dbae61ca95a6da845d5`
- **Nombre de tours** : 45
- **Nombre total de choix** : 360 (45 par siège, `PICK_COUNT` = 360)
- **Taille des pools finaux** : exactement 45 cartes par siège (`SEAT_POOL_SIZE` = 45)
- **Cartes inutilisées** : exactement 185 cartes (545 − 360)
- **Conservation globale** : 545 instances distinctes, 0 doublon (`CARD_CONSERVATION` = 545, `NO_DUPLICATE_ASSIGNMENT` = 0)
- **Événements** : 407 événements ordonnés (1 `DraftStarted`, 1 `BoostersDealt`, 360 `CardPicked`, 42 `BoostersPassed`, 2 `PackCompleted` intermédiaires, 1 `DraftCompleted`)

## Procédure de changement (Gouvernance et interdiction de régénération automatique)

1. **Interdiction de régénération automatique** : les tests de non-régression ne doivent JAMAIS écraser ou régénérer automatiquement cette fixture en cas d'échec.
2. **Investigation systématique** : tout écart observé dans le digest fonctionnel ou les pools finaux doit être considéré par défaut comme une régression ou un bug d'implémentation.
3. **Changement intentionnel** : si une modification fonctionnelle légitime du moteur ou de la dérivation aléatoire modifie le comportement :
   - Le changement doit faire l'objet d'une nouvelle version explicite (ex. bump de version du moteur ou de la politique).
   - Les motifs et arbitrages doivent être consignés dans la documentation ou un ADR.
   - Une revue humaine et une approbation explicite sont obligatoires avant toute mise à jour de la fixture.