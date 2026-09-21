# Quickstart Validation: Gestion de tournois de cube

Ce guide décrit les preuves attendues après implémentation. Il ne remplace ni les tests, ni la checklist reviewer, ni `qa-evidence.md`.

## Prerequisites

- Node.js 24 LTS et npm 11.
- Dépendances installées.
- Pour les tests PostgreSQL : instance Supabase/PostgreSQL isolée, migration tournoi appliquée et `SUPABASE_SERVICE_ROLE_KEY` de test.
- Pour la validation navigateur : serveur lancé sur un port libre et aucun serveur stale réutilisé.

## 1. Tracer bullet toutes-rondes à trois

Lancer le test ciblé :

```powershell
npm run test -- tests/unit/tournaments/coordinator.test.ts
```

Scénario attendu :

1. Créer `Soirée Cube`.
2. Choisir `titou_tribal`.
3. Ajouter Alice / Aggro Boros, Bob / Izzet Wizards et Chloé / Golgari Graveyard.
4. Choisir `round-robin-three` et démarrer.
5. Vérifier trois rondes, les paires Alice-Bob, Alice-Chloé, Bob-Chloé exactement une fois et une Pause toutes-rondes sans point par joueur.
6. Saisir trois scores puis finaliser.
7. Recharger l'agrégat et retrouver exactement le classement et l'historique.

## 2. Suisse déterministe et propriétés

```powershell
npm run test -- tests/unit/tournaments/pairing.test.ts tests/unit/tournaments/pairing.property.test.ts tests/unit/tournaments/standings.test.ts
```

Preuves attendues sur 2 à 32 participants :

- chaque actif apparaît une fois par ronde ou reçoit l'unique Exemption suisse ;
- aucun participant ne s'affronte lui-même ;
- le même état, seed et moteur produit le même Appariement ;
- aucun rematch n'apparaît si une solution complète sans rematch existe ;
- aucun second bye n'est donné avant tous les autres participants éligibles ;
- le bye vaut 2-0 et trois points mais n'entre pas dans OMW%/OGW% ;
- les comparaisons de départage n'arrondissent pas les fractions ;
- le calcul reste sous le budget documenté pour 32 participants.

## 3. Résultats, corrections et refus sans mutation

```powershell
npm run test -- tests/contract/tournament-management.test.ts
```

Vérifier notamment :

- un score invalide ne modifie ni révision ni journal ;
- un retry identique rejoue la réponse ;
- une clé idempotente réutilisée différemment est rejetée ;
- deux démarrages concurrents créent une seule première ronde ;
- une correction conserve les deux versions et recalcule le classement ;
- une correction tardive ne modifie pas un Appariement publié ;
- le replay du journal reconstruit le checkpoint.

## 4. HTTP et PostgreSQL réels

```powershell
npm run test -- tests/integration/tournament-management-http.test.ts tests/integration/tournament-management-postgres.test.ts
```

Attendus :

- le contrat [HTTP](contracts/http-api.md) est respecté ;
- les tables sont inaccessibles aux rôles navigateur ;
- le rôle serveur commit événement, checkpoint et reçu dans une seule transaction ;
- un redémarrage du serveur recharge le tournoi depuis PostgreSQL ;
- l'absence de clé de service ou une panne de base renvoie `STORE_UNAVAILABLE`, sans fallback local silencieux ;
- le Snapshot archivé reste lisible après changement du snapshot actif.

## 5. Parcours navigateur

```powershell
npm run web
npx playwright test tests/browser/tournament-management.spec.ts
```

Parcours de preuve :

1. Ouvrir `/tournaments`.
2. Créer et configurer un tournoi de cinq joueurs.
3. Démarrer trois rondes suisses, saisir les résultats et observer le classement.
4. Corriger un résultat et vérifier la présence des deux versions.
5. Ajouter manuellement deux Cartes clés de deck depuis le Snapshot.
6. Finaliser, revenir à l'historique puis rouvrir le tournoi.
7. Répéter les actions critiques au clavier et à 360 px sans défilement horizontal bloquant.
8. Chronométrer un organisateur depuis l'ouverture du formulaire jusqu'à la première ronde et consigner le résultat par rapport aux trois minutes de SC-001.

## 6. Out-of-scope follow-up

La reconnaissance photo ne fait partie d'aucune validation de la feature 008. Elle est suivie par l'Issue #81 et devra disposer de ses propres artefacts et preuves avant implémentation.

## 7. Full quality gate

Après les tests ciblés :

```powershell
npm run check
git diff --check
```

Consigner commandes, résultats, environnement PostgreSQL, mesures de performance, test utilisateur à quatre participants et preuves clavier/mobile dans `specs/008-tournament-management/qa-evidence.md`. Distinguer explicitement ce qui est local, branché à PostgreSQL, validé, committé et poussé.
