# Research: Coaching Pédagogique et Bots Personnalisés Amis

**Date**: 2026-09-04

> **Statut de l'analyse Untapped — remplacé pour la calibration.** Les affirmations quantitatives et la formule de la section 1 étaient des hypothèses initiales, pas une distillation validée. Le benchmark tenu à l'écart, les résultats reproductibles, les contre-exemples et le registre d'hypothèses font désormais autorité dans [`docs/research/untapped-random-draft-calibration.md`](../../docs/research/untapped-random-draft-calibration.md). Cette section est conservée pour la traçabilité de la décision initiale et ne doit pas servir à justifier une nouvelle règle de score.

## 1. Distillation mathématique du score dynamique (Draftsmith / Untapped.gg)

**Décision** : Modéliser le score dynamique sous forme d'une fonction mathématique déterministe et explicable combinant puissance brute (`staticScore`), facteur d'engagement progressif (_commitment_), affinité de couleur, et bonus de fixation de mana (bilands et fetchlands).

**Preuve et données de calibration** :
L'analyse approfondie de 10 080 évaluations réelles issues de l'application Untapped.gg Companion ([data/untapped_history/drafts_backup.json](file:///e:/SecondBrain/DraftMaster/data/untapped_history/drafts_backup.json)) a permis de mesurer empiriquement les invariants suivants :

- **Au Pack 1 Pick 1 ($t=1$)** : le score dynamique est strictement égal au score statique dans 100 % des cas (315 cartes testées, 0 écart).
- **Au cours du draft** : 81.3 % des cartes subissent une décote due à la divergence de couleur, tandis que 14.2 % reçoivent un bonus (notamment les terrains bicolores et fixeurs).
- **Courbe d'engagement (_commitment_)** :
  - Au P1P1 : $Commitment = 0.0$
  - Au P1P5 : $Commitment \approx 0.35$ (pénalité hors-couleur moyenne de 35 %)
  - Au P2P1 : $Commitment \approx 0.65$
  - Au P3P1 : $Commitment \approx 0.85$
  - Au P3P15 : $Commitment \approx 0.95$

**Formule retenue** :
$$\text{DynamicScore}(c) = \text{StaticScore}(c) \times \text{Affinité}(c) + \text{BonusMana}(c) + \text{BonusCourbe}(c) + \text{BonusSynergie}(c)$$

---

## 2. Profils de personnalité des amis du groupe Magic

**Décision** : Modéliser explicitement les 7 joueurs du groupe régulier documentés dans `perso/02_culture/04_magic/01_notes_et_formats/groupe-de-jeu-cubes.md` sous forme de profils de bots (`FriendProfile`).

**Inventaire et modélisation des profils** :

1. **Nico (@Fedor007)** : Niveau Élite / Spike impitoyable. Température Softmax $T=0.8$ (très faible dispersion). Discipline de couleur stricte (+1.25), priorise le tempo, les contresorts et les removals légers (+3.0 pts).
2. **Cédric (@Strobinellus)** : Niveau Élite / « Meilleur joueur de sa génération ». Température $T=0.9$. Passionné par la régularité et la value, favorise les moteurs 2-pour-1 (+3.0 pts) et la courbe basse (+2.5 pts sur CMC 1-3).
3. **Hugues (Huge)** : Niveau Ambitieux / « Turbo Rien / Johnny osé ». Température $T=1.6$. Attiré par les dispositifs complexes, sagas, artefacts et interactions atypiques (+4.0 pts sur les moteurs exotiques), reste ouvert plus longtemps (discipline 0.75).
4. **Rémi** : Niveau Moyen / « Maître des rouxelettes ». Température $T=2.0$. Plus forte variance, opportuniste, capable de pivots inattendus.
5. **Papayou (@Papayou)** : Niveau Moyen / Amateur de High-Power. Température $T=1.7$. Attiré par les bombes légendaires imposantes (+3.5 pts) et les plays explosifs.
6. **Ivan** : Niveau Moyen / « Timmy archétypal ». Température $T=1.5$. Attiré par les monstres colossaux (+4.5 pts sur CMC $\ge 5$) et les accélérateurs de mana vert (+3.0 pts).
7. **Titou (Tristan / @eltitou007)** : Niveau Élite / « Architecte tribal & chromatique ». Température $T=1.0$. Favorise les synergies de types de créatures et les seigneurs (+3.5 pts).

---

## 3. Choix probabiliste et Déterminisme strict (Constitution Principe III)

**Décision** : Le tirage de cartes par les bots utilise la loi de Boltzmann (Softmax) avec température $T$ :
$$P(c_i) = \frac{\exp((S_i - S_{\max}) / T)}{\sum_j \exp((S_j - S_{\max}) / T)}$$
Le tirage pseudo-aléatoire est opéré par `xoroshiro128plus` et `uniformInt` de `pure-rand`, alimenté par le flux de graine dérivé propre au siège (`policy:seat:X`).

**Garantie constitutionnelle** : À graine identique, l'ensemble des 45 tours des 7 bots produit **strictement la même séquence de choix**, ce qui garantit la reproductibilité intégrale du Journal de draft et de l'Auditabilité.

---

## 4. Générateur d'Explications Pédagogiques en Français

**Décision** : Remplacer l'affichage opaque d'un simple nombre par une synthèse pédagogique en langage naturel français.

- **Top 1 Recommandé** : met en avant la stabilité de mana s'il s'agit d'un terrain, ou l'ancrage stratégique s'il s'agit d'une bombe dans les couleurs.
- **Alerte piège** : prévient explicitement quand une carte individuellement très forte subit une lourde pénalité car hors des couleurs du joueur.
- **Alternatives viables** : valorise les cartes de consolidation de courbe ou de réserve.
