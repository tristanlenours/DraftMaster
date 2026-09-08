import type {
  DetailedDraftReport,
  InitialDealtBooster,
  EnrichedCard,
} from "./detailed-simulation.ts";

function escapeHtml(text: string | number | undefined | null): string {
  if (text === undefined || text === null || text === "") return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateBoosterDistributionHtml(report: DetailedDraftReport): string {
  const serializedReport = JSON.stringify(report).replace(/</g, "\\u003c");
  const boosters: readonly InitialDealtBooster[] = report.initialBoosters ?? [];

  // Compute aggregate statistics
  const allCards: EnrichedCard[] = boosters.flatMap((b) => b.cards);
  const totalCards = allCards.length;
  const bombCount = allCards.filter((card) => card.isBomb).length;
  const averageBombsPerBooster = boosters.length === 0 ? 0 : bombCount / boosters.length;
  const boostersWithoutBomb = boosters.filter(
    (booster) => !booster.cards.some((card) => card.isBomb),
  ).length;

  const colorCounts: Record<string, number> = {
    W: 0,
    U: 0,
    B: 0,
    R: 0,
    G: 0,
    multi: 0,
    colorless: 0,
    land: 0,
  };

  const cmcCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const card of allCards) {
    if (card.isLand) {
      colorCounts.land = (colorCounts.land ?? 0) + 1;
    } else if (card.colors.length === 0) {
      colorCounts.colorless = (colorCounts.colorless ?? 0) + 1;
    } else if (card.colors.length > 1) {
      colorCounts.multi = (colorCounts.multi ?? 0) + 1;
    } else if (card.colors[0]) {
      const c = card.colors[0];
      colorCounts[c] = (colorCounts[c] ?? 0) + 1;
    }

    const cmcKey = Math.min(Math.max(0, Math.floor(card.cmc)), 6);
    cmcCounts[cmcKey] = (cmcCounts[cmcKey] ?? 0) + 1;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DraftMaster — Répartition des 360 Cartes ${report.cubeName} (Seed ${String(report.seed)})</title>
  <style>
    :root {
      --bg-main: #0c0f14;
      --bg-surface: #151a23;
      --bg-card: #1c2230;
      --bg-highlight: #242d3e;
      --border: #2c3548;
      --text-main: #f0f4fc;
      --text-muted: #8b99b5;
      --primary: #4f8cff;
      --primary-glow: rgba(79, 140, 255, 0.35);
      --accent: #ffb834;
      --accent-glow: rgba(255, 184, 52, 0.35);
      --success: #10b981;
      --danger: #ef4444;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-main);
      color: var(--text-main);
      font-family: var(--font);
      line-height: 1.5;
      padding: 0;
      overflow-x: hidden;
    }

    /* HEADER */
    header {
      background: linear-gradient(180deg, #161c28 0%, #0e1219 100%);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .logo-badge {
      background: linear-gradient(135deg, #ffb834 0%, #f97316 100%);
      color: #0c0f14;
      font-weight: 800;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      letter-spacing: 0.5px;
    }

    h1 {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      font-size: 0.85rem;
    }

    .badge-seed {
      background: #222938;
      border: 1px solid #3b465d;
      color: var(--accent);
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-family: monospace;
      font-weight: 600;
    }

    .btn-switch-report {
      background: var(--primary);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.45rem 1rem;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      box-shadow: 0 2px 8px var(--primary-glow);
      transition: all 0.2s ease;
    }

    .btn-switch-report:hover {
      background: #3b79f5;
      transform: translateY(-1px);
    }

    main {
      max-width: 1700px;
      margin: 0 auto;
      padding: 1.5rem 2rem;
    }

    /* STATS SUMMARY BAR */
    .summary-box {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-number {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--accent);
      line-height: 1.1;
    }

    .stat-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .color-pills-row {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-top: 0.3rem;
    }

    .color-pill {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .color-pill.white { background: #fef08a; color: #422006; }
    .color-pill.blue { background: #93c5fd; color: #1e3a8a; }
    .color-pill.black { background: #475569; color: #f8fafc; }
    .color-pill.red { background: #fca5a5; color: #7f1d1d; }
    .color-pill.green { background: #86efac; color: #14532d; }
    .color-pill.multi { background: #fcd34d; color: #78350f; }
    .color-pill.colorless { background: #94a3b8; color: #0f172a; }
    .color-pill.land { background: #d97706; color: #ffffff; }

    /* STICKY FILTER BAR */
    .filter-sticky-bar {
      position: sticky;
      top: 61px;
      z-index: 90;
      background: rgba(14, 18, 25, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.75rem 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .filter-top-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .round-tabs {
      display: flex;
      gap: 0.4rem;
      background: #11151e;
      padding: 0.25rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }

    .round-tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .round-tab-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }

    .round-tab-btn.active {
      background: var(--accent);
      color: #0c0f14;
      box-shadow: 0 2px 8px var(--accent-glow);
    }

    .search-box {
      display: flex;
      align-items: center;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.35rem 0.75rem;
      gap: 0.5rem;
      min-width: 260px;
    }

    .search-input {
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 0.85rem;
      outline: none;
      width: 100%;
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .filter-bottom-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      font-size: 0.82rem;
    }

    .seat-filter-chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .chip-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .chip-btn:hover {
      background: var(--bg-highlight);
      color: var(--text-main);
    }

    .chip-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      box-shadow: 0 0 8px var(--primary-glow);
    }

    .chip-btn.titou-chip.active {
      background: var(--accent);
      color: #0c0f14;
      border-color: var(--accent);
      box-shadow: 0 0 8px var(--accent-glow);
    }

    /* BOOSTERS CONTAINER */
    .boosters-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .booster-card-wrapper {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      scroll-margin-top: 140px;
      transition: border-color 0.2s ease;
    }

    .booster-card-wrapper:hover {
      border-color: #3e4d6a;
    }

    .booster-card-wrapper.titou-booster {
      border-color: rgba(255, 184, 52, 0.4);
      background: linear-gradient(180deg, rgba(255, 184, 52, 0.04) 0%, var(--bg-surface) 100%);
    }

    .booster-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.8rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }

    .booster-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .booster-pack-tag {
      background: var(--primary);
      color: white;
      font-weight: 800;
      font-size: 0.78rem;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.5px;
    }

    .booster-bot-name {
      font-size: 1.15rem;
      font-weight: 700;
    }


    .cards-15-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 1rem;
    }

    .card-item {
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .card-item:hover {
      transform: translateY(-4px) scale(1.02);
      border-color: #51648a;
      z-index: 10;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7);
    }


    .rank-number {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      z-index: 5;
    }

    .card-img-wrap {
      width: 100%;
      aspect-ratio: 5 / 7;
      background: #111;
      overflow: hidden;
    }

    .card-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .card-details {
      padding: 0.6rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      background: var(--bg-surface);
    }

    .card-name {
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .score-badge {
      background: rgba(255, 184, 52, 0.15);
      color: var(--accent);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-weight: 700;
    }

    .card-item.is-bomb {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent-glow);
    }

    .bomb-ribbon {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 6;
      border-radius: 999px;
      background: linear-gradient(135deg, #ffb834, #f97316);
      color: #0c0f14;
      padding: 0.2rem 0.5rem;
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.04em;
    }

    /* FLOATING BACK TO TOP BUTTON */
    .btn-top {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 44px;
      height: 44px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text-main);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 99;
      transition: all 0.2s ease;
    }

    .btn-top:hover {
      background: var(--primary);
      border-color: var(--primary);
      transform: translateY(-3px);
    }
  </style>
</head>
<body>

  <header>
    <div class="header-title">
      <span class="logo-badge">DRAFTMASTER</span>
      <h1>${escapeHtml(report.cubeName)} — Les 360 Cartes</h1>
    </div>
    <div class="header-meta">
      <span class="badge-seed">Seed: ${String(report.seed)}</span>
      <span style="color: var(--text-muted); font-size: 0.85rem;">24 Boosters &bull; 360 Cartes</span>
      <a href="draft-titou-seed-${String(report.seed)}.html" class="btn-switch-report">
        🎯 Voir le Parcours 17Lands & Decks
      </a>
    </div>
  </header>

  <main>
    <!-- GLOBAL STATS SUMMARY BOX -->
    <div class="summary-box">
      <div class="stat-card">
        <span class="stat-label">Total des Cartes Dealt</span>
        <span class="stat-number">${String(totalCards)}</span>
        <span class="stat-sub">3 tours de 8 paquets de 15 cartes</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">Bombes — Top 5 % du Cube</span>
        <span class="stat-number">${String(bombCount)}</span>
        <span class="stat-sub">${String(bombCount)} bombes distribuées &bull; ${averageBombsPerBooster.toFixed(2).replace(".", ",")} par booster &bull; ${String(boostersWithoutBomb)} boosters sans bombe</span>
        <span class="stat-sub">Seuil ${String(report.bombDefinition.cutoffScore)}/55 &bull; ${String(report.bombDefinition.bombCardCount)} cartes éligibles sur ${String(report.bombDefinition.rankedUniqueCards)} identités uniques, égalités incluses</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">Répartition par Couleur</span>
        <div class="color-pills-row">
          <span class="color-pill white">W ${String(colorCounts.W)}</span>
          <span class="color-pill blue">U ${String(colorCounts.U)}</span>
          <span class="color-pill black">B ${String(colorCounts.B)}</span>
          <span class="color-pill red">R ${String(colorCounts.R)}</span>
          <span class="color-pill green">G ${String(colorCounts.G)}</span>
          <span class="color-pill multi">Multi ${String(colorCounts.multi)}</span>
          <span class="color-pill colorless">Inc ${String(colorCounts.colorless)}</span>
          <span class="color-pill land">Lands ${String(colorCounts.land)}</span>
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">Courbe de Mana (CMC)</span>
        <div style="display: flex; align-items: flex-end; gap: 0.4rem; height: 36px; margin-top: 0.4rem;">
          ${[0, 1, 2, 3, 4, 5, 6]
            .map((cmc) => {
              const count = cmcCounts[cmc] ?? 0;
              const heightPct = Math.min(100, Math.round((count / 90) * 100));
              return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <div style="width: 100%; height: ${String(heightPct)}%; background: var(--accent); border-radius: 2px;"></div>
                  <span style="font-size: 0.65rem; color: var(--text-muted);">${cmc === 6 ? "6+" : String(cmc)}</span>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    </div>

    <!-- STICKY FILTER BAR -->
    <div class="filter-sticky-bar">
      <div class="filter-top-row">
        <div class="round-tabs">
          <button class="round-tab-btn active" onclick="setRoundFilter(0)">Tous les 24 Paquets</button>
          <button class="round-tab-btn" onclick="setRoundFilter(1)">Tour 1 (Packs 1 à 8)</button>
          <button class="round-tab-btn" onclick="setRoundFilter(2)">Tour 2 (Packs 9 à 16)</button>
          <button class="round-tab-btn" onclick="setRoundFilter(3)">Tour 3 (Packs 17 à 24)</button>
        </div>

        <div class="search-box">
          <span>🔍</span>
          <input type="text"
                 class="search-input"
                 id="search-input"
                 placeholder="Rechercher une carte par nom ou type..."
                 oninput="onSearchInput(this.value)" />
        </div>
      </div>

      <div class="filter-bottom-row">
        <div class="seat-filter-chips">
          <span style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Filtrer par Siège :</span>
          <button class="chip-btn active" onclick="setSeatFilter(-1)">Tous</button>
          ${report.seats
            .map(
              (seat) =>
                `<button class="chip-btn${seat.seatId === 7 ? " titou-chip" : ""}" onclick="setSeatFilter(${String(seat.seatId)})">${seat.seatId === 7 ? "👑 " : ""}${escapeHtml(seat.botName)}</button>`,
            )
            .join("\n          ")}
        </div>

        <div style="color: var(--text-muted); font-size: 0.8rem;" id="filter-count-label">
          Affichage : 24 paquets (360 cartes)
        </div>
      </div>
    </div>

    <!-- BOOSTERS CONTAINER -->
    <div class="boosters-container" id="boosters-container">
      <!-- Rendered by JavaScript -->
    </div>
  </main>

  <button class="btn-top" onclick="window.scrollTo({ top: 0, behavior: 'smooth' })" title="Haut de page">&uarr;</button>

  <!-- EMBEDDED REPORT JSON DATA -->
  <script id="draft-data" type="application/json">
${serializedReport}
  </script>

  <script>
    const DRAFT_DATA = JSON.parse(document.getElementById('draft-data').textContent);
    const ALL_BOOSTERS = DRAFT_DATA.initialBoosters || [];

    let filterState = {
      round: 0, // 0 = all, 1 = pack 1, 2 = pack 2, 3 = pack 3
      seatId: -1, // -1 = all, 0..7
      query: '',
    };

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function onImageError(img) {
      if (!img.dataset.retried) {
        img.dataset.retried = '1';
        const currentSrc = img.getAttribute('src') || '';
        img.src = currentSrc.startsWith('../') ? currentSrc : '../' + currentSrc;
      } else {
        img.onerror = null;
        img.src = 'https://api.scryfall.com/cards/named?format=image&exact=' + encodeURIComponent(img.dataset.cardName || '');
      }
    }

    function setRoundFilter(roundNum) {
      filterState.round = Number(roundNum);
      document.querySelectorAll('.round-tab-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === roundNum);
      });
      renderBoosters();
    }

    function setSeatFilter(seatId) {
      filterState.seatId = Number(seatId);
      document.querySelectorAll('.seat-filter-chips .chip-btn').forEach(btn => {
        const text = btn.textContent;
        const isAll = filterState.seatId === -1 && text.includes('Tous');
        const isMatch = btn.getAttribute('onclick')?.includes('(' + filterState.seatId + ')');
        btn.classList.toggle('active', Boolean(isAll || isMatch));
      });
      renderBoosters();
    }

    function onSearchInput(val) {
      filterState.query = (val || '').toLowerCase().trim();
      renderBoosters();
    }

    function renderBoosters() {
      const container = document.getElementById('boosters-container');
      container.innerHTML = '';

      let visibleBoostersCount = 0;
      let visibleCardsCount = 0;

      ALL_BOOSTERS.forEach((booster, bIndex) => {
        // Round filter
        if (filterState.round > 0 && booster.packNumber !== filterState.round) {
          return;
        }
        // Seat filter
        if (filterState.seatId >= 0 && booster.originSeatId !== filterState.seatId) {
          return;
        }

        // Query filter: filter cards inside booster
        let matchingCards = booster.cards;
        if (filterState.query) {
          matchingCards = booster.cards.filter(c =>
            c.name.toLowerCase().includes(filterState.query) ||
            (c.typeLine && c.typeLine.toLowerCase().includes(filterState.query))
          );
          if (matchingCards.length === 0) {
            return;
          }
        }

        visibleBoostersCount++;
        visibleCardsCount += matchingCards.length;

        const isTitou = booster.originSeatId === 7;
        const wrapper = document.createElement('div');
        wrapper.className = 'booster-card-wrapper' + (isTitou ? ' titou-booster' : '');
        wrapper.id = 'booster-' + booster.boosterId;

        // Sort booster cards by staticScore descending to show rank
        const sortedCards = [...matchingCards].sort((a, b) => b.staticScore - a.staticScore);

        let cardsHtml = '';
        sortedCards.forEach((card, rIdx) => {
          const fallbackUrl = 'https://api.scryfall.com/cards/named?format=image&exact=' + encodeURIComponent(card.name);
          const imgSrc = card.localImagePath || fallbackUrl;

          cardsHtml += \`
            <div class="card-item \${card.isBomb ? 'is-bomb' : ''}" title="\${escapeHtml(card.name)} (\${card.typeLine})">
              <span class="rank-number">#\${rIdx + 1}</span>
              \${card.isBomb ? '<span class="bomb-ribbon">💥 BOMBE</span>' : ''}
              <div class="card-img-wrap">
                <img src="\${escapeHtml(imgSrc)}"
                     alt="\${escapeHtml(card.name)}"
                     data-card-name="\${escapeHtml(card.name)}"
                     onerror="onImageError(this);"
                     loading="lazy" />
              </div>
              <div class="card-details">
                <div class="card-name">\${escapeHtml(card.name)}</div>
                <div class="card-meta-row">
                  <span>\${escapeHtml(card.typeLine ? card.typeLine.split('—')[0].trim() : 'Card')}</span>
                  <span class="score-badge">★ \${card.staticScore}</span>
                </div>
              </div>
            </div>
          \`;
        });

        wrapper.innerHTML = \`
          <div class="booster-header">
            <div class="booster-title">
              <span class="booster-pack-tag">Pack \${booster.packNumber} &bull; Paquet #\${bIndex + 1}</span>
              <div class="booster-bot-name">\${isTitou ? '👑 ' : ''}\${escapeHtml(booster.originBotName)} (Siège \${booster.originSeatId})</div>
            </div>
            <span class="score-badge">\${booster.cards.filter(card => card.isBomb).length} bombe(s)</span>
          </div>
          <div class="cards-15-grid">
            \${cardsHtml}
          </div>
        \`;

        container.appendChild(wrapper);
      });

      // Update count label
      const countLabel = document.getElementById('filter-count-label');
      if (countLabel) {
        countLabel.textContent = \`Affichage : \${visibleBoostersCount} paquet\${visibleBoostersCount > 1 ? 's' : ''} (\${visibleCardsCount} cartes)\`;
      }

      if (visibleBoostersCount === 0) {
        container.innerHTML = \`
          <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Aucune carte ne correspond à vos filtres</div>
            <div style="font-size: 0.85rem; margin-top: 0.3rem;">Essayez d'ajuster votre recherche ou de réinitialiser les filtres.</div>
          </div>
        \`;
      }
    }

    // Initialize
    renderBoosters();
  </script>
</body>
</html>`;
}
