import urllib.request
import json
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

url = "https://www.17lands.com/card_ratings/data?expansion=MKM&format=PremierDraft&start_date=2024-02-06&end_date=2024-05-01"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        for c in data:
            if c.get("name") == "Novice Inspector":
                gih = (c.get("ever_drawn_win_rate") or 0) * 100
                oh = (c.get("opening_hand_win_rate") or 0) * 100
                alsa = c.get("avg_seen")
                games = c.get("ever_drawn_game_count")
                iwd = (c.get("drawn_improvement_win_rate") or 0) * 100
                print("=" * 60)
                print("📊 STATISTIQUES RÉELLES 17LANDS (MKM PREMIER DRAFT)")
                print(f"🃏 Carte : {c.get('name')}")
                print(f"📈 GIH WR (Game in Hand Win Rate) : {gih:.2f}% (Sur {games:,} parties)")
                print(f"✋ OH WR (Opening Hand Win Rate)  : {oh:.2f}%")
                print(f"👀 ALSA (Average Last Seen At)    : {alsa:.2f}")
                print(f"⚡ IWD (Improvement When Drawn)   : {iwd:+.2f}%")
                print("=" * 60)
                break
except Exception as e:
    print("Erreur 17lands:", e)
