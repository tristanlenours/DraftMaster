# Feature Specification: Pertinence des cartes remplaçantes

**Feature Branch**: `codex/audit-card-replacement-relevance`

**Issue**: [#77](https://github.com/tristanlenours/DraftMaster/issues/77)

**Created**: 2026-09-20

**Status**: Ready for delivery review

## Intent

Le propriétaire d'un cube doit recevoir une liste courte de changements crédibles et une
veille récente utile, sans devoir éliminer manuellement des cartes hors thème, hors format ou
nettement moins fortes que les meilleures options disponibles.

## User stories et critères observables

### P1 — Préserver l'identité du cube

1. Une carte tribale de Titou Tribal n'est remplacée que par une carte partageant une tribu
   déclarée, un changelin ou une glue tribale universelle compatible.
2. La règle couvre les créatures et les cartes non-créature qui nomment explicitement une tribu.
3. Les restrictions Pauper/Peasant, les couleurs, la production de mana des terrains, les types
   structurants, les sous-types spécialisés et les fonctions Oracle restent compatibles.

### P1 — Classer par pertinence avant la récence

1. Aucune suggestion publiée n'a un score de puissance inférieur à 25/55.
2. Une candidate doit améliorer sa cible d'au moins 5 points.
3. La récence apporte au plus 6 points ; elle ne permet pas à une découverte d'évincer une carte
   établie dont le score composite non direct est supérieur de plus de 6 points.
4. La récence utilise une fenêtre glissante de trois ans ancrée sur la dernière année présente
   dans les métadonnées, et non une année codée en dur.

### P1 — Produire une veille courte et explicable

1. La maybeboard contient au plus 30 cartes.
2. Jusqu'à un tiers des places peut accueillir des nouveautés compétitives hors remplacements
   directs ; les places inutilisées reviennent aux meilleurs candidats.
3. Chaque recommandation expose le score de classement et les bonus matériels appliqués.
4. Chaque rapport expose version moteur, snapshot, empreintes des sources, couverture et fenêtre
   de récence.

## Hors périmètre et limite connue

L'ingestion des 358 cartes du benchmark Titou absentes du catalogue n'appartient pas à cette
livraison. Le rapport rend ce manque visible ; une carte non ingérée ne peut pas être suggérée.
La feature réduit les faux positifs et les oublis dans le corpus disponible, sans promettre un
rappel exhaustif au-delà de ce corpus.
