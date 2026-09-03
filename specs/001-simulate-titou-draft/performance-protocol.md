# Protocole de performance — SC-006

Protocole approuvé par l’utilisateur le 2026-09-03. Aucun benchmark n’a encore été exécuté : ce document définit la validation à implémenter, pas un résultat.

## Poste de référence

Configuration relevée en lecture seule le 2026-09-03, sans nom de machine ni identifiant matériel :

| Élément | Référence |
|---|---|
| Processeur | AMD Ryzen 7 7800X3D, 8 cœurs, 16 processeurs logiques |
| Mémoire utilisable rapportée par Windows | 31,1 Gio |
| Système | Windows 11 Home, 64 bits, version 10.0.26100, build 26100 |
| Runtime requis | Node.js 24 LTS ; version corrective exacte à consigner lors de chaque mesure |
| Runtime observé, non conforme au protocole | Node.js 22.16.0, npm 10.9.2 |

Le changement de runtime reste une étape d’installation à venir. Une exécution sous Node 22 ne valide pas SC-006. Documenter toute évolution de l’environnement ; ne pas substituer silencieusement une autre machine à la référence.

## Entrées et préparation

- Commande prévue : `npm run test:performance`, suite isolée dans `tests/integration/performance.test.ts`.
- Snapshot : `data/cubes/titou_tribal/2026-02-24.1.json`, 545 instances ; seed `42`, configuration 8 sièges × 3 boosters × 15 cartes et politique aléatoire seedée sur les huit sièges.
- Dépendances issues du lockfile. Consigner la révision du code, les versions moteur/politiques/RNG, le digest du snapshot et les versions exactes Node/npm.
- Charger les modules et le snapshot, valider ce dernier, préparer les entrées d’identité/temps avant les mesures. Ne pas préparer les boosters ou les choix à l’avance.
- Exécuter la suite seule, sans couverture, débogueur, mode watch ou autres suites concurrentes ; éviter les charges lourdes et consigner les perturbations observées. Ne pas modifier automatiquement les paramètres du système.

## Mesure

Dans un même processus, effectuer trois simulations d’échauffement non retenues, puis cinq simulations mesurées, séquentiellement. Chaque passage repart d’une session et d’états RNG/politiques neufs avec les mêmes entrées fonctionnelles ; aucun résultat d’un passage précédent ne peut être réutilisé.

Utiliser une horloge monotone. Démarrer juste avant la création du draft ; arrêter lorsque la simulation complète, le rapport autonome, ses contrôles d’invariants, son empreinte, sa sérialisation JSON et la préparation de sa sortie UTF-8 avec saut de ligne sont terminés. Les copies et validations internes au moteur restent incluses.

Sont exclus : lancement de npm/Node, imports initiaux, chargement/validation préalable du fichier snapshot, préparation des identifiants/horodatages injectés, écritures stdout/disque et assertions du banc de test après mesure. Le parcours CLI réel, notamment démarrage et écriture du JSON, reste vérifié séparément en E2E, sans lui attribuer ce seuil.

## Verdict et preuves

Chaque passage doit produire un résultat correct : 360 choix, huit pools de 45 cartes, 185 inutilisées, invariants valides et empreinte conforme à la référence. Un échauffement ou une mesure fonctionnellement incorrects invalident l’essai.

SC-006 passe uniquement si les cinq durées sont chacune strictement inférieures à 2 000 ms. Une durée égale ou supérieure échoue ; moyenne ou médiane ne peuvent pas remplacer cette condition. Conserver les cinq valeurs et le maximum. Ne pas supprimer une valeur lente ou relancer automatiquement jusqu’à obtenir un succès ; conserver les essais échoués et expliquer une éventuelle nouvelle mesure.

Enregistrer dans `qa-evidence.md` la date, la commande, les entrées/versions, l’environnement, les durées, le verdict et toute perturbation. Aucun résultat n’est prérempli ici. Le test doit aussi vérifier sa propre règle de seuil avec des durées contrôlées, notamment 1 999, 2 000 et 2 001 ms.

## CI et limites

La CI exécute le même protocole dans un job isolé et publie ses mesures avec les caractéristiques du runner. Ses résultats ne sont pas présentés comme ceux du poste de référence. Un contrôle requis en échec reste bloquant ; aucun `continue-on-error` ne doit masquer une régression. La validation finale de SC-006 requiert les preuves sur le poste de référence pour la révision livrée.

Ce budget concerne le snapshot initial et le moteur à chaud. Les autres tailles valides restent couvertes fonctionnellement ; le protocole ne promet pas deux secondes pour un cube arbitrairement grand ni pour le démarrage à froid de la CLI.
