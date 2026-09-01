import urllib.request
import json
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

url = "https://cubecobra.com/cube/api/cubeJSON/1itq2"
req = urllib.request.Request(url, headers={"User-Agent": "AntigravityCubeCompiler/1.0"})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        name = data.get("name", "")
        owner = data.get("owner_name", "")
        cards = data.get("cards", {}).get("mainboard", [])
        print(f"Cube 1itq2 : Nom='{name}', Propriétaire='{owner}', Nb cartes={len(cards)}")
except Exception as e:
    print("Erreur fetch 1itq2 :", e)
