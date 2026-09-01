import csv
import json
import urllib.parse
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
EXPORTS_DIR = REPO_ROOT / "02_culture" / "04_magic" / "03_exports"
APP_DIR = REPO_ROOT / "05_projets" / "mtg_cube_draft_app"
JS_DIR = APP_DIR / "js"

# 1. Cube Titou (545 cards)
titou_csv = EXPORTS_DIR / "cube-titou-tribal-chromatic-cubecobra.csv"
titou_cards = []
if titou_csv.exists():
    with open(titou_csv, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("name", "").strip()
            if not name: continue
            cmc = 1
            try:
                cmc = int(float(row.get("CMC", 1)))
            except:
                pass
            typ = row.get("Type", "Creature")
            col = row.get("Color", "Incolore")
            color_map = {"W": "Blanc", "U": "Bleu", "B": "Noir", "R": "Rouge", "G": "Vert"}
            color_name = color_map.get(col, "Multicolore" if len(col) > 1 else "Incolore")
            if "Land" in typ: color_name = "Terrain"
            
            rarity = row.get("Rarity", "rare").lower()
            tier = "B"
            if rarity == "mythic": tier = "S"
            elif rarity == "rare": tier = "A"
            elif rarity == "uncommon": tier = "B"
            else: tier = "C"

            titou_cards.append({
                "name": name,
                "tier": tier,
                "color": color_name,
                "cmc": cmc,
                "type": typ,
                "comment": f"Carte tribale / synergie clé du Cube Titou ({typ}).",
                "image": f"https://api.scryfall.com/cards/named?exact={urllib.parse.quote(name)}&format=image&version=normal"
            })

print(f"Cube Titou chargé : {len(titou_cards)} cartes")

# 2. Registre des Cubes
cubes_registry = {
    "peasant_360": {
        "id": "peasant_360",
        "name": "Digital Peasant+ 360 (MTG Arena)",
        "owner": "Tristan",
        "size": 360,
        "description": "Cube optimisé 360 cartes pour MTG Arena. 85% Communes/Uncos modernes (MH3, OTJ, BLB, DSK) + 30 Bilands Rares détap.",
        "cards": "CUBE_CARDS_PEASANT" # Refer to existing array
    },
    "titou_tribal": {
        "id": "titou_tribal",
        "name": "Titou's Tribal & Chromatic Cube",
        "owner": "Tristan (@eltitou007)",
        "size": len(titou_cards),
        "cubecobra_id": "1itq2",
        "description": "545 cartes physiques. Synergies tribales profondes (Humains, Elfes, Gobelins, Vampires, Zombies, Anges, Dragons), Changélins et ABUR Duals.",
        "cards": titou_cards
    },
    "cedric_vintage": {
        "id": "cedric_vintage",
        "name": "Strobinellus's Vintage Unpowered",
        "owner": "Cédric N.",
        "size": 720,
        "cubecobra_id": "17",
        "description": "720 cartes Vintage Unpowered de très haute puissance. Archétypes denses, interactifs et rapides.",
        "cards": [] # Loaded via CubeCobra API / dynamic fallback
    },
    "nico_candyshop": {
        "id": "nico_candyshop",
        "name": "Fedor's Candyshop IRL",
        "owner": "Nico (@Fedor007)",
        "size": 730,
        "cubecobra_id": "1nxrs",
        "description": "730 cartes Legacy/Vintage physique. Piliers iconiques : Reanimator, Sneak Attack, Delver Tempo, Contrôle lourd.",
        "cards": []
    },
    "huge_pauper": {
        "id": "huge_pauper",
        "name": "Huge's Pauper Cube",
        "owner": "Huge",
        "size": 450,
        "description": "450 cartes Communes pures. Combat de créatures au sol, card advantage mesuré et respect strict des fondamentaux.",
        "cards": []
    }
}

out_file = JS_DIR / "cubes_registry.js"
with open(out_file, "w", encoding="utf-8") as f:
    f.write("// Registre Multi-Cubes du Groupe & Parser CubeCobra\n")
    f.write("const CUBE_TITOU_CARDS = " + json.dumps(titou_cards, indent=2, ensure_ascii=False) + ";\n\n")
    f.write("const CUBES_PRESETS = " + json.dumps(cubes_registry, indent=2, ensure_ascii=False) + ";\n")

print(f"✓ Registre Multi-Cubes écrit dans : {out_file}")
