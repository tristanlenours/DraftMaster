#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simulateur de Draft CLI : 8 Sièges (1 Joueur / Bot + 7 Bots IA) sur le Cube Titou (ou tout Cube).
Exécute un draft complet de 45 cartes, construit les 8 decks (23 sorts + 17 terrains)
et calcule le Graphe de Kiviat et les Trophées pour toute la table.
"""

import json
import random
import re
import sys
from pathlib import Path

# Encodage console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

APP_DIR = Path(__file__).resolve().parent
JS_DB_PATH = APP_DIR / "js" / "cubes_static_db.js"

# 1. Chargement de la base statique des Cubes
def load_cubes_db():
    with open(JS_DB_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    json_match = re.search(r"const CUBES_STATIC_DB\s*=\s*(\{.*\});", content, re.DOTALL)
    if not json_match:
        raise ValueError("Impossible de parser CUBES_STATIC_DB")
    return json.loads(json_match.group(1))

# 2. Algorithme des Bots IA (Heuristique Draftmancer à 3 Phases)
def calculate_pick_score(card, current_picks):
    tier_map = {"S": 98, "A": 85, "B": 72, "C": 56, "D": 40}
    base_score = tier_map.get(card.get("tier", "B"), 65)
    pick_count = len(current_picks)

    # PHASE 1 : PACK 1 (Picks 0 à 8 — Exploration & Force Brute)
    if pick_count < 8:
        if card.get("color") in ["Terrain", "Incolore"]:
            base_score += 3
        return max(15.0, min(99.0, base_score))

    # Calcul du vecteur de préférences de couleurs
    color_weights = {"Blanc": 0, "Bleu": 0, "Noir": 0, "Rouge": 0, "Vert": 0}
    for c in current_picks:
        col = c.get("color")
        if col in color_weights:
            color_weights[col] += tier_map.get(c.get("tier", "B"), 50)

    dominant = sorted(color_weights.keys(), key=lambda k: color_weights[k], reverse=True)[:2]
    card_col = card.get("color")

    # PHASE 2 : FIN PACK 1 & PACK 2 (Picks 8 à 30 — Commitment)
    if pick_count < 30:
        if card_col in ["Terrain", "Incolore"]:
            base_score += 6
        elif card_col in dominant:
            base_score += 16
        elif card_col == "Multicolore":
            base_score += 5
        else:
            base_score -= 22

        cmc = min(max(card.get("cmc", 1), 1), 6)
        cmc_counts = {}
        for c in current_picks:
            c_cmc = min(max(c.get("cmc", 1), 1), 6)
            cmc_counts[c_cmc] = cmc_counts.get(c_cmc, 0) + 1
        if cmc in [2, 3] and cmc_counts.get(cmc, 0) < 4:
            base_score += 4
        return max(15.0, min(99.0, base_score))

    # PHASE 3 : PACK 3 (Picks 30 à 45 — Fixing & Courbe)
    if card_col in ["Terrain", "Incolore"]:
        base_score += 18
    elif card_col in dominant:
        base_score += 24
    elif card_col == "Multicolore":
        base_score -= 10
    else:
        base_score -= 45

    cmc = min(max(card.get("cmc", 1), 1), 6)
    cmc_counts = {}
    for c in current_picks:
        c_cmc = min(max(c.get("cmc", 1), 1), 6)
        cmc_counts[c_cmc] = cmc_counts.get(c_cmc, 0) + 1

    if cmc == 2 and cmc_counts.get(2, 0) < 4:
        base_score += 12
    elif cmc == 3 and cmc_counts.get(3, 0) < 4:
        base_score += 8
    elif cmc >= 5 and (cmc_counts.get(5, 0) + cmc_counts.get(6, 0)) >= 5:
        base_score -= 15

    return max(15.0, min(99.0, base_score))

# 3. Auto-Build Karsten (23 spells + 17 lands)
def auto_build_deck(pool):
    non_lands = [c for c in pool if "Land" not in c.get("type", "") and c.get("color") != "Terrain"]
    non_basic_lands = [c for c in pool if "Land" in c.get("type", "") or c.get("color") == "Terrain"]

    # Couleurs dominantes
    color_weights = {"Blanc": 0, "Bleu": 0, "Noir": 0, "Rouge": 0, "Vert": 0}
    for c in pool:
        col = c.get("color")
        if col in color_weights:
            rating = c.get("rating", 35.0)
            color_weights[col] += rating

    top_colors = sorted(color_weights.keys(), key=lambda k: color_weights[k], reverse=True)[:2]

    # Tri des sorts par affinité de couleur et note Untapped
    def sort_key(c):
        col = c.get("color")
        on_color = (col in top_colors) or (col in ["Incolore", "Multicolore"])
        rating = c.get("rating", 35.0)
        return (1 if on_color else 0, rating)

    non_lands.sort(key=sort_key, reverse=True)
    mainboard = non_lands[:23] + non_basic_lands

    # Pips de mana colorés
    pips = {"Blanc": 0, "Bleu": 0, "Noir": 0, "Rouge": 0, "Vert": 0}
    for c in non_lands[:23]:
        col = c.get("color")
        if col in pips:
            pips[col] += max(c.get("cmc", 1), 1)

    total_pips = sum(pips.values()) or 1
    target_basics = max(0, 17 - len(non_basic_lands))

    basics = {}
    for col, count in pips.items():
        basics[col] = round((count / total_pips) * target_basics)

    while sum(basics.values()) < target_basics:
        best_col = max(pips.keys(), key=lambda k: pips[k])
        basics[best_col] += 1
    while sum(basics.values()) > target_basics:
        best_col = max(basics.keys(), key=lambda k: basics[k])
        basics[best_col] -= 1

    return mainboard, basics, top_colors

# 4. Évaluation du Graphe de Kiviat (5 Axes)
def evaluate_kiviat(mainboard, basics, top_colors):
    non_lands = [c for c in mainboard if "Land" not in c.get("type", "") and c.get("color") != "Terrain"]
    non_basic_lands = [c for c in mainboard if "Land" in c.get("type", "") or c.get("color") == "Terrain"]
    total_lands = len(non_basic_lands) + sum(basics.values())

    # 1. Puissance Brute (Untapped)
    avg_untapped = sum(c.get("rating", 35.0) for c in non_lands) / max(len(non_lands), 1)
    raw_power = min(100, max(20, round((avg_untapped / 48.0) * 98)))

    # 2. Synergie
    col_counts = {}
    for c in non_lands:
        col = c.get("color")
        if col and col not in ["Incolore", "Multicolore"]:
            col_counts[col] = col_counts.get(col, 0) + 1

    sorted_counts = sorted(col_counts.values(), reverse=True)
    c1 = sorted_counts[0] if len(sorted_counts) > 0 else 0
    c2 = sorted_counts[1] if len(sorted_counts) > 1 else 0
    off_color = sum(sorted_counts[2:])

    synergy = 50
    if c1 >= 10 and c2 >= 6: synergy += 35
    elif c1 >= 15: synergy += 45
    elif c1 >= 8 and c2 >= 8: synergy += 30
    else: synergy += 10
    synergy -= (off_color * 6)
    synergy = min(100, max(15, synergy))

    # 3. Courbe CMC
    cmc_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
    for c in non_lands:
        cmc = min(max(c.get("cmc", 1), 1), 6)
        cmc_counts[cmc] += 1

    curve = 100
    if cmc_counts[2] < 4: curve -= (4 - cmc_counts[2]) * 8
    if cmc_counts[3] < 3: curve -= (3 - cmc_counts[3]) * 6
    if (cmc_counts[5] + cmc_counts[6]) > 5: curve -= ((cmc_counts[5] + cmc_counts[6]) - 5) * 8
    curve = min(100, max(15, curve))

    # 4. Base de Mana
    mana = 80
    if total_lands < 15: mana -= (15 - total_lands) * 12
    elif total_lands > 18: mana -= (total_lands - 18) * 10
    else: mana += 10
    mana += min(15, len(non_basic_lands) * 4)
    if off_color > 2 and len(non_basic_lands) < 2: mana -= 20
    mana = min(100, max(15, mana))

    # 5. Interaction
    keywords = ["destroy", "exile", "damage", "counter", "target", "kill", "bolt", "swords", "down"]
    removals = sum(1 for c in non_lands if any(k in f"{c.get('name','')} {c.get('comment','')}".lower() for k in keywords))
    interaction = 95 if 4 <= removals <= 7 else (75 if removals >= 2 else 50)

    overall = round(raw_power * 0.20 + synergy * 0.25 + curve * 0.20 + mana * 0.20 + interaction * 0.15)
    return {
        "overall": overall,
        "raw_power": raw_power,
        "synergy": synergy,
        "curve": curve,
        "mana": mana,
        "interaction": interaction,
        "avg_untapped": round(avg_untapped, 1),
        "removals": removals,
        "cmc_counts": cmc_counts
    }

# 5. Déroulement du Draft 8 Sièges
def run_draft_simulation(cube_id="titou_tribal"):
    cubes_db = load_cubes_db()
    cube = cubes_db.get(cube_id)
    if not cube:
        print(f"Cube '{cube_id}' non trouvé.")
        return

    print("=" * 75)
    print(f"🎴 SIMULATION DE CUBE DRAFT : {cube['name']}")
    print(f"👑 Propriétaire : {cube['owner']} | Taille du Cube : {len(cube['cards'])} cartes")
    print("🤖 Table : Siège 1 (Joueur Solo / Tristan) + Sièges 2 à 8 (7 Bots IA)")
    print("=" * 75)

    pool = list(cube["cards"])
    random.shuffle(pool)

    # 24 boosters de 15 cartes = 360 cartes
    total_packs = 24
    cards_per_pack = 15
    packs = [pool[i * cards_per_pack : (i + 1) * cards_per_pack] for i in range(total_packs)]

    seats_picks = [[] for _ in range(8)]
    p1p1_picks = []

    # 3 Rounds de boosters
    for round_num in range(1, 4):
        active_packs = packs[(round_num - 1) * 8 : round_num * 8]
        direction = "➔ Gauche" if round_num != 2 else "➔ Droite"
        print(f"\n📦 Booster {round_num}/3 ({direction}) ouvert...")

        for pick_num in range(15):
            for s in range(8):
                current_pack = active_packs[s]
                # Choisir la meilleure carte
                best_idx = max(range(len(current_pack)), key=lambda idx: calculate_pick_score(current_pack[idx], seats_picks[s]))
                chosen = current_pack.pop(best_idx)
                seats_picks[s].append(chosen)

                if round_num == 1 and pick_num == 0:
                    p1p1_picks.append(chosen)

            # Rotation des boosters
            if round_num == 2:
                active_packs = [active_packs[-1]] + active_packs[:-1]
            else:
                active_packs = active_packs[1:] + [active_packs[0]]

    # Résultats et analyse des 8 decks
    print("\n" + "=" * 75)
    print("📊 RÉSULTATS DU DRAFT & ÉVALUATION DES 8 DECKS (KIVIAT + AUTO-BUILD)")
    print("=" * 75)

    leaderboard = []

    for s in range(8):
        name = "Joueur 1 (Tristan)" if s == 0 else f"Bot {s + 1}"
        picks = seats_picks[s]
        mainboard, basics, top_colors = auto_build_deck(picks)
        kiviat = evaluate_kiviat(mainboard, basics, top_colors)

        # Détection d'archétype
        archetype = f"{' / '.join(top_colors)} Midrange"
        p1p1_name = p1p1_picks[s]["name"]
        bombs_count = sum(1 for c in mainboard if c.get("rating", 0) >= 48.0 or c.get("tier") == "S")

        leaderboard.append({
            "seat": s + 1,
            "name": name,
            "score": kiviat["overall"],
            "archetype": archetype,
            "p1p1": p1p1_name,
            "kiviat": kiviat,
            "bombs": bombs_count,
            "basics": basics
        })

    # Tri par score global
    leaderboard.sort(key=lambda x: x["score"], reverse=True)

    print(f"{'Rang':<5} | {'Joueur / Siège':<22} | {'Score':<8} | {'Archétype':<18} | {'P1P1 Clé':<24} | {'Kiviat (P/S/C/M/I)'}")
    print("-" * 105)

    for rank, entry in enumerate(leaderboard, 1):
        medal = "🥇" if rank == 1 else ("🥈" if rank == 2 else ("🥉" if rank == 3 else f"#{rank}"))
        k = entry["kiviat"]
        k_str = f"P:{k['raw_power']} S:{k['synergy']} C:{k['curve']} M:{k['mana']} I:{k['interaction']}"
        print(f"{medal:<5} | {entry['name']:<22} | {entry['score']:>3}/100 | {entry['archetype']:<18} | {entry['p1p1'][:22]:<24} | {k_str}")

    # Focus détaillé sur le deck du Joueur 1 (Tristan)
    p1 = next(e for e in leaderboard if "Tristan" in e["name"])
    print("\n" + "─" * 75)
    print(f"👑 FOCUS SUR VOTRE DECK : {p1['name']}")
    print(f"⚡ Deck Score Kiviat : {p1['score']}/100 | Note Untapped Moyenne : {p1['kiviat']['avg_untapped']}/53.0")
    print(f"🎨 Archétype : {p1['archetype']} | First Pick (P1P1) : {p1['p1p1']}")
    print(f"💣 Nombre de Bombes (Tier S / Untapped ≥ 48) : {p1['bombs']}")
    print(f"🏔️ Terrains de Base Karsten : {', '.join(f'{k}: {v}' for k, v in p1['basics'].items() if v > 0)}")
    print(f"📈 Courbe CMC : T1: {p1['kiviat']['cmc_counts'][1]} | T2: {p1['kiviat']['cmc_counts'][2]} | T3: {p1['kiviat']['cmc_counts'][3]} | T4: {p1['kiviat']['cmc_counts'][4]} | T5: {p1['kiviat']['cmc_counts'][5]} | T6+: {p1['kiviat']['cmc_counts'][6]}")
    print("─" * 75)
    print("✓ Simulation du draft exécutée avec succès !")

if __name__ == "__main__":
    cube_arg = sys.argv[1] if len(sys.argv) > 1 else "titou_tribal"
    run_draft_simulation(cube_arg)
