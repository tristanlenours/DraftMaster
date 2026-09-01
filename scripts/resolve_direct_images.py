import urllib.request
import urllib.parse
import json
import time
import sys
from pathlib import Path

# Fix stdout encoding & flushing
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_DIR = REPO_ROOT / "05_projets" / "mtg_cube_draft_app"
JS_DB_PATH = APP_DIR / "js" / "cubes_static_db.js"
CACHE_PATH = APP_DIR / "data" / "scryfall_direct_images.json"
CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

image_cache = {}
if CACHE_PATH.is_file():
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            image_cache = json.load(f)
    except Exception:
        pass

print(f"✓ {len(image_cache)} images directes déjà en cache.", flush=True)

import re
with open(JS_DB_PATH, "r", encoding="utf-8") as f:
    content = f.read()

json_match = re.search(r"const CUBES_STATIC_DB\s*=\s*(\{.*\});", content, re.DOTALL)
cubes_data = json.loads(json_match.group(1))

all_card_names = set()
for cube_key, cube_obj in cubes_data.items():
    for c in cube_obj.get("cards", []):
        all_card_names.add(c["name"])

print(f"Total cartes uniques : {len(all_card_names)}", flush=True)

headers = {
    "User-Agent": "CubeDraftMastery/1.0",
    "Accept": "application/json;q=0.9,*/*;q=0.8"
}

missing_names = [n for n in all_card_names if n not in image_cache]
print(f"Cartes manquantes à résoudre : {len(missing_names)}", flush=True)

def fetch_batch_collection(names_batch):
    url = "https://api.scryfall.com/cards/collection"
    # Nettoyer les noms
    clean_idents = []
    for n in names_batch:
        # Prendre la première moitié si split card ou DFC avec //
        base_n = n.split(" // ")[0].strip()
        clean_idents.append({"name": base_n})

    payload = json.dumps({"identifiers": clean_idents}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for card in data.get("data", []):
                req_name = card.get("name")
                img_url = card.get("image_uris", {}).get("normal")
                if not img_url and "card_faces" in card:
                    img_url = card["card_faces"][0].get("image_uris", {}).get("normal")
                if img_url:
                    image_cache[req_name] = img_url
                    for orig in names_batch:
                        if orig.lower() in req_name.lower() or req_name.lower() in orig.lower():
                            image_cache[orig] = img_url
    except Exception as e:
        print(f"Erreur batch : {e}", flush=True)

batch_size = 70
total_batches = (len(missing_names) + batch_size - 1) // batch_size
for i in range(0, len(missing_names), batch_size):
    batch = missing_names[i : i + batch_size]
    print(f"  Batch {i // batch_size + 1}/{total_batches} ({len(batch)} cartes)...", flush=True)
    fetch_batch_collection(batch)
    time.sleep(0.12)

with open(CACHE_PATH, "w", encoding="utf-8") as f:
    json.dump(image_cache, f, indent=2, ensure_ascii=False)

print(f"✓ Cache sauvegardé : {len(image_cache)} images résolues.", flush=True)

# Mise à jour de cubes_static_db.js
updated = 0
for cube_key, cube_obj in cubes_data.items():
    for c in cube_obj.get("cards", []):
        name = c["name"]
        if name in image_cache:
            c["image"] = image_cache[name]
            updated += 1
        elif name.split(" // ")[0] in image_cache:
            c["image"] = image_cache[name.split(" // ")[0]]
            updated += 1
        else:
            c["image"] = f"https://api.scryfall.com/cards/named?fuzzy={urllib.parse.quote(name)}&format=image&version=normal"

with open(JS_DB_PATH, "w", encoding="utf-8") as f:
    f.write("// BASE DE DONNÉES STATIQUE DES 6 CUBES AVEC IMAGES DIRECTES CDN CLOUDFLARE\n")
    f.write("const CUBES_STATIC_DB = " + json.dumps(cubes_data, indent=2, ensure_ascii=False) + ";\n")

print(f"✓ cubes_static_db.js mis à jour ({updated} images directes CDN Cloudflare) !", flush=True)
