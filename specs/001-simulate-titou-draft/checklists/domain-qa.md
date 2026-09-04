# Checklist QA du domaine : Simuler un draft Titou reproductible

**Objectif** : Évaluer si les exigences et la conception sont complètes, sans ambiguïté, mesurables et suffisamment auditables avant de définir les tâches ou de commencer l’implémentation.
**Créée le** : 2026-09-02
**Fonctionnalité** : [spec.md](../spec.md)

**Note** : Cette checklist personnalisée est générée par la commande `$speckit-checklist` à partir du contexte et des exigences de la fonctionnalité.
**Responsabilité de la revue** : Cette checklist appartient au relecteur humain. Un critère ne doit être coché `[x]` que lorsque ce relecteur juge que la qualité des exigences correspondantes est satisfaisante.
**Sens des cases** : `[x]` signifie que le critère de qualité des exigences a été examiné et satisfait. Cela ne signifie pas que l’implémentation est terminée.

## Exhaustivité du périmètre et des acteurs

- [x] CHK001 Le contributeur, l’appelant, le siège pilotable, les sièges automatisés et les acteurs futurs hors périmètre sont-ils distingués assez clairement pour éviter une confusion des responsabilités entre le moteur et ses adaptateurs ? [Exhaustivité, Spec §User Stories, §FR-006, §FR-018]
- [x] CHK002 Le périmètre du premier livrable inclut-il explicitement l’import, la validation, la simulation, le rejeu, le rapport et la ligne de commande, tout en excluant les fonctionnalités prévues pour plus tard ? [Couverture, Spec §FR-001–FR-018]
- [x] CHK003 La remise à zéro et la suppression de l’ancien code sont-elles clairement identifiées comme un prérequis distinct, sans travail caché dans cette fonctionnalité ? [Dépendance, Plan §Structure Decision, Recherche §Greenfield sequencing]
- [x] CHK004 Est-il sans ambiguïté que la commande automatise les huit sièges, tandis que l’interface du moteur n’autorise des choix explicites que pour le siège 0 ? [Clarté, Spec §Clarifications, §FR-006, §FR-010]

## Clarté des règles du draft

- [x] CHK005 La numérotation des sièges, l’orientation de la table, les formules gauche/droite, l’ordre des paquets, le nombre de choix et le moment des passages sont-ils cohérents entre les exigences et les contrats ? [Cohérence, Spec §FR-006–FR-008, Modèle de données §Identity conventions, Contrat §Rotation]
- [x] CHK006 Un Tour de draft est-il explicitement défini comme huit décisions appliquées ensemble, intégralement ou pas du tout, sans possibilité de tour partiellement appliqué ? [Clarté, CONTEXT §Draft Sessions, Contrat §SubmitPickRound]
- [x] CHK007 Les transitions entre paquets, notamment l’absence de passage après le quinzième choix, sont-elles précisées pour les trois paquets ? [Couverture, Modèle de données §Booster, Contrat §SubmitPickRound]
- [x] CHK008 Les nombres finaux du snapshot initial sont-ils cohérents entre eux : 24 boosters, 45 tours, 360 choix, 45 cartes par siège et 185 instances inutilisées ? [Cohérence, Spec §FR-007, §FR-015, §SC-001, §SC-003]

## Données du cube et identité des cartes

- [x] CHK009 La distinction entre clé du cube, version du cube, identité du snapshot, exemplaire physique, identité d’impression, identité Oracle et nom de carte est-elle explicite partout où une identité est utilisée ? [Clarté, Spec §Key Entities, Modèle de données §Identity conventions]
- [x] CHK010 Les exigences préservent-elles explicitement les impressions répétées légitimes et rejettent-elles uniquement les identifiants d’instance en double ? [Cohérence, Spec §FR-002, §Edge Cases, Modèle de données §CardInstance]
- [x] CHK011 La règle d’attribution de `AAAA-MM-JJ.N`, fondée sur la date de révision de la source, couvre-t-elle les révisions multiples le même jour et les réimports sans changement ? [Exhaustivité, Spec §FR-001, Contrat CLI §Import a cube revision]
- [x] CHK012 Les informations de la source initiale — 545 entrées de la liste principale, exclusion des terrains de base séparés, absence de liste de cartes envisagées, révision 64, horodatage historique et identifiants CubeCobra — sont-elles cohérentes dans tous les documents ? [Cohérence, Recherche §Cube snapshot and provenance, Schéma du snapshot]
- [x] CHK013 Les exigences de mention des sources, d’autorisation de redistribution, de limitation des données conservées et d’avertissement sur le caractère non officiel du projet sont-elles suffisantes pour un dépôt public ? [Dépendance, Lacune potentielle, Recherche §Attribution and data minimization]
- [x] CHK014 Le contenu normalisé servant au calcul de l’empreinte est-il défini assez précisément pour qu’une seconde implémentation conforme inclue et exclue les mêmes champs, sous la même représentation ? [Ambiguïté, Plan §Technical Context, Recherche §Validation and integrity]

## Déterminisme et gestion des versions

- [x] CHK015 Toutes les entrées qui déterminent la reproductibilité fonctionnelle sont-elles énumérées : snapshot du cube, seed, moteur, politique de choix, générateur pseudo-aléatoire, convention de dérivation, configuration et décisions explicites ? [Exhaustivité, Spec §FR-005, §FR-011, §FR-019]
- [x] CHK016 Le contenu fonctionnel comparé et haché exclut-il sans ambiguïté uniquement l’identité de session, les horodatages et le digest du rapport lui-même, tout en conservant toutes les versions susceptibles d’influencer le comportement ? [Clarté, Spec §FR-011, §Assumptions, Contrat §Report contract ; exclusion du digest validée par l’utilisateur le 2026-09-03]
- [x] CHK017 Les règles de changement de version sont-elles documentées pour les modifications de l’ordre de distribution, de la dérivation des seeds, de la consommation de nombres aléatoires, des règles de draft, du schéma d’événements ou des politiques de choix ? [Lacune potentielle, Recherche §Seeded randomness and replay]
- [x] CHK018 L’indépendance entre le flux aléatoire de distribution et ceux des différents sièges est-elle spécifiée comme une exigence durable, et pas seulement comme une préférence d’implémentation ? [Cohérence, Plan §Summary, Recherche §Seeded randomness and replay]
- [x] CHK019 La différence entre une nouvelle simulation à partir des mêmes entrées fonctionnelles et un rejeu fondé uniquement sur les événements du journal est-elle explicite et testable ? [Clarté, Spec §User Story 2, Recherche §Report and journal]

## Exhaustivité de l’audit et des événements

- [x] CHK020 Tous les types d’événements, champs obligatoires, règles d’ordre et règles de numérotation sont-ils documentés sans lacune ? [Exhaustivité, Spec §FR-012–FR-014, Modèle de données §DraftEvent]
- [x] CHK021 Est-il précisé si les huit événements `CardPicked` d’un tour partagent le même horodatage et comment l’ordre chronologique s’articule avec la séquence des événements ? [Ambiguïté, Modèle de données §PickRound and SeatDecision, §DraftEvent]
- [x] CHK022 Les exigences du rapport permettent-elles de rattacher chacune des 545 instances du snapshot initial à exactement un lot final de cartes choisies ou à la collection inutilisée ? [Couverture, Spec §User Story 3, §SC-003]
- [x] CHK023 Les noms des invariants finaux, leur signification et la représentation de leur réussite ou de leur échec sont-ils suffisamment définis pour les outils indépendants qui exploiteront le rapport ? [Lacune potentielle, Spec §FR-014, Modèle de données §DraftReport]

## Couverture des erreurs et de l’atomicité

- [x] CHK024 Des exigences couvrent-elles chaque scénario invalide de snapshot, de démarrage, de tour, de politique de choix, de rejeu et de rapport répertorié dans le modèle d’erreurs ? [Couverture, Spec §Edge Cases, Modèle de données §Error model]
- [x] CHK025 L’expression « état inchangé après rejet » couvre-t-elle explicitement la révision, le journal, les boosters, les lots de cartes choisies, la position dans le draft et l’orchestration des politiques de choix ? [Clarté, Spec §FR-009, §SC-004, Contrat §SubmitPickRound]
- [x] CHK026 Un ordre de priorité déterministe est-il spécifié lorsque plusieurs erreurs coexistent : révision périmée, mauvaise session, siège manquant ou répété, appelant non autorisé, carte illégale ? [Lacune potentielle, Modèle de données §Error model]
- [x] CHK027 Les exigences relatives à la récupération externe, aux réponses mal formées, au système de fichiers, à la sortie standard et aux imports interrompus sont-elles documentées sans les assimiler à des transitions du domaine ? [Couverture, Contrat CLI §Import a cube revision, §Exit codes]

## Critères d’acceptation et qualité non fonctionnelle

- [x] CHK028 Chaque critère de réussite peut-il être évalué à partir d’un scénario, d’un livrable ou d’une mesure identifiés, sans interprétation subjective ? [Mesurabilité, Spec §Success Criteria]
- [x] CHK029 Le « poste de développement pris en charge » utilisé pour le budget de deux secondes est-il défini avec un environnement stable et une méthode de mesure précise ? [Ambiguïté, Spec §SC-006, Guide de démarrage §Performance]
- [x] CHK030 Les exigences hors ligne sont-elles explicites pour la validation, la simulation, le rejeu et les tests, avec un accès réseau limité à la récupération manuelle des données ? [Cohérence, Spec §FR-017, Contrat CLI]
- [x] CHK031 Les exigences de confidentialité et de limitation des informations produites sont-elles adaptées aux identifiants de session, seeds, chemins locaux, variables d’environnement et données externes ? [Couverture, Contrat CLI §Exit codes]
- [x] CHK032 L’usage des pourcentages de couverture comme indicateurs, tout en exigeant une couverture intentionnelle de chaque invariant et branche, est-il cohérent entre la constitution, le plan et les preuves d’acceptation attendues ? [Cohérence, Constitution §II, Plan §Constitution Check, Guide de démarrage §Quality gate]
- [x] CHK033 Les exclusions explicites de Lighthouse, du mobile, de l’accessibilité et de la QA visuelle pour cette fonctionnalité uniquement en ligne de commande sont-elles documentées sans affaiblir ces contrôles pour les futures interfaces ? [Périmètre, Plan §Constitution Check]

## Traçabilité et préparation de la revue

- [x] CHK034 Chaque exigence fonctionnelle correspond-elle à au moins un scénario d’acceptation, une règle contractuelle ou un résultat mesurable ? [Traçabilité, Spec §FR-001–FR-019]
- [x] CHK035 Les preuves attendues — drafts de référence, séquences aléatoires de référence, tests par propriétés, contrats, intégration, rejeu, ligne de commande et performance — sont-elles reliées aux risques qu’elles réduisent ? [Traçabilité, Plan §Delivery and Test Sequence]
- [x] CHK036 Toutes les dépendances externes et leurs règles de verrouillage de version ou de compatibilité sont-elles documentées, y compris la raison du maintien de TypeScript 6 pendant la transition vers TypeScript 7 ? [Dépendance, Plan §Technical Context, Recherche §TypeScript runtime and tooling]
- [x] CHK037 L’approbation humaine, la revue Standards + Spec, le blocage en cas de contrôle en échec et l’interdiction pour l’agent de fusionner lui-même ses changements sont-ils explicites pour cette fonctionnalité ? [Gouvernance, Constitution §IV, Plan §Constitution Check]

## Approbation humaine

Le 2026-09-03, l’utilisateur a approuvé cette checklist dans la conversation : « ok, j'ai regardé, ça semble correct, on peut passer cette étape ». Les 37 cases sont cochées pour enregistrer cette approbation, et non une auto-évaluation de l’agent ni une validation de l’implémentation.

## Notes

- Ne cocher `[x]` qu’après confirmation, par le relecteur, de la qualité des exigences concernées.
- Laisser les critères non cochés tant qu’ils nécessitent une clarification, une correction ou une évaluation humaine.
- `$speckit-implement` utilise l’état des cases comme condition de passage et ne doit pas les modifier.
- `checklists/requirements.md` suit un cycle distinct, géré par `$speckit-specify` et `$speckit-clarify`.
- Ajouter les observations du relecteur sous le critère concerné et les relier aux corrections.
- Les critères CHK013, CHK014, CHK017, CHK021, CHK023, CHK026 et CHK029 signalent volontairement des points de vigilance ; ils ne constituent pas des échecs présumés.
- Les titres de sections cités après le symbole § et les identifiants techniques conservent leur forme originale pour faciliter leur recherche dans les documents sources.
