import type { DetailedDraftReport } from "./detailed-simulation.ts";

function escapeHtml(text: string | number | undefined | null): string {
  if (text === undefined || text === null || text === "") return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateDetailedDraftHtml(report: DetailedDraftReport): string {
  const serializedReport = JSON.stringify(report).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DraftMaster — Rapport 17Lands ${report.cubeName} (Seed ${String(report.seed)})</title>
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
      --success: #10b981;
      --danger: #ef4444;
      --pick-badge: #10b981;
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
      background: linear-gradient(135deg, #4f8cff 0%, #a855f7 100%);
      color: white;
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

    .nav-tabs {
      display: flex;
      gap: 0.4rem;
      background: #11151e;
      padding: 0.3rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
      background: var(--primary);
      color: white;
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    main {
      max-width: 1600px;
      margin: 0 auto;
      padding: 1.5rem 2rem;
    }

    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
    }

    /* ========================================================
       BOT SELECTOR BAR
       ======================================================== */
    .bot-selector-bar {
      display: flex;
      gap: 0.6rem;
      overflow-x: auto;
      padding-bottom: 0.8rem;
      margin-bottom: 1.2rem;
      border-bottom: 1px solid var(--border);
    }

    .bot-btn {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.5rem 0.9rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .bot-btn:hover {
      background: var(--bg-highlight);
      color: var(--text-main);
    }

    .bot-btn.active {
      background: var(--bg-highlight);
      border-color: var(--primary);
      color: var(--text-main);
      box-shadow: 0 0 12px var(--primary-glow);
    }

    .bot-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .bot-btn.seat-0 .bot-avatar { background: linear-gradient(135deg, #10b981, #059669); }
    .bot-btn.seat-1 .bot-avatar { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    .bot-btn.seat-2 .bot-avatar { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .bot-btn.seat-3 .bot-avatar { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
    .bot-btn.seat-4 .bot-avatar { background: linear-gradient(135deg, #06b6d4, #0891b2); }
    .bot-btn.seat-5 .bot-avatar { background: linear-gradient(135deg, #ec4899, #be185d); }
    .bot-btn.seat-6 .bot-avatar { background: linear-gradient(135deg, #6366f1, #4338ca); }
    .bot-btn.seat-7 .bot-avatar { background: linear-gradient(135deg, #14b8a6, #0f766e); }

    /* ========================================================
       TAB 1: TABLE OVERVIEW (8 BOTS)
       ======================================================== */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .bot-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .bot-card:hover {
      transform: translateY(-2px);
      border-color: #435272;
    }

    .bot-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.8rem;
    }

    .bot-card-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .bot-card-name {
      font-size: 1.1rem;
      font-weight: 700;
    }

    .bot-card-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .score-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--bg-highlight);
      border: 2px solid var(--success);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 800;
      color: var(--success);
    }

    .score-circle.score-medium { border-color: var(--accent); color: var(--accent); }
    .score-circle.score-low { border-color: var(--danger); color: var(--danger); }

    .bot-quote {
      font-style: italic;
      font-size: 0.82rem;
      color: #94a3b8;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--primary);
    }

    .archetype-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #1e2638;
      border: 1px solid #334155;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .axes-bars {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .axis-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.78rem;
    }

    .axis-label {
      width: 110px;
      color: var(--text-muted);
    }

    .progress-track {
      flex: 1;
      height: 6px;
      background: #222a3a;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      border-radius: 3px;
    }

    .progress-fill.synergy { background: linear-gradient(90deg, #ec4899, #f472b6); }
    .progress-fill.consistency { background: linear-gradient(90deg, #10b981, #34d399); }

    .axis-value {
      width: 28px;
      text-align: right;
      font-weight: 700;
    }

    .bot-card-actions {
      display: flex;
      gap: 0.6rem;
      margin-top: auto;
    }

    .btn-action {
      flex: 1;
      background: var(--bg-highlight);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
    }

    .btn-action:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }

    /* ========================================================
       TAB 2: 17LANDS WALKTHROUGH (45 SCREENS)
       ======================================================== */
    .stepper-sticky-bar {
      position: sticky;
      top: 61px;
      z-index: 90;
      background: rgba(14, 18, 25, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.75rem 1.25rem;
      margin-bottom: 1rem;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .stepper-row-bots {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .stepper-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .stepper-row-controls {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.8rem;
    }

    .stepper-nav-arrows {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .nav-arrow-primary {
      background: var(--primary) !important;
      color: white !important;
      font-weight: 700 !important;
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .nav-arrow-primary:hover {
      background: #3b79f5 !important;
      transform: scale(1.03);
    }

    .pack-selector {
      display: flex;
      gap: 0.4rem;
    }

    .pack-btn {
      background: #1d2535;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.35rem 0.8rem;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pack-btn:hover {
      color: var(--text-main);
      background: #273248;
    }

    .pack-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .pick-buttons-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }

    .pick-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #18202d;
      border: 1px solid var(--border);
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pick-btn:hover {
      background: #242f44;
      color: white;
    }

    .pick-btn.active {
      background: var(--accent);
      color: #0c0f14;
      border-color: var(--accent);
      font-weight: 800;
      box-shadow: 0 0 10px rgba(255, 184, 52, 0.4);
    }

    .nav-arrow-btn {
      background: #1e2637;
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .nav-arrow-btn:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    /* Floating Navigation Pill */
    .floating-nav-pill {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999;
      background: rgba(18, 23, 33, 0.94);
      backdrop-filter: blur(14px);
      border: 1px solid #3b4866;
      border-radius: 999px;
      padding: 0.45rem 0.75rem;
      display: none;
      align-items: center;
      gap: 0.8rem;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.75), 0 0 15px rgba(79, 140, 255, 0.25);
    }

    .floating-btn {
      background: #1c2333;
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 0.4rem 0.9rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .floating-btn:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .floating-btn-next {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
      box-shadow: 0 2px 10px var(--primary-glow);
    }

    .floating-btn-next:hover {
      background: #3b79f5;
      transform: scale(1.04);
    }

    .floating-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .floating-bot {
      font-weight: 700;
      color: var(--accent);
    }

    .floating-pick {
      background: var(--success);
      color: #0c0f14;
      font-weight: 800;
      font-size: 0.75rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .floating-card {
      color: #cbd5e1;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Floating side chevrons */
    .side-nav-btn {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      z-index: 95;
      width: 44px;
      height: 68px;
      background: rgba(18, 23, 33, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 1.8rem;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      line-height: 1;
    }

    .side-nav-btn:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
      box-shadow: 0 0 20px var(--primary-glow);
    }

    .side-nav-left {
      left: 0;
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
    }

    .side-nav-right {
      right: 0;
      border-radius: var(--radius-md) 0 0 var(--radius-md);
    }

    /* Justification banner */
    .justification-banner {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(79, 140, 255, 0.08) 100%);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .justification-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .picked-card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--success);
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .pick-number-badge {
      background: var(--success);
      color: #0c0f14;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
    }

    .justification-text {
      font-size: 0.95rem;
      color: #e2e8f0;
      line-height: 1.5;
    }

    /* Layout for Booster + Pool Drawer */
    .walkthrough-body {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1.5rem;
      align-items: start;
    }

    @media (max-width: 1100px) {
      .walkthrough-body {
        grid-template-columns: 1fr;
      }
    }

    .booster-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }

    .card-item {
      background: var(--bg-surface);
      border: 2px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.2s ease;
    }

    .card-item:hover {
      transform: translateY(-4px) scale(1.02);
      border-color: #51648a;
      z-index: 10;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    }

    .card-item.is-picked {
      border-color: var(--success);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
    }

    .picked-flag {
      position: absolute;
      top: 8px;
      right: 8px;
      background: var(--success);
      color: #0c0f14;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.5px;
      z-index: 5;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    }

    .rank-flag {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.2);
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
      font-size: 0.85rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-scores-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
    }

    .score-pill-dyn {
      background: rgba(79, 140, 255, 0.2);
      color: var(--primary);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-weight: 700;
    }

    .score-pill-static {
      color: var(--text-muted);
    }

    /* Pool Drawer */
    .pool-drawer {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 85vh;
      overflow-y: auto;
    }

    .pool-drawer-title {
      font-size: 1rem;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.6rem;
    }

    .pool-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .pool-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-highlight);
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
    }

    .pool-item-cmc {
      width: 20px;
      height: 20px;
      background: #334155;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 700;
    }

    /* ========================================================
       TAB 3: FINAL DECK (23 CARDS + 17 LANDS)
       ======================================================== */
    .deck-header-box {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1.5rem;
      align-items: center;
    }

    @media (max-width: 900px) {
      .deck-header-box { grid-template-columns: 1fr; }
    }

    .deck-title-area {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .deck-main-title {
      font-size: 1.4rem;
      font-weight: 800;
    }

    .deck-scores-card {
      background: var(--bg-highlight);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }

    .deck-score-hero {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .deck-score-hero-number {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--success);
      line-height: 1;
    }

    .deck-curve-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .curve-col {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .curve-col-header {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.4rem;
      display: flex;
      justify-content: space-between;
    }

    .deck-card-mini {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      background: var(--bg-highlight);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      transition: transform 0.15s ease;
    }

    .deck-card-mini:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
    }

    .deck-card-mini img {
      width: 100%;
      aspect-ratio: 5 / 7;
      object-fit: cover;
    }

    .deck-card-mini-label {
      padding: 0.35rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sideboard-section {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }

    .sideboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.8rem;
      margin-top: 1rem;
    }

    .feedback-box {
      margin-top: 1rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .feedback-box { grid-template-columns: 1fr; }
    }

    .feedback-col {
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      padding: 0.8rem;
      font-size: 0.82rem;
    }
    .feedback-col h4 {
      margin-bottom: 0.4rem;
      font-size: 0.85rem;
    }
    .feedback-col.strengths h4 { color: var(--success); }
    .feedback-col.weaknesses h4 { color: var(--danger); }
    .feedback-col ul {
      padding-left: 1.2rem;
    }

    .deck-audit-section {
      margin: 1.5rem 0 2rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }

    .deck-audit-meta {
      margin: 0.35rem 0 1rem;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .deck-audit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 0.8rem;
    }

    .deck-audit-card {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.85rem;
      font-size: 0.8rem;
      line-height: 1.55;
    }

    .deck-audit-card h4 {
      margin-bottom: 0.45rem;
      color: var(--accent);
    }

    .decision-proof {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      display: grid;
      gap: 0.55rem;
      font-size: 0.8rem;
    }

    .proof-row, .bias-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
    }

    .proof-chip, .bias-chip {
      background: rgba(79, 140, 255, 0.13);
      border: 1px solid rgba(79, 140, 255, 0.3);
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
    }

    .bias-chip.negative {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.35);
    }

    .candidate-policy-line {
      color: var(--text-muted);
      font-size: 0.7rem;
      line-height: 1.35;
    }

    .timeline-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .timeline-decisions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .timeline-decision-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: grid;
      gap: 0.55rem;
    }

    .timeline-decision-title {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-weight: 700;
    }

    .timeline-card-name { color: var(--success); font-size: 1rem; font-weight: 700; }
  </style>
</head>
<body>

  <header>
    <div class="header-title">
      <span class="logo-badge">DRAFTMASTER</span>
      <h1>${escapeHtml(report.cubeName)}</h1>
    </div>
    <div class="header-meta">
      <span class="badge-seed">Seed: ${String(report.seed)}</span>
      <nav class="nav-tabs">
        <button class="tab-btn active" onclick="switchTab('overview')">Table des 8 Bots</button>
        <button class="tab-btn" onclick="switchTab('timeline')">Fil du draft (45 Tours)</button>
        <button class="tab-btn" onclick="switchTab('walkthrough')">Parcours 17Lands (45 Écrans)</button>
        <button class="tab-btn" onclick="switchTab('deck')">Deck Final (23 Cartes)</button>
        <a href="draft-titou-seed-${String(report.seed)}-boosters.html" class="tab-btn link-boosters" style="text-decoration: none; border: 1px solid var(--accent); color: var(--accent); display: flex; align-items: center; gap: 0.35rem;" title="Voir les 360 cartes réparties en 24 paquets de 15">📦 360 Cartes (24 Boosters)</a>
      </nav>
    </div>
  </header>

  <main>
    <!-- TAB 1: OVERVIEW DE LA TABLE (8 BOTS) -->
    <section id="tab-overview" class="tab-pane active">
      <div style="margin-bottom: 1.2rem;">
        <h2 style="font-size: 1.3rem; margin-bottom: 0.3rem;">Résumé de la Table de Draft</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Tirage déterministe avec la graine <strong>${String(report.seed)}</strong> sur 3 packs de 15 cartes (360 cartes parmi les 545 du Cube).
        </p>
      </div>

      <div class="overview-grid" id="overview-grid">
        <!-- Rendered by JavaScript -->
      </div>
    </section>

    <!-- TAB 2: FIL CHRONOLOGIQUE DES 360 DÉCISIONS -->
    <section id="tab-timeline" class="tab-pane">
      <div style="margin-bottom: 1rem;">
        <h2 style="font-size: 1.3rem; margin-bottom: 0.3rem;">Fil du draft : qui choisit quoi, quand et pourquoi</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Chaque tour regroupe les huit décisions et les relie à leur séquence dans le journal canonique.
        </p>
      </div>
      <div class="timeline-controls">
        <button class="nav-arrow-btn" onclick="prevPick()">&larr; Tour précédent</button>
        <span class="badge-seed" id="timeline-round-label">P1P1</span>
        <button class="nav-arrow-btn nav-arrow-primary" onclick="nextPick()">Tour suivant &rarr;</button>
      </div>
      <div class="timeline-decisions-grid" id="timeline-decisions-grid"></div>
    </section>

    <!-- TAB 3: PARCOURS 17LANDS (45 ÉCRANS) -->
    <section id="tab-walkthrough" class="tab-pane">
      <!-- Sticky Navigation Bar (stays on screen when scrolling through cards) -->
      <div class="stepper-sticky-bar">
        <div class="stepper-row-bots">
          <span class="stepper-label">Drafteur :</span>
          <div class="bot-selector-bar" id="walkthrough-bot-selector" style="margin-bottom: 0; padding-bottom: 0; border-bottom: none;">
            <!-- Rendered by JavaScript -->
          </div>
        </div>

        <div class="stepper-row-controls">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <div class="pack-selector">
              <button class="pack-btn active" id="btn-pack-1" onclick="setPack(1)">Pack 1</button>
              <button class="pack-btn" id="btn-pack-2" onclick="setPack(2)">Pack 2</button>
              <button class="pack-btn" id="btn-pack-3" onclick="setPack(3)">Pack 3</button>
            </div>
            <div class="pick-buttons-grid" id="pick-buttons-grid">
              <!-- Rendered by JavaScript (1..15) -->
            </div>
          </div>

          <div class="stepper-nav-arrows">
            <button class="nav-arrow-btn" onclick="prevPick()" title="Pick précédent (Raccourci: Touche Flèche Gauche)">&larr; Précédent</button>
            <button class="nav-arrow-btn nav-arrow-primary" onclick="nextPick()" title="Pick suivant (Raccourci: Touche Flèche Droite ou Espace)">Suivant &rarr;</button>
          </div>
        </div>
      </div>

      <!-- Justification Banner -->
      <div class="justification-banner" id="justification-banner" style="margin-bottom: 1.5rem;">
        <div class="justification-top">
          <div class="picked-card-title">
            <span class="pick-number-badge" id="banner-pick-badge">P1P1</span>
            <span id="banner-card-name">Carte Choisie</span>
          </div>
          <div style="display: flex; gap: 0.5rem; font-size: 0.8rem;">
            <span class="score-pill-dyn" id="banner-dyn-score">Score dyn: 0</span>
            <span class="score-pill-dyn" id="banner-policy-score">Score bot: 0</span>
            <span class="score-pill-dyn" id="banner-probability">Probabilité: 0 %</span>
            <span class="score-pill-static" id="banner-static-score">Score brut: 0</span>
          </div>
        </div>
        <div class="justification-text" id="banner-justification">
          Justification text...
        </div>
        <div class="decision-proof" id="decision-proof"></div>
      </div>

      <div class="walkthrough-body">
        <div>
          <h3 style="font-size: 1rem; margin-bottom: 0.8rem; color: var(--text-muted);" id="booster-count-label">
            Cartes disponibles dans le booster
          </h3>
          <div class="booster-grid" id="booster-cards-grid">
            <!-- Rendered by JavaScript -->
          </div>
        </div>

        <aside class="pool-drawer">
          <div class="pool-drawer-title">
            <span>Pool Actuel</span>
            <span style="color: var(--primary); font-size: 0.85rem;" id="pool-count-label">0 cartes</span>
          </div>
          <div class="pool-list" id="pool-list-container">
            <!-- Rendered by JavaScript -->
          </div>
        </aside>
      </div>

      <!-- Floating Navigation Pill (Fixed at bottom-center of viewport) -->
      <div class="floating-nav-pill" id="floating-nav-pill">
        <button class="floating-btn" onclick="prevPick()" title="Précédent (←)">&larr; Précédent</button>
        <div class="floating-meta">
          <span class="floating-bot" id="float-bot-name">Titou</span>
          <span class="floating-pick" id="float-pick-badge">P1P1</span>
          <span class="floating-card" id="float-card-name">Tundra</span>
        </div>
        <button class="floating-btn floating-btn-next" onclick="nextPick()" title="Suivant (→ ou Espace)">Suivant &rarr;</button>
      </div>

      <!-- Floating Side Chevrons -->
      <button class="side-nav-btn side-nav-left" onclick="prevPick()" title="Précédent (←)">&lsaquo;</button>
      <button class="side-nav-btn side-nav-right" onclick="nextPick()" title="Suivant (→ ou Espace)">&rsaquo;</button>
    </section>

    <!-- TAB 3: DECK FINAL (23 CARTES + 17 TERRAINS) -->
    <section id="tab-deck" class="tab-pane">
      <div class="bot-selector-bar" id="deck-bot-selector">
        <!-- Rendered by JavaScript -->
      </div>

      <div class="deck-header-box" id="deck-header-box">
        <div class="deck-title-area">
          <div style="font-size: 0.85rem; color: var(--text-muted);" id="deck-bot-title">Bot</div>
          <div class="deck-main-title" id="deck-archetype-name">Nom de l'Archétype</div>
          <div style="font-size: 0.9rem; color: #cbd5e1;" id="deck-archetype-desc">Description du plan de jeu...</div>
        </div>

        <div class="deck-scores-card">
          <div class="deck-score-hero">
            <div class="deck-score-hero-number" id="deck-overall-score">85</div>
            <div>
              <div style="font-size: 0.85rem; font-weight: 700;">Score Global / 100</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);" id="deck-spells-count">23 Sorts + 17 Terrains</div>
            </div>
          </div>

          <div class="axes-bars">
            <div class="axis-row">
              <span class="axis-label">Puissance</span>
              <div class="progress-track"><div class="progress-fill" id="deck-axe-power" style="width: 80%;"></div></div>
              <span class="axis-value" id="deck-val-power">80</span>
            </div>
            <div class="axis-row">
              <span class="axis-label">Synergie</span>
              <div class="progress-track"><div class="progress-fill synergy" id="deck-axe-synergy" style="width: 85%;"></div></div>
              <span class="axis-value" id="deck-val-synergy">85</span>
            </div>
            <div class="axis-row">
              <span class="axis-label">Courbe</span>
              <div class="progress-track"><div class="progress-fill consistency" id="deck-axe-curve" style="width: 78%;"></div></div>
              <span class="axis-value" id="deck-val-curve">78</span>
            </div>
            <div class="axis-row">
              <span class="axis-label">Mana</span>
              <div class="progress-track"><div class="progress-fill consistency" id="deck-axe-mana" style="width: 78%;"></div></div>
              <span class="axis-value" id="deck-val-mana">78</span>
            </div>
            <div class="axis-row">
              <span class="axis-label">Interaction</span>
              <div class="progress-track"><div class="progress-fill consistency" id="deck-axe-interaction" style="width: 78%;"></div></div>
              <span class="axis-value" id="deck-val-interaction">78</span>
            </div>
          </div>
        </div>
      </div>

      <div class="feedback-box" id="feedback-box">
        <div class="feedback-col strengths">
          <h4>Forces Détectées</h4>
          <ul id="deck-strengths-list"></ul>
        </div>
        <div class="feedback-col weaknesses">
          <h4>Points de Vigilance</h4>
          <ul id="deck-weaknesses-list"></ul>
        </div>
      </div>

      <section class="deck-audit-section">
        <h3>Audit du Score de deck</h3>
        <div class="deck-audit-meta" id="deck-audit-meta"></div>
        <div class="deck-audit-grid">
          <article class="deck-audit-card" id="deck-audit-contributions"><h4>Contributions pondérées</h4></article>
          <article class="deck-audit-card" id="deck-audit-power"><h4>Puissance</h4></article>
          <article class="deck-audit-card" id="deck-audit-synergy"><h4>Synergie</h4></article>
          <article class="deck-audit-card" id="deck-audit-curve"><h4>Courbe</h4></article>
          <article class="deck-audit-card" id="deck-audit-mana"><h4>Mana</h4></article>
          <article class="deck-audit-card" id="deck-audit-interaction"><h4>Interaction</h4></article>
        </div>
      </section>

      <h3 style="font-size: 1.15rem; margin: 1.5rem 0 0.8rem;">Deck Principal (40 cartes : 23 sorts + 17 terrains)</h3>
      <div class="deck-curve-columns" id="deck-curve-columns">
        <!-- Rendered by JavaScript (CMC 1, 2, 3, 4, 5+ and Lands) -->
      </div>

      <div class="sideboard-section">
        <h3 style="font-size: 1rem; color: var(--text-muted);">Réserve (Sideboard - 22 cartes non retenues)</h3>
        <div class="sideboard-grid" id="sideboard-grid">
          <!-- Rendered by JavaScript -->
        </div>
      </div>
    </section>
  </main>

  <!-- EMBEDDED REPORT JSON DATA -->
  <script id="draft-data" type="application/json">
${serializedReport}
  </script>

  <script>
    const DRAFT_DATA = JSON.parse(document.getElementById('draft-data').textContent);

    let state = {
      activeTab: 'overview',
      selectedSeatId: 7,
      currentPack: 1,
      currentPick: 1,
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

    function switchTab(tabId) {
      state.activeTab = tabId;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

      const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b =>
        b.getAttribute('onclick')?.includes(tabId)
      );
      if (targetBtn) targetBtn.classList.add('active');

      const targetPane = document.getElementById('tab-' + tabId);
      if (targetPane) targetPane.classList.add('active');

      const floatPill = document.getElementById('floating-nav-pill');
      const sideBtns = document.querySelectorAll('.side-nav-btn');
      const isWalkthrough = tabId === 'walkthrough';
      if (floatPill) floatPill.style.display = isWalkthrough ? 'flex' : 'none';
      sideBtns.forEach(btn => btn.style.display = isWalkthrough ? 'flex' : 'none');

      if (tabId === 'walkthrough') {
        renderWalkthrough();
      } else if (tabId === 'timeline') {
        renderTimeline();
      } else if (tabId === 'deck') {
        renderFinalDeck();
      }
    }

    function selectBot(seatId, andSwitchTab = null) {
      state.selectedSeatId = Number(seatId);
      document.querySelectorAll('.bot-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.seatId) === state.selectedSeatId);
      });

      if (andSwitchTab) {
        switchTab(andSwitchTab);
      } else {
        if (state.activeTab === 'walkthrough') renderWalkthrough();
        if (state.activeTab === 'deck') renderFinalDeck();
      }
    }

    function setPack(packNum) {
      state.currentPack = Number(packNum);
      renderCurrentDecisionView();
    }

    function setPick(pickNum) {
      state.currentPick = Number(pickNum);
      renderCurrentDecisionView();
    }

    function renderCurrentDecisionView() {
      if (state.activeTab === 'timeline') renderTimeline();
      if (state.activeTab === 'walkthrough') renderWalkthrough();
    }

    function prevPick() {
      if (state.currentPick > 1) {
        state.currentPick--;
      } else if (state.currentPack > 1) {
        state.currentPack--;
        state.currentPick = 15;
      }
      renderCurrentDecisionView();
    }

    function nextPick() {
      if (state.currentPick < 15) {
        state.currentPick++;
      } else if (state.currentPack < 3) {
        state.currentPack++;
        state.currentPick = 1;
      }
      renderCurrentDecisionView();
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (state.activeTab !== 'walkthrough' && state.activeTab !== 'timeline') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPick();
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPick();
      }
    });

    // ========================================================
    // RENDER TAB 1: OVERVIEW
    // ========================================================
    function renderOverview() {
      const container = document.getElementById('overview-grid');
      container.innerHTML = '';

      DRAFT_DATA.seats.forEach(seat => {
        const deck = seat.finalDeck;
        const score = deck.overallScore;
        let scoreClass = 'score-high';
        if (score < 70) scoreClass = 'score-low';
        else if (score < 80) scoreClass = 'score-medium';

        const isTitou = seat.seatId === 7;
        const card = document.createElement('div');
        card.className = 'bot-card' + (isTitou ? ' titou-card' : '');
        card.innerHTML = \`
          <div class="bot-card-header">
            <div class="bot-card-title">
              <div class="bot-avatar" style="background: \${getAvatarGradient(seat.seatId)}">\${isTitou ? '👑' : seat.seatId}</div>
              <div>
                <div class="bot-card-name">\${escapeHtml(seat.botName)}</div>
                <div class="bot-card-subtitle">\${escapeHtml(seat.title)}</div>
              </div>
            </div>
            <div class="score-circle \${scoreClass}">\${score}</div>
          </div>

          <div class="bot-quote">"\${escapeHtml(seat.quote)}"</div>

          <div>
            <span class="archetype-badge">
              🏷️ \${escapeHtml(deck.archetype.label)}
            </span>
          </div>

          <div class="axes-bars">
             <div class="axis-row">
               <span class="axis-label">Puissance</span>
               <div class="progress-track"><div class="progress-fill" style="width: \${deck.radar.power}%;"></div></div>
               <span class="axis-value">\${deck.radar.power}</span>
             </div>
             <div class="axis-row">
               <span class="axis-label">Synergie</span>
               <div class="progress-track"><div class="progress-fill synergy" style="width: \${deck.radar.synergy}%;"></div></div>
               <span class="axis-value">\${deck.radar.synergy}</span>
             </div>
             <div class="axis-row">
               <span class="axis-label">Courbe</span>
               <div class="progress-track"><div class="progress-fill consistency" style="width: \${deck.radar.curve}%;"></div></div>
               <span class="axis-value">\${deck.radar.curve}</span>
             </div>
             <div class="axis-row">
               <span class="axis-label">Mana</span>
               <div class="progress-track"><div class="progress-fill consistency" style="width: \${deck.radar.mana}%;"></div></div>
               <span class="axis-value">\${deck.radar.mana}</span>
             </div>
             <div class="axis-row">
               <span class="axis-label">Interaction</span>
               <div class="progress-track"><div class="progress-fill consistency" style="width: \${deck.radar.interaction}%;"></div></div>
               <span class="axis-value">\${deck.radar.interaction}</span>
             </div>
          </div>

          <div class="bot-card-actions">
            <button class="btn-action \${isTitou ? 'btn-action-primary' : ''}" onclick="selectBot(\${seat.seatId}, 'walkthrough')">
              \${isTitou ? 'Explorer les 45 Picks de Titou' : 'Explorer 45 Picks'}
            </button>
            <button class="btn-action" onclick="selectBot(\${seat.seatId}, 'deck')">
              \${isTitou ? 'Voir Deck de Titou (23)' : 'Voir Deck (23)'}
            </button>
          </div>
        \`;
        container.appendChild(card);
      });
    }

    function getAvatarGradient(seatId) {
      const colors = [
        'linear-gradient(135deg, #10b981, #059669)',
        'linear-gradient(135deg, #ef4444, #b91c1c)',
        'linear-gradient(135deg, #f59e0b, #d97706)',
        'linear-gradient(135deg, #8b5cf6, #6d28d9)',
        'linear-gradient(135deg, #06b6d4, #0891b2)',
        'linear-gradient(135deg, #ec4899, #be185d)',
        'linear-gradient(135deg, #6366f1, #4338ca)',
        'linear-gradient(135deg, #14b8a6, #0f766e)'
      ];
      return colors[seatId % colors.length];
    }

    function formatProbability(value) {
      return (Number(value || 0) * 100).toFixed(2) + ' %';
    }

    function renderBiasChips(contributions) {
      if (!contributions || contributions.length === 0) {
        return '<span class="proof-chip">Aucun biais de personnalité appliqué</span>';
      }
      return contributions.map(contribution =>
        '<span class="bias-chip ' + (contribution.points < 0 ? 'negative' : '') + '">' +
        escapeHtml(contribution.label) + ' : ' + (contribution.points >= 0 ? '+' : '') +
        contribution.points + '</span>'
      ).join('');
    }

    // ========================================================
    // RENDER TAB 2: GLOBAL DRAFT TIMELINE
    // ========================================================
    function renderTimeline() {
      const label = document.getElementById('timeline-round-label');
      if (label) label.textContent = 'P' + state.currentPack + 'P' + state.currentPick;

      const container = document.getElementById('timeline-decisions-grid');
      if (!container) return;
      container.innerHTML = '';

      DRAFT_DATA.seats.forEach(seat => {
        const step = seat.steps.find(candidate =>
          candidate.packNumber === state.currentPack && candidate.pickNumber === state.currentPick
        );
        if (!step) return;
        const picked = step.boosterCards.find(card => card.isPicked);
        const card = document.createElement('article');
        card.className = 'timeline-decision-card';
        card.innerHTML =
          '<div class="timeline-decision-title"><span>Siège ' + seat.seatId + ' — ' +
          escapeHtml(seat.botName) + '</span><span>#' + (picked?.policyRank ?? '?') + '/' +
          step.boosterCards.length + '</span></div>' +
          '<div class="timeline-card-name">' + escapeHtml(step.pickedCardName) + '</div>' +
          '<div class="proof-row"><span class="proof-chip">dynamicScore ' +
          (picked?.dynamicScore?.toFixed(1) ?? '?') + '</span>' +
          '<span class="proof-chip">policyScore ' + (picked?.policyScore?.toFixed(1) ?? '?') +
          '</span><span class="proof-chip">Probabilité ' +
          formatProbability(picked?.selectionProbability) + '</span></div>' +
          '<div><strong>Biais appliqués</strong></div><div class="bias-list">' +
          renderBiasChips(picked?.biasContributions) + '</div>' +
          '<div class="candidate-policy-line">Séquence journal #' + step.eventSequence +
          ' · Booster ' + escapeHtml(step.boosterId) + ' · Tirage déterministe ' +
          (step.decisionTrace.randomRoll === null
            ? 'non requis'
            : Number(step.decisionTrace.randomRoll).toFixed(7)) +
          ' · Température ' + (step.decisionTrace.temperature ?? 'n/a') + '</div>';
        container.appendChild(card);
      });
    }

    // ========================================================
    // RENDER TAB 3: WALKTHROUGH
    // ========================================================
    function renderWalkthroughBotSelector() {
      const container = document.getElementById('walkthrough-bot-selector');
      container.innerHTML = '';

      DRAFT_DATA.seats.forEach(seat => {
        const btn = document.createElement('button');
        const isTitou = seat.seatId === 7;
        btn.className = \`bot-btn seat-\${seat.seatId} \${seat.seatId === state.selectedSeatId ? 'active' : ''}\`;
        btn.dataset.seatId = seat.seatId;
        btn.onclick = () => selectBot(seat.seatId);
        btn.innerHTML = \`
          <div class="bot-avatar">\${isTitou ? '👑' : seat.seatId}</div>
          <span>\${escapeHtml(seat.botName)}</span>
        \`;
        container.appendChild(btn);
      });
    }

    function renderWalkthrough() {
      renderWalkthroughBotSelector();

      // Update pack buttons
      [1, 2, 3].forEach(p => {
        const btn = document.getElementById('btn-pack-' + p);
        if (btn) btn.classList.toggle('active', p === state.currentPack);
      });

      // Update pick buttons (1..15)
      const pickGrid = document.getElementById('pick-buttons-grid');
      pickGrid.innerHTML = '';
      for (let i = 1; i <= 15; i++) {
        const pBtn = document.createElement('button');
        pBtn.className = \`pick-btn \${i === state.currentPick ? 'active' : ''}\`;
        pBtn.textContent = i;
        pBtn.onclick = () => setPick(i);
        pickGrid.appendChild(pBtn);
      }

      const seat = DRAFT_DATA.seats.find(s => s.seatId === state.selectedSeatId) || DRAFT_DATA.seats[0];
      const step = seat.steps.find(st => st.packNumber === state.currentPack && st.pickNumber === state.currentPick);

      if (!step) return;

      // Banner update
      document.getElementById('banner-pick-badge').textContent = \`P\${step.packNumber}P\${step.pickNumber}\`;
      document.getElementById('banner-card-name').textContent = step.pickedCardName;
      document.getElementById('banner-justification').textContent = step.justification;

      const pickedCard = step.boosterCards.find(c => c.isPicked);
      if (pickedCard) {
        document.getElementById('banner-dyn-score').textContent = \`Score: \${pickedCard.dynamicScore.toFixed(1)}\`;
        document.getElementById('banner-policy-score').textContent = \`Score bot: \${pickedCard.policyScore.toFixed(1)}\`;
        document.getElementById('banner-probability').textContent = \`Probabilité: \${formatProbability(pickedCard.selectionProbability)}\`;
        document.getElementById('banner-static-score').textContent = \`Base: \${pickedCard.staticScore}\`;

        const breakdown = pickedCard.coachingBreakdown;
        document.getElementById('decision-proof').innerHTML = \`
          <div class="proof-row">
            <strong>Calcul du dynamicScore</strong>
            <span class="proof-chip">Affinité couleur ×\${breakdown.colorAffinityFactor}</span>
            <span class="proof-chip">Pénalité couleur -\${breakdown.colorPenalty}</span>
            <span class="proof-chip">Fixing +\${breakdown.manaFixingBonus}</span>
            <span class="proof-chip">Courbe +\${breakdown.curveBonus}</span>
            <span class="proof-chip">Cube \${breakdown.cubeScoreModifier ?? 0}</span>
            <span class="proof-chip">Synergie +\${breakdown.synergyBonus ?? 0}</span>
          </div>
          <div><strong>Biais appliqués</strong></div>
          <div class="bias-list">\${renderBiasChips(pickedCard.biasContributions)}</div>
          <div class="candidate-policy-line">
            Méthode \${step.decisionTrace.method} · Température \${step.decisionTrace.temperature ?? 'n/a'} ·
            Tirage déterministe \${step.decisionTrace.randomRoll === null ? 'non requis' : Number(step.decisionTrace.randomRoll).toFixed(7)} ·
            Séquence journal #\${step.eventSequence} · Booster \${escapeHtml(step.boosterId)}
          </div>
        \`;
      }

      document.getElementById('booster-count-label').textContent =
        \`Pack \${step.packNumber} Pick \${step.pickNumber} — \${step.boosterCards.length} cartes disponibles (\${seat.botName})\`;

      // Floating pill update
      const floatBot = document.getElementById('float-bot-name');
      if (floatBot) floatBot.textContent = seat.botName;
      const floatPick = document.getElementById('float-pick-badge');
      if (floatPick) floatPick.textContent = \`P\${step.packNumber}P\${step.pickNumber}\`;
      const floatCard = document.getElementById('float-card-name');
      if (floatCard) floatCard.textContent = step.pickedCardName;

      // Render booster cards
      const boosterGrid = document.getElementById('booster-cards-grid');
      boosterGrid.innerHTML = '';

      step.boosterCards.forEach(card => {
        const item = document.createElement('div');
        item.className = \`card-item \${card.isPicked ? 'is-picked' : ''}\`;

        const fallbackUrl = 'https://api.scryfall.com/cards/named?format=image&exact=' + encodeURIComponent(card.name);
        const imgSrc = card.localImagePath || fallbackUrl;

        item.innerHTML = \`
          \${card.isPicked ? '<span class="picked-flag">CHOIX</span>' : ''}
          <span class="rank-flag">#\${card.rankInPack}</span>
          <div class="card-img-wrap">
            <img src="\${escapeHtml(imgSrc)}"
                 alt="\${escapeHtml(card.name)}"
                 data-card-name="\${escapeHtml(card.name)}"
                 onerror="onImageError(this);"
                 loading="lazy" />
          </div>
          <div class="card-details">
            <div class="card-name" title="\${escapeHtml(card.name)}">\${escapeHtml(card.name)}</div>
            <div class="card-scores-row">
              <span class="score-pill-dyn">Dyn \${card.dynamicScore.toFixed(1)}</span>
              <span class="score-pill-static">Base \${card.staticScore}</span>
            </div>
            <div class="candidate-policy-line">
              Bot \${card.policyScore.toFixed(1)} · rang #\${card.policyRank} · \${formatProbability(card.selectionProbability)}
            </div>
            <div class="bias-list">\${renderBiasChips(card.biasContributions)}</div>
          </div>
        \`;
        boosterGrid.appendChild(item);
      });

      // Render pool drawer
      document.getElementById('pool-count-label').textContent = \`\${step.poolSoFar.length} cartes\`;
      const poolContainer = document.getElementById('pool-list-container');
      poolContainer.innerHTML = '';

      const sortedPool = [...step.poolSoFar].sort((a, b) => a.cmc - b.cmc);
      sortedPool.forEach(c => {
        const row = document.createElement('div');
        row.className = 'pool-item';
        row.innerHTML = \`
          <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
            <div class="pool-item-cmc">\${c.isLand ? 'L' : c.cmc}</div>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${escapeHtml(c.name)}</span>
          </div>
          <span style="color: var(--text-muted); font-size: 0.75rem;">\${c.staticScore}</span>
        \`;
        poolContainer.appendChild(row);
      });
    }

    // ========================================================
    // RENDER TAB 3: FINAL DECK (23 CARDS)
    // ========================================================
    function renderDeckBotSelector() {
      const container = document.getElementById('deck-bot-selector');
      container.innerHTML = '';

      DRAFT_DATA.seats.forEach(seat => {
        const btn = document.createElement('button');
        const isTitou = seat.seatId === 7;
        btn.className = \`bot-btn seat-\${seat.seatId} \${seat.seatId === state.selectedSeatId ? 'active' : ''}\`;
        btn.dataset.seatId = seat.seatId;
        btn.onclick = () => selectBot(seat.seatId);
        btn.innerHTML = \`
          <div class="bot-avatar">\${isTitou ? '👑' : seat.seatId}</div>
          <span>\${escapeHtml(seat.botName)}</span>
        \`;
        container.appendChild(btn);
      });
    }

    function renderFinalDeck() {
      renderDeckBotSelector();

      const seat = DRAFT_DATA.seats.find(s => s.seatId === state.selectedSeatId) || DRAFT_DATA.seats[0];
      const deck = seat.finalDeck;

      document.getElementById('deck-bot-title').textContent = \`Siège \${seat.seatId} : \${seat.botName} — « \${seat.title} »\`;
      document.getElementById('deck-archetype-name').textContent = deck.archetype.label;
      document.getElementById('deck-archetype-desc').textContent = deck.archetype.description;

      document.getElementById('deck-overall-score').textContent = deck.overallScore;
      document.getElementById('deck-spells-count').textContent =
        \`\${deck.maindeckSpells.length} Sorts + \${deck.maindeckLands.length} Terrains = 40 cartes\`;

      document.getElementById('deck-axe-power').style.width = deck.radar.power + '%';
      document.getElementById('deck-val-power').textContent = deck.radar.power;

      document.getElementById('deck-axe-synergy').style.width = deck.radar.synergy + '%';
      document.getElementById('deck-val-synergy').textContent = deck.radar.synergy;

      document.getElementById('deck-axe-curve').style.width = deck.radar.curve + '%';
      document.getElementById('deck-val-curve').textContent = deck.radar.curve;
      document.getElementById('deck-axe-mana').style.width = deck.radar.mana + '%';
      document.getElementById('deck-val-mana').textContent = deck.radar.mana;
      document.getElementById('deck-axe-interaction').style.width = deck.radar.interaction + '%';
      document.getElementById('deck-val-interaction').textContent = deck.radar.interaction;

      const audit = deck.audit;
      const listNames = names => names.length > 0 ? names.map(escapeHtml).join(', ') : 'aucune';
      document.getElementById('deck-audit-meta').textContent =
        audit.formulaVersion + ' — ' + audit.scoreMeaning;
      document.getElementById('deck-audit-contributions').innerHTML =
        '<h4>Contributions pondérées</h4>' +
        audit.contributions.map(contribution =>
          '<div><strong>' + escapeHtml(contribution.axis) + '</strong> : ' +
          contribution.score + ' × ' + Math.round(contribution.weight * 100) + ' % = ' +
          contribution.weightedPoints.toFixed(2) + ' points</div>'
        ).join('');
      document.getElementById('deck-audit-power').innerHTML =
        '<h4>Puissance</h4>' +
        '<div>Moyenne statique : <strong>' + audit.power.meanStaticScore + '</strong></div>' +
        '<div>Médiane : <strong>' + audit.power.medianStaticScore + '</strong></div>' +
        '<div>Top 5 moyen : <strong>' + audit.power.topFiveMean + '</strong></div>' +
        '<div>Seuil bombe : <strong>' + (audit.power.bombThreshold ?? 'non fourni') + '</strong></div>' +
        '<div>Bombes : ' + listNames(audit.power.bombCards) + '</div>' +
        '<div>Mana rapide : ' +
        (audit.power.fastManaCards.length > 0
         ? audit.power.fastManaCards.map(card => escapeHtml(card.name) + ' (+' + card.manaGain + ')').join(', ')
          : 'aucun') + '</div>';
      const bestSynergy = audit.synergy.bestArchetype;
      document.getElementById('deck-audit-synergy').innerHTML =
        '<h4>Synergie</h4>' +
        (audit.synergy.profile
          ? '<div>Référentiel : <strong>' + escapeHtml(audit.synergy.profile.modelVersion) +
            '</strong> · ' + escapeHtml(audit.synergy.profile.cubeSnapshotId) + '</div>'
          : '<div>Référentiel : <strong>aucun</strong></div>') +
        (bestSynergy
          ? '<div>Archétype : <strong>' + escapeHtml(bestSynergy.name) + '</strong></div>' +
            '<div>Cartes clés × 3 : <strong>' + bestSynergy.keyCardCount +
            ' × 3 = ' + (bestSynergy.keyCardCount * 3) + '</strong> — ' +
            listNames(bestSynergy.keyCards) + '</div>' +
            '<div>Supports × 1 : <strong>' + bestSynergy.supportCardCount + '</strong> — ' +
            listNames(bestSynergy.supportCards) + '</div>' +
            '<div>Points : <strong>' + bestSynergy.points + ' / ' +
            bestSynergy.targetPoints + '</strong> · Score : <strong>' +
            bestSynergy.score + '/100</strong></div>' +
            '<div>Familles de rôles : ' + bestSynergy.families.map(family =>
              (family.complete ? '✓ ' : '✗ ') + escapeHtml(family.name) + ' (' +
              family.matchedCount + '/' + family.minimum + ')'
            ).join(' · ') + '</div>'
          : '<div>Aucune carte clé ou support d’un archétype du cube.</div>') +
        (audit.synergy.packages.length > 0
          ? audit.synergy.packages.map(pkg =>
              '<hr><div><strong>' + escapeHtml(pkg.label) + '</strong> : +' + pkg.contribution +
              ', fragilité -' + pkg.fragilityPenalty + '<br>Enablers : ' + listNames(pkg.enablers) +
              '<br>Payoffs : ' + listNames(pkg.payoffs) + '<br>Soutien : ' +
              listNames(pkg.supportCards) + '</div>'
            ).join('<hr>')
          : '<hr><div>Aucun package structurant détecté.</div>');
      document.getElementById('deck-audit-curve').innerHTML =
        '<h4>Courbe</h4>' +
        '<div>CMC moyen imprimé : <strong>' + audit.curve.printedAverageCmc + '</strong></div>' +
        '<div>CMC moyen effectif : <strong>' + audit.curve.effectiveAverageCmc + '</strong></div>' +
        '<div>Actions à 0–2 mana : <strong>' + audit.curve.earlyActionCount + '</strong></div>' +
        '<div>Ajustements : ' +
        (audit.curve.effectiveCostAdjustments.length > 0
          ? audit.curve.effectiveCostAdjustments.map(card =>
              escapeHtml(card.name) + ' ' + card.printedCmc + '→' + card.effectiveCmc
            ).join(', ')
          : 'aucun') + '</div>';
      const manaSources = Object.entries(audit.mana.sourcesByColor)
        .map(([color, count]) => color + ' ' + count).join(' · ');
      const manaTargets = Object.entries(audit.mana.targetSourcesByColor)
        .filter(([, count]) => count > 0)
        .map(([color, count]) => color + ' ' + count).join(' · ');
      document.getElementById('deck-audit-mana').innerHTML =
        '<h4>Mana</h4>' +
        '<div>Terrains réels : <strong>' + audit.mana.landCount + '</strong></div>' +
        '<div>Équivalents-terrain : ' + listNames(audit.mana.landEquivalentCards) + '</div>' +
        '<div>Total effectif : <strong>' + audit.mana.effectiveLandCount + '</strong></div>' +
        '<div>Sources : ' + escapeHtml(manaSources) + '</div>' +
        '<div>Sources requises : ' + escapeHtml(manaTargets) + '</div>' +
        '<div>Fixeurs : <strong>' + audit.mana.fixerUnits + ' / ' +
        audit.mana.requiredFixerUnits + '</strong> — ' +
        listNames(audit.mana.fixers.map(card => card.name)) + '</div>' +
        '<div>Adéquation terrains : <strong>' + Math.round(audit.mana.landCountAdequacy * 100) +
        '%</strong> · sources : <strong>' + Math.round(audit.mana.sourceAdequacy * 100) +
        '%</strong> · fixeurs : <strong>' + Math.round(audit.mana.fixingAdequacy * 100) +
        '%</strong></div>' +
        '<div>Accélérateurs : ' +
        listNames(audit.mana.accelerators.map(card => card.name)) + '</div>';
      document.getElementById('deck-audit-interaction').innerHTML =
        '<h4>Interaction</h4>' +
        '<div>Cartes comptées : <strong>' + audit.interaction.cards.length + '</strong> — ' +
        listNames(audit.interaction.cards.map(card => card.name)) + '</div>' +
        '<div>Qualité moyenne : <strong>' + audit.interaction.averageQuality + '</strong></div>' +
        '<div>Couverture : ' + listNames(audit.interaction.coverage) + '</div>' +
        '<div>Cible du plan : ' + audit.interaction.targetRange.minimum + '–' +
        audit.interaction.targetRange.maximum + ' (idéal ' + audit.interaction.targetRange.ideal + ')</div>' +
        '<div>Adéquation : <strong>' + audit.interaction.planAdequacy + '/100</strong></div>';

      // Strengths & Weaknesses
      const sList = document.getElementById('deck-strengths-list');
      sList.innerHTML = '';
      deck.strengths.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        sList.appendChild(li);
      });

      const wList = document.getElementById('deck-weaknesses-list');
      wList.innerHTML = '';
      deck.weaknesses.forEach(w => {
        const li = document.createElement('li');
        li.textContent = w;
        wList.appendChild(li);
      });

      // Render curve columns
      const colsContainer = document.getElementById('deck-curve-columns');
      colsContainer.innerHTML = '';

      const cmcBuckets = {
        'CMC 1': deck.maindeckSpells.filter(c => c.cmc <= 1),
        'CMC 2': deck.maindeckSpells.filter(c => c.cmc === 2),
        'CMC 3': deck.maindeckSpells.filter(c => c.cmc === 3),
        'CMC 4': deck.maindeckSpells.filter(c => c.cmc === 4),
        'CMC 5+': deck.maindeckSpells.filter(c => c.cmc >= 5),
        'Terrains': deck.maindeckLands,
      };

      Object.entries(cmcBuckets).forEach(([label, cards]) => {
        const col = document.createElement('div');
        col.className = 'curve-col';
        col.innerHTML = \`
          <div class="curve-col-header">
            <span>\${label}</span>
            <span>\${cards.length}</span>
          </div>
        \`;

        cards.forEach(c => {
          const mini = document.createElement('div');
          mini.className = 'deck-card-mini';
          const fallbackUrl = 'https://api.scryfall.com/cards/named?format=image&exact=' + encodeURIComponent(c.name);
          const imgSrc = c.localImagePath || fallbackUrl;

          mini.innerHTML = \`
            <img src="\${escapeHtml(imgSrc)}"
                 alt="\${escapeHtml(c.name)}"
                 data-card-name="\${escapeHtml(c.name)}"
                 onerror="onImageError(this);"
                 loading="lazy" />
            <div class="deck-card-mini-label" title="\${escapeHtml(c.name)}">\${escapeHtml(c.name)}</div>
          \`;
          col.appendChild(mini);
        });

        colsContainer.appendChild(col);
      });

      // Sideboard grid
      const sbGrid = document.getElementById('sideboard-grid');
      sbGrid.innerHTML = '';

      deck.sideboard.forEach(c => {
        const mini = document.createElement('div');
        mini.className = 'deck-card-mini';
        const fallbackUrl = 'https://api.scryfall.com/cards/named?format=image&exact=' + encodeURIComponent(c.name);
        const imgSrc = c.localImagePath || fallbackUrl;

        mini.innerHTML = \`
          <img src="\${escapeHtml(imgSrc)}"
               alt="\${escapeHtml(c.name)}"
               data-card-name="\${escapeHtml(c.name)}"
               onerror="onImageError(this);"
               loading="lazy" />
          <div class="deck-card-mini-label" title="\${escapeHtml(c.name)}">\${escapeHtml(c.name)}</div>
        \`;
        sbGrid.appendChild(mini);
      });
    }

    // Initialize
    renderOverview();
  </script>
</body>
</html>`;
}
