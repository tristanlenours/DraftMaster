// Système de Gamification, Trophées Universels & Spécifiques par Cube avec Éditeur Admin
class AchievementsManager {
  constructor() {
    this.storageKey = "mtg_draft_achievements_v1";
    this.customTrophiesKey = "mtg_custom_trophies_v1";
    this.state = this.loadState();
    this.customTrophies = this.loadCustomTrophies();

    // Trophées Universels et Spécifiques par défaut
    this.defaultTrophies = [
      // --- UNIVERSELS (TOUS LES CUBES) ---
      {
        id: "speed_toilet",
        scope: "ALL",
        title: "Speed Draft Toilettes",
        icon: "🚽",
        desc: "Terminer un draft complet en moins de 90 secondes.",
        xp: 150,
        category: "Vitesse",
        ruleType: "speed",
        threshold: 90
      },
      {
        id: "bomb_collector",
        scope: "ALL",
        title: "Bombardier Fou",
        icon: "💣",
        desc: "Drafter au moins 5 cartes de Tier S / Untapped ≥ 48.0.",
        xp: 150,
        category: "Puissance",
        ruleType: "bombs",
        threshold: 5
      },
      {
        id: "synergy_god",
        scope: "ALL",
        title: "Maître des Synergies",
        icon: "🧬",
        desc: "Atteindre un score de 98+/100 sur l'axe Synergie du Kiviat.",
        xp: 200,
        category: "Stratégie",
        ruleType: "synergy_score",
        threshold: 98
      },
      {
        id: "timmy_supreme",
        scope: "ALL",
        title: "Timmy Suprême",
        icon: "🦖",
        desc: "Avoir au moins 4 cartes à 6+ manas et conserver un Deck Score > 80.",
        xp: 150,
        category: "Style",
        ruleType: "heavy_spells",
        threshold: 4
      },
      {
        id: "five_color_greed",
        scope: "ALL",
        title: "5-Color Greedy",
        icon: "🌈",
        desc: "Jouer des sorts des 5 couleurs avec une note de Mana > 85.",
        xp: 250,
        category: "Audace",
        ruleType: "five_colors",
        threshold: 5
      },
      {
        id: "weenie_rush",
        scope: "ALL",
        title: "Weenie Rocket",
        icon: "⚡",
        desc: "Avoir une courbe ultra-basse (CMC moyen < 2.2) et un Deck Score > 85.",
        xp: 150,
        category: "Vitesse",
        ruleType: "avg_cmc",
        threshold: 2.2
      },
      {
        id: "grandmaster_score",
        scope: "ALL",
        title: "Grandmaster de l'Arène",
        icon: "👑",
        desc: "Atteindre un Deck Score global supérieur à 95/100.",
        xp: 300,
        category: "Prestige",
        ruleType: "overall_score",
        threshold: 95
      },
      {
        id: "hall_of_famer",
        scope: "ALL",
        title: "Légende du Mur",
        icon: "🏆",
        desc: "Enregistrer un deck dans le Top 3 du Mur des Records.",
        xp: 200,
        category: "Prestige",
        ruleType: "manual"
      },
      {
        id: "poly_cubeur",
        scope: "ALL",
        title: "Explorateur des 6 Cubes",
        icon: "🌐",
        desc: "Avoir drafté au moins une fois sur chacun des 6 Cubes du groupe.",
        xp: 250,
        category: "Collection",
        ruleType: "cubes_played",
        threshold: 6
      },

      // --- SPÉCIFIQUES : NICO (Fedor's Candyshop IRL) ---
      {
        id: "nico_storm_master",
        scope: "nico_candyshop",
        title: "Le Stormeur Fou",
        icon: "🌪️",
        desc: "Drafter un moteur Storm complet (Tendrils / Brain Freeze / Rituels) dans le Cube de Nico.",
        xp: 250,
        category: "Nico's Cube",
        ruleType: "keywords",
        keywords: ["storm", "tendrils", "freeze", "ritual", "dark ritual", "seething", "cabal", "lotus"],
        threshold: 4
      },
      {
        id: "nico_artifact_pro",
        scope: "nico_candyshop",
        title: "Le Pro de l'Artefact",
        icon: "🤖",
        desc: "Avoir au moins 8 artefacts / mana rocks / créatures-artefacts dans le Cube de Nico.",
        xp: 200,
        category: "Nico's Cube",
        ruleType: "type_count",
        targetType: "Artifact",
        threshold: 8
      },
      {
        id: "nico_reanimator",
        scope: "nico_candyshop",
        title: "Réanimateur des Enfers",
        icon: "💀",
        desc: "Drafter au moins 2 gros monstres (Griselbrand/Archon) + 2 sorts de réanimation dans le Cube de Nico.",
        xp: 200,
        category: "Nico's Cube",
        ruleType: "keywords",
        keywords: ["reanimate", "animate dead", "necromancy", "shallow", "entomb", "griselbrand", "archon", "atraxa"],
        threshold: 3
      },

      // --- SPÉCIFIQUES : TRISTAN (Titou's Tribal & Chromatic) ---
      {
        id: "titou_tribal_lord",
        scope: "titou_tribal",
        title: "Seigneur Tribal Absolu",
        icon: "👑",
        desc: "Drafter au moins 10 créatures d'une même tribu ou changélins dans le Cube Titou.",
        xp: 250,
        category: "Titou's Cube",
        ruleType: "type_count",
        targetType: "Creature",
        threshold: 10
      },

      // --- SPÉCIFIQUES : CÉDRIC (Strobinellus Vintage) ---
      {
        id: "cedric_tempo_king",
        scope: "cedric_vintage",
        title: "Roi du Tempo Vintage",
        icon: "⚡",
        desc: "Drafter au moins 6 sorts de contre / burn avec un CMC moyen < 2.0 dans le Cube de Cédric.",
        xp: 200,
        category: "Cédric's Cube",
        ruleType: "avg_cmc",
        threshold: 2.0
      },

      // --- SPÉCIFIQUES : PAPAYOU (Papayou_Cube) ---
      {
        id: "papayou_apocalypse",
        scope: "papayou_cube",
        title: "Apocalypse de Papayou",
        icon: "💥",
        desc: "Drafter au moins 4 cartes mythiques de puissance Untapped ≥ 49 dans le Papayou_Cube.",
        xp: 250,
        category: "Papayou's Cube",
        ruleType: "bombs",
        threshold: 4
      },

      // --- SPÉCIFIQUES : HUGE (Huge's Pauper Cube) ---
      {
        id: "huge_pauper_hero",
        scope: "huge_pauper",
        title: "Héros du Prolétariat",
        icon: "🛡️",
        desc: "Obtenir un Deck Score > 90 sur le Pauper Cube de Huge.",
        xp: 200,
        category: "Huge's Cube",
        ruleType: "overall_score",
        threshold: 90
      }
    ];

    this.titles = [
      "Apprenti Drafter",
      "Mage de Guilde",
      "Initié du Limité",
      "Spike de Boutique",
      "Seigneur de Draft",
      "Maître du Tempo",
      "Champion de l'Arène",
      "Arpenteur Mythique",
      "Grand Arbitre de Dominaria",
      "Titan Éternel de Magic"
    ];
  }

  loadState() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      xp: 0,
      unlockedIds: [],
      playedCubes: [],
      fastestDraftSec: 999
    };
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  loadCustomTrophies() {
    const saved = localStorage.getItem(this.customTrophiesKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  }

  saveCustomTrophies() {
    localStorage.setItem(this.customTrophiesKey, JSON.stringify(this.customTrophies));
  }

  getAllTrophies() {
    return [...this.defaultTrophies, ...this.customTrophies];
  }

  addCustomTrophy(trophy) {
    const newTrophy = {
      id: "custom_" + Date.now(),
      scope: trophy.scope || "ALL",
      title: trophy.title.trim(),
      icon: trophy.icon.trim() || "🏆",
      desc: trophy.desc.trim(),
      xp: parseInt(trophy.xp) || 150,
      category: trophy.scope === "ALL" ? "Universel (Custom)" : `${trophy.scope} (Custom)`,
      ruleType: trophy.ruleType || "bombs",
      threshold: parseFloat(trophy.threshold) || 4,
      targetType: trophy.targetType || "",
      keywords: trophy.keywords ? trophy.keywords.split(",").map(k => k.trim().toLowerCase()) : [],
      isCustom: true
    };

    this.customTrophies.push(newTrophy);
    this.saveCustomTrophies();
    showToast(`🏆 Trophée spécifique créé : "${newTrophy.title}" !`);
    this.render();
    if (adminStudio) adminStudio.renderTrophiesTab();
  }

  deleteCustomTrophy(trophyId) {
    this.customTrophies = this.customTrophies.filter(t => t.id !== trophyId);
    this.saveCustomTrophies();
    showToast("✓ Trophée supprimé");
    this.render();
    if (adminStudio) adminStudio.renderTrophiesTab();
  }

  getLevelInfo() {
    const xp = this.state.xp;
    const level = Math.min(10, Math.floor(xp / 300) + 1);
    const currentLvlXp = xp % 300;
    const progressPercent = Math.min(100, Math.round((currentLvlXp / 300) * 100));
    const title = this.titles[level - 1] || "Légende Vivante";
    return { level, xp, currentLvlXp, progressPercent, title };
  }

  unlock(trophyId) {
    if (this.state.unlockedIds.includes(trophyId)) return;

    const all = this.getAllTrophies();
    const trophy = all.find(t => t.id === trophyId);
    if (!trophy) return;

    this.state.unlockedIds.push(trophyId);
    this.state.xp += trophy.xp;
    this.saveState();

    this.showUnlockPopup(trophy);
    this.triggerConfetti();
    this.render();
  }

  showUnlockPopup(trophy) {
    const popup = document.getElementById("trophy-popup");
    if (!popup) return;

    document.getElementById("trophy-popup-icon").textContent = trophy.icon;
    document.getElementById("trophy-popup-title").textContent = trophy.title;
    document.getElementById("trophy-popup-desc").textContent = `${trophy.desc} (+${trophy.xp} XP)`;

    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), 4500);
  }

  // Vérification intelligente de tous les trophées (Universels + Spécifiques au Cube)
  checkAchievements(mainboard, evalResult, draftDurationSec, cubeId) {
    const nonLands = mainboard.filter(c => c.type !== "Land");
    const spells = mainboard.filter(c => c.type !== "Land");
    const avgCmc = spells.length > 0 ? spells.reduce((acc, c) => acc + (c.cmc || 1), 0) / spells.length : 3.0;
    const colors = new Set(mainboard.map(c => c.color).filter(c => c && c !== "Terrain" && c !== "Incolore"));

    // Suivi de collection des cubes
    if (!this.state.playedCubes.includes(cubeId)) {
      this.state.playedCubes.push(cubeId);
      if (this.state.playedCubes.length >= 6) {
        this.unlock("poly_cubeur");
      }
      this.saveState();
    }

    const allTrophies = this.getAllTrophies();

    allTrophies.forEach(trophy => {
      // Filtrer par scope de cube
      if (trophy.scope !== "ALL" && trophy.scope !== cubeId) {
        return;
      }

      if (trophy.ruleType === "speed" && draftDurationSec > 0 && draftDurationSec <= trophy.threshold) {
        this.unlock(trophy.id);
      }
      else if (trophy.ruleType === "bombs") {
        const bombCount = mainboard.filter(c => (c.rating && c.rating >= 48) || c.tier === "S").length;
        if (bombCount >= trophy.threshold) this.unlock(trophy.id);
      }
      else if (trophy.ruleType === "synergy_score" && evalResult.scores.synergy >= trophy.threshold) {
        this.unlock(trophy.id);
      }
      else if (trophy.ruleType === "overall_score" && evalResult.overallScore >= trophy.threshold) {
        this.unlock(trophy.id);
      }
      else if (trophy.ruleType === "heavy_spells") {
        const heavyCount = mainboard.filter(c => (c.cmc || 1) >= 6).length;
        if (heavyCount >= trophy.threshold && evalResult.overallScore >= 80) this.unlock(trophy.id);
      }
      else if (trophy.ruleType === "five_colors" && colors.size >= 5 && evalResult.scores.mana >= 85) {
        this.unlock(trophy.id);
      }
      else if (trophy.ruleType === "avg_cmc" && avgCmc <= trophy.threshold && evalResult.overallScore >= 80) {
        this.unlock(trophy.id);
      }
      else if (trophy.ruleType === "type_count") {
        const count = mainboard.filter(c => c.type && c.type.toLowerCase().includes(trophy.targetType.toLowerCase())).length;
        if (count >= trophy.threshold) this.unlock(trophy.id);
      }
      else if (trophy.ruleType === "keywords" && trophy.keywords && trophy.keywords.length > 0) {
        let matchCount = 0;
        mainboard.forEach(c => {
          const str = `${c.name} ${c.comment || ''}`.toLowerCase();
          if (trophy.keywords.some(k => str.includes(k))) matchCount++;
        });
        if (matchCount >= trophy.threshold) this.unlock(trophy.id);
      }
    });

    this.render();
  }

  triggerConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ["#f5a623", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ffd700"];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10
      });
    }

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.rotation += p.rSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      frame++;
      if (frame < 100) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
  }

  render() {
    const lvl = this.getLevelInfo();

    const lvlEl = document.getElementById("player-level-num");
    const titleEl = document.getElementById("player-level-title");
    const xpEl = document.getElementById("player-xp-count");
    const barEl = document.getElementById("player-xp-bar");
    const gridEl = document.getElementById("trophies-grid");

    if (lvlEl) lvlEl.textContent = `Niv. ${lvl.level}`;
    if (titleEl) titleEl.textContent = lvl.title;
    if (xpEl) xpEl.textContent = `${lvl.xp} XP (Prochain niveau : ${300 - lvl.currentLvlXp} XP)`;
    if (barEl) barEl.style.width = `${lvl.progressPercent}%`;

    if (gridEl) {
      const currentCubeId = draftEngine ? draftEngine.currentCubeId : "peasant_360";
      const all = this.getAllTrophies();

      gridEl.innerHTML = all.map(t => {
        const isUnlocked = this.state.unlockedIds.includes(t.id);
        const isCurrentCubeSpecific = t.scope === currentCubeId;
        const isUniversal = t.scope === "ALL";

        return `
          <div class="trophy-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrentCubeSpecific ? 'current-cube-trophy' : ''}">
            <div class="trophy-icon">${t.icon}</div>
            <div class="trophy-info">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div class="trophy-title">${t.title} ${isUnlocked ? '✓' : ''}</div>
                <span style="font-size:10px;padding:1px 6px;border-radius:10px;background:${isUniversal ? '#334155' : '#8b5cf6'};color:#fff">
                  ${isUniversal ? 'Universel' : t.category}
                </span>
              </div>
              <div class="trophy-desc">${t.desc}</div>
              <div class="trophy-xp">+${t.xp} XP</div>
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

const achievements = new AchievementsManager();
