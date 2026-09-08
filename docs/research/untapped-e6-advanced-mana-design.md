# E6 — Modélisation avancée du mana & fixing hors échantillon

_Date : 4 septembre 2026. Cette note définit l'expérience E6 sous le protocole de calibration de DraftMaster._

## 1. Contexte et motivation

L'analyse des pires erreurs de l'expérience E5 sur le draft témoin (`d555b02d-3745-4a4f-b1b6-fdc75c38c5c0`) a révélé que **4 des 5 plus grands résidus** étaient dus à des lacunes d'encodage du mana :

1. **`Misty Rainforest` (P1P3, erreur +27,7 pts)** : le fetchland vert/bleu a `produced_mana: []` et `color_identity: []`. Il était traité comme un terrain incolore neutre (affinité 100 %) alors que le pool du joueur était Rouge/Blanc. Untapped lui attribuait 15,8 (contre 43,5 prédit).
2. **`Hallowed Fountain` (P1P4, erreur +17,7 pts)** : terrain bicolore Blanc/Bleu surévalué dans un pool Rouge/Blanc/Noir sans bleu.
3. **`Teferi, Hero of Dominaria` (P1P5, erreur +17,3 pts)** : sort bicolore Blanc/Bleu insuffisamment pénalisé alors que le bleu est absent du pool.
4. **`Figure of Destiny` (P1P3, erreur -16,9 pts)** : coût en mana hybride `{R/W}` sous-évalué alors qu'il s'adapte parfaitement à un début de draft Rouge/Blanc.

Les hypothèses **H2** (un modèle bicolore strict est trop pauvre, le témoin est Esper) et **H3** (les terrains doivent être évalués sur leurs sources réelles et les fetchlands doivent être décodés) sont directement ciblées par E6.

## 2. Question falsifiable

Une représentation enrichie du mana — intégrant :
- la détection sémantique des **fetchlands** (analyse de l'oracle text pour identifier les couleurs cherchées),
- la flexibilité du **mana hybride**,
- un **profil de couleurs continu** à 5 dimensions (autorisant les stratégies 2 couleurs + splash et tricolores),
- une pénalisation explicite des terrains bicolores/fetchlands dont aucune couleur ne correspond au pool,

améliore-t-elle la MAE et la concordance Top 1 sur le draft témoin sans fuite d'information ?

## 3. Définition des nouvelles composantes de mana

### A. Détection des fetchlands et sources produites effectives
Pour tout terrain sans `produced_mana` explicite :
- Si `oracle_text` contient `Search your library for a [Type1] or [Type2] card` : les types de terrains de base (`Plains`, `Island`, `Swamp`, `Mountain`, `Forest`) sont convertis en leurs couleurs respectives `['W', 'U', 'B', 'R', 'G']`.
- Si `oracle_text` contient `Search your library for a basic land card` (ex: `Fabled Passage`) : le terrain est reconnu comme fixeur universel (`['W', 'U', 'B', 'R', 'G']`).
- Pour les terrains bicolores réguliers (ex: shocklands, verges, fastlands) : `produced_mana` ou `color_identity` fournit les 2 couleurs produites.

### B. Profil de couleurs continu du pool (Pt)
Pour chaque couleur $c \in \{W, U, B, R, G\}$, on calcule le poids total des cartes du pool contenant $c$ (pondéré par leur `staticScore`).
Les poids sont normalisés :
$$p_c = \frac{\text{weight}(c)}{\sum_{k} \text{weight}(k)}$$
Ce vecteur $(p_W, p_U, p_B, p_R, p_G)$ permet d'identifier :
- Les couleurs principales ($p_c \ge 0.20$),
- La présence d'une 3ème couleur de splash ($p_c \ge 0.10$),
- L'entropie/dispersion des couleurs du pool.

### C. Affinité et pénalités de sorts
- **Mana hybride** : pour un coût `{X/Y}`, la contribution de couleur est $\max(p_X, p_Y)$ au lieu de la moyenne restrictive.
- **Pénalité hors-couleur ciblée** : pénalité proportionnelle aux symboles colorés stricts manquants dans le pool.

### D. Adéquation des terrains (*Land Fit & Miss*)
- Un terrain produisant ou cherchant des couleurs $C$ a une adéquation :
$$\text{landAffinity} = \max_{c \in C}(p_c) + 0.5 \times \text{secondMax}_{c \in C}(p_c)$$
- Si $\sum_{c \in C} p_c < 0.05$ (terrain totalement étranger au pool, ex: `Misty Rainforest` dans un pool RW), le terrain subit un malus franc proportionnel au `commitment`.

## 4. Protocole anti-fuite

- **Train set** : 20 drafts d'apprentissage (7 193 positions numériques).
- **Validation croisée** : *leave-one-draft-out* sur les 20 drafts pour choisir $\lambda$ (régularisation Ridge) et les hyperparamètres de mana.
- **Draft témoin** : fermé jusqu'au calcul des métriques finales.
- **Non-régression P1P1** : à $t=1$, pool vide, tous les deltas de mana et d'affinité sont nuls $\implies dynamicScore === staticScore$.
