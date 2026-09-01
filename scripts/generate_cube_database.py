import json
import re
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
APP_DIR.mkdir(parents=True, exist_ok=True)
JS_DIR = APP_DIR / "js"
JS_DIR.mkdir(parents=True, exist_ok=True)
CSS_DIR = APP_DIR / "css"
CSS_DIR.mkdir(parents=True, exist_ok=True)

TXT_PATH = EXPORTS_DIR / "cube-arena-peasant-plus-360.txt"

with open(TXT_PATH, "r", encoding="utf-8") as f:
    card_names = [line.strip()[2:] for line in f if line.strip()]

# Dictionnaire de métadonnées, Tiers et Commentaires Pédagogiques
def get_card_meta(name):
    # Tier: S, A, B, C, D
    # Archetypes, cmc, type, colors, image, comment
    
    # 1. Tier S (Bombes de format / First Picks incontournables)
    tier_s_cards = {
        "Fable of the Mirror-Breaker": ("S", "Rouge", 3, "Enchantment", "La meilleure carte du Cube en valeur pure : crée un jeton Trésor, filtre 2 cartes, puis se transforme en Reflets de Kiki-Jiki pour copier vos créatures."),
        "Dreadhorde Arcanist": ("S", "Rouge", 2, "Creature", "Moteur de tempo absolu en Spellslinger. Rejoue gratuitement tous vos éphémères et rituels à 1 mana (Lightning Bolt, Consider, Thoughtseize) à chaque attaque."),
        "Hardened Scales": ("S", "Vert", 1, "Enchantment", "Le cœur nucléaire de Selesnya Marqueurs. Double l'impact de Rosie Cotton, Conclave Mentor, Pelt Collector et Quirion Beastcaller."),
        "Birthing Pod": ("S", "Vert", 4, "Artifact", "Moteur de boîte à outils légendaire. Sacrifie vos créatures à ETB pour aller chercher la réponse exacte sur votre courbe de mana."),
        "Insidious Roots": ("S", "Golgari", 2, "Enchantment", "Pilier ultime de Golgari Gravebreak. Génère une armée de plantes et accélère le mana chaque fois qu'une carte quitte votre cimetière."),
        "Priest of Forgotten Gods": ("S", "Noir", 2, "Creature", "Le meilleur moteur de sacrifice du Cube : force l'adversaire à sacrifier, perd des PV, vous fait piocher et donne 2 manas."),
        "Rosie Cotton of South Lane": ("S", "Selesnya", 3, "Creature", "Génère un jeton Nourriture et pose un marqueur +1/+1 à chaque création de jeton. Synergie explosive avec Tokens et Artefacts."),
        "Mayhem Devil": ("S", "Rakdos", 3, "Creature", "Inflige 1 blessure à n'importe quelle cible chaque fois qu'un joueur sacrifie un permanent (créature, trésor, indice, nourriture)."),
        "Soulherder": ("S", "Azorius", 3, "Creature", "Réactive gratuitement une capacité d'arrivée en jeu (ETB) à chaque tour tout en grossissant à chaque blink."),
        "Lurrus of the Dream-Den": ("S", "Orzhov", 3, "Creature", "Rejoue un permanent à 2 manas ou moins de votre cimetière chaque tour (Mishra's Bauble, Blood Artist, Nurturing Pixie)."),
        "Serra Paragon": ("S", "Blanc", 4, "Creature", "Rejoue des terrains ou des sorts à 3 manas ou moins depuis votre cimetière à chaque tour avec gain de points de vie."),
        "Smuggler's Copter": ("S", "Incolore", 2, "Artifact", "Véhicule volant 3/3 avec pilotage 1. Filtre votre main (loot) à chaque attaque et s'intègre dans n'importe quel deck."),
        "Sunfall": ("S", "Blanc", 5, "Sorcery", "Exile toutes les créatures de la table et vous laisse avec un incubateur géant prêt à clore la partie."),
        "Craterhoof Behemoth": ("S", "Vert", 8, "Creature", "Le finisher absolu des decks go-wide et elfes. Donne le piétinement et +X/+X à toute votre armée pour tuer en un coup.")
    }
    
    if name in tier_s_cards:
        t, col, cmc, typ, cmt = tier_s_cards[name]
        return {"tier": t, "color": col, "cmc": cmc, "type": typ, "comment": cmt}

    # 2. Tier A (Staples de grande qualité & Signposts d'archétype)
    tier_a_keywords = {
        "Lightning Bolt": ("A", "Rouge", 1, "Instant", "Le meilleur sort de dégâts direct du jeu. 3 blessures pour 1 mana, tue presque toutes les créatures du Cube."),
        "Thoughtseize": ("A", "Noir", 1, "Sorcery", "Disruption T1 suprême. Permet de voir la main adverse et d'exiler sa meilleure menace ou son moteur de jeu."),
        "Fatal Push": ("A", "Noir", 1, "Instant", "L'antibête de référence. Détruit n'importe quelle créature à 2 manas ou 4 manas avec Révolte (facile à déclencher avec Trésor/Fetch)."),
        "Ephemerate": ("A", "Blanc", 1, "Instant", "Blink une créature à l'arrivée en jeu et se répète gratuitement au tour suivant avec Rebond."),
        "Ruthless Lawbringer": ("A", "Orzhov", 2, "Creature", "Détruit n'importe quel permanent non-terrain adverse en sacrifiant une créature ou un jeton. Réutilisable à l'infini avec Pixie/Blink."),
        "Sprite Dragon": ("A", "Izzet", 2, "Creature", "Menace volante célérité qui grossit de +1/+1 à chaque éphémère ou rituel lancé."),
        "Third Path Iconoclast": ("A", "Izzet", 2, "Creature", "Crée un jeton soldat artefact 1/1 à chaque sort non-créature lancé. Nourrit à la fois Spells, Tokens et Artefacts."),
        "Broodspinner": ("A", "Golgari", 2, "Creature", "Meule 2 cartes, surveille et se sacrifie pour créer une armée d'araignées volantes 1/1 selon vos cartes de créatures au cimetière."),
        "Skilled Animator": ("A", "Azorius", 3, "Creature", "Transforme n'importe quel jeton Indice, Nourriture ou Trésor en un monstre artefact 5/5 tant qu'il reste en jeu."),
        "Eddymurk Crab": ("A", "Bleu", 8, "Creature", "Monstre 5/5 Flash coûtant souvent seulement 2 ou 3 manas en deck Spells, capable d'engager 2 créatures adverses."),
        "Inti, Seneschal of the Sun": ("A", "Rouge", 2, "Creature", "Donne le piétinement et +1/+1 en attaquant, et transforme chaque défausse en carte exilée jouable."),
        "Heroic Reinforcements": ("A", "Boros", 4, "Sorcery", "Crée deux soldats 1/1 et donne +1/+1 et la célérité à toute votre armée. Termine les parties en un tour."),
        "Blood Artist": ("A", "Noir", 2, "Creature", "Pousse l'adversaire au suicide à chaque mort de créature sur le terrain (chez vous comme chez lui)."),
        "Oni-Cult Anvil": ("A", "Rakdos", 2, "Artifact", "Génère un jeton construct 1/1 chaque tour où un artefact quitte le champ de bataille et draine 1 PV."),
        "Esika's Chariot": ("A", "Vert", 4, "Artifact", "Crée 2 chats 2/2 et duplique votre meilleur jeton (chat, incubateur 5/5, monstre 4/4) à chaque attaque."),
        "Snapcaster Mage": ("A", "Bleu", 2, "Creature", "Donne Flashback à n'importe quel sort de votre cimetière pour un retournement de situation en Flash."),
        "Restoration Angel": ("A", "Blanc", 4, "Creature", "Ange Flash 3/4 volant qui blink une créature pour la sauver d'un antibête ou réactiver son effet d'arrivée en jeu."),
        "Bloodbraid Elf": ("A", "Gruul", 4, "Creature", "Cascade légendaire : lance gratuitement un sort à 3 manas ou moins de votre bibliothèque tout en posant une 3/2 célérité.")
    }

    if name in tier_a_keywords:
        t, col, cmc, typ, cmt = tier_a_keywords[name]
        return {"tier": t, "color": col, "cmc": cmc, "type": typ, "comment": cmt}

    # 3. Terrains Rares & Duals (Tier A)
    if any(k in name for k in ["Fountain", "Grave", "Crypt", "Ground", "Garden", "Shrine", "Vents", "Tomb", "Foundry", "Pool", "Coast", "Shores", "Cliffs", "Gorge", "Thicket", "Courtyard", "Canal", "Marsh", "Vantage", "Sanctum", "Wastes", "River", "Springs", "Forest", "Brushland", "Koilos", "Reef", "Forge"]):
        return {
            "tier": "A",
            "color": "Terrain",
            "cmc": 0,
            "type": "Land",
            "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme."
        }

    # 4. Déductions par défaut pour les autres cartes (Tier B ou C)
    if any(k in name for k in ["Looter", "Inspector", "Pixie", "Charming", "Spiritbinder", "Tracker", "Reanimat", "Young Pyro", "Witness", "Cultivate", "Cast Down", "Counterspell", "Mana Leak", "Abrade", "Lightning Helix", "Repulsive", "Dovin's", "Baleful", "Fallen Shinobi", "Hostage", "Judith", "Halana", "King Darien", "Meren", "Shadowspear", "Skullclamp", "Hearse", "Bankbuster"]):
        return {
            "tier": "B",
            "color": "Multicolore" if "/" in name else "Synergie",
            "cmc": 2,
            "type": "Creature/Spell",
            "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées."
        }
    
    return {
        "tier": "C",
        "color": "Incolore/Mono",
        "cmc": 3,
        "type": "Card",
        "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck."
    }

def urllib_quote(s):
    import urllib.parse
    return urllib.parse.quote(s)

cards_database = []
for name in card_names:
    meta = get_card_meta(name)
    cards_database.append({
        "name": name,
        "tier": meta["tier"],
        "color": meta["color"],
        "cmc": meta["cmc"],
        "type": meta["type"],
        "comment": meta["comment"],
        "image": f"https://api.scryfall.com/cards/named?exact={urllib_quote(name)}&format=image&version=normal"
    })

js_content = f"""// Base de données des 360 cartes du Cube Peasant+ avec Tiers & Commentaires Pédagogiques
const CUBE_CARDS = {json.dumps(cards_database, indent=2, ensure_ascii=False)};
"""

with open(JS_DIR / "cube_data.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"✓ Base de données JavaScript générée : {JS_DIR / 'cube_data.js'} ({len(cards_database)} cartes)")
