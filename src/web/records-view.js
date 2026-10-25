// Wall of Records view and the deck review modal opened from it.
import { elements, state } from "./app-state.js";
import { render17LandsDeckView } from "./deck-viewer-17lands.js";
import { fetchLeaderboard, getScoreGrade, renderLeaderboardTable } from "./leaderboard.js";

export async function loadAndRenderLeaderboard() {
  if (elements.leaderboardTbody) {
    elements.leaderboardTbody.innerHTML = `<tr><td colspan="8" class="arcade-empty-cell">Chargement du Mur des Records...</td></tr>`;
  }
  const entries = await fetchLeaderboard();
  renderLeaderboardTable(entries, elements.leaderboardTbody, (entry) => {
    openDeckReviewModal(entry);
  });
}

export function openDeckReviewModal(entry) {
  if (!elements.deckReviewBackdrop) return;
  state.selectedDeckReview = entry;
  if (elements.deckReviewRank) elements.deckReviewRank.textContent = `#${entry.rank || 1}`;
  if (elements.deckReviewTitle)
    elements.deckReviewTitle.textContent = `Deck de ${entry.playerName}`;
  if (elements.deckReviewMeta) {
    const mins = Math.floor((entry.totalDurationSeconds || 0) / 60);
    const secs = (entry.totalDurationSeconds || 0) % 60;
    elements.deckReviewMeta.textContent = `Score : ${entry.overallScore}/100 • ${entry.archetype?.label || "Archétype Libre"} • Durée : ${String(mins)}m ${String(secs)}s`;
  }

  const copyBtn = document.getElementById("deck-review-copy-link-btn");
  if (copyBtn) {
    if (entry.id) {
      copyBtn.hidden = false;
      copyBtn.onclick = async () => {
        const shareUrl = `${window.location.origin}/?deck=${entry.id}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          copyBtn.innerHTML = "<span>✅ Lien Copié !</span>";
          setTimeout(() => {
            if (copyBtn) copyBtn.innerHTML = "<span>📋 Copier le Lien</span>";
          }, 2500);
        } catch {
          prompt("Copiez ce lien pour partager le deck :", shareUrl);
        }
      };
    } else {
      copyBtn.hidden = true;
    }
  }

  const radarContainer = document.getElementById("deck-review-radar-container");
  if (radarContainer) {
    const radar = entry.radar || { power: 70, synergy: 70, curve: 70, mana: 70, interaction: 70 };
    const radarTiers = entry.radarTiers || {
      power: getScoreGrade(radar.power).grade,
      synergy: getScoreGrade(radar.synergy).grade,
      curve: getScoreGrade(radar.curve).grade,
      mana: getScoreGrade(radar.mana).grade,
      interaction: getScoreGrade(radar.interaction).grade,
    };
    radarContainer.innerHTML = `
      <div class="seat-radar-grid" style="margin-bottom: 0;">
        <div class="radar-bar-item">
          <div class="rbi-header">
            <span class="rbi-label">⚡ Puissance Brute</span>
            <span class="rbi-val">${radar.power}/100 <small class="axis-tier-badge grade-${(radarTiers.power || "B").toLowerCase()}">${radarTiers.power || "B"}</small></span>
          </div>
          <div class="rbi-track"><div class="rbi-fill fill-power" style="width: ${radar.power}%;"></div></div>
        </div>
        <div class="radar-bar-item">
          <div class="rbi-header">
            <span class="rbi-label">🔄 Synergie & Thème</span>
            <span class="rbi-val">${radar.synergy}/100 <small class="axis-tier-badge grade-${(radarTiers.synergy || "B").toLowerCase()}">${radarTiers.synergy || "B"}</small></span>
          </div>
          <div class="rbi-track"><div class="rbi-fill fill-synergy" style="width: ${radar.synergy}%;"></div></div>
        </div>
        <div class="radar-bar-item">
          <div class="rbi-header">
            <span class="rbi-label">📈 Courbe de Mana</span>
            <span class="rbi-val">${radar.curve}/100 <small class="axis-tier-badge grade-${(radarTiers.curve || "B").toLowerCase()}">${radarTiers.curve || "B"}</small></span>
          </div>
          <div class="rbi-track"><div class="rbi-fill fill-curve" style="width: ${radar.curve}%;"></div></div>
        </div>
        <div class="radar-bar-item">
          <div class="rbi-header">
            <span class="rbi-label">💧 Base de Mana</span>
            <span class="rbi-val">${radar.mana}/100 <small class="axis-tier-badge grade-${(radarTiers.mana || "B").toLowerCase()}">${radarTiers.mana || "B"}</small></span>
          </div>
          <div class="rbi-track"><div class="rbi-fill fill-mana" style="width: ${radar.mana}%;"></div></div>
        </div>
        <div class="radar-bar-item">
          <div class="rbi-header">
            <span class="rbi-label">🛡️ Interaction & Retraits</span>
            <span class="rbi-val">${radar.interaction}/100 <small class="axis-tier-badge grade-${(radarTiers.interaction || "B").toLowerCase()}">${radarTiers.interaction || "B"}</small></span>
          </div>
          <div class="rbi-track"><div class="rbi-fill fill-interaction" style="width: ${radar.interaction}%;"></div></div>
        </div>
      </div>
    `;
  }

  if (elements.deckReviewCardsGrid) {
    const cards = entry.maindeckCards || [];
    if (cards.length === 0) {
      elements.deckReviewCardsGrid.innerHTML = `<p class="arcade-empty-cell" style="padding: 2.5rem 1rem;">Composition des cartes non détaillée pour ce record historique.</p>`;
    } else {
      render17LandsDeckView(elements.deckReviewCardsGrid, cards, {
        language: state.cardLanguage,
        basicLands: entry.basicLands,
      });
    }
  }

  elements.deckReviewBackdrop.hidden = false;
  elements.deckReviewBackdrop.classList.add("is-open");
}
