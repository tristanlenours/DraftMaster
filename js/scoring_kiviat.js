// Moteur d'évaluation Mathématique & Graphe de Kiviat basé sur le Scoring Untapped (1.0 à 53.0+)
class ScoringKiviat {
  constructor() {
    this.axes = [
      { key: "rawPower", label: "Puissance Brute (Tiers)", weight: 0.20, max: 100 },
      { key: "synergy", label: "Synergie d'Archétype", weight: 0.25, max: 100 },
      { key: "curve", label: "Fluidité Courbe & Tempo", weight: 0.20, max: 100 },
      { key: "mana", label: "Stabilité & Base de Mana", weight: 0.20, max: 100 },
      { key: "interaction", label: "Densité d'Interaction", weight: 0.15, max: 100 }
    ];
  }

  evaluateDeck(mainboard, basics) {
    const nonLands = mainboard.filter(c => c.type !== "Land");
    const nonBasicLands = mainboard.filter(c => c.type === "Land");
    const totalBasics = Object.values(basics).reduce((a, b) => a + b, 0);
    const totalLands = nonBasicLands.length + totalBasics;

    // 1. Puissance Brute basée sur la répartition des Tiers (S = 100, A = 85, B = 70, C = 55, D = 40)
    const tierWeights = { "S": 100, "A": 85, "B": 70, "C": 55, "D": 40 };
    let totalTierScore = 0;
    nonLands.forEach(c => {
      const score = tierWeights[c.tier] || 60;
      totalTierScore += score;
    });
    const rawPowerScore = nonLands.length > 0 ? Math.round(totalTierScore / nonLands.length) : 50;

    // 2. Synergie d'Archétype
    const colorCounts = {};
    nonLands.forEach(c => {
      if (c.color && c.color !== "Incolore" && c.color !== "Multicolore") {
        colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
      }
    });
    const sortedColors = Object.values(colorCounts).sort((a, b) => b - a);
    const primaryColorCount = sortedColors[0] || 0;
    const secondaryColorCount = sortedColors[1] || 0;
    const offColorCount = sortedColors.slice(2).reduce((a, b) => a + b, 0);

    let synergyScore = 50;
    if (primaryColorCount >= 10 && secondaryColorCount >= 6) {
      synergyScore += 35; // Bicolore bien focalisé
    } else if (primaryColorCount >= 16) {
      synergyScore += 45; // Mono-couleur ultra-synergique
    } else if (primaryColorCount >= 8 && secondaryColorCount >= 8) {
      synergyScore += 30;
    } else {
      synergyScore += 10;
    }

    if (offColorCount > 3) {
      synergyScore -= (offColorCount * 6); // Pénalité dilution
    }
    synergyScore = Math.min(100, Math.max(10, synergyScore));

    // 3. Fluidité de la Courbe de Mana (CMC)
    const cmcCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    nonLands.forEach(c => {
      const cmc = Math.min(Math.max(c.cmc || 1, 1), 6);
      cmcCounts[cmc]++;
    });

    let curveScore = 100;
    const twoDrops = cmcCounts[2] || 0;
    const threeDrops = cmcCounts[3] || 0;
    const highDrops = (cmcCounts[5] || 0) + (cmcCounts[6] || 0);

    if (twoDrops < 4) curveScore -= (4 - twoDrops) * 8;
    if (threeDrops < 3) curveScore -= (3 - threeDrops) * 6;
    if (highDrops > 5) curveScore -= (highDrops - 5) * 8;
    if (cmcCounts[1] === 0 && twoDrops < 5) curveScore -= 10;
    curveScore = Math.min(100, Math.max(15, curveScore));

    // 4. Stabilité de la Base de Mana (Karsten Heuristics)
    let manaScore = 80;
    if (totalLands < 15) manaScore -= (15 - totalLands) * 12;
    else if (totalLands > 18) manaScore -= (totalLands - 18) * 10;
    else manaScore += 10; // Ratio parfait 16-17 lands

    // Bonus bilands détap / fixing
    manaScore += Math.min(15, nonBasicLands.length * 4);
    if (offColorCount > 2 && nonBasicLands.length < 2) {
      manaScore -= 20; // 3+ couleurs sans bilands = punition mana screw
    }
    manaScore = Math.min(100, Math.max(10, manaScore));

    // 5. Densité d'Interaction & Removals
    let interactionScore = 40;
    const interactionKeywords = ["destroy", "exile", "damage", "counter", "target", "return", "fight", "kill", "bolt", "swords", "push", "down"];
    let removalCount = 0;

    nonLands.forEach(c => {
      const text = `${c.name} ${c.comment || ''}`.toLowerCase();
      if (interactionKeywords.some(k => text.includes(k))) {
        removalCount++;
      }
    });

    if (removalCount >= 4 && removalCount <= 7) interactionScore = 95;
    else if (removalCount >= 2) interactionScore = 75;
    else if (removalCount >= 8) interactionScore = 80; // Un peu trop de removals
    else interactionScore = 45; // Pas assez d'antibêtes

    // Score Global Pondéré
    const scores = {
      rawPower: rawPowerScore,
      synergy: synergyScore,
      curve: curveScore,
      mana: manaScore,
      interaction: interactionScore
    };

    const overallScore = Math.round(
      scores.rawPower * 0.20 +
      scores.synergy * 0.25 +
      scores.curve * 0.20 +
      scores.mana * 0.20 +
      scores.interaction * 0.15
    );

    const diagnosis = this.generateDiagnosis(scores, overallScore, avgUntapped);

    return {
      scores,
      overallScore: Math.min(99, Math.max(25, overallScore)),
      avgUntapped: avgUntapped.toFixed(1),
      diagnosis
    };
  }

  generateDiagnosis(scores, overallScore, avgUntapped) {
    const tips = [];

    if (avgUntapped >= 45.0) {
      tips.push(`👑 Puissance brute Untapped exceptionnelle (Moyenne : ${avgUntapped.toFixed(1)}/53) !`);
    } else if (avgUntapped < 36.0) {
      tips.push(`⚠️ Puissance brute moyenne faible (${avgUntapped.toFixed(1)}/53) — Pensez à prioriser les Tier S & A en début de pack.`);
    }

    if (scores.curve < 70) {
      tips.push("📉 Courbe déséquilibrée : Manque de créatures à 2 manas (T2) ou excès de sorts lourds à 5+.");
    } else {
      tips.push("⚡ Excellente fluidité de courbe : vous pourrez développer votre jeu dès les premiers tours.");
    }

    if (scores.mana < 70) {
      tips.push("🏔️ Base de mana fragile : Risque élevé de color screw. Ajoutez du fixing ou réduisez les splashs.");
    }

    if (scores.synergy >= 85) {
      tips.push("🧬 Deck ultra-synergique et cohérent avec une identité bicolore claire.");
    }

    if (scores.interaction < 70) {
      tips.push("⚔️ Manque d'interaction : Vous risquez de perdre face aux bombes adverses sans antibêtes.");
    }

    let verdict = "Deck Compétitif de Haut Niveau";
    if (overallScore >= 92) verdict = "🔥 Deck God-Tier — Favori Absolu pour le 3-0 !";
    else if (overallScore >= 84) verdict = "⚡ Deck Solide & Équilibré — Candidat au podium";
    else if (overallScore >= 74) verdict = "⚖️ Deck Décent — Quelques faiblesses de tempo ou de mana";
    else verdict = "⚠️ Pile Instable — Ajustez votre courbe et vos couleurs";

    return { verdict, tips };
  }

  drawRadarChart(canvasId, scores) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const radius = Math.min(w, h) / 2 - 32;

    ctx.clearRect(0, 0, w, h);

    const labels = ["Puissance (Untapped)", "Synergie", "Courbe CMC", "Base Mana", "Interaction"];
    const values = [
      scores.rawPower / 100,
      scores.synergy / 100,
      scores.curve / 100,
      scores.mana / 100,
      scores.interaction / 100
    ];
    const totalAxes = labels.length;

    // Toiles concentriques (polygones)
    const levels = [0.25, 0.5, 0.75, 1.0];
    levels.forEach(lvl => {
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * (radius * lvl);
        const y = cy + Math.sin(angle) * (radius * lvl);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = lvl === 1.0 ? "#475569" : "#334155";
      ctx.lineWidth = lvl === 1.0 ? 1.5 : 1;
      ctx.stroke();
    });

    // Axes radiaux
    for (let i = 0; i < totalAxes; i++) {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Libellés
      const lx = cx + Math.cos(angle) * (radius + 20);
      const ly = cy + Math.sin(angle) * (radius + 20);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], lx, ly);
    }

    // Polygone des scores du joueur
    ctx.beginPath();
    for (let i = 0; i < totalAxes; i++) {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const val = Math.max(0.1, values[i]);
      const x = cx + Math.cos(angle) * (radius * val);
      const y = cy + Math.sin(angle) * (radius * val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
    ctx.fill();
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Points sur les sommets
    for (let i = 0; i < totalAxes; i++) {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const val = Math.max(0.1, values[i]);
      const x = cx + Math.cos(angle) * (radius * val);
      const y = cy + Math.sin(angle) * (radius * val);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#f5a623";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

const scoringKiviat = new ScoringKiviat();
