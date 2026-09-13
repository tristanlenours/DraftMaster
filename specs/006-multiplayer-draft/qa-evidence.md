# Preuves QA — Draft multijoueur amical et Coach final

**Date**: 2026-09-13
**Branche**: `006-multiplayer-draft`
**Base avant livraison**: `3d39df1`
**Environnement execute**: Windows, Node `v22.16.0`, npm `10.9.2`

Ce registre separe les preuves automatisees effectivement obtenues des validations qui exigent un reviewer ou l'environnement de production. Les marqueurs de `checklists/multiplayer-release.md` restent exclusivement sous responsabilite humaine.

## Etat de livraison

| Capacite | Preuve actuelle | Statut |
| --- | --- | --- |
| Salon global | Deux contextes rejoignent, choisissent/verrouillent le cube, quittent/rejoignent, remettent les accords a zero, conservent chacun un Acces de reprise et convergent par polling | Valide localement |
| Lancement | Deux a huit humains ; tous les humains doivent etre prets ; six a zero bots remplissent les sieges ; une seule Session demarre | Valide localement |
| Draft | Boosters et pools illustres prives, attente sans chrono, choix immuables groupes avec provenance 1 caller + humains + Friend-Bots, rotations gauche/droite/gauche et 45 cartes distinctes par siege | Valide localement |
| Reprise et abandon | Etat persiste dans le store fichier, reconstruction exacte apres redemarrage en Salon, draft et deckbuilding, pause de 24 h, reprise par Bearer token, abandon explicite et liberation du Salon | Valide localement ; presence reseau informative non livree |
| Coach final | Mission `final-deck-coach@1`, Gemini puis DeepSeek, validation locale stricte, repli deterministe et evaluation cinq axes | Valide avec doubles de provider et repli local |
| Solo | Constructeur flexible partage ; demande d'assistance annoncee ; Homologation retiree avant la resolution du Coach | Valide localement |
| Atelier | Liste modifiable, 40 cartes exactes, 16–18 terrains normalement, plan/couleurs/mana/raisons et evaluation locale | Valide localement |
| Export MTGA | `Deck` de 40 cartes, `Sideboard` exhaustif, quantites agregees, ordre stable et blocage explicite des incompatibilites Arena | Valide par generateur et API ; import dans le vrai client Arena a faire |
| Cubes | Titou, Nico, Cedric et Arena Peasant+ chargent depuis les donnees locales | Valide localement |
| Cube Hugues | Le mainboard local contient 354 cartes pour 360 requises | Desactive honnêtement dans le menu |

## Commandes et resultats observes

```text
npm run check
  Prettier: OK
  ESLint: OK
  TypeScript: OK
  Profils de synergie: OK
  Vitest: 81 fichiers, 468 tests passes
  Couverture V8: 85,87 % statements, 73,51 % branches,
                  92,60 % functions, 86,99 % lines
  Rapports seed 42: 24 boosters, 21 bombes, 360 decisions tracees
  Playwright Chromium: 19 tests passes

npx playwright test tests/browser/multiplayer-draft.spec.ts
  2 tests passes
  - deux amis, cube, depart/rearrivee, remise a zero de Pret, premier booster illustre, fermeture, reprise, abandon et nouveau groupe
  - pool illustre et atelier a 360 px au clavier, modification, finalisation et copie MTGA

npx vitest run tests/integration/multiplayer-draft-restart.test.ts
  1 fichier, 2 tests passes
  - reconstruction exacte du Salon, du Tour, des choix, des pools et du deckbuilding
  - reprise normale apres 24 heures sans choix automatique

npx vitest run tests/integration/multiplayer-draft-http.test.ts tests/unit/multiplayer-draft/coordinator-lobby.test.ts
  2 fichiers, 13 tests passes
  - conflit atomique depart/dernier Pret, retry idempotent, double onglet et secret invalide

npx vitest run tests/unit/multiplayer-draft/coordinator-pick.property.test.ts
  1 fichier, 1 propriete passee sur 5 seeds
  - 360 choix uniques, 45 par siege et 42 passages gauche/droite/gauche par draft

npm run test:mobile
  1 fichier, 25 tests passes

npm run test:performance
  1 fichier, 2 tests passes

npm run test:reference
  1 fichier, 3 tests passes

npm run test:replay
  4 fichiers, 27 tests passes

npm run test:audit
  1 fichier, 4 tests passes

npm run test:domain-errors
  3 fichiers, 43 tests passes

npm run test:e2e
  2 fichiers, 12 tests passes

git diff --check
  Aucune erreur
```

## Preuves comportementales notables

- Le dernier accord `Pret` demarre une table fixe de huit sieges ; tout changement de composition avant le depart remet les accords a zero.
- Aucun minuteur, choix automatique ou remplacement d'un humain n'est present dans le flux Multi. En cas de depart, le groupe utilise l'abandon confirme puis recommence, conformement au choix produit.
- Le 45e Tour libere le Salon global sans detruire les ateliers individuels de l'ancienne Session.
- La vue privee ne contient que le booster, le pool et l'atelier du porteur de l'Acces de reprise.
- Une sortie LLM avec carte inventee, mauvaise multiplicite, total different de 40 ou justification invalide est rejetee avant persistance et remplacee par la recommandation locale.
- Le Solo conserve une recommandation locale auditable sans perdre son Homologation. Le clic explicite vers Gemini/DeepSeek retire l'Homologation avant l'appel, y compris si le provider echoue et provoque un repli.
- L'export n'est disponible qu'apres finalisation. Une carte `unknown`, `unavailable` ou `ambiguous` produit une reponse incompatible qui nomme les cartes concernees.

## Limites et validations humaines ouvertes

- Le runtime local execute et valide est Node 22, alors que le depot cible Node 24 LTS. La CI Node 24 doit confirmer la portabilite.
- Le serveur web monte actuellement le store fichier atomique. Le schema et l'adapter Supabase existent, mais le gateway de production doit etre branche et valide avant de promettre une durabilite multi-instance.
- La presence connecte/deconnecte n'est pas detectee. Ce choix ne bloque pas le draft : aucun humain n'est remplace et le groupe abandonne/recommence via Discord.
- Le test de performance execute est celui du moteur existant. Le profil Multi de 100 Sessions et son p95 de convergence restent a mesurer.
- Le corpus aveugle d'au moins vingt pools et les jugements de deux relecteurs sur la pertinence du nouveau Coach ne sont pas encore constitues.
- Le test chronometre de comprehension des explications en moins de 30 secondes reste a conduire par un reviewer.
- Une liste compatible doit encore etre collee dans le client Magic Arena courant ; Deck et Sideboard reconstruits doivent etre consignes ici.
- La recette amicale a quatre participants et la revue Standards + Spec/CI restent a effectuer.

## Approbations reservees au reviewer

| Validation | Critere | Statut |
| --- | --- | --- |
| Pertinence Coach | Au moins 80 % des pools juges au moins aussi pertinents que l'ancien constructeur, aucune erreur critique | A faire |
| Lisibilite | Plan, couleurs, une force et un risque identifies en moins de 30 secondes | A faire |
| Import Arena | Import sans correction d'un export compatible, Deck 40 et Sideboard identiques | A faire |
| Soiree amicale | Au moins quatre participants, appareils et Snapshot consignes | A faire |
| Livraison | CI Node 24, revue Standards + Spec et approbation humaine | A faire |
