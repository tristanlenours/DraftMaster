// Mur des Records & Leaderboard Communautaire par Cube (Wall of Fame)
class Leaderboard {
  constructor() {
    this.storageKey = "mtg_cube_draft_leaderboard_v1";
    this.records = this.loadRecords();
    this.filterCube = "ALL";
  }

  loadRecords() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }

    return [
      {
        id: 1,
        playerName: "Tristan (Titou)",
        cubeId: "peasant_360",
        cubeName: "Digital Peasant+ 360",
        score: 94,
        archetype: "🤍🖤 Orzhov Skyfisher Attrition",
        scores: { rawPower: 90, synergy: 98, curve: 95, mana: 92, interaction: 96 },
        date: "2026-08-29",
        deckSummary: "Lurrus + Ruthless Lawbringer + Nurturing Pixie"
      },
      {
        id: 2,
        playerName: "Cédric N.",
        cubeId: "cedric_vintage",
        cubeName: "Strobinellus's Vintage",
        score: 91,
        archetype: "💙❤️ Izzet Spells & Tempo",
        scores: { rawPower: 96, synergy: 88, curve: 92, mana: 85, interaction: 94 },
        date: "2026-08-25",
        deckSummary: "Dreadhorde Arcanist + Expressive Iteration + Bolt"
      },
      {
        id: 3,
        playerName: "Nico (Fedor)",
        cubeId: "nico_candyshop",
        cubeName: "Fedor's Candyshop IRL",
        score: 89,
        archetype: "🖤💙 Dimir Reanimator",
        scores: { rawPower: 98, synergy: 90, curve: 80, mana: 88, interaction: 90 },
        date: "2026-08-20",
        deckSummary: "Griselbrand + Reanimate + Thoughtseize"
      },
      {
        id: 4,
        playerName: "Huge",
        cubeId: "huge_pauper",
        cubeName: "Huge's Pauper Cube",
        score: 88,
        archetype: "💚🤍 Selesnya Go-Wide",
        scores: { rawPower: 82, synergy: 95, curve: 94, mana: 86, interaction: 84 },
        date: "2026-08-15",
        deckSummary: "Battle Screech + Travel Preparations"
      },
      {
        id: 5,
        playerName: "Tristan (Titou)",
        cubeId: "titou_tribal",
        cubeName: "Titou's Tribal Chromatic",
        score: 92,
        archetype: "👑 Humains Tribal Aggro",
        scores: { rawPower: 92, synergy: 96, curve: 95, mana: 90, interaction: 86 },
        date: "2026-08-10",
        deckSummary: "Champion of the Parish + Thalia's Lieutenant"
      }
    ];
  }

  saveRecords() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.records));
  }

  addRecord(playerName, cubeId, cubeName, evalResult, mainboard) {
    const dominantColors = mainboard.filter(c => c.color && c.color !== "Terrain" && c.color !== "Incolore");
    const archetypeGuess = this.guessArchetype(dominantColors);

    const newRecord = {
      id: Date.now(),
      playerName: playerName.trim() || "Drafter Anonyme",
      cubeId: cubeId,
      cubeName: cubeName,
      score: evalResult.overallScore,
      archetype: archetypeGuess,
      scores: evalResult.scores,
      date: new Date().toISOString().split("T")[0],
      deckSummary: mainboard.slice(0, 3).map(c => c.name).join(" + ")
    };

    this.records.unshift(newRecord);
    this.records.sort((a, b) => b.score - a.score);
    this.saveRecords();

    showToast(`🏆 Score de ${newRecord.score}/100 enregistré sur le Mur des Records !`);
    this.render();
    app.switchTab("leaderboard");
    return newRecord;
  }

  guessArchetype(cards) {
    const counts = {};
    cards.forEach(c => counts[c.color] = (counts[c.color] || 0) + 1);
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 2);
    if (top.length === 2) return `${top[0]} / ${top[1]} Midrange`;
    if (top.length === 1) return `Mono ${top[0]} Aggro`;
    return "Multicolore Goodstuff";
  }

  render() {
    const tableBody = document.getElementById("leaderboard-body");
    if (!tableBody) return;

    const filtered = this.records.filter(r => this.filterCube === "ALL" || r.cubeId === this.filterCube);

    tableBody.innerHTML = filtered.map((r, idx) => {
      const medal = idx === 0 ? "🥇" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : `${idx + 1}.`));
      const scoreBadgeClass = r.score >= 90 ? "tier-S" : (r.score >= 80 ? "tier-A" : "tier-B");

      return `
        <tr style="cursor:pointer">
          <td style="font-size:15px" onclick="leaderboard.showRecordDetails(${r.id})"><strong>${medal}</strong></td>
          <td onclick="leaderboard.showRecordDetails(${r.id})">
            <strong>${r.playerName}</strong>
            <div style="font-size:10px;color:var(--text-muted)">${r.date}</div>
          </td>
          <td onclick="leaderboard.showRecordDetails(${r.id})">
            <span style="font-size:11px;color:var(--accent-blue)">${r.cubeName}</span>
            <div style="font-size:11px;color:var(--text-main)">${r.archetype}</div>
          </td>
          <td onclick="leaderboard.showRecordDetails(${r.id})">
            <span class="card-tier-badge ${scoreBadgeClass}" style="position:static;display:inline-block">
              ${r.score}/100
            </span>
          </td>
          <td>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div style="font-size:10px;color:var(--text-muted)">
                P:${r.scores.rawPower} S:${r.scores.synergy} C:${r.scores.curve} M:${r.scores.mana} I:${r.scores.interaction}
              </div>
              <button onclick="leaderboard.notifySlackRecord(${r.id})" style="background:transparent;border:1px solid #4a154b;color:#e01e5a;padding:2px 6px;border-radius:4px;font-size:10px;cursor:pointer">📢 Slack</button>
            </div>
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Aucun record enregistré pour ce Cube. Soyez le premier !</td></tr>`;
  }

  notifySlackRecord(recordId) {
    const r = this.records.find(x => x.id === recordId);
    if (!r) return;
    slackNotifier.sendDraftRecord(r, 0);
  }

  showRecordDetails(recordId) {
    const r = this.records.find(x => x.id === recordId);
    if (!r) return;

    alert(`📊 Détails du Record de ${r.playerName} (${r.score}/100)\n\n` +
          `Cube : ${r.cubeName}\n` +
          `Archétype : ${r.archetype}\n` +
          `Cartes clés : ${r.deckSummary}\n\n` +
          `Détail Kiviat :\n` +
          ` - Puissance : ${r.scores.rawPower}/100\n` +
          ` - Synergie : ${r.scores.synergy}/100\n` +
          ` - Courbe : ${r.scores.curve}/100\n` +
          ` - Mana : ${r.scores.mana}/100\n` +
          ` - Interaction : ${r.scores.interaction}/100`);
  }
}

const leaderboard = new Leaderboard();
