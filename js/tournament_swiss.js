// Gestionnaire de Tournoi 8 Joueurs en Rondes Suisses avec calcul des Tiebreakers
class TournamentSwiss {
  constructor() {
    this.players = [
      { id: 0, name: "Tristan (Humain)", points: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] },
      { id: 1, name: "Cédric N. (Bot 1)", points: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] },
      { id: 2, name: "Nico (Bot 2)", points: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] },
      { id: 3, name: "Huge (Bot 3)", points: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] },
      { id: 4, name: "Papayou (Bot 4)", points: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] },
      { id: 5, name: "Urza (Bot 5)", points: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] },
      { id: 6, name: "Mishra (Bot 6)", points: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] },
      { id: 7, name: "Karn (Bot 7)", points: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] }
    ];
    this.currentRound = 1;
    this.totalRounds = 3;
    this.rounds = [
      {
        roundNum: 1,
        matches: [
          { p1: 0, p2: 1, s1: 0, s2: 0, played: false },
          { p1: 2, p2: 3, s1: 0, s2: 0, played: false },
          { p1: 4, p2: 5, s1: 0, s2: 0, played: false },
          { p1: 6, p2: 7, s1: 0, s2: 0, played: false }
        ]
      },
      {
        roundNum: 2,
        matches: [
          { p1: 0, p2: 2, s1: 0, s2: 0, played: false },
          { p1: 1, p2: 3, s1: 0, s2: 0, played: false },
          { p1: 4, p2: 6, s1: 0, s2: 0, played: false },
          { p1: 5, p2: 7, s1: 0, s2: 0, played: false }
        ]
      },
      {
        roundNum: 3,
        matches: [
          { p1: 0, p2: 3, s1: 0, s2: 0, played: false },
          { p1: 1, p2: 2, s1: 0, s2: 0, played: false },
          { p1: 4, p2: 7, s1: 0, s2: 0, played: false },
          { p1: 5, p2: 6, s1: 0, s2: 0, played: false }
        ]
      }
    ];
  }

  setMatchScore(roundIdx, matchIdx, s1, s2) {
    const match = this.rounds[roundIdx].matches[matchIdx];
    match.s1 = parseInt(s1) || 0;
    match.s2 = parseInt(s2) || 0;
    match.played = true;

    this.recalculateStandings();
    this.render();
  }

  autoSimulateRound(roundIdx) {
    const round = this.rounds[roundIdx];
    round.matches.forEach((m, mIdx) => {
      if (!m.played) {
        const isP1Win = Math.random() > 0.5;
        const s1 = isP1Win ? 2 : (Math.random() > 0.5 ? 1 : 0);
        const s2 = isP1Win ? (Math.random() > 0.5 ? 1 : 0) : 2;
        this.setMatchScore(roundIdx, mIdx, s1, s2);
      }
    });
    showToast(`🎲 Résultats de la Ronde ${roundIdx + 1} simulés !`);
  }

  recalculateStandings() {
    this.players.forEach(p => {
      p.points = 0;
      p.gamesWon = 0;
      p.gamesPlayed = 0;
      p.opponents = [];
    });

    this.rounds.forEach(r => {
      r.matches.forEach(m => {
        if (m.played) {
          const p1 = this.players.find(p => p.id === m.p1);
          const p2 = this.players.find(p => p.id === m.p2);

          if (p1 && p2) {
            p1.opponents.push(p2.id);
            p2.opponents.push(p1.id);

            p1.gamesWon += m.s1;
            p1.gamesPlayed += (m.s1 + m.s2);
            p2.gamesWon += m.s2;
            p2.gamesPlayed += (m.s1 + m.s2);

            if (m.s1 > m.s2) {
              p1.points += 3;
            } else if (m.s2 > m.s1) {
              p2.points += 3;
            } else {
              p1.points += 1;
              p2.points += 1;
            }
          }
        }
      });
    });

    this.players.forEach(p => {
      p.gw = p.gamesPlayed > 0 ? (p.gamesWon / p.gamesPlayed) * 100 : 0;
    });

    this.players.forEach(p => {
      if (p.opponents.length > 0) {
        const oppWinPercentages = p.opponents.map(oppId => {
          const opp = this.players.find(x => x.id === oppId);
          const totalRounds = this.rounds.filter(r => r.matches.some(m => (m.p1 === oppId || m.p2 === oppId) && m.played)).length || 1;
          return Math.max(0.33, (opp.points / (totalRounds * 3)));
        });
        p.omw = (oppWinPercentages.reduce((a, b) => a + b, 0) / oppWinPercentages.length) * 100;
      } else {
        p.omw = 33.0;
      }
    });

    this.players.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.omw !== a.omw) return b.omw - a.omw;
      return b.gw - a.gw;
    });
  }

  exportReportMarkdown() {
    const today = new Date().toISOString().split("T")[0];
    let md = `# Compte-Rendu Tournoi Cube MTG Arena — ${today}\n\n`;
    md += `## 🏆 Classement Final & Départages (8 Joueurs)\n\n`;
    md += `| Rang | Joueur | Points | OMW % | GW % | Victoires / Défaites |\n`;
    md += `| :--: | :--- | :----: | :---: | :--: | :------------------: |\n`;

    this.players.forEach((p, idx) => {
      const medal = idx === 0 ? "🥇" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : `${idx + 1}.`));
      md += `| ${medal} | **${p.name}** | ${p.points} pts | ${p.omw.toFixed(1)}% | ${p.gw.toFixed(1)}% | ${p.gamesWon}-${p.gamesPlayed - p.gamesWon} |\n`;
    });

    md += `\n---\n\n## ⚔️ Détail des 3 Rondes\n\n`;
    this.rounds.forEach(r => {
      md += `### Ronde ${r.roundNum}\n`;
      r.matches.forEach(m => {
        const p1Name = this.players.find(p => p.id === m.p1)?.name || "P1";
        const p2Name = this.players.find(p => p.id === m.p2)?.name || "P2";
        md += `* ${p1Name} **${m.s1} - ${m.s2}** ${p2Name}\n`;
      });
      md += `\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
      showToast("📝 Rapport Markdown copié dans le presse-papier !");
    });
  }

  render() {
    const roundsContainer = document.getElementById("tournament-rounds");
    const standingsBody = document.getElementById("standings-body");

    if (roundsContainer) {
      roundsContainer.innerHTML = this.rounds.map((r, rIdx) => `
        <div class="round-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div class="round-title">⚔️ Ronde ${r.roundNum} / 3</div>
            <button class="nav-btn" onclick="tournament.autoSimulateRound(${rIdx})" style="font-size:12px;padding:4px 10px">🎲 Simuler la ronde</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${r.matches.map((m, mIdx) => {
              const p1 = this.players.find(p => p.id === m.p1);
              const p2 = this.players.find(p => p.id === m.p2);
              return `
                <div class="match-row">
                  <span class="match-player">${p1.name}</span>
                  <div class="score-inputs">
                    <input type="number" min="0" max="2" class="score-box" value="${m.s1}" onchange="tournament.setMatchScore(${rIdx}, ${mIdx}, this.value, ${m.s2})" />
                    <span>vs</span>
                    <input type="number" min="0" max="2" class="score-box" value="${m.s2}" onchange="tournament.setMatchScore(${rIdx}, ${mIdx}, ${m.s1}, this.value)" />
                  </div>
                  <span class="match-player">${p2.name}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `).join("");
    }

    if (standingsBody) {
      standingsBody.innerHTML = this.players.map((p, idx) => {
        const medal = idx === 0 ? "🥇" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : `${idx + 1}.`));
        return `
          <tr>
            <td><strong>${medal}</strong></td>
            <td><strong>${p.name}</strong></td>
            <td><strong>${p.points}</strong> pts</td>
            <td>${p.omw ? p.omw.toFixed(1) : "33.0"}%</td>
            <td>${p.gw ? p.gw.toFixed(1) : "0.0"}%</td>
          </tr>
        `;
      }).join("");
    }
  }
}

const tournament = new TournamentSwiss();
