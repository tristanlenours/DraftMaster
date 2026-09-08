/**
 * admin.js — Logique de la Console d'Administration
 * Visualisation des sessions de draft, inspection complète des 8 decks (humain + 7 bots)
 * et audit des rapports HTML archivés.
 */

let allDrafts = [];
let currentDraft = null;
let currentSeatIndex = 0;

export async function initAdminView() {
  const refreshBtn = document.getElementById("admin-refresh-btn");
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      loadAdminData();
    };
  }

  await loadAdminData();
}

export async function loadAdminData() {
  await Promise.all([loadAdminDrafts(), loadAdminReports()]);
}

async function loadAdminDrafts() {
  const tbody = document.getElementById("admin-drafts-tbody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Chargement des sessions de draft...</td></tr>';

  try {
    const res = await fetch("/api/admin/drafts");
    const data = await res.json();
    if (data.ok && Array.isArray(data.drafts)) {
      allDrafts = data.drafts;
      renderAdminDrafts(allDrafts);
      // If we have drafts and none is selected yet, select the first one
      if (allDrafts.length > 0 && !currentDraft) {
        selectDraft(allDrafts[0].id);
      }
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Erreur lors de la récupération des sessions.</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Erreur de connexion : ${err.message}</td></tr>`;
  }
}

function renderAdminDrafts(drafts) {
  const tbody = document.getElementById("admin-drafts-tbody");
  if (!tbody) return;

  if (drafts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">
          <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
            <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">Aucune session de draft enregistrée</p>
            <p style="font-size: 0.9rem;">Effectuez un Draft Solo pour que la session et les 8 decks de la table soient archivés ici.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = drafts
    .map((draft) => {
      const dateStr = draft.completedAt ? new Date(draft.completedAt).toLocaleString("fr-FR") : "—";
      const humanSeat = draft.seats ? draft.seats.find((s) => s.seatId === 0) : null;
      const humanScore = humanSeat ? humanSeat.deck.overallScore : "—";
      const humanArchetype = humanSeat ? humanSeat.deck.archetype.label : "—";

      return `
        <tr class="admin-draft-row ${currentDraft && currentDraft.id === draft.id ? "active-draft" : ""}" data-draft-id="${draft.id}">
          <td><strong>${dateStr}</strong></td>
          <td><code>${draft.seed}</code></td>
          <td><span class="player-tag">${escapeHtml(draft.playerName)}</span></td>
          <td><span class="score-badge score-${getScoreClass(humanScore)}">${humanScore}/100</span></td>
          <td><span class="archetype-pill">${escapeHtml(humanArchetype)}</span></td>
          <td>
            <div class="report-links-row">
              <a href="${draft.reports.walkthroughUrl}" target="_blank" rel="noopener noreferrer" class="report-mini-btn" title="Ouvrir le rapport 17Lands">📊 17Lands</a>
              <a href="${draft.reports.boostersUrl}" target="_blank" rel="noopener noreferrer" class="report-mini-btn" title="Ouvrir la distribution des boosters">📦 Boosters</a>
            </div>
          </td>
          <td>
            <button type="button" class="btn btn-sm btn-primary inspect-draft-btn" data-draft-id="${draft.id}">
              🔍 Inspecter (8 Decks)
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll(".inspect-draft-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-draft-id");
      if (id) selectDraft(id);
    });
  });
}

export function selectDraft(draftId) {
  currentDraft = allDrafts.find((d) => d.id === draftId) || null;
  if (!currentDraft) return;

  // Highlight row in table
  document.querySelectorAll(".admin-draft-row").forEach((row) => {
    if (row.getAttribute("data-draft-id") === draftId) {
      row.classList.add("active-draft");
    } else {
      row.classList.remove("active-draft");
    }
  });

  const inspector = document.getElementById("admin-table-inspector");
  if (!inspector) return;
  inspector.hidden = false;

  const titleEl = document.getElementById("admin-inspector-title");
  const metaEl = document.getElementById("admin-inspector-meta");
  if (titleEl) {
    titleEl.textContent = `Inspection de la Table • Seed ${currentDraft.seed} (${currentDraft.playerName})`;
  }
  if (metaEl) {
    const dateStr = currentDraft.completedAt ? new Date(currentDraft.completedAt).toLocaleString("fr-FR") : "";
    metaEl.textContent = `${dateStr} • 8 Decks Disponibles`;
  }

  renderSeatsTabs(currentDraft.seats || []);
  selectSeat(0);

  inspector.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderSeatsTabs(seats) {
  const container = document.getElementById("admin-seats-tabs");
  if (!container) return;

  container.innerHTML = seats
    .map((seat, idx) => {
      const isHuman = seat.seatId === 0;
      const score = seat.deck ? seat.deck.overallScore : 0;
      const icon = isHuman ? "👤" : "🤖";
      const name = isHuman ? `${seat.botName} (Humain)` : seat.botName;

      return `
        <button
          type="button"
          class="admin-seat-tab-btn ${idx === currentSeatIndex ? "active" : ""}"
          data-seat-index="${idx}"
        >
          <span class="ast-icon">${icon}</span>
          <span class="ast-name">${escapeHtml(name)}</span>
          <span class="ast-score score-${getScoreClass(score)}">${score}</span>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll(".admin-seat-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-seat-index") || "0", 10);
      selectSeat(idx);
    });
  });
}

function selectSeat(index) {
  if (!currentDraft || !currentDraft.seats || !currentDraft.seats[index]) return;
  currentSeatIndex = index;

  // Update tab buttons active state
  document.querySelectorAll(".admin-seat-tab-btn").forEach((btn) => {
    const btnIdx = parseInt(btn.getAttribute("data-seat-index") || "0", 10);
    btn.classList.toggle("active", btnIdx === index);
  });

  renderSeatDetail(currentDraft.seats[index]);
}

function renderSeatDetail(seat) {
  const container = document.getElementById("admin-seat-detail");
  if (!container) return;

  const deck = seat.deck;
  const isHuman = seat.seatId === 0;
  const radar = deck.radar || { power: 0, synergy: 0, curve: 0, mana: 0, interaction: 0 };
  const archetype = deck.archetype || { label: "Inconnu", category: "autre", description: "" };

  const lands = deck.maindeckLands || [];
  const basicCounts = { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 };
  lands.forEach((l) => {
    if (l.name in basicCounts) basicCounts[l.name]++;
  });

  const spells = deck.maindeckSpells || [];
  const sideboard = deck.sideboard || [];

  container.innerHTML = `
    <!-- Seat Header Banner -->
    <div class="seat-detail-header">
      <div class="sdh-left">
        <div class="sdh-avatar">${isHuman ? "👤" : "🤖"}</div>
        <div class="sdh-meta">
          <div class="sdh-title-row">
            <h3 class="sdh-name">${escapeHtml(seat.botName)}</h3>
            <span class="sdh-badge ${isHuman ? "badge-human" : "badge-bot"}">
              ${isHuman ? "Joueur Humain (Siège 0)" : `Bot IA • Niveau ${escapeHtml(seat.level || "Élite")}`}
            </span>
          </div>
          <p class="sdh-quote">« ${escapeHtml(seat.quote || seat.title || "Prêt au combat.")} »</p>
          <div class="sdh-archetype-row">
            <span class="sdh-arch-label">Archétype :</span>
            <strong class="sdh-arch-val">${escapeHtml(archetype.label)}</strong>
            <span class="sdh-arch-cat">(${escapeHtml(archetype.category)})</span>
          </div>
        </div>
      </div>
      <div class="sdh-right">
        <div class="sdh-score-box score-${getScoreClass(deck.overallScore)}">
          <span class="sdh-score-val">${deck.overallScore}</span>
          <span class="sdh-score-max">/100</span>
        </div>
        <span class="sdh-score-label">Score Global</span>
      </div>
    </div>

    <!-- 5-Axis Radar & Deck Breakdown -->
    <div class="seat-radar-grid">
      <div class="radar-bar-item">
        <div class="rbi-header">
          <span class="rbi-label">⚡ Puissance Brute</span>
          <span class="rbi-val">${radar.power}/100</span>
        </div>
        <div class="rbi-track"><div class="rbi-fill fill-power" style="width: ${radar.power}%;"></div></div>
      </div>
      <div class="radar-bar-item">
        <div class="rbi-header">
          <span class="rbi-label">🔄 Synergie & Thème</span>
          <span class="rbi-val">${radar.synergy}/100</span>
        </div>
        <div class="rbi-track"><div class="rbi-fill fill-synergy" style="width: ${radar.synergy}%;"></div></div>
      </div>
      <div class="radar-bar-item">
        <div class="rbi-header">
          <span class="rbi-label">📈 Courbe de Mana</span>
          <span class="rbi-val">${radar.curve}/100</span>
        </div>
        <div class="rbi-track"><div class="rbi-fill fill-curve" style="width: ${radar.curve}%;"></div></div>
      </div>
      <div class="radar-bar-item">
        <div class="rbi-header">
          <span class="rbi-label">💧 Base de Mana</span>
          <span class="rbi-val">${radar.mana}/100</span>
        </div>
        <div class="rbi-track"><div class="rbi-fill fill-mana" style="width: ${radar.mana}%;"></div></div>
      </div>
      <div class="radar-bar-item">
        <div class="rbi-header">
          <span class="rbi-label">🛡️ Interaction & Retraits</span>
          <span class="rbi-val">${radar.interaction}/100</span>
        </div>
        <div class="rbi-track"><div class="rbi-fill fill-interaction" style="width: ${radar.interaction}%;"></div></div>
      </div>
    </div>

    <!-- AI Evaluation Strengths / Weaknesses -->
    ${
      (deck.strengths && deck.strengths.length > 0) || (deck.weaknesses && deck.weaknesses.length > 0)
        ? `
        <div class="seat-eval-notes">
          ${
            deck.strengths && deck.strengths.length > 0
              ? `
            <div class="eval-notes-col strengths">
              <h4>✅ Points Forts</h4>
              <ul>${deck.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
            </div>
          `
              : ""
          }
          ${
            deck.weaknesses && deck.weaknesses.length > 0
              ? `
            <div class="eval-notes-col weaknesses">
              <h4>⚠️ Points de Vigilance</h4>
              <ul>${deck.weaknesses.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
            </div>
          `
              : ""
          }
        </div>
      `
        : ""
    }

    <!-- Decklist View: 23 Spells + 17 Lands -->
    <div class="seat-decklist-container">
      <div class="decklist-column spells-col">
        <div class="decklist-col-header">
          <h4>🪄 Sorts Actifs (${spells.length} cartes)</h4>
          <span class="decklist-sub">Sélection principale</span>
        </div>
        <div class="decklist-cards-list">
          ${spells
            .map(
              (card) => `
            <div class="decklist-card-item" title="${escapeHtml(card.frenchName && card.frenchName !== card.name ? `${card.frenchName} (VO: ${card.name})` : card.name)}">
              <span class="dci-mana-cost">${formatManaCost(card.colors, card.cmc)}</span>
              <span class="dci-name">${escapeHtml(card.frenchName || card.name)}</span>
              <span class="dci-type">${escapeHtml(card.typeLine || "")}</span>
              ${card.staticScore >= 80 ? '<span class="dci-bomb" title="Bombe du cube">💣</span>' : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      </div>

      <div class="decklist-column lands-col">
        <div class="decklist-col-header">
          <h4>🌲 Terrains (${lands.length} cartes)</h4>
          <span class="decklist-sub">17 Terrains de base</span>
        </div>
        <div class="lands-breakdown-list">
          <div class="land-count-badge"><span>⚪ Plaine :</span> <strong>${basicCounts.Plains}</strong></div>
          <div class="land-count-badge"><span>🔵 Île :</span> <strong>${basicCounts.Island}</strong></div>
          <div class="land-count-badge"><span>⚫ Marais :</span> <strong>${basicCounts.Swamp}</strong></div>
          <div class="land-count-badge"><span>🔴 Montagne :</span> <strong>${basicCounts.Mountain}</strong></div>
          <div class="land-count-badge"><span>🟢 Forêt :</span> <strong>${basicCounts.Forest}</strong></div>
        </div>

        ${
          sideboard.length > 0
            ? `
          <div class="sideboard-box">
            <div class="decklist-col-header" style="margin-top: 1.5rem;">
              <h4>🎒 Réserve (${sideboard.length} cartes)</h4>
            </div>
            <div class="sideboard-chips-wrap">
              ${sideboard
                .map(
                  (card) => `
                <span class="sideboard-chip" title="${escapeHtml(card.frenchName && card.frenchName !== card.name ? `${card.frenchName} (VO: ${card.name})` : card.name)}">
                  ${escapeHtml(card.frenchName || card.name)}
                </span>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

async function loadAdminReports() {
  const tbody = document.getElementById("reports-tbody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/reports");
    const data = await res.json();
    if (data.ok && Array.isArray(data.reports)) {
      renderAdminReports(data.reports);
    } else {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">Aucun rapport trouvé.</td></tr>';
    }
  } catch {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">Erreur de chargement des rapports.</td></tr>';
  }
}

function renderAdminReports(reports) {
  const tbody = document.getElementById("reports-tbody");
  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">Aucun rapport HTML archivé dans reports/.</td></tr>';
    return;
  }

  tbody.innerHTML = reports
    .map((r) => {
      const isBoosters = r.isBoosters;
      const typeBadge = isBoosters
        ? '<span class="badge badge-boosters">📦 Boosters (24 Packs)</span>'
        : '<span class="badge badge-17lands">📊 17Lands Walkthrough</span>';

      return `
        <tr>
          <td>${typeBadge}</td>
          <td><code>${escapeHtml(r.filename)}</code></td>
          <td>
            <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">
              Ouvrir le rapport ↗
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getScoreClass(score) {
  const s = typeof score === "number" ? score : 0;
  if (s >= 85) return "high";
  if (s >= 70) return "mid";
  return "low";
}

function formatManaCost(colors, cmc) {
  if (!colors || colors.length === 0) return `${cmc}`;
  return colors.join("");
}

function escapeHtml(text) {
  if (text === undefined || text === null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
