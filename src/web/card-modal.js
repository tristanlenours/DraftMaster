// Card detail modal: texts, rankings, archetype fit, synergies and cross-cube view.
import { elements, escapeHtml, hydrateCardFromFrenchCache, localFrenchCache, saveFrenchCache, state, toTierCssClass } from "./app-state.js";
import { computeCubeRankings, getCardTier, renderMatrix } from "./card-explorer.js";
import { isMatchingScryfallPrint } from "./card-image.js";
import { getCardDisplayName, getCardImageFallbackUrl, getCardImageUrl as resolveCardImageUrl } from "./card-language.js";
import { CUBE_CONFIGS } from "./cube-config.js";
import { toPowerBarPercentage } from "./power-ranking.js";

// Update Modal Rules Text (French / English toggle)
export function updateModalCardText(card) {
  if (!card) return;
  const isFr = state.cardLanguage === "FR";

  if (elements.langBtnFr) elements.langBtnFr.classList.toggle("active", isFr);
  if (elements.langBtnEn) elements.langBtnEn.classList.toggle("active", !isFr);

  // French Subtitle & Title
  if (isFr) {
    elements.modalCardTitle.textContent = card.frenchName || card.name;
    if (elements.modalCardSubtitleFr) {
      if (card.frenchName && card.frenchName !== card.name) {
        elements.modalCardSubtitleFr.textContent = `(VO : ${card.name})`;
        elements.modalCardSubtitleFr.hidden = false;
        elements.modalCardSubtitleFr.style.display = "block";
      } else {
        elements.modalCardSubtitleFr.hidden = true;
        elements.modalCardSubtitleFr.style.display = "none";
      }
    }
  } else {
    elements.modalCardTitle.textContent = card.name;
    if (elements.modalCardSubtitleFr) {
      if (card.frenchName && card.frenchName !== card.name) {
        elements.modalCardSubtitleFr.textContent = `(FR : ${card.frenchName})`;
        elements.modalCardSubtitleFr.hidden = false;
        elements.modalCardSubtitleFr.style.display = "block";
      } else {
        elements.modalCardSubtitleFr.hidden = true;
        elements.modalCardSubtitleFr.style.display = "none";
      }
    }
  }

  // Card Image
  if (elements.modalCardImage) {
    const primary = resolveCardImageUrl(card, state.cardLanguage, true);
    const fallback = getCardImageFallbackUrl(card, state.cardLanguage);
    elements.modalCardImage.onerror = () => {
      if (elements.modalCardImage.src !== fallback) {
        elements.modalCardImage.src = fallback;
      }
    };
    elements.modalCardImage.src = primary;
    elements.modalCardImage.alt = isFr && card.frenchName ? card.frenchName : card.name;
  }

  // Rules text
  if (elements.modalOracleText) {
    if (isFr) {
      elements.modalOracleText.textContent =
        card.frenchText || card.oracleText || "Aucun texte de règle spécifique.";
    } else {
      elements.modalOracleText.textContent = card.oracleText || "Aucun texte de règle spécifique.";
    }
  }
}

// Fetch official French card info (text and image) on-demand if missing and user is online
export async function fetchFrenchCardOnDemand(card, onUpdate) {
  if (!card || !card.name) return;

  // 1. Check local cache
  if (localFrenchCache.has(card.name)) {
    const cached = localFrenchCache.get(card.name);
    if (cached.hasNoFrenchPrint) return;
    if (cached.frenchName && !card.frenchName) card.frenchName = cached.frenchName;
    if (cached.frenchText && !card.frenchText) card.frenchText = cached.frenchText;
    if (cached.frenchImageUrl && !card.frenchImageUrl) card.frenchImageUrl = cached.frenchImageUrl;
    if (cached.frenchLargeImageUrl && !card.frenchLargeImageUrl)
      card.frenchLargeImageUrl = cached.frenchLargeImageUrl;
    if (onUpdate) onUpdate(card);
    if (card.frenchImageUrl) return;
  }

  // 2. Fetch from Scryfall
  try {
    const cleanName = card.name.split(" // ")[0].trim();
    const searchUrl = `https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cleanName)}%22+lang%3Afr`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "DraftMaster/1.0 (local-french-cache; github.com/tristanlenours/DraftMaster)",
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const prints = data.data || [];
      const match = prints.find(
        (p) =>
          isMatchingScryfallPrint(p, card.name) && (p.image_uris || p.card_faces?.[0]?.image_uris),
      );

      if (match) {
        let fName = match.printed_name || card.name;
        let fText = match.printed_text || match.oracle_text || card.oracleText;
        const fImg = match.image_uris?.normal || match.card_faces?.[0]?.image_uris?.normal || null;
        const fLargeImg =
          match.image_uris?.large || match.card_faces?.[0]?.image_uris?.large || fImg;

        if (match.card_faces && match.card_faces.length > 0) {
          fName =
            match.printed_name ||
            match.card_faces.map((f) => f.printed_name || f.name).join(" // ");
          fText = match.card_faces
            .map((f) =>
              `${f.printed_name || f.name}\n${f.printed_text || f.oracle_text || ""}`.trim(),
            )
            .join("\n\n---\n\n");
        }
        card.frenchName = fName;
        card.frenchText = fText;
        if (fImg) card.frenchImageUrl = fImg;
        if (fLargeImg) card.frenchLargeImageUrl = fLargeImg;

        saveFrenchCache(card.name, {
          frenchName: fName,
          frenchText: fText,
          frenchImageUrl: fImg,
          frenchLargeImageUrl: fLargeImg,
        });

        if (onUpdate) onUpdate(card);
      } else {
        saveFrenchCache(card.name, {
          hasNoFrenchPrint: true,
        });
      }
    } else {
      saveFrenchCache(card.name, {
        hasNoFrenchPrint: true,
      });
    }
  } catch {
    // Offline mode: gracefully keeps fallback
  }
}

// Helper to find or synthesize full card object for modal inspection
export function getOrBuildCardObject(cardRefOrName, cubeKey) {
  const source = typeof cardRefOrName === "object" && cardRefOrName !== null ? cardRefOrName : null;
  const name = typeof cardRefOrName === "string" ? cardRefOrName : source?.name || "Carte";
  const oracleId = source?.oracleId;
  const existing = state.cards.find(
    (card) =>
      (oracleId && card.oracleId === oracleId) || card.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return hydrateCardFromFrenchCache(existing);

  // Check maybeboard
  const maybeItem = state.cubesSuggestions[cubeKey]?.maybeboard?.find(
    (m) => m.card.name.toLowerCase() === name.toLowerCase(),
  );
  if (maybeItem) return buildSuggestionCardObject(maybeItem.card);

  // Check upgrades
  const upgrades = state.cubesSuggestions[cubeKey]?.upgrades || {};
  for (const up of Object.values(upgrades)) {
    if (up.suggestedCard.name.toLowerCase() === name.toLowerCase()) {
      return buildSuggestionCardObject(up.suggestedCard);
    }
  }

  return buildSuggestionCardObject(source || { name, score: 20, typeLine: "Card" });
}

function buildSuggestionCardObject(cardRef) {
  const typeLine = cardRef.typeLine || "Card";
  return hydrateCardFromFrenchCache({
    oracleId: cardRef.oracleId,
    name: cardRef.name,
    frenchName: cardRef.frenchName,
    frenchImageUrl: cardRef.frenchImageUrl,
    cmc: cardRef.cmc ?? 0,
    colors: cardRef.colors || [],
    typeLine,
    types: [typeLine.split(" ")[0]],
    powerScore: {
      score: Number.isFinite(cardRef.powerScore?.score)
        ? cardRef.powerScore.score
        : Number.isFinite(cardRef.score)
          ? cardRef.score
          : 20,
    },
    imageUrl: cardRef.imageUrl,
    presentInCubes: [],
    cubeAnalyses: {},
  });
}

export function updateModalComparisonCardNames(comparison, selectedCard) {
  if (!comparison) return;
  if (comparison.isStandaloneMaybeboard) {
    if (elements.modalUpgradeSuggName && selectedCard) {
      elements.modalUpgradeSuggName.textContent = getCardDisplayName(
        selectedCard,
        state.cardLanguage,
      );
    }
    return;
  }

  if (elements.modalUpgradeCurrName) {
    elements.modalUpgradeCurrName.textContent = getCardDisplayName(
      comparison.cubeCard,
      state.cardLanguage,
    );
  }
  if (elements.modalUpgradeSuggName) {
    elements.modalUpgradeSuggName.textContent = getCardDisplayName(
      comparison.suggCard,
      state.cardLanguage,
    );
  }
}

function configureComparisonPane(pane, status, isCurrent, onSelect) {
  if (!pane) return;
  pane.classList.toggle("is-inspected", isCurrent);
  pane.setAttribute("aria-current", String(isCurrent));
  pane.tabIndex = isCurrent ? -1 : 0;

  if (status) {
    status.textContent = isCurrent ? "👁️ Affichée" : "⇄ Voir fiche";
    status.className = `pane-status-pill ${isCurrent ? "inspected" : "switchable"}`;
  }

  pane.onclick = isCurrent ? null : onSelect;
  pane.onkeydown = isCurrent
    ? null
    : (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      };
}

// Open Educational Card Detail Modal with Bidirectional Upgrade Switcher
export function openCardModal(card, comparisonOverride) {
  const cardChanged = state.selectedCard?.name !== card.name;
  state.selectedCard = card;
  const cubeKey = state.activeCubeKey;
  const inCube = Boolean(card.presentInCubes && card.presentInCubes.includes(cubeKey));
  const analysis = card.cubeAnalyses?.[cubeKey];
  const pedagogy = analysis?.pedagogy;

  // Left Column : Image & Quadrants
  const isFr = state.cardLanguage === "FR";

  const primaryModalSrc = resolveCardImageUrl(card, state.cardLanguage, true);
  const fallbackModalSrc = getCardImageFallbackUrl(card, state.cardLanguage);

  elements.modalCardImage.onerror = () => {
    if (elements.modalCardImage.src !== fallbackModalSrc) {
      elements.modalCardImage.src = fallbackModalSrc;
    }
  };
  elements.modalCardImage.src = primaryModalSrc;
  elements.modalCardImage.alt = isFr && card.frenchName ? card.frenchName : card.name;

  const q = card.objectiveAnalysis?.quadrantStrengths || {
    opening: 4.0,
    developing: 4.0,
    parity: 4.0,
    behind: 4.0,
  };
  elements.qValOpening.textContent = q.opening.toFixed(1);
  elements.qValDeveloping.textContent = q.developing.toFixed(1);
  elements.qValParity.textContent = q.parity.toFixed(1);
  elements.qValBehind.textContent = q.behind.toFixed(1);

  // Right Column : Header Info
  elements.modalCardTitle.textContent = isFr && card.frenchName ? card.frenchName : card.name;
  elements.modalCardTypeline.textContent = card.typeLine || "Carte";
  const cubeDisplayName = CUBE_CONFIGS[cubeKey]?.name || cubeKey;
  elements.modalActiveCubeBadge.textContent = inCube
    ? cubeDisplayName
    : `💡 Maybeboard IA • ${cubeDisplayName}`;

  // Tier & Power Ranking Showcase Box
  const tier = getCardTier(card);
  const tierLower = toTierCssClass(tier);
  const rankings = computeCubeRankings(cubeKey);
  const cardKey = card.oracleId || card.slug || card.name;
  const rankInfo = rankings[cardKey] || {
    rank: 1,
    total: Object.keys(rankings).length || 541,
    score: card.powerScore?.score || 1,
    percentile: 10,
  };

  if (elements.modalRankingHero) {
    elements.modalRankingHero.className = `modal-ranking-hero tier-${tierLower}`;
  }
  if (elements.modalHeroTierCard) {
    elements.modalHeroTierCard.className = `hero-tier-card tier-${tierLower}`;
  }
  if (elements.modalHeroTierLetter) {
    elements.modalHeroTierLetter.textContent = tier;
  }
  if (elements.modalHeroTierLabel) {
    elements.modalHeroTierLabel.textContent = `TIER ${tier}`;
  }
  if (elements.modalHeroPowerScore) {
    elements.modalHeroPowerScore.textContent = Math.round(rankInfo.score);
    elements.modalHeroPowerScore.title = `Score Universel : ${rankInfo.score}/55`;
  }
  if (elements.modalHeroPowerBar) {
    elements.modalHeroPowerBar.style.width = `${toPowerBarPercentage(rankInfo.score)}%`;
  }
  if (elements.modalHeroCubeRank) {
    elements.modalHeroCubeRank.textContent = inCube ? `#${rankInfo.rank}` : "Suggestion";
  }
  if (elements.modalHeroCubeTotal) {
    elements.modalHeroCubeTotal.textContent = inCube ? `/ ${rankInfo.total}` : "Hors Cube";
  }
  if (elements.modalHeroPercentile) {
    elements.modalHeroPercentile.textContent = inCube
      ? `Top ${rankInfo.percentile}% du Cube`
      : "Candidat Maybeboard IA";
  }
  if (elements.modalHeroCubeRole) {
    if (inCube) {
      const metaBonus = analysis?.metaBonus ?? analysis?.scoreModifier ?? 0;
      const metaRole =
        analysis?.metaRole ||
        (metaBonus >= 8 ? "key" : metaBonus >= 4 ? "support" : metaBonus < 0 ? "trap" : "neutral");
      const metaRoleLabel =
        metaRole === "key"
          ? "Carte Clé"
          : metaRole === "support"
            ? "Support"
            : metaRole === "trap"
              ? "Piège"
              : "Neutre";
      const bonusText =
        metaBonus !== 0
          ? ` • Méta : ${metaRoleLabel} (${metaBonus > 0 ? "+" : ""}${metaBonus})`
          : "";
      elements.modalHeroCubeRole.textContent = `${formatFit(analysis?.fit)}${bonusText}`;
    } else {
      const role =
        comparisonOverride?.proposal?.metaAddedValue?.strategicRole || "Suggestion Maybeboard IA";
      elements.modalHeroCubeRole.textContent = `🎯 ${role}`;
    }
  }
  if (elements.modalHeroTempoImpact) {
    const tempoImp = card.objectiveAnalysis?.tempoImpact || "medium";
    const tempoLabel = tempoImp === "high" ? "Élevé" : tempoImp === "low" ? "Faible" : "Modéré";
    elements.modalHeroTempoImpact.textContent = `Impact : ${tempoLabel}`;
  }

  // Active Comparison Resolution (Bidirectional Cube <-> Maybeboard)
  let comparison = comparisonOverride || null;

  if (!comparison) {
    const directProposal = state.cubesSuggestions[cubeKey]?.upgrades?.[card.name];
    if (directProposal) {
      const suggCard = getOrBuildCardObject(directProposal.suggestedCard, cubeKey);
      const mbItem = state.cubesSuggestions[cubeKey]?.maybeboard?.find(
        (m) => m.card.name.toLowerCase() === suggCard.name.toLowerCase(),
      );
      const targets =
        mbItem?.replacesCards && mbItem.replacesCards.length > 0
          ? mbItem.replacesCards
          : [
              {
                name: card.name,
                score: directProposal.targetCard.score,
                tier: directProposal.targetCard.tier,
                scoreDelta: directProposal.scoreDelta,
                reason: directProposal.reason,
              },
            ];
      comparison = {
        cubeCard: card,
        suggCard,
        proposal: directProposal,
        replacesCards: targets,
      };
    } else {
      const maybeItem = state.cubesSuggestions[cubeKey]?.maybeboard?.find(
        (m) => m.card.name.toLowerCase() === card.name.toLowerCase(),
      );
      if (maybeItem) {
        const replaces = maybeItem.replacesCards || [];
        if (replaces.length > 0) {
          const firstTarget = replaces[0];
          const targetCard = getOrBuildCardObject(firstTarget.name, cubeKey);
          const fullProposal = state.cubesSuggestions[cubeKey]?.upgrades?.[firstTarget.name] || {
            targetCard: {
              name: targetCard.name,
              score: firstTarget.score,
              tier: firstTarget.tier,
            },
            suggestedCard: {
              name: card.name,
              score: card.powerScore?.score || maybeItem.card.score,
              tier: maybeItem.card.tier,
            },
            scoreDelta:
              firstTarget.scoreDelta ||
              Math.max(0, (card.powerScore?.score || 35) - firstTarget.score),
            reason: firstTarget.reason || maybeItem.rationale,
            isRecent: maybeItem.isRecent,
            releaseYear: maybeItem.releaseYear,
            benchmarkCubes: maybeItem.benchmarkCubes,
            metaAddedValue: maybeItem.metaAddedValue,
          };
          comparison = {
            cubeCard: targetCard,
            suggCard: card,
            proposal: fullProposal,
            replacesCards: replaces,
          };
        } else {
          comparison = {
            isStandaloneMaybeboard: true,
            maybeItem,
          };
        }
      }
    }
  }

  // Render Upgrade / Comparison Section
  if (elements.modalUpgradeSection) {
    if (comparison && !comparison.isStandaloneMaybeboard) {
      state.selectedCardComparison = comparison;
      elements.modalUpgradeSection.hidden = false;
      const isViewingCube = card.name === comparison.cubeCard.name;
      const isViewingSugg = card.name === comparison.suggCard.name;

      if (elements.modalUpgradeSectionTitle) {
        elements.modalUpgradeSectionTitle.textContent = isViewingSugg
          ? "Recommandation Maybeboard (Poste pour Poste)"
          : "Mise à Niveau Suggérée (Poste pour Poste)";
      }

      // Left Pane (Carte en Place)
      updateModalComparisonCardNames(comparison, card);
      if (elements.modalUpgradeCurrScore) {
        elements.modalUpgradeCurrScore.textContent = `${comparison.proposal.targetCard.score}/55 (Tier ${comparison.proposal.targetCard.tier || "D"})`;
      }
      if (elements.modalUpgradeCurrPaneLabel) {
        elements.modalUpgradeCurrPaneLabel.textContent = "Carte en Place";
      }
      configureComparisonPane(
        elements.modalUpgradeCurrPane,
        elements.modalUpgradeCurrStatus,
        isViewingCube,
        () => openCardModal(comparison.cubeCard, comparison),
      );

      // Right Pane (Remplacement Suggéré)
      if (elements.modalUpgradeSuggScore) {
        elements.modalUpgradeSuggScore.textContent = `${comparison.proposal.suggestedCard.score}/55 (Tier ${comparison.proposal.suggestedCard.tier || "A"})`;
      }
      if (elements.modalUpgradeSuggPaneLabel) {
        elements.modalUpgradeSuggPaneLabel.textContent = "Remplacement Suggéré";
      }
      configureComparisonPane(
        elements.modalUpgradeSuggPane,
        elements.modalUpgradeSuggStatus,
        isViewingSugg,
        () => openCardModal(comparison.suggCard, comparison),
      );

      // Center Swap Button
      if (elements.modalBtnSwapArrow) {
        elements.modalBtnSwapArrow.onclick = () => {
          const nextCard = isViewingCube ? comparison.suggCard : comparison.cubeCard;
          openCardModal(nextCard, comparison);
        };
      }
      if (elements.modalUpgradeDelta) {
        elements.modalUpgradeDelta.textContent = `+${comparison.proposal.scoreDelta}`;
      }

      // Multi-targets Chips (when suggested card replaces multiple cards in this cube)
      const replaces = comparison.replacesCards || [];
      if (elements.modalUpgradeMultiTargetsWrap && elements.modalUpgradeMultiTargetsChips) {
        if (replaces.length > 1) {
          elements.modalUpgradeMultiTargetsWrap.hidden = false;
          elements.modalUpgradeMultiTargetsChips.innerHTML = replaces
            .map((target) => {
              const isActive = target.name === comparison.cubeCard.name;
              return `<button type="button" class="btn-target-chip ${isActive ? "active" : ""}" data-target-name="${escapeHtml(target.name)}" title="Comparer avec ${escapeHtml(target.name)}">
                ${escapeHtml(target.name)} (+${target.scoreDelta})
              </button>`;
            })
            .join("");

          elements.modalUpgradeMultiTargetsChips
            .querySelectorAll(".btn-target-chip")
            .forEach((chip) => {
              chip.onclick = () => {
                const targetName = chip.getAttribute("data-target-name");
                const targetCard = getOrBuildCardObject(targetName, cubeKey);
                const fullProposal = state.cubesSuggestions[cubeKey]?.upgrades?.[targetName] || {
                  targetCard: { name: targetCard.name, score: 20 },
                  suggestedCard: { name: comparison.suggCard.name, score: 35 },
                  scoreDelta: 15,
                  reason: comparison.proposal.reason,
                  isRecent: comparison.proposal.isRecent,
                  releaseYear: comparison.proposal.releaseYear,
                  benchmarkCubes: comparison.proposal.benchmarkCubes,
                  metaAddedValue: comparison.proposal.metaAddedValue,
                };
                const newComparison = {
                  cubeCard: targetCard,
                  suggCard: comparison.suggCard,
                  proposal: fullProposal,
                  replacesCards: replaces,
                };
                openCardModal(card, newComparison);
              };
            });
        } else {
          elements.modalUpgradeMultiTargetsWrap.hidden = true;
        }
      }

      if (elements.modalUpgradeReason) {
        elements.modalUpgradeReason.textContent = comparison.proposal.reason;
      }

      // Badges (Nouveauté & CubeCobra Benchmark)
      const isRecent = Boolean(
        comparison.proposal.isRecent ||
        (comparison.proposal.releaseYear && comparison.proposal.releaseYear >= 2023),
      );
      if (elements.modalUpgradeRecencyPill) {
        if (isRecent) {
          elements.modalUpgradeRecencyPill.hidden = false;
          elements.modalUpgradeRecencyPill.textContent = `✨ Nouveauté (${comparison.proposal.releaseYear || "Veille"})`;
        } else {
          elements.modalUpgradeRecencyPill.hidden = true;
        }
      }

      const benchmarks = comparison.proposal.benchmarkCubes || [];
      if (elements.modalUpgradeBenchmarkPill) {
        if (benchmarks.length > 0) {
          elements.modalUpgradeBenchmarkPill.hidden = false;
          elements.modalUpgradeBenchmarkPill.textContent = `⚡ Vu dans : ${benchmarks.join(", ")}`;
        } else {
          elements.modalUpgradeBenchmarkPill.hidden = true;
        }
      }

      if (elements.modalUpgradeBadgesRow) {
        const hideBadges =
          elements.modalUpgradeRecencyPill?.hidden && elements.modalUpgradeBenchmarkPill?.hidden;
        elements.modalUpgradeBadgesRow.hidden = Boolean(hideBadges);
      }

      // Meta Added Value Box
      const metaVal = comparison.proposal.metaAddedValue;
      if (elements.modalUpgradeMetaBox) {
        if (metaVal) {
          elements.modalUpgradeMetaBox.hidden = false;
          if (elements.modalUpgradeStrategicRole) {
            elements.modalUpgradeStrategicRole.textContent =
              metaVal.strategicRole || "Rôle Stratégique";
          }
          if (elements.modalUpgradeMetaSummary) {
            elements.modalUpgradeMetaSummary.textContent = metaVal.summary || "";
          }
          const affectedArchs = metaVal.affectedArchetypes || [];
          if (elements.modalUpgradeArchetypesWrap && elements.modalUpgradeArchetypesChips) {
            if (affectedArchs.length > 0) {
              elements.modalUpgradeArchetypesWrap.hidden = false;
              elements.modalUpgradeArchetypesChips.innerHTML = affectedArchs
                .map((a) => `<span class="meta-arch-chip">${escapeHtml(a)}</span>`)
                .join("");
            } else {
              elements.modalUpgradeArchetypesWrap.hidden = true;
            }
          }
        } else {
          elements.modalUpgradeMetaBox.hidden = true;
        }
      }

      // Bottom action button: Bidirectional switch
      if (elements.modalBtnInspectUpgrade) {
        elements.modalBtnInspectUpgrade.parentElement?.removeAttribute("hidden");
        if (isViewingCube) {
          const suggName = getCardDisplayName(comparison.suggCard, state.cardLanguage);
          elements.modalBtnInspectUpgrade.innerHTML = `🔍 Consulter la fiche de la remplaçante : <strong>${escapeHtml(suggName)}</strong> ➔`;
          elements.modalBtnInspectUpgrade.onclick = () => {
            openCardModal(comparison.suggCard, comparison);
          };
        } else {
          const cubeCardName = getCardDisplayName(comparison.cubeCard, state.cardLanguage);
          elements.modalBtnInspectUpgrade.innerHTML = `⬅ Revenir à la carte en place : <strong>${escapeHtml(cubeCardName)}</strong>`;
          elements.modalBtnInspectUpgrade.onclick = () => {
            openCardModal(comparison.cubeCard, comparison);
          };
        }
      }
    } else if (comparison && comparison.isStandaloneMaybeboard) {
      state.selectedCardComparison = comparison;
      // Standalone Maybeboard Recommendation
      const mb = comparison.maybeItem;
      elements.modalUpgradeSection.hidden = false;
      if (elements.modalUpgradeSectionTitle) {
        elements.modalUpgradeSectionTitle.textContent =
          "Recommandation Maybeboard (IA & Tendances)";
      }

      if (elements.modalUpgradeCurrName)
        elements.modalUpgradeCurrName.textContent = "Nouveau Choix";
      if (elements.modalUpgradeCurrScore)
        elements.modalUpgradeCurrScore.textContent = "Suggestion IA";
      if (elements.modalUpgradeCurrPaneLabel)
        elements.modalUpgradeCurrPaneLabel.textContent = "Statut";
      if (elements.modalUpgradeCurrPane) {
        elements.modalUpgradeCurrPane.classList.remove("is-inspected");
        elements.modalUpgradeCurrPane.setAttribute("aria-current", "false");
        elements.modalUpgradeCurrPane.tabIndex = -1;
        if (elements.modalUpgradeCurrStatus) {
          elements.modalUpgradeCurrStatus.textContent = "Suggestion";
          elements.modalUpgradeCurrStatus.className = "pane-status-pill inspected";
        }
        elements.modalUpgradeCurrPane.onclick = null;
        elements.modalUpgradeCurrPane.onkeydown = null;
      }

      updateModalComparisonCardNames(comparison, card);
      if (elements.modalUpgradeSuggScore) {
        elements.modalUpgradeSuggScore.textContent = `${mb.card.score}/55 (Tier ${mb.card.tier || "B"})`;
      }
      if (elements.modalUpgradeSuggPaneLabel)
        elements.modalUpgradeSuggPaneLabel.textContent = "Carte Recommandée";
      if (elements.modalUpgradeSuggPane) {
        elements.modalUpgradeSuggPane.classList.add("is-inspected");
        elements.modalUpgradeSuggPane.setAttribute("aria-current", "true");
        elements.modalUpgradeSuggPane.tabIndex = -1;
        if (elements.modalUpgradeSuggStatus) {
          elements.modalUpgradeSuggStatus.textContent = "👁️ Affichée";
          elements.modalUpgradeSuggStatus.className = "pane-status-pill inspected";
        }
        elements.modalUpgradeSuggPane.onclick = null;
        elements.modalUpgradeSuggPane.onkeydown = null;
      }

      if (elements.modalBtnSwapArrow) elements.modalBtnSwapArrow.onclick = null;
      if (elements.modalUpgradeDelta) elements.modalUpgradeDelta.textContent = "★";
      if (elements.modalUpgradeMultiTargetsWrap)
        elements.modalUpgradeMultiTargetsWrap.hidden = true;
      if (elements.modalUpgradeReason) elements.modalUpgradeReason.textContent = mb.rationale;

      const isRecent = Boolean(mb.isRecent || (mb.releaseYear && mb.releaseYear >= 2023));
      if (elements.modalUpgradeRecencyPill) {
        if (isRecent) {
          elements.modalUpgradeRecencyPill.hidden = false;
          elements.modalUpgradeRecencyPill.textContent = `✨ Nouveauté (${mb.releaseYear || "Veille"})`;
        } else {
          elements.modalUpgradeRecencyPill.hidden = true;
        }
      }

      const benchmarks = mb.benchmarkCubes || [];
      if (elements.modalUpgradeBenchmarkPill) {
        if (benchmarks.length > 0) {
          elements.modalUpgradeBenchmarkPill.hidden = false;
          elements.modalUpgradeBenchmarkPill.textContent = `⚡ Vu dans : ${benchmarks.join(", ")}`;
        } else {
          elements.modalUpgradeBenchmarkPill.hidden = true;
        }
      }

      if (elements.modalUpgradeBadgesRow) {
        const hideBadges =
          elements.modalUpgradeRecencyPill?.hidden && elements.modalUpgradeBenchmarkPill?.hidden;
        elements.modalUpgradeBadgesRow.hidden = Boolean(hideBadges);
      }

      const metaVal = mb.metaAddedValue;
      if (elements.modalUpgradeMetaBox) {
        if (metaVal) {
          elements.modalUpgradeMetaBox.hidden = false;
          if (elements.modalUpgradeStrategicRole) {
            elements.modalUpgradeStrategicRole.textContent =
              metaVal.strategicRole || "Rôle Stratégique";
          }
          if (elements.modalUpgradeMetaSummary) {
            elements.modalUpgradeMetaSummary.textContent = metaVal.summary || "";
          }
          const affectedArchs = metaVal.affectedArchetypes || [];
          if (elements.modalUpgradeArchetypesWrap && elements.modalUpgradeArchetypesChips) {
            if (affectedArchs.length > 0) {
              elements.modalUpgradeArchetypesWrap.hidden = false;
              elements.modalUpgradeArchetypesChips.innerHTML = affectedArchs
                .map((a) => `<span class="meta-arch-chip">${escapeHtml(a)}</span>`)
                .join("");
            } else {
              elements.modalUpgradeArchetypesWrap.hidden = true;
            }
          }
        } else {
          elements.modalUpgradeMetaBox.hidden = true;
        }
      }

      if (elements.modalBtnInspectUpgrade) {
        elements.modalBtnInspectUpgrade.parentElement?.setAttribute("hidden", "true");
      }
    } else {
      state.selectedCardComparison = null;
      elements.modalUpgradeSection.hidden = true;
      if (elements.modalBtnInspectUpgrade) {
        elements.modalBtnInspectUpgrade.parentElement?.removeAttribute("hidden");
      }
    }
  }

  // Rules text (French default with toggle)
  updateModalCardText(card);

  // Background fetch French text & image if not locally present
  fetchFrenchCardOnDemand(card, (updated) => {
    if (state.selectedCard?.name === updated.name) {
      updateModalCardText(updated);
    }
  });

  // "Comment la jouer"
  elements.modalPedagogyPlay.textContent =
    pedagogy?.howToPlay ||
    analysis?.analysis ||
    `Dans ce cube, ${card.name} joue un rôle tactique essentiel sur courbe de mana.`;

  // Archetypes breakdown table
  renderModalArchetypeRows(card, analysis);

  // Key synergies
  renderModalSynergies(card, analysis);

  // Cross-cube perspective
  renderModalCrossCube(card);

  // Show Modal
  elements.modalBackdrop.classList.add("is-open");
  elements.modalBackdrop.style.display = "flex";
  if (cardChanged) {
    const modal = elements.modalBackdrop.querySelector(".card-modal");
    if (modal) modal.scrollTop = 0;
  }
  document.body.style.overflow = "hidden";
}

// Render Modal Archetype breakdown table
function renderModalArchetypeRows(card, analysis) {
  elements.modalArchetypeRows.innerHTML = "";
  const rows = analysis?.pedagogy?.archetypeFit;

  if (rows && rows.length > 0) {
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const pipsHtml = renderGuildPips(row.colors);
      tr.innerHTML = `
        <td class="deck-cell">
          <span class="guild-mana-pips">${pipsHtml}</span>
          <span>${row.archetype}</span>
        </td>
        <td><span class="table-grade-badge tier-${toTierCssClass(row.grade || "B")}-row">${row.grade || "B"}</span></td>
        <td style="font-weight: 700; color: var(--tier-s);">${row.winrateOrScore || "—"}</td>
        <td style="color: var(--text-secondary); font-size: 0.8rem;">${row.comment || ""}</td>
      `;
      elements.modalArchetypeRows.appendChild(tr);
    });
  } else {
    // Default fallback row based on current cube analysis
    const tr = document.createElement("tr");
    const pipsHtml = renderGuildPips(card.colors || []);
    const tier = analysis?.tier || "B";
    const metaBonus = analysis?.metaBonus ?? analysis?.scoreModifier ?? 0;
    tr.innerHTML = `
      <td class="deck-cell">
        <span class="guild-mana-pips">${pipsHtml}</span>
        <span>${(analysis?.archetypes && analysis.archetypes[0]) || "Archétype Principal"}</span>
      </td>
      <td><span class="table-grade-badge tier-${toTierCssClass(tier)}-row">${tier}</span></td>
      <td style="font-weight: 700; color: var(--tier-s);">Bonus Méta ${metaBonus >= 0 ? "+" : ""}${metaBonus}</td>
      <td style="color: var(--text-secondary); font-size: 0.8rem;">${formatFit(analysis?.fit)}</td>
    `;
    elements.modalArchetypeRows.appendChild(tr);
  }
}

// Render Guild Mana Pips
function renderGuildPips(colors) {
  if (!colors || colors.length === 0) {
    return '<span class="mana-symbol mana-c" style="width:16px;height:16px;font-size:0.6rem;margin-right:2px;">C</span>';
  }
  return colors
    .map((c) => {
      const cls = `mana-${c.toLowerCase()}`;
      return `<span class="mana-symbol ${cls}" style="width:16px;height:16px;font-size:0.6rem;margin-right:2px;">${c}</span>`;
    })
    .join("");
}

// Render Key Synergies
function renderModalSynergies(card, analysis) {
  elements.modalSynergiesGrid.innerHTML = "";
  const synergies = analysis?.pedagogy?.keySynergies || [];

  if (synergies.length > 0) {
    synergies.forEach((syn) => {
      const cardEl = document.createElement("div");
      cardEl.className = "synergy-card";
      cardEl.innerHTML = `
        <div class="synergy-card-header">
          <span class="synergy-partner-name">🔗 ${syn.cardName}</span>
          <span class="synergy-type-tag">${syn.synergyType || "Synergie"}</span>
        </div>
        <p class="synergy-card-desc">${syn.description}</p>
      `;

      // Click on synergy searches for partner card
      cardEl.addEventListener("click", () => {
        closeModal();
        elements.cardSearchInput.value = syn.cardName;
        state.searchQuery = syn.cardName.toLowerCase();
        renderMatrix();
      });

      elements.modalSynergiesGrid.appendChild(cardEl);
    });
  } else if (analysis?.keyPairs && analysis.keyPairs.length > 0) {
    analysis.keyPairs.forEach((pairName) => {
      const cardEl = document.createElement("div");
      cardEl.className = "synergy-card";
      cardEl.innerHTML = `
        <div class="synergy-card-header">
          <span class="synergy-partner-name">🔗 ${pairName}</span>
          <span class="synergy-type-tag">Association Clé</span>
        </div>
        <p class="synergy-card-desc">Carte clé synergisant naturellement avec ${card.name} dans les parties de ce format.</p>
      `;

      cardEl.addEventListener("click", () => {
        closeModal();
        elements.cardSearchInput.value = pairName;
        state.searchQuery = pairName.toLowerCase();
        renderMatrix();
      });

      elements.modalSynergiesGrid.appendChild(cardEl);
    });
  } else {
    elements.modalSynergiesGrid.innerHTML =
      '<p style="color: var(--text-muted); font-size: 0.8rem;">Aucune synergie spécifique renseignée pour ce format.</p>';
  }
}

// Render Cross Cube Comparative Section
function renderModalCrossCube(card) {
  elements.modalCrossCubeCards.innerHTML = "";
  const allAnalyses = card.cubeAnalyses || {};
  const cubeKeys = Object.keys(allAnalyses);

  if (cubeKeys.length <= 1) {
    elements.modalCrossCubeSection.hidden = true;
    return;
  }

  elements.modalCrossCubeSection.hidden = false;

  cubeKeys.forEach((k) => {
    const ana = allAnalyses[k];
    const isCurrent = k === state.activeCubeKey;
    const tier = ana.tier || "B";

    const cardEl = document.createElement("div");
    cardEl.className = `cross-cube-card ${isCurrent ? "is-active-cube" : ""}`;
    cardEl.innerHTML = `
      <div class="cross-card-header">
        <span class="cross-cube-name">${CUBE_CONFIGS[k]?.name || k}</span>
        <span class="cross-tier-pill tier-${tier.toLowerCase()}-row">${tier} Tier</span>
      </div>
      <p class="cross-card-text">${ana.analysis || formatFit(ana.fit)}</p>
      ${isCurrent ? '<span style="font-size:0.65rem; color:var(--tier-s); font-weight:700; margin-top:4px; display:block;">[Cube Actuel]</span>' : ""}
    `;

    // Click to switch cube
    if (!isCurrent) {
      cardEl.style.cursor = "pointer";
      cardEl.title = `Basculer sur ${CUBE_CONFIGS[k]?.name}`;
      cardEl.addEventListener("click", () => {
        elements.cubeSelect.value = k;
        state.activeCubeKey = k;
        renderMatrix();
        openCardModal(card);
      });
    }

    elements.modalCrossCubeCards.appendChild(cardEl);
  });
}

// Close Modal
export function closeModal() {
  elements.modalBackdrop.classList.remove("is-open");
  elements.modalBackdrop.style.display = "none";
  document.body.style.overflow = "";
  state.selectedCard = null;
  state.selectedCardComparison = null;
}

// Helpers
export function formatPowerTier(tier) {
  switch (tier) {
    case "powered_vintage":
      return "⚡ Powered Vintage";
    case "pauper":
      return "🛡️ Pauper (100% Communes)";
    case "synergy_unpowered":
      return "👑 Synergie Unpowered";
    default:
      return tier;
  }
}

export function formatFixing(fixing) {
  switch (fixing) {
    case "fast_fetches_duals":
      return "10 Fetches & ABUR Duals";
    case "bouncelands_taplands":
      return "Bouncelands & Taplands";
    case "rainbow_tribal":
      return "Fixing Chromatique & Changélins";
    default:
      return "Fixing Standard";
  }
}

function formatFit(fit) {
  switch (fit) {
    case "staple":
      return "Staple Incontournable";
    case "build_around":
      return "Build-Around / Payoff";
    case "support":
      return "Support Polyvalent";
    case "filler":
      return "Rôle-Player / Filler";
    case "trap":
      return "Piège de Tempo";
    default:
      return fit || "Rôle Standard";
  }
}
