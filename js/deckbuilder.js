// Deckbuilder intelligent avec Graphe de Kiviat, Trophées & Notification Slack
class Deckbuilder {
  constructor() {
    this.mainboard = [];
    this.sideboard = [];
    this.basics = {
      "Plains": 0,
      "Island": 0,
      "Swamp": 0,
      "Mountain": 0,
      "Forest": 0
    };
    this.lastEvaluation = null;
  }

  init(pool) {
    this.mainboard = [];
    this.sideboard = [...pool];
    this.autoBuildDeck();
  }

  autoBuildDeck() {
    const fullPool = [...this.mainboard, ...this.sideboard];
    if (fullPool.length === 0) return;

    const colorScores = { "Blanc": 0, "Bleu": 0, "Noir": 0, "Rouge": 0, "Vert": 0 };
    fullPool.forEach(c => {
      if (colorScores[c.color] !== undefined) {
        let weight = 2;
        if (c.tier === "S") weight = 10;
        else if (c.tier === "A") weight = 6;
        else if (c.tier === "B") weight = 4;
        colorScores[c.color] += weight;
      }
    });

    const topColors = Object.keys(colorScores)
      .sort((a, b) => colorScores[b] - colorScores[a])
      .slice(0, 2);

    const nonLands = fullPool.filter(c => c.type !== "Land");
    const nonBasicLands = fullPool.filter(c => c.type === "Land");

    nonLands.sort((a, b) => {
      const aOnColor = topColors.includes(a.color) || a.color === "Incolore";
      const bOnColor = topColors.includes(b.color) || b.color === "Incolore";
      if (aOnColor && !bOnColor) return -1;
      if (!aOnColor && bOnColor) return 1;

      const tierWeights = { "S": 5, "A": 4, "B": 3, "C": 2, "D": 1 };
      return (tierWeights[b.tier] || 1) - (tierWeights[a.tier] || 1);
    });

    this.mainboard = nonLands.slice(0, 23);
    this.sideboard = nonLands.slice(23);

    nonBasicLands.forEach(l => {
      this.mainboard.push(l);
    });

    this.autoAddBasics();
    showToast(`⚡ Deck Auto-Construit (${topColors.join(" / ")}) !`);
    this.render();
  }

  moveToSideboard(index) {
    const card = this.mainboard.splice(index, 1)[0];
    this.sideboard.push(card);
    this.autoAddBasics();
    this.render();
  }

  moveToMainboard(index) {
    const card = this.sideboard.splice(index, 1)[0];
    this.mainboard.push(card);
    this.autoAddBasics();
    this.render();
  }

  updateBasic(landName, delta) {
    this.basics[landName] = Math.max(0, (this.basics[landName] || 0) + delta);
    this.render();
  }

  autoAddBasics() {
    const nonBasicLands = this.mainboard.filter(c => c.type === "Land").length;
    const targetLands = 17;
    const neededBasics = Math.max(0, targetLands - nonBasicLands);

    const colorPips = { "Blanc": 0, "Bleu": 0, "Noir": 0, "Rouge": 0, "Vert": 0 };
    this.mainboard.forEach(c => {
      if (colorPips[c.color] !== undefined) {
        colorPips[c.color] += (c.cmc || 1);
      }
    });

    const totalPips = Object.values(colorPips).reduce((a, b) => a + b, 0) || 1;
    this.basics["Plains"] = Math.round((colorPips["Blanc"] / totalPips) * neededBasics);
    this.basics["Island"] = Math.round((colorPips["Bleu"] / totalPips) * neededBasics);
    this.basics["Swamp"] = Math.round((colorPips["Noir"] / totalPips) * neededBasics);
    this.basics["Mountain"] = Math.round((colorPips["Rouge"] / totalPips) * neededBasics);
    this.basics["Forest"] = Math.round((colorPips["Vert"] / totalPips) * neededBasics);

    let currentBasics = Object.values(this.basics).reduce((a, b) => a + b, 0);
    while (currentBasics < neededBasics) {
      const bestColor = Object.keys(colorPips).sort((a, b) => colorPips[b] - colorPips[a])[0];
      const landMap = { "Blanc": "Plains", "Bleu": "Island", "Noir": "Swamp", "Rouge": "Mountain", "Vert": "Forest" };
      this.basics[landMap[bestColor]]++;
      currentBasics++;
    }
  }

  recordScoreToLeaderboard() {
    if (!this.lastEvaluation) {
      showToast("Veuillez d'abord évaluer votre deck.");
      return;
    }

    const defaultName = draftEngine.soloChallengeMode ? "Challenger Solo" : "Tristan (Titou)";
    const playerName = prompt("Entrez votre pseudo pour le Mur des Records :", defaultName);
    if (!playerName) return;

    const record = leaderboard.addRecord(
      playerName,
      draftEngine.currentCubeId,
      draftEngine.currentCubeName,
      this.lastEvaluation,
      this.mainboard
    );

    // Trophée Top 3
    achievements.unlock("hall_of_famer");

    // Option notification Slack
    if (confirm("📢 Voulez-vous notifier le groupe sur Slack de ce nouveau score ?")) {
      slackNotifier.sendDraftRecord(record, draftEngine.draftDurationSec);
    }
  }

  sendToSlackDirect() {
    if (!this.lastEvaluation) {
      showToast("Veuillez évaluer votre deck d'abord.");
      return;
    }
    const record = {
      playerName: "Tristan (Titou)",
      cubeName: draftEngine.currentCubeName,
      archetype: leaderboard.guessArchetype(this.mainboard),
      score: this.lastEvaluation.overallScore,
      scores: this.lastEvaluation.scores
    };
    slackNotifier.sendDraftRecord(record, draftEngine.draftDurationSec);
  }

  exportArenaFormat() {
    let output = "Deck\n";
    const cardCounts = {};
    this.mainboard.forEach(c => cardCounts[c.name] = (cardCounts[c.name] || 0) + 1);
    for (const [name, count] of Object.entries(cardCounts)) output += `${count} ${name}\n`;
    for (const [land, count] of Object.entries(this.basics)) {
      if (count > 0) output += `${count} ${land}\n`;
    }
    if (this.sideboard.length > 0) {
      output += "\nSideboard\n";
      const sideCounts = {};
      this.sideboard.forEach(c => sideCounts[c.name] = (sideCounts[c.name] || 0) + 1);
      for (const [name, count] of Object.entries(sideCounts)) output += `${count} ${name}\n`;
    }

    navigator.clipboard.writeText(output).then(() => {
      showToast("📋 Deck copié dans le presse-papier pour MTG Arena !");
    }).catch(err => alert("Erreur : " + err));

    return output;
  }

  render() {
    const totalBasics = Object.values(this.basics).reduce((a, b) => a + b, 0);
    const totalMain = this.mainboard.length + totalBasics;

    document.getElementById("deck-total-count").textContent = `${totalMain} / 40 cartes`;
    document.getElementById("deck-creatures-count").textContent = this.mainboard.filter(c => c.type.includes("Creature")).length;
    document.getElementById("deck-spells-count").textContent = this.mainboard.filter(c => !c.type.includes("Creature") && c.type !== "Land").length;
    document.getElementById("deck-lands-count").textContent = this.mainboard.filter(c => c.type === "Land").length + totalBasics;

    this.lastEvaluation = scoringKiviat.evaluateDeck(this.mainboard, this.basics);

    const scoreValEl = document.getElementById("deck-score-value");
    const scoreGradeEl = document.getElementById("deck-score-grade");
    const scoreBarEl = document.getElementById("deck-score-bar");
    const diagVerdictEl = document.getElementById("diagnosis-verdict");
    const diagTipsEl = document.getElementById("diagnosis-tips");

    if (scoreValEl) scoreValEl.textContent = `${this.lastEvaluation.overallScore}/100`;
    if (scoreGradeEl) scoreGradeEl.textContent = this.lastEvaluation.overallScore >= 95 ? "Grandmaster" : (this.lastEvaluation.overallScore >= 85 ? "Master" : (this.lastEvaluation.overallScore >= 75 ? "Diamant" : "Platine"));
    if (scoreBarEl) scoreBarEl.style.width = `${this.lastEvaluation.overallScore}%`;

    if (diagVerdictEl) diagVerdictEl.textContent = this.lastEvaluation.diagnosis.verdict;
    if (diagTipsEl) {
      diagTipsEl.innerHTML = this.lastEvaluation.diagnosis.tips.map(t => `<div>• ${t}</div>`).join("");
    }

    scoringKiviat.drawRadarChart("kiviat-chart", this.lastEvaluation.scores);

    achievements.checkAchievements(
      this.mainboard,
      this.lastEvaluation,
      draftEngine.draftDurationSec,
      draftEngine.currentCubeId
    );

    const columns = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    this.mainboard.forEach((card, idx) => {
      const cmcKey = Math.min(Math.max(card.cmc || 1, 1), 6);
      columns[cmcKey].push({ card, idx });
    });

    for (let cmc = 1; cmc <= 6; cmc++) {
      const colEl = document.getElementById(`cmc-col-${cmc}`);
      if (colEl) {
        colEl.innerHTML = `
          <div class="column-header">CMC ${cmc === 6 ? '6+' : cmc} (${columns[cmc].length})</div>
          ${columns[cmc].map(({ card, idx }) => `
            <div class="deck-card-mini" onclick="deckbuilder.moveToSideboard(${idx})">
              <span>${card.name}</span>
              <span style="font-size:10px;color:var(--accent-red)">✕</span>
            </div>
          `).join("")}
        `;
      }
    }

    const sideEl = document.getElementById("sideboard-list");
    if (sideEl) {
      sideEl.innerHTML = this.sideboard.map((card, idx) => `
        <div class="deck-card-mini" onclick="deckbuilder.moveToMainboard(${idx})" style="background:#1e293b">
          <span>${card.name}</span>
          <span style="font-size:10px;color:var(--accent-green)">+</span>
        </div>
      `).join("") || `<div style="color:var(--text-muted);font-size:12px">Réserve vide</div>`;
    }

    document.getElementById("cnt-plains").textContent = this.basics["Plains"];
    document.getElementById("cnt-islands").textContent = this.basics["Island"];
    document.getElementById("cnt-swamps").textContent = this.basics["Swamp"];
    document.getElementById("cnt-mountains").textContent = this.basics["Mountain"];
    document.getElementById("cnt-forests").textContent = this.basics["Forest"];
  }
}

const deckbuilder = new Deckbuilder();
