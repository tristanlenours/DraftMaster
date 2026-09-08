// DraftMaster — Leaderboard (Mur des Records Rétro Arcade)

export async function fetchLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
    const data = await res.json();
    return data.ok ? data.entries : [];
  } catch (err) {
    console.error("Erreur lors de la récupération du leaderboard:", err);
    return [];
  }
}

export async function fetchReports() {
  try {
    const res = await fetch("/api/reports");
    if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
    const data = await res.json();
    return data.ok ? data.reports : [];
  } catch (err) {
    console.error("Erreur lors de la récupération des rapports:", err);
    return [];
  }
}

export function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

export function getScoreGrade(score) {
  if (score >= 90) return { grade: "S", css: "grade-s" };
  if (score >= 82) return { grade: "A", css: "grade-a" };
  if (score >= 74) return { grade: "B", css: "grade-b" };
  if (score >= 65) return { grade: "C", css: "grade-c" };
  return { grade: "D", css: "grade-d" };
}

export function renderLeaderboardTable(entries, tbodyElement, onReviewDeck) {
  if (!tbodyElement) return;

  if (entries.length === 0) {
    tbodyElement.innerHTML = `
      <tr>
        <td colspan="7" class="arcade-empty-cell">
          🕹️ AUCUN RECORD ENREGISTRÉ POUR LE MOMENT.<br>
          Soyez le premier à inscrire votre nom tout en haut du classement !
        </td>
      </tr>
    `;
    return;
  }

  tbodyElement.innerHTML = entries
    .map((entry, idx) => {
      const rank = entry.rank || idx + 1;
      let rankBadge = `<span class="arcade-rank-num">#${String(rank)}</span>`;
      let rowHighlightClass = "";

      if (rank === 1) {
        rankBadge = `<span class="arcade-rank-badge rank-gold">👑 #1</span>`;
        rowHighlightClass = "record-row-gold";
      } else if (rank === 2) {
        rankBadge = `<span class="arcade-rank-badge rank-silver">🥈 #2</span>`;
        rowHighlightClass = "record-row-silver";
      } else if (rank === 3) {
        rankBadge = `<span class="arcade-rank-badge rank-bronze">🥉 #3</span>`;
        rowHighlightClass = "record-row-bronze";
      }

      const { grade, css } = getScoreGrade(entry.overallScore);
      const timeFormatted = formatDuration(entry.totalDurationSeconds);
      const dateFormatted = new Date(entry.occurredAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      return `
        <tr class="arcade-record-row ${rowHighlightClass}">
          <td class="cell-rank">${rankBadge}</td>
          <td class="cell-player">
            <div class="player-info-wrap">
              <span class="player-name">${escapeHtml(entry.playerName)}</span>
              ${entry.isHomologated ? '<span class="badge-homologated" title="Draft Homologué (Sans Coaching)">🛡️ Homologué</span>' : '<span class="badge-assisted">Accompagné</span>'}
            </div>
          </td>
          <td class="cell-score">
            <div class="arcade-score-wrap">
              <span class="arcade-score-val">${String(entry.overallScore)}</span>
              <span class="score-grade-pill ${css}">${grade}</span>
            </div>
          </td>
          <td class="cell-archetype">
            <span class="archetype-label">${escapeHtml(entry.archetype?.label || "Libre")}</span>
          </td>
          <td class="cell-time">
            <span class="arcade-time">${timeFormatted}</span>
          </td>
          <td class="cell-date">
            <span class="arcade-date">${dateFormatted}</span>
          </td>
          <td class="cell-actions">
            <div class="record-actions-group">
              <button type="button" class="btn-action-arcade btn-review-deck" data-entry-id="${entry.id}" title="Revoir la composition du deck">
                🎴 Deck
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // Attach event listener for review deck buttons
  tbodyElement.querySelectorAll(".btn-review-deck").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entryId = btn.dataset.entryId;
      const found = entries.find((e) => e.id === entryId);
      if (found && onReviewDeck) {
        onReviewDeck(found);
      }
    });
  });
}

export function renderAdminReportsTable(reports, tbodyElement) {
  if (!tbodyElement) return;

  if (reports.length === 0) {
    tbodyElement.innerHTML = `
      <tr>
        <td colspan="3" class="arcade-empty-cell">
          Aucun rapport HTML archivé dans le dossier reports/.
        </td>
      </tr>
    `;
    return;
  }

  tbodyElement.innerHTML = reports
    .map((rep) => {
      const icon = rep.isBoosters ? "📦" : "📑";
      const typeLabel = rep.isBoosters
        ? "Répartition 360 Cartes (24 Boosters)"
        : "Parcours 17Lands (45 Écrans & 8 Decks)";

      return `
        <tr class="report-file-row">
          <td class="report-cell-icon">${icon}</td>
          <td class="report-cell-name">
            <strong>${escapeHtml(rep.filename)}</strong>
            <span class="report-desc">${typeLabel}</span>
          </td>
          <td class="report-cell-action">
            <a href="${rep.url}" target="_blank" rel="noopener" class="btn-action-arcade primary-neon">
              Ouvrir dans un nouvel onglet ↗
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ==============================================================================
// EFFET WHAOU : SUPABASE REALTIME & LIVE NOTIFICATIONS
// ==============================================================================

export async function fetchMagiciens() {
  try {
    const res = await fetch("/api/magiciens");
    if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
    const data = await res.json();
    return data.ok ? data.magiciens : [];
  } catch (err) {
    console.warn("Erreur chargement magiciens :", err);
    return [];
  }
}

export function triggerConfetti() {
  if (typeof window !== "undefined" && typeof window.confetti === "function") {
    try {
      window.confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#d4af37", "#38bdf8", "#f43f5e", "#10b981", "#a855f7"],
      });
    } catch {
      // Ignorer si bloqué
    }
  }
}

export function showLiveToast(record) {
  const container = document.getElementById("live-activity-toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "live-toast-item";

  const playerName = record.player_name || record.playerName || "Un Magicien";
  const score = record.overall_score || record.overallScore || 0;
  const tier = record.tier || (score >= 90 ? "S" : score >= 82 ? "A" : score >= 74 ? "B" : "C");
  const archetype = record.archetype?.label || "Deck Libre";
  const avatarUrl =
    record.magicien_slug
      ? `https://api.dicebear.com/7.x/bottts/svg?seed=${record.magicien_slug}&backgroundColor=0e1115`
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(playerName)}&backgroundColor=0e1115`;

  toast.innerHTML = `
    <img src="${avatarUrl}" alt="${escapeHtml(playerName)}" class="live-toast-avatar" />
    <div class="live-toast-body">
      <div class="live-toast-title">
        <span>⚡ En Direct : ${escapeHtml(playerName)}</span>
      </div>
      <div class="live-toast-desc">
        Vient de valider son deck <strong>${escapeHtml(archetype)}</strong> avec un score de <span class="live-toast-score">${String(score)} (Tier ${tier})</span> !
      </div>
    </div>
    <button class="live-toast-close" aria-label="Fermer">✕</button>
  `;

  const closeBtn = toast.querySelector(".live-toast-close");
  closeBtn?.addEventListener("click", () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Auto-dismiss après 8 secondes
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      setTimeout(() => toast.remove(), 300);
    }
  }, 8000);
}

export async function initSupabaseRealtime(onNewRecordCallback) {
  if (typeof window === "undefined" || !window.supabase) {
    console.log("ℹ️ [Realtime] SDK Supabase non chargé dans la fenêtre.");
    return;
  }

  try {
    const res = await fetch("/api/config/supabase");
    if (!res.ok) return;
    const { config } = await res.json();

    if (!config?.configured || !config.url || !config.anonKey) {
      console.log("ℹ️ [Realtime] Supabase non configuré sur le serveur (mode local).");
      return;
    }

    const client = window.supabase.createClient(config.url, config.anonKey);
    console.log("⚡ [Realtime] Abonnement WebSocket Supabase actif sur le Mur des Records !");

    client
      .channel("public:draft_records")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "draft_records" },
        (payload) => {
          console.log("🎉 [Realtime] Nouveau record reçu :", payload.new);
          const newRecord = payload.new;

          // Notification visuelle
          showLiveToast(newRecord);

          // Confetti si score élevé
          if (Number(newRecord.overall_score) >= 84) {
            triggerConfetti();
          }

          // Callback pour rafraîchir le tableau
          if (onNewRecordCallback) {
            onNewRecordCallback(newRecord);
          }
        },
      )
      .subscribe();
  } catch (err) {
    console.warn("⚠️ [Realtime] Échec initialisation Supabase Realtime :", err);
  }
}

export function renderPantheonGrid(magiciens, containerElement) {
  if (!containerElement) return;

  if (!magiciens || magiciens.length === 0) {
    containerElement.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 24px;">
        Chargement des profils des 8 Magiciens...
      </div>
    `;
    return;
  }

  containerElement.innerHTML = magiciens
    .map((m, idx) => {
      const rankBadge = idx === 0 ? "👑 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${String(idx + 1)}`;
      const bestScore = m.bestScore ? m.bestScore.toFixed(1) : "-";
      const trophies = m.trophiesCount || 0;
      const drafts = m.totalDrafts || 0;

      const colorDots = (m.preferredColors || [])
        .map((c) => `<span class="color-dot ${c}" title="Couleur ${c}"></span>`)
        .join("");

      return `
        <div class="pantheon-card">
          <div class="pantheon-card-header">
            <img src="${m.avatarUrl}" alt="${escapeHtml(m.name)}" class="pantheon-avatar" />
            <div class="pantheon-name-wrap">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span class="pantheon-name">${escapeHtml(m.name)}</span>
                <span style="font-size: 0.85rem; font-weight: 800; color: #d4af37;">${rankBadge}</span>
              </div>
              <div class="pantheon-nickname">${escapeHtml(m.nickname)}</div>
              <div class="pantheon-title">${escapeHtml(m.title)}</div>
              <div class="magicien-colors-dots" style="margin-top: 4px;">
                ${colorDots}
              </div>
            </div>
          </div>
          <div class="pantheon-quote">« ${escapeHtml(m.quote)} »</div>
          <div class="pantheon-stats-row">
            <div class="pantheon-stat-item">
              <span class="pantheon-stat-val gold">${bestScore}</span>
              <span class="pantheon-stat-lbl">Record Score</span>
            </div>
            <div class="pantheon-stat-item">
              <span class="pantheon-stat-val">${String(trophies)}</span>
              <span class="pantheon-stat-lbl">Trophées #1 🏆</span>
            </div>
            <div class="pantheon-stat-item">
              <span class="pantheon-stat-val">${String(drafts)}</span>
              <span class="pantheon-stat-lbl">Drafts Joués</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
