# 01 — Inventaire Exhaustif du Changelog & des 130 Changements (Déc. 2024 – 18 Nov. 2026)

> [!IMPORTANT]
> **Périmètre vérifié sur CubeCobra (`1nxrs` — *Fedor's candyshop IRL*)** :
> - **Snapshot de référence initial** : 11 décembre 2024 (`730` cartes, `0` doublon).
> - **Session de mise à jour massive** : **17 et 18 novembre 2026** (**45 commits** successifs sur le changelog CubeCobra, représentant **139 opérations** d'ajout/retrait/swap et **48 éditions cosmétiques/catégories**).
> - **Bilan net exact** : **130 cartes retirées** et **130 cartes ajoutées** (**17,8 %** du cube renouvelé), maintenant l'effectif total à **730 cartes exactement** (`White: 93`, `Blue: 93`, `Black: 93`, `Red: 93`, `Green: 93`, `Multicolored: 87`, `Colorless: 85`, `Lands: 93`).

---

## 1. Synthèse Quantitative par Section

| Section | Swaps Nets | CMC Moyen Sortant | CMC Moyen Entrant | Delta CMC | Hits IA (`Maybeboard` / `Upgrades`) | Présence *MTGO Vintage Cube* |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **White** | 17 | 3.65 | 2.47 | -1.18 | 5 / 17 | 13 / 17 |
| **Blue** | 20 | 3.30 | 2.70 | -0.60 | 3 / 20 | 15 / 20 |
| **Black** | 15 | 2.47 | 2.67 | +0.20 | 0 / 15 | 9 / 15 |
| **Red** | 16 | 2.69 | 2.69 | 0.00 | 2 / 16 | 11 / 16 |
| **Green** | 21 | 3.52 | 3.24 | -0.28 | 6 / 21 | 17 / 21 |
| **Multicolored** | 25 | 3.40 | 3.68 | +0.28 | 5 / 25 | 14 / 25 |
| **Lands** | 2 | 4.00 | 0.00 | -4.00 | 0 / 2 | 2 / 2 |
| **Colorless** | 14 | 5.36 | 3.14 | -2.22 | 3 / 14 | 10 / 14 |
| **TOTAL GLOBAL** | **130** | **3.46** | **2.95** | **-0.51** | **24 ajouts (+24 cuts ciblés)** | **91 / 130 (70.0 %)** |

---

## 2. Les 130 Remplacements Nets commentés Poste par Poste

Légende des badges :
- **🤖 IA Maybeboard #X** : Carte présente au rang `#X` de la Maybeboard IA (`cube-upgrade-advisor@5`).
- **🎯 Cible IA Coupée** : La carte retirée par Nico avait été explicitement identifiée par l'IA comme maillon faible à remplacer.
- **🏆 MTGO Vintage** : Carte présente dans la liste de référence *MTGO Vintage Cube* ou *Vintage Cube Archive*.

### 2.1. Section White (17 changements)

| # | Carte Retirée (Out) | CMC / Score | Carte Ajoutée (In) | CMC / Set / Score | Badges (IA & Peer) | Analyse Tactique du Choix |
| :-: | :--- | :---: | :--- | :---: | :--- | :--- |
| 1 | **Kytheon, Hero of Akros** | 1 / 28 (B) | **Guide of Souls** | 1 / `MH3` / 44 | 🤖 **MB #7**<br>🏆 *MTGO* | Upgrade S-Tier (MH3) : passe d'un 2/1 vanille conditionnel au meilleur 1-drop blanc moderne (gain de vie continu pour Ocelot Pride, vol + marqueurs +1/+1 sur l'attaque). |
| 2 | **Qasali Pridemage** | 2 / 20.2 (D+) | **Figure of Fable** | 1 / `ECL` / 16 | 🏆 *MTGO* | Évolution d'un hatebear défensif vers un 1-drop hybride GW ultra-agressif (ECL) qui scale en 2/3, 4/5 puis 7/8 protection multicolore. |
| 3 | **Adanto Vanguard** | 2 / 20 (D+) | **Luminarch Aspirant** | 2 / `ZNR` / 22.7 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA (Adanto) remplacée par un classique proactif distribuant des marqueurs chaque tour sans coûter 4 PV. |
| 4 | **Imposing Sovereign** | 2 / 21.7 (C) | **Spider-Woman, Stunning Savior** | 2 / `SPM` / 29.8 | 🏆 *MTGO* | Strict upgrade (SPM) : pour {1}{W} (ou hybride WU), conserve l'effet d'engagement des artefacts/créatures adverses en gagnant un corps 2/2 Vol + Ward {2}. |
| 5 | **Intrepid Adversary** | 2 / 19 (D+) | **Securitron Squadron** | 2 / `PIP` / 20.1 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA remplacée par un moteur de jetons/marqueurs Fallout (PIP) très explosif avec le fast mana incolore. |
| 6 | **Selfless Spirit** | 2 / 21.3 (C-) | **Spectacular Spider-Man** | 2 / `SPM` / Elo 1245 | — | Upgrade fonctionnel (SPM) : gagne le Flash, peut acquérir le vol pour {1} et son sacrifice donne Hexproof + Indestructible à toute l'équipe. |
| 7 | **Reidane, God of the Worthy** | 3 / 19.1 (D+) | **Agent Bishop, Man in Black** | 3 / `TMT` / Elo 1342 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA remplacée par un double Luminarch Aspirant à 3 manas (TMT) distribuant deux marqueurs +1/+1 à chaque début de combat. |
| 8 | **Force of Virtue** | 4 / 19 (D+) | **Sage of the Skies** | 3 / `TDM` / 42 | 🤖 **MB #11**<br>🏆 *MTGO* | Hit Maybeboard IA #11 (TDM) : remplace une antienne statique par l'une des meilleures menaces blanches récentes (se copie en deux 2/3 vol lifelink dès le 2e sort). |
| 9 | **Steel Seraph** | 6 / 18.1 (D) | **Clarion Conqueror** | 3 / `TDM` / Elo 1200 | — | Remplace un ange générique par un stax-dragon 3/3 vol (TDM) qui coupe les capacités activées d'artefacts, créatures et planeswalkers. |
| 10 | **Angel of Sanctions** | 5 / 23.2 (C+) | **Captain Marvel, Earth's Protector** | 5 / `MSH` / Elo 1337 | — | Modernise le slot 5-drop blanc (MSH) avec le Flash, Vol, Lifelink et un Power-up à {W}{W} le tour où elle arrive. |
| 11 | **Elspeth, Knight-Errant** | 4 / 21.7 (C) | **Elspeth, Storm Slayer** | 5 / `TDM` / 43 | 🤖 **MB #8**<br>🏆 *MTGO* | Hit Maybeboard IA #8 (TDM) : passe de l'Elspeth historique à la version Parallel Lives + jetons + removal à 5 manas. |
| 12 | **March of Otherworldly Light** | 1 / 15 (D-) | **Erode** | 1 / `SOS` / 34 | 🤖 **MB #24**<br>🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Hit Maybeboard IA #24 + Cible IA coupée (SOS) : remplace un exil coûteux en mana/cartes par un removal à 1 mana ultra-flexible. |
| 13 | **Angel of Invention** | 5 / 24.1 (B-) | **Sanguine Evangelist** | 3 / `LCI` / Elo 1352 | 🏆 *MTGO* | Compressse la courbe de 5 à 3 manas (LCI) tout en gardant le thème go-wide (Battle cry + jetons Chauve-souris volants à l'ETB et à la mort). |
| 14 | **Angel of Indemnity** | 6 / 20.7 (C-) | **Voice of Victory** | 2 / `PTDM` / 29.8 | 🤖 **MB #42**<br>🏆 *MTGO* | Hit Maybeboard IA #42 (TDM) : abaisse la courbe de 6 à 2 manas avec un Grand Abolisher offensif qui crée deux jetons 1/1 en attaquant. |
| 15 | **Flare of Fortitude** | 4 / 18.3 (D) | **Exorcise** | 2 / `FDC` / 13 | 🏆 *MTGO* | Remplace un sort de protection situationnel par un exil net à 2 manas (DSK) ciblant artefact, enchantement ou créature de force >= 4. |
| 16 | **Farewell** | 6 / 19.2 (D+) | **Sunfall** | 5 / `FRC` / 17 | 🏆 *MTGO* | Abaisse le sweeper d'exil de 6 à 5 manas (MOM) tout en laissant un jeton Incubate X/X pour conclure la partie. |
| 17 | **Serra's Emissary** | 7 / 23 (C+) | **Abandoned Air Temple** | 0 / `TLA` / 39 | 🏆 *MTGO* | Remplace une cible de réanimation redondante par un terrain blanc utilitaire S-Tier (TLA, score 39) qui pompe toute l'équipe. |

### 2.2. Section Blue (20 changements)

| # | Carte Retirée (Out) | CMC / Score | Carte Ajoutée (In) | CMC / Set / Score | Badges (IA & Peer) | Analyse Tactique du Choix |
| :-: | :--- | :---: | :--- | :---: | :--- | :--- |
| 18 | **Baral, Chief of Compliance** | 2 / 18.1 (D) | **Bilbo, Thief in the Night** | 2 / `HOB` / 31 | 🤖 **MB #6**<br>🎯 **Match Exact IA**<br>🏆 *MTGO* | Double Hit Exact IA #6 (HOB) : remplace exactement la cible proposée par l'IA par un looter/voleur de sorts à 2 manas beaucoup plus polyvalent hors Storm pur. |
| 19 | **Ledger Shredder** | 2 / 27.8 (B) | **The Wondrous Wasp** | 2 / `MSH` / 22.8 | 🏆 *MTGO* | Choix audacieux (MSH) : coupe un pilier Tempo/Reanimator au profit d'une menace volante à 2 manas plus agressive mais moins synergique avec le cimetière. |
| 20 | **Sea Gate Stormcaller** | 2 / 18.6 (D) | **Geist of Saint Thalia** | 2 / `FRA` / 22.8 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA remplacée par un 2-drop bleu (FRA) plus résilient et autonome que Stormcaller. |
| 21 | **The Reality Chip** | 2 / 20.8 (C-) | **Astrologian's Planisphere** | 2 / `FIN` / 11 | 🏆 *MTGO* | Remplace un équipement lent par un équipement bleu à 2 manas (FIN) créant un sorcier Hero qui grossit sur les sorts non-créatures et la pioche. |
| 22 | **Aether Channeler** | 3 / 21.2 (C-) | **Wan Shi Tong, Librarian** | 2 / `TLA` / 24 | 🏆 *MTGO* | Upgrade majeur (TLA) : un Hydroid Krasis en Flash à {U}{U} de base qui punit également les tutorisations/fetchlands adverses. |
| 23 | **Barrin, Tolarian Archmage** | 3 / 23.2 (C+) | **Seasoned Cryomancer** | 3 / `FRA` / 22.8 | 🏆 *MTGO* | Modernise le slot bounce/valeur à 3 manas par un sorcier (FRA) plus incisif. |
| 24 | **Cryptic Coat** | 3 / 20.8 (C-) | **Tishana's Tidebinder** | 3 / `LCI` / Elo 1396 | 🏆 *MTGO* | Choix discutable sur la carte coupée : Tishana's Tidebinder (LCI) est un staple Vintage incontournable (Stifle + 3/2 Flash), mais Cryptic Coat méritait de rester. |
| 25 | **Deceiver Exarch** | 3 / 20.8 (C-) | **Glamermite** | 3 / `ECL` / Elo 1286 | — | Mutation Twin #1 (ECL) : conserve la combo infinie avec Splinter Twin / Kiki-Jiki en gagnant un corps 2/1 Vol Flash, mais perd la capacité d'engager un terrain adverse. |
| 26 | **Pestermite** | 3 / 19.6 (D+) | **Divining Duelist** | 3 / `FRA` / Elo 1265 | 🎯 *Cut Ciblé IA* | Mutation Twin #2 (FRA) : conserve la combo Twin/Kiki et ajoute un mode 'loot 1' en arrivant en jeu, mais perd le vol et le tap de terrain. |
| 27 | **Riftwing Cloudskate** | 5 / 19.3 (D+) | **Sphinx of False Conclusions** | 4 / `FRA` / 22.8 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA remplacée par un Sphinx à 4 manas (FRA) nettement moins lent que le Suspend de Cloudskate. |
| 28 | **Smirking Spelljacker** | 5 / 24.1 (B-) | **Emeritus of Ideation** | 5 / `SOS` / 22 | 🏆 *MTGO* | Remplace un contre-créature à 5 manas par un moteur de valeur/sorts à 5 manas (SOS). |
| 29 | **Thought Monitor** | 7 / 16 (D-) | **Quantum Riddler** | 5 / `EOE` / 40 | 🏆 *MTGO* | Upgrade exceptionnel (EOE, score 40) : jouable dès 2 manas via Warp {1}{U} pour piocher et doubler les pioches en main vide. |
| 30 | **Jace, Wielder of Mysteries** | 4 / 6 (F) | **The Theorist, Jace Beleren** | 4 / `FRA` / 33.1 | 🤖 **MB #4**<br>🏆 *MTGO* | Hit Maybeboard IA #4 (FRA) : coupe une wincon parasite (Jace LabMan) pour le nouveau Jace à 4 manas plébiscité par l'IA. |
| 31 | **Tezzeret, Betrayer of Flesh** | 4 / 18.1 (D) | **Flash** | 2 / `MIR` / Elo 1691 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA remplacée par LA carte combo la plus cassée du Vintage Cube (MIR, Elo 1691) ! |
| 32 | **Memory Deluge** | 4 / 25.2 (B-) | **Consult the Star Charts** | 2 / `EOE` / Elo 1478 | — | Compresse la courbe de 4 à 2 manas (EOE, Elo 1478) : un Impulse scalant sur le nombre de terrains avec Kicker {1}{U} pour prendre 2 cartes. |
| 33 | **Flare of Denial** | 3 / 18.1 (D) | **Occult Epiphany** | 1 / `VOC` / Elo 1496 | 🏆 *MTGO* | Remplace un contre conditionnel par l'un des meilleurs instants de sculpt/cimetière/jetons du Vintage Cube (VOC, Elo 1496). |
| 34 | **Ancestral Vision** | 0 / 27.8 (B) | **Stock Up** | 3 / `SOA` / 41 | 🤖 **MB #1**<br>🏆 *MTGO* | Hit Maybeboard IA #1Absolu (DFT, score 41) : remplace un Suspend trop lent par le meilleur divination/dig à 3 manas moderne (regarde 5, garde 2). |
| 35 | **See the Truth** | 2 / 17.9 (D-) | **Winternight Stories** | 3 / `TDM` / Elo 1334 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA remplacée par un Faithless Looting dopé à 3 manas avec Harmonize {4}{U} (TDM). |
| 36 | **Compulsive Research** | 3 / 20.8 (C-) | **Cryogen Relic** | 2 / `EOE` / 15 | 🏆 *MTGO* | Abaisse le coût de 3 à 2 manas (EOE) pour un artefact bleu qui pioche à l'ETB et à la sortie, idéal pour Tinker, Blink et Welder. |
| 37 | **The Eternal Wanderer** | 6 / 19.8 (D+) | **Sewer-veillance Cam** | 1 / `TMT` / 29.8 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA (Eternal Wanderer) coupée pour un artefact bleu à 1 mana (TMT) qui alimente Urza, Tinker, Emry et Mox Opal. |

### 2.3. Section Black (15 changements)

| # | Carte Retirée (Out) | CMC / Score | Carte Ajoutée (In) | CMC / Set / Score | Badges (IA & Peer) | Analyse Tactique du Choix |
| :-: | :--- | :---: | :--- | :---: | :--- | :--- |
| 38 | **Dread Wanderer** | 1 / 17.9 (D-) | **Cecil, Dark Knight** | 1 / `FIN` / 15 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA remplacée par le meilleur 1-drop noir agressif moderne (FIN, 2/3 Deathtouch qui se transforme en Paladin 4/4 Lifelink). |
| 39 | **Evolved Sleeper** | 1 / 20.9 (C-) | **Nethergoyf** | 1 / `MH3` / 15 | 🏆 *MTGO* | Upgrade S-Tier (MH3) : Tarmogoyf noir à 1 mana avec Escape, parfait avec Fetchlands, Thoughtseize et Reanimator. |
| 40 | **Gutterbones** | 1 / 17.9 (D-) | **Black Widow, Super Spy** | 2 / `MSH` / 24 | 🏆 *MTGO* | Abandon définitif du vieux package Black Aggro récursif lent au profit d'un 2-drop disruptif/tempo (MSH). |
| 41 | **Blade of the Oni** | 2 / 17.9 (D) | **Gollum, Riddle Master** | 2 / `HOB` / Elo 1237 | — | Remplace un menacer agressif par un moteur de taxe/valeur à 2 manas (HOB) punissant les sorts pairs (dont les Moxen à 0 mana !) ou impairs. |
| 42 | **Heir of Falkenrath** | 2 / 18.2 (D) | **Iron-Shield Elf** | 2 / `ECL` / 13 | 🏆 *MTGO* | Remplace un discard outlet daté par un 2-drop noir moderne (HOB) capable de se protéger/cycler. |
| 43 | **Mesmeric Fiend** | 2 / 23.6 (C+) | **Salt Vampire** | 2 / `TRK` / Elo 1414 | — | Upgrade net (TRK) : conserve la disruption de main à 2 manas avec Lifelink et exil définitif (remplacé par une pioche, combo avec Bowmasters/Narset/Hullbreacher !). |
| 44 | **Darkstar Augur** | 3 / 21 (C-) | **Overlord of the Balemurk** | 5 / `DSK` / 29 | 🏆 *MTGO* | Upgrade massif (DSK) : pour {1}{B} en Impending, meule 4 et récupère une créature ou un planeswalker tout en préparant un 5/5. |
| 45 | **Liliana, Heretical Healer** | 3 / 18.8 (D) | **Sedgemoor Witch** | 3 / `STX` / 23.5 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA remplacée par un moteur de jetons 3 manas (STX) qui forme aussi la combo infinie Magecraft avec Chain of Smog ! |
| 46 | **Preacher of the Schism** | 3 / 22 (C) | **Sanctum Lurker** | 3 / `FRA` / 20.1 | 🏆 *MTGO* | Échange un 3-drop midrange contre un 3-drop synergique (FRA). |
| 47 | **Gonti, Lord of Luxury** | 4 / 20 (D+) | **Ravenloft Adventurer** | 4 / `CLB` / Elo 1422 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA remplacée par l'un des meilleurs porteurs d'Initiative à 4 manas (CLB, Elo 1422) qui exile aussi le cimetière adverse. |
| 48 | **Hostile Investigator** | 4 / 23.7 (C+) | **Elegy Acolyte** | 4 / `EOE` / Elo 1259 | — | Passe d'un 4-drop indice lent à un moteur de pioche sur dégâts de combat + création de Robots 2/2 via Void (EOE). |
| 49 | **Heartless Act** | 2 / 31.6 (B+) | **Metamorphosis Fanatic** | 6 / `DSC` / 29.8 | 🏆 *MTGO* | Remplace un removal conditionnel par une bombe Reanimator/Miracle (DSC) qui réanime une créature avec Lifelink sur un corps 4/4 Lifelink. |
| 50 | **Infernal Grasp** | 2 / 31.5 (B+) | **Chain of Smog** | 2 / `ONS` / Elo 1367 | 🏆 *MTGO* | Introduit la moitié A de la combo infinie 2-cartes avec Witherbloom Apprentice / Sedgemoor Witch, mais au prix d'un removal inconditionnel à 2 manas. |
| 51 | **Lethal Scheme** | 4 / 20.8 (C-) | **Vraska's Final Mercy** | 2 / `FRA` / 20.1 | 🏆 *MTGO* | Compresse un removal à 4 manas (Convoke) vers une interaction noire à 2 manas (FRA). |
| 52 | **Phyrexian Arena** | 3 / 20.8 (C-) | **Lich's Relic** | 1 / `FRA` / Elo 1365 | — | Coupe un enchantement de pioche trop lent en Vintage (Arena) pour un équipement noir à 1 mana (FRA) qui sert d'édit créature/PW à l'ETB pour {2}. |

### 2.4. Section Red (16 changements)

| # | Carte Retirée (Out) | CMC / Score | Carte Ajoutée (In) | CMC / Set / Score | Badges (IA & Peer) | Analyse Tactique du Choix |
| :-: | :--- | :---: | :--- | :---: | :--- | :--- |
| 53 | **Bomat Courier** | 1 / 17.9 (D) | **Kellan, Planar Trailblazer** | 1 / `FDN` / Elo 1277 | — | Échange un 1-drop artefact contre le 1-drop rouge Figure of Destiny de Foundations (FDN) qui génère du card advantage dès le tour 2. |
| 54 | **Bloodthirsty Adversary** | 2 / 17.9 (D) | **Samut, Hazoret's Champion** | 2 / `FRA` / 22.8 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA remplacée par un 2-drop agressif (FRA) nettement plus percutant. |
| 55 | **Embereth Shieldbreaker** | 2 / 7 (F) | **Stingcaster Mage** | 2 / `FRA` / 24.4 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA (score 7, Tier F) remplacée par un 2-drop rouge (ECL) plus polyvalent. |
| 56 | **Ral, Monsoon Mage** | 2 / 21.9 (C) | **Ravenous Robots** | 2 / `TMT` / 12 | 🏆 *MTGO* | Retire un support Storm étroit pour un 2-drop artefact/jetons (TMT) qui croise Aggro et Artefacts. |
| 57 | **Scrapwork Mutt** | 2 / 20.1 (D+) | **Ivora, Insatiable Heir** | 2 / `J25` / 24 | 🏆 *MTGO* | Upgrade puissant (J25) : 2-drop Trample qui crée un jeton Sang sur chaque défausse et grossit massivement avec Faithless Looting, Wheel et Psychic Frog. |
| 58 | **Noise Marine** | 5 / 25.9 (B-) | **Batroc the Leaper** | 2 / `MSC` / 20.1 | 🏆 *MTGO* | Abaisse la courbe de 5 à 2 manas (MSH) avec une menace rouge agile. |
| 59 | **Breya's Apprentice** | 3 / 9 (F) | **Yuffie, Materia Hunter** | 3 / `FIC` / Elo 1246 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA (score 9, Tier F) remplacée par un Ninja {1}{R} (FIC) qui vole un Mox, un Sol Ring ou un The One Ring adverse ! |
| 60 | **Detective's Phoenix** | 3 / 25.1 (B-) | **Tersa Lightshatter** | 3 / `TDM` / 24 | 🏆 *MTGO* | Upgrade majeur à 3 manas (TDM) : 3/3 Haste qui fait Tormenting Voice à l'ETB et génère du card advantage depuis le cimetière en fin de tour. |
| 61 | **Death-Greeter's Champion** | 3 / 21.6 (C) | **Screaming Nemesis** | 3 / `DSK` / 35 | 🤖 **MB #3**<br>🏆 *MTGO* | Hit Maybeboard IA #3 (DSK) : l'un des meilleurs 3-drops rouges de l'histoire récente (3/3 Haste qui renvoie les dégâts au joueur et interdit définitivement le gain de vie). |
| 62 | **Rampaging Raptor** | 4 / 17.9 (D-) | **Smaug the Magnificent** | 4 / `HOB` / Elo 1405 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA (Raptor) remplacée par un Dragon 4 manas Vol Haste (HOB) qui génère des Trésors et tire à l'attaque. |
| 63 | **Inferno Titan** | 6 / 19.8 (D+) | **Overlord of the Boilerbilges** | 6 / `DSK` / Elo 1369 | — | Upgrade archétypal (DSK) : jouable dès 4 manas (Impending {2}{R}{R}) pour infliger 4 dégâts à toute cible immédiatement, tout en restant blinkable avec Phelia/Flickerwisp ! |
| 64 | **Flare of Duplication** | 3 / 17.9 (D-) | **Ajani Unrelenting** | 6 / `FRA` / Elo 1354 | — | Remplace un sort de copie étroit par un Planeswalker rouge de fin de courbe (FRA) qui génère des jetons 2/2 à chaque activation. |
| 65 | **Demand Answers** | 2 / 17.9 (D-) | **Flashback** | 1 / `SOS` / 20.1 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA remplacée par un sort rouge à 1 mana (MSH) plus incisif. |
| 66 | **Searing Spear** | 2 / 28.2 (B) | **Sear** | 2 / `ECL` / 25 | 🏆 *MTGO* | Strict upgrade (ECL) : passe de 3 dégâts pour 2 manas à un removal rouge moderne plus efficace. |
| 67 | **Flame Slash** | 1 / 36 (A-) | **Suplex** | 2 / `FIN` / 22 | 🏆 *MTGO* | Strict upgrade de polyvalence (FIN) : 3 dégâts sur créature (avec exil) OU destruction d'artefact en mode modal à 2 manas ! |
| 68 | **Arc Trail** | 2 / 20.8 (C-) | **Cori-Steel Cutter** | 2 / `TDM` / 41 | 🤖 **MB #44**<br>🏆 *MTGO* | Hit Maybeboard IA #44 (TDM, score 41) : remplace un removal poussif par l'équipement phare des decks Prowess/Cantrips/Fast Mana en Vintage. |

### 2.5. Section Green (21 changements)

| # | Carte Retirée (Out) | CMC / Score | Carte Ajoutée (In) | CMC / Set / Score | Badges (IA & Peer) | Analyse Tactique du Choix |
| :-: | :--- | :---: | :--- | :---: | :--- | :--- |
| 69 | **Duskwatch Recruiter** | 2 / 23.6 (C+) | **Badgermole Cub** | 2 / `TLA` / 43 | 🏆 *MTGO* | Upgrade S-Tier (TLA, score 43) : transforme un terrain en créature Célérité (Earthbend 1) ET double le mana produit par tous les dorks ! |
| 70 | **Scavenging Ooze** | 2 / 24.7 (B-) | **Keen-Eyed Curator** | 2 / `BLB` / 17 | 🏆 *MTGO* | Modernisation (BLB) : 3/3 pour {G}{G} qui grossit en 7/7 Trample tout en exilant n'importe quel type de carte du cimetière pour {1}. |
| 71 | **Tough Cookie** | 2 / 5 (F) | **Bristly Bill, Spine Sower** | 2 / `SLD` / 40 | 🤖 **MB #15**<br>🏆 *MTGO* | Hit Maybeboard IA #15 (OTJ, reskinné en Man-Thing) : remplace la carte la plus faible du vert (score 5) par le meilleur 2-drop Landfall du jeu. |
| 72 | **Explore** | 2 / 17.9 (D-) | **Bejeweled Warg** | 2 / `HOB` / Elo 1297 | — | Remplace un cantrip de ramp lent par une créature 2 manas Trample (HOB) générant des Trésors ou des marqueurs au combat. |
| 73 | **Flare of Cultivation** | 3 / 18.6 (D) | **Carnivorous Cultivator** | 2 / `FRA` / 20.1 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA remplacée par un 2-drop vert proactif (SOS). |
| 74 | **Farseek** | 2 / 24.9 (B-) | **Scythecat Cub** | 2 / `J25` / 41 | 🤖 **MB #13**<br>🏆 *MTGO* | Hit Maybeboard IA #13 (J25, score 41) : remplace un ramp sorcery mou par une menace Landfall létale avec les Fetchlands. |
| 75 | **Kodama's Reach** | 3 / 21.4 (C-) | **Webstrike Elite** | 2 / `DFT` / Elo 1186 | — | Retire un ramp à 3 manas obsolète en Vintage pour un 3/3 Reach {G}{G} avec Cycling {X}{G}{G} détruisant un artefact/enchantement (DFT). |
| 76 | **Reclamation Sage** | 3 / 19 (D+) | **Surrak, Elusive Hunter** | 3 / `TDM` / 24 | 🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Cible faible pointée par l'IA remplacée par un 4/3 Trample incontrable à 3 manas (TDM) qui fait piocher à chaque fois qu'une créature est ciblée par l'adversaire. |
| 77 | **Ramunap Excavator** | 3 / 23.2 (C+) | **Mole Man, Moloid Master** | 3 / `MSH` / 35 | 🤖 **MB #23**<br>🏆 *MTGO* | Hit Maybeboard IA #23 (MSH) : modernise le slot 3-drop du package Lands. |
| 78 | **Simian Simulacrum** | 3 / 18.1 (D) | **Ursine Monstrosity** | 3 / `DSC` / 19.9 | 🏆 *MTGO* | Remplace un 3-drop artefact par un 3-drop vert agressif (DSC). |
| 79 | **Surrak, the Hunt Caller** | 4 / 23 (C+) | **Emeritus of Abundance** | 3 / `SOS` / 32 | 🤖 **MB #34**<br>🏆 *MTGO* | Hit Maybeboard IA #34 (SOS) : abaisse la courbe de 4 à 3 manas avec une carte recommandée par l'IA. |
| 80 | **Disciple of Freyalise** | 6 / 23.8 (C+) | **Formidable Speaker** | 3 / `ECL` / 34 | 🏆 *MTGO* | Upgrade S-Tier (ECL, score 34) : un Survival of the Fittest à l'ETB sur un elfe 3 manas qui dégage aussi Gaea's Cradle ou un permanent ! |
| 81 | **Beast Whisperer** | 4 / 23.1 (C+) | **Icetill Explorer** | 4 / `EOE` / 42 | 🤖 **MB #10**<br>🏆 *MTGO* | Hit Maybeboard IA #10 (EOE, score 42) : remplace un moteur elfe fragile par un Crucible of Worlds + Exploration + meule sur un corps 4 manas ! |
| 82 | **Ojer Kaslem, Deepest Growth** | 5 / 21.6 (C) | **Baloth Prime** | 4 / `EOC` / 29.8 | 🏆 *MTGO* | Compresse la courbe de 5 à 4 manas (EOC) pour renforcer l'axe Lands/Sacrifice de terrains. |
| 83 | **Verdurous Gearhulk** | 5 / 7 (F) | **Ouroboroid** | 4 / `EOE` / 41 | 🤖 **MB #12**<br>🏆 *MTGO* | Hit Maybeboard IA #12 (EOE, score 41) : abaisse la courbe de 5 à 4 manas avec une menace exponentielle qui distribue sa force en marqueurs +1/+1 à toute l'équipe à chaque combat. |
| 84 | **Terastodon** | 8 / 21.5 (C) | **Worldspine Wurm** | 11 / `DSC` / 24 | 🏆 *MTGO* | Pivot stratégique majeur : remplace une cible Natural Order défensive par LA meilleure cible de Flash et Sneak Attack / Through the Breach du jeu (15/15 Trample qui laisse trois 5/5 Trample). |
| 85 | **Garruk Relentless** | 4 / 23.2 (C+) | **Wistfulness** | 5 / `ECL` / 7 | 🏆 *MTGO* | Remplace un planeswalker daté par l'incarnation élémentale Simic à 5 manas (ECL) dotée d'un mode alternatif précoce. |
| 86 | **Conduit of Worlds** | 4 / 20.8 (C-) | **Heritage Reclamation** | 2 / `TDM` / Elo 1127 | — | Remplace un Crucible redondant à 4 manas par un Naturalize/Cimetière/Cantrip instantané à 2 manas (TDM). |
| 87 | **Rampant Growth** | 2 / 25.1 (B-) | **Lumbering Worldwagon** | 3 / `DFT` / Elo 1308 | — | Échange un ramp 2 manas contre un Véhicule 3 manas (DFT) qui cherche un terrain de base dès l'ETB ET à chaque attaque. |
| 88 | **Garruk Wildspeaker** | 4 / 22 (C) | **Garruk, Curse Breaker** | 5 / `FRA` / 19.9 | 🏆 *MTGO* | Modernise le slot Planeswalker vert (ECL). |
| 89 | **Worn Powerstone** | 3 / 20.8 (C-) | **Sylvan Safekeeper** | 1 / `SLD` / Elo 1334 | 🏆 *MTGO* | Excellent ajout de fin de session : remplace un caillou engagé lent par la meilleure protection à 0 mana (JUD) pour Marit Lage, Reanimator et Lands. |

### 2.6. Section Multicolored (25 changements)

| # | Carte Retirée (Out) | CMC / Score | Carte Ajoutée (In) | CMC / Set / Score | Badges (IA & Peer) | Analyse Tactique du Choix |
| :-: | :--- | :---: | :--- | :---: | :--- | :--- |
| 90 | **Shorikai, Genesis Engine** *Azorius* | 4 / 20.8 (C-) | **King T'Challa** | 3 / `MSH` / Elo 1275 | — | Passe d'un véhicule de contrôle à une créature Flash Azorius (MSH) qui récompense la pioche de 2e carte et se transforme en Black Panther. |
| 91 | **Soulherder** *Azorius* | 3 / 21.4 (C-) | **Bard, Heir of Girion** | 4 / `HOC` / Elo 1338 | — | Choix discutable : coupe un moteur clé de l'archétype Blink (Soulherder) pour un lord/piocheur d'attaque à 4 manas (HOC). |
| 92 | **Assimilation Aegis** *Azorius* | 3 / 23.3 (C+) | **Aang, Swift Savior** | 3 / `TLA` / 42 | 🏆 *MTGO* | Upgrade S-Tier (TLA, score 42) : un Venser/Spell Queller en Flash Vol à 3 manas qui gère aussi bien un sort sur la pile qu'un permanent ! |
| 93 | **Kaito Shizuki** *Dimir* | 3 / 23.5 (C+) | **Kaito, Bane of Nightmares** | 4 / `DSK` / 32 | 🤖 **MB #35**<br>🏆 *MTGO* | Hit Maybeboard IA #35 (DSK) : strict upgrade du Planeswalker Ninja, jouable en Ninjutsu à 3 manas et quasiment intouchable pendant votre tour. |
| 94 | **Thief of Sanity** *Dimir* | 3 / 23.9 (C+) | **Superior Spider-Man** | 4 / `SPM` / 20.1 | 🏆 *MTGO* | Modernise un 3-drop Dimir fragile par un clone/voleur Dimir à 4 manas (SPM). |
| 95 | **Hostage Taker** *Dimir* | 4 / 23.9 (C+) | **Ertai Resurrected** | 4 / `DMU` / 23.9 | — | Remplace un 4-drop lent par le couteau suisse Flash Dimir (DMU) capable de contrer un sort, une capacité (fetch/Storm/Twin) ou détruire une menace. |
| 96 | **Burning-Tree Emissary** *Gruul* | 2 / 17.9 (D) | **Aerid Konstrari** | 4 / `FRA` / Elo 1210 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA remplacée par un Sphinx Gruul à 4 manas (FRA) qui génère un caillou de mana R/G à l'ETB et à la mort. |
| 97 | **Dragonlord Atarka** *Gruul* | 7 / 19.2 (D+) | **Raph & Mikey, Troublemakers** | 7 / `TMT` / Elo 1306 | — | Choix contestable (TMT) : perd l'ETB dévastateur de Dragonlord Atarka (excellent avec Flash/Sneak/Blink/Reanimate) pour un 7-drop qui doit attaquer. |
| 98 | **Lavaspur Boots** *Gruul* | 1 / 20.1 (D+) | **Vibrance** | 5 / `ECL` / 10 | 🏆 *MTGO* | Remplace un équipement mineur par l'incarnation Gruul (ECL). |
| 99 | **Selvala, Eager Trailblazer** *Selesnya* | 4 / 18.7 (D) | **Jennifer Walters** | 2 / `MSH` / 33 | 🤖 **MB #29**<br>🏆 *MTGO* | Hit Maybeboard IA #29 (MSH) : compresse de 4 à 2 manas avec une carte plébiscitée par l'IA. |
| 100 | **Yasharn, Implacable Earth** *Selesnya* | 4 / 20.9 (C-) | **Okoye, Mighty and Adored** | 4 / `MSC` / 18.4 | 🏆 *MTGO* | Remplace un hatebear Selesnya à 4 manas par une menace Selesnya plus proactive (MSH). |
| 101 | **Phyrexian Fleshgorger** *Selesnya* | 7 / 21.9 (C) | **Brightglass Gearhulk** | 4 / `DFT` / 28 | 🏆 *MTGO* | Upgrade intéressant (DFT) : le Gearhulk Selesnya tutorise deux cartes de CMC <= 1 (Moxen, Guide of Souls, Ocelot Pride, Sylvan Safekeeper, Walking Ballista, Manifold Key !). |
| 102 | **Carnage Interpreter** *Rakdos* | 3 / 7 (F) | **Kellogg, Dangerous Mind** | 3 / `PIP` / Elo 1274 | — | Remplace un 3-drop Rakdos solide par un producteur de Trésors Fallout (PIP) — léger downgrade de puissance brute. |
| 103 | **The Infamous Cruelclaw** *Rakdos* | 3 / 17.9 (D-) | **Deadpool, Trading Card** | 4 / `SLD` / Elo 1383 | 🎯 *Cut Ciblé IA* | Cible faible pointée par l'IA remplacée par une carte Secret Lair (SLD) ultra-fun et étonnamment forte qui échange sa boîte de texte avec une créature en jeu. |
| 104 | **Vindicate** *Orzhov* | 3 / 42 (A) | **Cloak and Dagger, Entwined** | 3 / `MSH` / 33 | 🤖 **Upgrade IA**<br>🏆 *MTGO* | Hit Upgrade IA (MSH) : remplace un sorcery à 3 manas dépassé par une carte Orzhov moderne recommandée par l'advisor. |
| 105 | **Expressive Iteration** *Izzet* | 2 / 38 (A-) | **Vivi Ornitier** | 3 / `FIN` / 33 | 🤖 **MB #14**<br>🏆 *MTGO* | Hit Maybeboard IA #14 (FIN) : Vivi Ornitier est un moteur de mana/prowess exceptionnel en Izzet, même si couper Expressive Iteration est douloureux. |
| 106 | **Third Path Iconoclast** *Izzet* | 2 / 28 (B) | **Pinnacle Emissary** | 3 / `EOE` / Elo 1346 | — | Upgrade net pour l'archétype Artefacts (EOE) : produit des Drones 1/1 Vol sur chaque sort d'artefact et peut être lancé pour {U/R} via Warp dès le Tour 1 ! |
| 107 | **Saheeli, Sublime Artificer** *Izzet* | 3 / 9 (F) | **Traumatic Critique** | 2 / `SOS` / 35 | 🤖 **MB #9**<br>🏆 *MTGO* | Hit Maybeboard IA #9 (SOS) : compresse de 3 à 2 manas avec une interaction Izzet de premier plan recommandée par l'IA. |
| 108 | **Prismari Command** *Izzet* | 3 / 21 (C-) | **Flame of Anor** | 3 / `HOC` / 21.2 | 🏆 *MTGO* | Upgrade classique (LTR) : avec le nombre élevé de Wizards ajoutés (Divining Duelist, Seasoned Cryomancer, Vivi, Memnarch, Snapcaster), Flame of Anor devient un 3-pour-1 dévastateur. |
| 109 | **Assassin's Trophy** *Golgari* | 2 / 22.2 (C) | **Nog, Ambitious Cadet** | 2 / `TRK` / Elo 1301 | — | Échange un removal Golgari contre un 2-drop évolutif (TRK) qui devient un Crucible + Exploration au niveau 3. |
| 110 | **Vraska, Golgari Queen** *Golgari* | 4 / 20.2 (D+) | **Witherbloom Apprentice** | 2 / `STX` / Elo 1271 | 🏆 *MTGO* | Introduit la moitié B de la combo infinie 2-cartes avec Chain of Smog pour 2 manas (STX). |
| 111 | **Pernicious Deed** *Golgari* | 3 / 19.7 (D+) | **Vicious Rivalry** | 4 / `SOS` / 17 | 🏆 *MTGO* | Modernise un sweeper Golgari lent par une carte Golgari récente (FRA). |
| 112 | **Niv-Mizzet Reborn** *Golgari/5C* | 5 / 19.2 (D+) | **Alpha Deathclaw** | 6 / `PIP` / 19.9 | 🏆 *MTGO* | Remplace un payoff 5 couleurs étroit par un removal/menace 6/6 Menace Trample Golgari (PIP). |
| 113 | **Marchesa, Dealer of Death** *3-Color* | 3 / 17.3 (D-) | **Loot, the Pathfinder** | 5 / `DFT` / Elo 1171 | — | Échange un 3-drop Grixis contre le 5-drop Temur (DFT) doté d'Ancestral Recall, Dark Ritual et Lightning Bolt en capacités Exhaust. |
| 114 | **Satya, Aetherflux Genius** *3-Color* | 4 / 19.3 (D+) | **Aragorn, King of Gondor** | 4 / `LTC` / Elo 1242 | — | Remplace Satya par le meilleur payoff Monarque Jeskai à 4 manas (LTC), rendant toute l'équipe imblocable. |

### 2.7. Section Lands (2 changements)

| # | Carte Retirée (Out) | CMC / Score | Carte Ajoutée (In) | CMC / Set / Score | Badges (IA & Peer) | Analyse Tactique du Choix |
| :-: | :--- | :---: | :--- | :---: | :--- | :--- |
| 115 | **Raffine, Scheming Seer** | 3 / 19.7 (D+) | **Starting Town** | 0 / `FIN` / 23 | 🏆 *MTGO* | Excellent choix structurel : coupe une carte tricolore Esper pour ajouter un terrain 5-couleurs (FIN) qui arrive dégagé aux tours 1 à 3 ! |
| 116 | **Karn, Legacy Reforged** | 5 / 4 (F) | **Multiversal Passage** | 0 / `SPM` / 31.1 | 🏆 *MTGO* | Coupe un 5-drop incolore lent pour ajouter un Shockland universel 5-couleurs (SPM) choisissant un type de terrain de base. |

### 2.8. Section Colorless (14 changements)

| # | Carte Retirée (Out) | CMC / Score | Carte Ajoutée (In) | CMC / Set / Score | Badges (IA & Peer) | Analyse Tactique du Choix |
| :-: | :--- | :---: | :--- | :---: | :--- | :--- |
| 117 | **Circuit Mender** | 3 / 18.1 (D) | **Scrawling Crawler** | 3 / `FDN` / Elo 1374 | — | Upgrade net à 3 manas (FDN) : punit toutes les pioches adverses (et les wheels !) tout en alimentant Sheoldred et Bowmasters. |
| 118 | **Filigree Familiar** | 3 / 17.9 (D-) | **The Fantasticar** | 3 / `MSC` / 35.3 | 🤖 **MB #48**<br>🏆 *MTGO* | Hit Maybeboard IA #48 (MSC) : remplace un 3-drop défensif mou par le véhicule incolore recommandé par l'IA. |
| 119 | **Batterskull** | 5 / 5 (F) | **Iron Man Armor** | 3 / `MSH` / 22.8 | 🏆 *MTGO* | Compresse le slot d'équipement de 5 à 3 manas (MSH). |
| 120 | **Kozilek, Butcher of Truth** | 10 / 18.1 (D) | **Krang, Utrom Warlord** | 9 / `TMT` / Elo 1335 | — | Bascule un Titan Eldrazi (non-artefact) vers un colosse Robot 9 manas (TMT) tutorisable sur Tinker avec Célérité, Vol, Trample et Indestructible. |
| 121 | **Ulamog, the Ceaseless Hunger** | 10 / 18.1 (D) | **Memnarch, the Warden** | 10 / `FRC` / Elo 1343 | — | Même logique : remplace Ulamog par un colosse artefact Indestructible à 10 manas (FRC) pour Tinker/Flash/Welder. |
| 122 | **Emrakul, the Promised End** | 13 / 7 (F) | **Skateboard** | 1 / `TMT` / 20.1 | 🏆 *MTGO* | Compresse radicalement la courbe (de 13 à 1 mana !) avec un équipement à 1 mana (TMT) pour Urza's Saga et Aggro. |
| 123 | **Cityscape Leveler** | 8 / 17.9 (D) | **Tezzeret, Cruel Captain** | 3 / `EOE` / 12 | 🏆 *MTGO* | Upgrade synergie S-Tier (EOE) : à 3 manas incolores, tutorise un artefact CMC <= 1 (Manifold Key, Mox Opal, Walking Ballista, Aether Spellbomb) ET dégage Time Vault ou Grim Monolith ! |
| 124 | **Ugin, the Ineffable** | 6 / 23.8 (C+) | **Ugin, Eye of the Storms** | 7 / `TDM` / 20 | 🏆 *MTGO* | Passe au nouvel Ugin à 7 manas (TDM) qui exile un permanent coloré dès le cast ET sur chaque sort incolore tout en ajoutant {C}{C}{C}. |
| 125 | **Karn Liberated** | 7 / 24 (B-) | **Lotus Petal** | 0 / `TMP` / Elo 1647 | 🏆 *MTGO* | Addition Vintage S-Tier (TMP, Elo 1647) : coupe un Planeswalker à 7 manas dépassé pour du fast mana à 0 mana (Storm, Reanimator, Flash, Breach). |
| 126 | **Lotus Bloom** | 0 / 24 (B-) | **Mox Opal** | 0 / `SLD` / Elo 1658 | 🏆 *MTGO* | Addition Vintage S-Tier (SOM, Elo 1658) : remplace le Suspend lent de Lotus Bloom par le vrai Mox Opal, soutenu par les nombreux nouveaux artefacts à 0-2 manas. |
| 127 | **Nexus of Becoming** | 6 / 6 (F) | **Manifold Key** | 1 / `TSR` / Elo 1502 | 🏆 *MTGO* | Addition Vintage S-Tier (TSR, Elo 1502) : ajoute la 2e clé à 1 mana pour Time Vault (cherchable par Urza's Saga, Tezzeret, Cruel Captain et Brightglass Gearhulk) ! |
| 128 | **Mishra's Research Desk** | 1 / 18.1 (D) | **Aether Spellbomb** | 1 / `FDC` / 26 | 🤖 **Upgrade IA**<br>🏆 *MTGO* | Hit Upgrade IA (SOA) : babiole classique à 1 mana pour Urza's Saga, Emry, Lurrus et Tinker. |
| 129 | **Morgul-Knife** | 1 / 20.8 (C-) | **Ghost Vacuum** | 1 / `DSK` / Elo 1353 | — | Upgrade massif (DSK) : la meilleure hate-graveyard à 1 mana actuelle, qui devient une wincon de fin de partie en réanimant toutes les créatures exilées en 1/1 Vol. |
| 130 | **Reckoner Bankbuster** | 2 / 20.1 (D+) | **The Echoverse Fulcrum** | 2 / `FRA` / 26 | 🤖 **Upgrade IA**<br>🎯 *Cut Ciblé IA*<br>🏆 *MTGO* | Double Hit IA (Cible coupée + Remplaçant suggéré dans upgrades, FRA) : remplace exactement Bankbuster par un artefact 3 manas moderne recommandé par l'IA. |

---

## 3. Les 5 Mouvements Transitoires & Hésitations en Direct (Bilan Net = 0)

L'inspection fine des 45 commits horodatés entre 21h14 et 00h42 révèle **5 cartes** que Nico a manipulées puis annulées ou corrigées en cours de séance. Ces micro-décisions sont extrêmement révélatrices de ses arbitrages :

1. **`Orcish Lumberjack` (Doublon accidentel corrigé)** :
   - *22h11* : Nico remplace `Burning-Tree Emissary` par `Orcish Lumberjack`.
   - *22h49* : En arrivant sur la section Gruul/Rouge, il réalise que `Orcish Lumberjack` était **déjà présent** dans le cube (ajouté le 7 novembre 2024). Il supprime donc le doublon (`-1`) et compense 3 minutes plus tard (*22h52*) en ajoutant `Aerid Konstrari` (`+1`).
2. **`Shifting Woodland` (Sauvée à 00h36 du matin)** :
   - *22h38* : Lors du nettoyage du Vert, Nico coupe `Shifting Woodland` pour `Vibrance`.
   - *00h36* : En relisant sa liste après minuit, alors qu'il vient d'ajouter massivement du support Lands/Delirium (`Icetill Explorer`, `Overlord of the Balemurk`, `Worldspine Wurm`, `Omniscience` déjà présente), il réalise que couper `Shifting Woodland` est une erreur et la **réintègre** en coupant `Lavaspur Boots`.
3. **`Deathrite Shaman` (Sauvé à 00h36 aux dépens de `Booster Tutor`)** :
   - *22h55* : Dans la section Selesnya/Hybride, Nico coupe `Deathrite Shaman` pour faire de la place à `Brightglass Gearhulk`.
   - *23h38* : Il tente d'abord un slot fun en remplaçant `Phyrexian Fleshgorger` par `Booster Tutor`.
   - *00h36* : Pris de remords d'avoir coupé le meilleur 1-drop hybride du format alors que le thème Lands/Graveyard vient d'être renforcé, il **remplace `Booster Tutor` par `Deathrite Shaman`** et le déplace en section Noire à *00h41*.
4. **`Sire of Seven Deaths` (Testé 28 minutes puis écarté)** :
   - *23h12* : Nico remplace `Karn, Legacy Reforged` par `Sire of Seven Deaths` (7 manas Eldrazi de *Foundations*).
   - *23h40* : Après avoir ajouté les colosses artefacts `Krang, Utrom Warlord` et `Memnarch, the Warden` (23h14), il juge `Sire of Seven Deaths` redondant (et non-artefact pour *Tinker*) et le retire définitivement (`-1`), ce qui équilibre l'ajout sec de `Multiversal Passage` (`+1` à 22h52).
5. **`Booster Tutor` (Parenthèse Un-Set de 58 minutes)** :
   - *23h38 $\rightarrow$ 00h36* : Testé à la place de `Phyrexian Fleshgorger`, puis sacrifié moins d'une heure plus tard pour rapatrier `Deathrite Shaman`.

---

## 4. Les 6 Skins Secret Lair / Universes Beyond Édités en Fin de Session

Entre 22h18 et 23h34, Nico a édité l'illustration/impression de **6 cartes** (dont 5 étaient déjà dans le cube en décembre 2024 et 1 venait d'être ajoutée à 22h27) vers des versions *Secret Lair* à nom d'emprunt (*Flavor Name*). Notre croisement par `oracle_id` résout leur identité exacte :

| Nom Affiché dans CubeCobra (Skin) | Carte Canonique Oracle | Édition & Licence | Statut dans l'Update |
| :--- | :--- | :--- | :--- |
| **`Cloud's Buster Sword`** | **Umezawa's Jitte** | `SLD #1865` (*Final Fantasy*) | Déjà dans le cube (reskin à 23h27) |
| **`Yuna's Sending Staff`** | **Staff of the Storyteller** | `SLD #1863` (*Final Fantasy*) | Déjà dans le cube (reskin à 23h27) |
| **`Merciless Poisoning`** | **Toxic Deluge** | `SLD #1860` (*Final Fantasy*) | Déjà dans le cube (reskin à 22h01) |
| **`Ororo Borealis`** | **Manamorphose** | `SLD #1746` (*Marvel Storm*) | Déjà dans le cube (reskin à 22h18) |
| **`Sandy Cheeks, Martial Astronaut`** | **Toski, Bearer of Secrets** | `SLD #1930` (*SpongeBob*) | Déjà dans le cube (reskin à 22h33) |
| **`Man-Thing, Marsh Protector`** | **Bristly Bill, Spine Sower** | `SLD #2621` (*Marvel*) | **Nouvel ajout** à 22h27 (`Tough Cookie -> Bristly Bill`), reskinné à 22h42 |

*(Note : le cube contenait déjà en décembre 2024 cinq autres skins : `Hadoken` = Lightning Bolt, `Mina Harker` = Thalia, Guardian of Thraben, `Balin's Tomb` = Ancient Tomb, `Valley of Gorgoroth` = Wasteland, et `Boogie Bomb` = Pyrite Spellbomb).*

---

## 5. Journal Chronologique Brut des 48 Entrées CubeCobra (Déc. 2024 – 18 Nov. 2026)

| # | Date & Heure | Opérations | Détail Exact des Swaps / Ajouts / Retraits / Éditions |
| :-: | :--- | :---: | :--- |
| 1 | **18 Nov 2026, 11:31** | `3 edits` | Éditions : `Daze`, `Counterspell`, `Lotus Petal` |
| 2 | **18 Nov 2026, 00:42** | `1 edit` | Édition : `Gaea's Cradle` |
| 3 | **18 Nov 2026, 00:41** | `+1, -1, 1 edit` | Swap : `Worn Powerstone -> Sylvan Safekeeper` ; Édition : `Deathrite Shaman` |
| 4 | **18 Nov 2026, 00:36** | `+2, -2, 3 edits` | Ajout : `+Shifting Woodland` ; Retrait : `-Lavaspur Boots` ; Swap : `Booster Tutor -> Deathrite Shaman` ; Éditions : `Overlord of the Boilerbilges`, `Icetill Explorer`, `Ugin, Eye of the Storms` |
| 5 | **17 Nov 2026, 23:40** | `-1` | Retrait : `-Sire of Seven Deaths` |
| 6 | **17 Nov 2026, 23:38** | `+1, -1` | Swap : `Phyrexian Fleshgorger -> Booster Tutor` |
| 7 | **17 Nov 2026, 23:37** | `1 edit` | Édition : `Black Widow, Super Spy` |
| 8 | **17 Nov 2026, 23:36** | `2 edits` | Éditions : `Voice of Victory`, `Elspeth, Storm Slayer` |
| 9 | **17 Nov 2026, 23:34** | `4 edits` | Éditions : `Sink into Stupor`, `Abandoned Air Temple`, `Boogie Bomb`, `Aether Spellbomb` |
| 10 | **17 Nov 2026, 23:28** | `2 edits` | Éditions : `Vraska's Final Mercy`, `Overlord of the Balemurk` |
| 11 | **17 Nov 2026, 23:27** | `4 edits` | Éditions : `Cloud's Buster Sword`, `Yuna's Sending Staff`, `Fractured Identity`, `Stonecoil Serpent` |
| 12 | **17 Nov 2026, 23:20** | `+1, -1, 1 edit` | Swap : `Reckoner Bankbuster -> The Echoverse Fulcrum` ; Édition : `Manifold Key` |
| 13 | **17 Nov 2026, 23:19** | `+6, -6` | Swaps : `Ugin, the Ineffable -> Ugin, Eye of the Storms`, `Karn Liberated -> Lotus Petal`, `Lotus Bloom -> Mox Opal`, `Nexus of Becoming -> MANIFOLD KEY`, `Mishra's Research Desk -> Aether Spellbomb`, `Morgul-Knife -> Ghost Vacuum` |
| 14 | **17 Nov 2026, 23:15** | `1 edit` | Édition : `Krang, Utrom Warlord` |
| 15 | **17 Nov 2026, 23:14** | `+4, -4, 1 edit` | Swaps : `Kozilek, Butcher of Truth -> Krang, Utrom Warlord`, `Ulamog, the Ceaseless Hunger -> Memnarch, the Warden`, `Emrakul, the Promised End -> Skateboard`, `Cityscape Leveler -> Tezzeret, Cruel Captain` ; Édition : `Sire of Seven Deaths` |
| 16 | **17 Nov 2026, 23:12** | `+2, -2` | Swaps : `Batterskull -> Iron Man Armor`, `Karn, Legacy Reforged -> Sire of Seven Deaths` |
| 17 | **17 Nov 2026, 23:10** | `+1, -1, 1 edit` | Swap : `Filigree Familiar -> The Fantasticar` ; Édition : `Scrawling Crawler` |
| 18 | **17 Nov 2026, 23:09** | `+1, -1` | Swap : `Circuit Mender -> Scrawling Crawler` |
| 19 | **17 Nov 2026, 23:07** | `+1, -1, 1 edit` | Swap : `Raffine, Scheming Seer -> Starting Town` ; Édition : `Loot, the Pathfinder` |
| 20 | **17 Nov 2026, 23:07** | `+1, -1` | Swap : `Satya, Aetherflux Genius -> Aragorn, King of Gondor` |
| 21 | **17 Nov 2026, 23:06** | `+1, -1, 3 edits` | Swap : `Marchesa, Dealer of Death -> Loot, the Pathfinder` ; Éditions : `Alpha Deathclaw`, `Forth Eorlingas!`, `Wistfulness` |
| 22 | **17 Nov 2026, 23:03** | `+4, -4, 2 edits` | Swaps : `Assassin's Trophy -> Nog, Ambitious Cadet`, `Vraska, Golgari Queen -> Witherbloom Apprentice`, `Pernicious Deed -> Vicious Rivalry`, `Niv-Mizzet Reborn -> Alpha Deathclaw` ; Éditions : `Pinnacle Emissary`, `Vivi Ornitier` |
| 23 | **17 Nov 2026, 23:00** | `+4, -4` | Swaps : `Expressive Iteration -> Vivi Ornitier`, `Third Path Iconoclast -> Pinnacle Emissary`, `Saheeli, Sublime Artificer -> Traumatic Critique`, `Prismari Command -> Flame of Anor` |
| 24 | **17 Nov 2026, 22:58** | `+1, -1, 2 edits` | Swap : `Vindicate -> Cloak and Dagger, Entwined` ; Éditions : `Kellogg, Dangerous Mind`, `Deadpool, Trading Card` |
| 25 | **17 Nov 2026, 22:56** | `+2, -2, 2 edits` | Swaps : `Carnage Interpreter -> Kellogg, Dangerous Mind`, `The Infamous Cruelclaw -> Deadpool, Trading Card` ; Éditions : `Jennifer Walters`, `Brightglass Gearhulk` |
| 26 | **17 Nov 2026, 22:55** | `+3, -3, 3 edits` | Swaps : `Selvala, Eager Trailblazer -> Jennifer Walters`, `Yasharn, Implacable Earth -> Okoye, Mighty and Adored`, `Deathrite Shaman -> Brightglass Gearhulk` ; Éditions : `Aerid Konstrari`, `Figure of Fable`, `Cecil, Dark Knight` |
| 27 | **17 Nov 2026, 22:52** | `+1` | Ajout : `+Aerid Konstrari` |
| 28 | **17 Nov 2026, 22:52** | `+2, -1, 2 edits` | Ajout : `+Multiversal Passage` ; Swap : `Dragonlord Atarka -> Raph & Mikey, Troublemakers` ; Éditions : `Vibrance`, `Etali, Primal Conqueror` |
| 29 | **17 Nov 2026, 22:49** | `-1, 2 edits` | Retrait : `-Orcish Lumberjack` (doublon) ; Éditions : `Kaito, Bane of Nightmares`, `Orcish Lumberjack` |
| 30 | **17 Nov 2026, 22:48** | `+3, -3, 2 edits` | Swaps : `Kaito Shizuki -> Kaito, Bane of Nightmares`, `Thief of Sanity -> Superior Spider-Man`, `Hostage Taker -> Ertai Resurrected` ; Éditions : `Aang, Swift Savior`, `King T'Challa` |
| 31 | **17 Nov 2026, 22:46** | `+3, -3, 1 edit` | Swaps : `Shorikai, Genesis Engine -> King T'Challa`, `Soulherder -> Bard, Heir of Girion`, `Assimilation Aegis -> Aang, Swift Savior` ; Édition : `Spider-Woman, Stunning Savior` |
| 32 | **17 Nov 2026, 22:42** | `4 edits` | Éditions : `Lumbering Worldwagon`, `Mole Man, Moloid Master`, `Webstrike Elite`, `Man-Thing, Marsh Protector` |
| 33 | **17 Nov 2026, 22:38** | `+5, -5, 1 edit` | Ajout : `+Wistfulness` ; Retrait : `-Garruk Relentless` ; Swaps : `Shifting Woodland -> Vibrance`, `Conduit of Worlds -> Heritage Reclamation`, `Rampant Growth -> Lumbering Worldwagon`, `Garruk Wildspeaker -> Garruk, Curse Breaker` ; Édition : `Sylvan Library` |
| 34 | **17 Nov 2026, 22:33** | `+10, -10, 4 edits` | Swaps : `Kodama's Reach -> Webstrike Elite`, `Reclamation Sage -> Surrak, Elusive Hunter`, `Ramunap Excavator -> Mole Man, Moloid Master`, `Simian Simulacrum -> Ursine Monstrosity`, `Surrak, the Hunt Caller -> Emeritus of Abundance`, `Disciple of Freyalise -> Formidable Speaker`, `Beast Whisperer -> Icetill Explorer`, `Ojer Kaslem, Deepest Growth -> Baloth Prime`, `Verdurous Gearhulk -> Ouroboroid`, `Terastodon -> Worldspine Wurm` ; Éditions : `Scythecat Cub`, `Carnivorous Cultivator`, `Badgermole Cub`, `Sandy Cheeks, Martial Astronaut` |
| 35 | **17 Nov 2026, 22:27** | `+6, -6, 3 edits` | Swaps : `Duskwatch Recruiter -> Badgermole Cub`, `Scavenging Ooze -> Keen-Eyed Curator`, `Tough Cookie -> Bristly Bill, Spine Sower`, `Explore -> Bejeweled Warg`, `Flare of Cultivation -> Carnivorous Cultivator`, `Farseek -> Scythecat Cub` ; Éditions : `Devoted Druid`, `Paradise Druid`, `Sakura-Tribe Elder` |
| 36 | **17 Nov 2026, 22:18** | `+7, -7, 6 edits` | Swaps : `Rampaging Raptor -> Smaug the Magnificent`, `Inferno Titan -> Overlord of the Boilerbilges`, `Flare of Duplication -> Ajani Unrelenting`, `Demand Answers -> Flashback`, `Searing Spear -> Sear`, `Flame Slash -> Suplex`, `Arc Trail -> Cori-Steel Cutter` ; Éditions : `Galvanic Blast`, `Unholy Heat`, `Ororo Borealis`, `Pyretic Ritual`, `Abrade`, `Splinter Twin` |
| 37 | **17 Nov 2026, 22:12** | `2 edits` | Éditions : `Stingcaster Mage`, `Kellan, Planar Trailblazer` |
| 38 | **17 Nov 2026, 22:11** | `+10, -10, 1 edit` | Swaps : `Bomat Courier -> Kellan, Planar Trailblazer`, `Burning-Tree Emissary -> Orcish Lumberjack`, `Bloodthirsty Adversary -> Samut, Hazoret's Champion`, `Embereth Shieldbreaker -> Stingcaster Mage`, `Ral, Monsoon Mage -> Ravenous Robots`, `Scrapwork Mutt -> Ivora, Insatiable Heir`, `Noise Marine -> Batroc the Leaper`, `Breya's Apprentice -> Yuffie, Materia Hunter`, `Detective's Phoenix -> Tersa Lightshatter`, `Death-Greeter's Champion -> Screaming Nemesis` ; Édition : `Dualcaster Mage` |
| 39 | **17 Nov 2026, 22:01** | `+15, -15, 12 edits` | Swaps : `Dread Wanderer -> Cecil, Dark Knight`, `Evolved Sleeper -> Nethergoyf`, `Gutterbones -> Black Widow, Super Spy`, `Blade of the Oni -> Gollum, Riddle Master`, `Heir of Falkenrath -> Iron-Shield Elf`, `Mesmeric Fiend -> Salt Vampire`, `Darkstar Augur -> Overlord of the Balemurk`, `Liliana, Heretical Healer -> Sedgemoor Witch`, `Preacher of the Schism -> Sanctum Lurker`, `Gonti, Lord of Luxury -> Ravenloft Adventurer`, `Hostile Investigator -> Elegy Acolyte`, `Heartless Act -> Metamorphosis Fanatic`, `Infernal Grasp -> Chain of Smog`, `Lethal Scheme -> Vraska's Final Mercy`, `Phyrexian Arena -> Lich's Relic` ; 12 éditions |
| 40 | **17 Nov 2026, 21:41** | `+8, -8` | Swaps : `Jace, Wielder of Mysteries -> The Theorist, Jace Beleren`, `Tezzeret, Betrayer of Flesh -> Flash`, `Memory Deluge -> Consult the Star Charts`, `Flare of Denial -> Occult Epiphany`, `Ancestral Vision -> Stock Up`, `See the Truth -> Winternight Stories`, `Compulsive Research -> Cryogen Relic`, `The Eternal Wanderer -> Sewer-veillance Cam` |
| 41 | **17 Nov 2026, 21:34** | `+7, -7` | Swaps : `Barrin, Tolarian Archmage -> Seasoned Cryomancer`, `Cryptic Coat -> Tishana's Tidebinder`, `Deceiver Exarch -> Glamermite`, `Pestermite -> Divining Duelist`, `Riftwing Cloudskate -> Sphinx of False Conclusions`, `Smirking Spelljacker -> Emeritus of Ideation`, `Thought Monitor -> Quantum Riddler` |
| 42 | **17 Nov 2026, 21:28** | `+5, -5` | Swaps : `Baral, Chief of Compliance -> Bilbo, Thief in the Night`, `Ledger Shredder -> The Wondrous Wasp`, `Sea Gate Stormcaller -> Geist of Saint Thalia`, `The Reality Chip -> Astrologian's Planisphere`, `Aether Channeler -> Wan Shi Tong, Librarian` |
| 43 | **17 Nov 2026, 21:24** | `5 edits` | Éditions : `Captain Marvel, Earth's Protector`, `Clarion Conqueror`, `Spectacular Spider-Man`, `Securitron Squadron`, `Luminarch Aspirant` |
| 44 | **17 Nov 2026, 21:19** | `+5, -5` | Swaps : `Angel of Invention -> Sanguine Evangelist`, `Angel of Indemnity -> Voice of Victory`, `Flare of Fortitude -> Exorcise`, `Farewell -> Sunfall`, `Serra's Emissary -> Abandoned Air Temple` |
| 45 | **17 Nov 2026, 21:14** | `+12, -12` | Swaps : `Kytheon, Hero of Akros -> Guide of Souls`, `Qasali Pridemage -> Figure of Fable`, `Adanto Vanguard -> Luminarch Aspirant`, `Imposing Sovereign -> Spider-Woman, Stunning Savior`, `Intrepid Adversary -> Securitron Squadron`, `Selfless Spirit -> Spectacular Spider-Man`, `Reidane, God of the Worthy -> Agent Bishop, Man in Black`, `Force of Virtue -> Sage of the Skies`, `Steel Seraph -> Clarion Conqueror`, `Angel of Sanctions -> Captain Marvel, Earth's Protector`, `Elspeth, Knight-Errant -> Elspeth, Storm Slayer`, `March of Otherworldly Light -> Erode` |
| 46 | **11 Déc 2024, 22:28** | `1 edit` | Édition : `Twitching Doll` |
| 47 | **11 Déc 2024, 22:04** | `+1, -1, 1 edit` | Swap : `Bristly Bill, Spine Sower -> Twitching Doll` ; Édition : `Fear of Missing Out` |
| 48 | **11 Déc 2024, 22:01** | `+1, -1` | Swap : `Robber of the Rich -> Fear of Missing Out` |
