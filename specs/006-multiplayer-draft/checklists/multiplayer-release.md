# Requirements Quality Checklist: Draft multijoueur et Coach final

**Purpose**: Verifier avant implementation que les exigences couvrent sans ambiguite les risques de concurrence, reprise, confidentialite, legalite et export de la feature.
**Created**: 2026-09-13
**Feature**: [spec.md](../spec.md)

**Note**: Cette checklist est generee par `$speckit-checklist` a partir de la specification, du plan et des contrats de la feature.
**Review Ownership**: Cette checklist appartient au reviewer. Une case ne peut etre cochee que lorsque le reviewer juge le critere de qualite des exigences satisfait.
**Marker Semantics**: `[x]` signifie que le critere a ete relu et satisfait pour la qualite des exigences ; cela ne signifie pas que l'implementation est terminee.

## Salon, concurrence et cycle de vie

- [ ] CHK001 Les exigences definissent-elles une autorite unique et observable pour le Salon global, y compris lorsqu'une ancienne session est encore en deckbuilding ? [Spec §FR-002, §FR-031]
- [ ] CHK002 Les regles de choix et de verrouillage du cube couvrent-elles le depart du premier entrant, le retour a un salon vide et les arrivees concurrentes ? [Spec §FR-036, §FR-037; Edge Cases]
- [ ] CHK003 La transition du dernier accord vers une seule session verrouillee est-elle exprimee comme atomique et testable face aux confirmations ou departs simultanes ? [Spec §FR-006–FR-008; §SC-001–SC-003]
- [ ] CHK004 Les exigences distinguent-elles clairement la presence, l'etat pret, la composition confirmee et l'attribution definitive des huit sieges ? [Spec §FR-004–FR-009]
- [ ] CHK005 Le moment exact ou le Salon global redevient disponible est-il coherent entre la fin du 45e Tour, l'abandon et les ateliers encore actifs ? [Spec §FR-031, §FR-032; Edge Cases]

## Tours, idempotence et reprise

- [ ] CHK006 Les exigences interdisent-elles sans exception minuteur, choix par defaut et remplacement d'un humain deconnecte, y compris apres 24 heures ? [Spec §FR-010, §FR-013, §FR-032; §SC-005]
- [ ] CHK007 Les comportements de deux picks concurrents, d'une commande repetee et d'un conflit de revision sont-ils suffisamment observables pour demontrer un seul choix immuable ? [Spec §FR-015–FR-017; Edge Cases; §SC-003]
- [ ] CHK008 Les exigences de persistance nomment-elles tous les etats a reconstruire apres redemarrage : salon, composition, Tour, choix, pools et deckbuilding ? [Spec §FR-016; §SC-004]
- [ ] CHK009 La frontiere entre decision des bots et attente des humains garantit-elle que le passage collectif n'arrive qu'apres huit choix, sans modifier la politique bot existante ? [Spec §FR-010–FR-012, §FR-038]
- [ ] CHK010 La confidentialite pendant le draft couvre-t-elle les reponses HTTP, les erreurs, les vues d'attente et les journaux, et pas seulement l'ecran principal ? [Spec §FR-014, §FR-035, §FR-039; Gap: canaux d'erreur et observabilite]

## Acces de reprise et securite

- [ ] CHK011 Le contrat de l'Acces de reprise precise-t-il son unicite par siege, sa conservation locale, son transfert et l'absence d'autorisation par pseudo ? [Spec §FR-017, §FR-034, §FR-035, §SC-012]
- [ ] CHK012 Les exigences couvrent-elles explicitement la rotation ou l'invalidation d'un acces compromis et la retention des sessions au-dela du minimum de 24 heures ? [Gap: cycle de vie du secret et duree de retention]
- [ ] CHK013 L'abandon definitif interdit-il toute reprise ou nouvelle mutation de l'ancienne session tout en conservant une preuve auditable de ses faits confirmes ? [Spec §FR-032; User Story 4, scenario 4]

## Coach final partage

- [ ] CHK014 La mission du Coach distingue-t-elle sans ambiguite les contraintes locales obligatoires des recommandations strategiques produites par Gemini, DeepSeek ou le repli ? [Spec §FR-019–FR-025, §FR-033; Contract final-deck-coach]
- [ ] CHK015 Les exigences definissent-elles une liste legale de 40 cartes en tenant compte des exemplaires, terrains draftes, terrains de base illimites, MDFC et sources de mana ? [Spec §FR-018–FR-020, §SC-006]
- [ ] CHK016 La pertinence attendue est-elle mesurable sur un corpus versionne avec protocole de comparaison, criteres d'erreur critique et responsabilite des relecteurs experts ? [Spec §SC-007; Gap: constitution et version du corpus]
- [ ] CHK017 Le repli local est-il exige comme deterministe, legal, explique et disponible pour les modes Solo et Multi sans appel externe pendant les picks ? [Spec §FR-023–FR-025, §FR-038, §FR-041]
- [ ] CHK018 Le retrait irreversible de l'Homologation solo est-il situe avant toute divulgation de recommandation et couvert pour reprise, erreur externe et nouvel essai ? [Spec §FR-040; User Story 5, scenario 8]
- [ ] CHK019 La minimisation des donnees externes exclut-elle identite, secret et cartes adverses et exige-t-elle une validation locale des identifiants de cartes renvoyes ? [Spec §FR-024, §FR-025, §FR-039; Contract final-deck-coach]

## Export et experience utilisateur

- [ ] CHK020 Le contrat MTGA definit-il clairement la source unique qu'est la derniere Liste finale validee, le regroupement des quantites et la reserve exhaustive ? [Spec §FR-026, §FR-027; Contract mtga-export]
- [ ] CHK021 Les cas de cartes Arena inconnues, ambigues, a plusieurs impressions ou a faces alternatives ont-ils un resultat utilisateur explicite et testable avant copie ou telechargement ? [Spec §FR-028; Edge Cases]
- [ ] CHK022 Les exigences de 360 px et clavier couvrent-elles les cinq actions critiques, les etats d'attente/deconnexion et l'affichage confidentiel du code de reprise ? [Spec §FR-029, §FR-034; §SC-010]
- [ ] CHK023 Les criteres de latence precisent-ils l'environnement et le point de mesure pour l'affichage du premier booster et la convergence par polling ? [Spec §SC-002; Plan §Technical Context; Gap: profil de charge]
- [ ] CHK024 Le test utilisateur amical definit-il les conditions de succes, le Snapshot, le nombre de navigateurs/appareils et la facon de consigner l'aide exterieure ? [Spec §SC-011; Gap: protocole de recette]

## Notes

- Marquer `[x]` uniquement apres revue humaine du critere de qualite des exigences.
- Laisser une case ouverte lorsqu'une clarification, une correction ou une preuve de revue manque.
- `$speckit-implement` lit cet etat comme une gate et ne doit pas modifier les marqueurs.
- `checklists/requirements.md` conserve son cycle de vie distinct gere par `$speckit-specify` et `$speckit-clarify`.
- Ajouter les conclusions ou liens de preuve directement sous l'item concerne.
