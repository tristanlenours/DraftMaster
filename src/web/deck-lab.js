import { getCardDisplayName, readCardLanguage } from "./card-language.js";
import { prepareDeckPhotoRegions } from "./deck-photo-upload.js";
import { formatMtgaDeckText, parseMtgaDeckText } from "./mtga-deck-text.js";

let initialized = false;
let latestResult = null;
let cubeLoading = false;
let photoReviewRequired = false;

function updatePhotoGate() {
  const blocked = photoReviewRequired && !element("deck-lab-photo-confirm").checked;
  element("deck-lab-rate").disabled = blocked;
  element("deck-lab-pimp").disabled = blocked;
}

const AXES = [
  ["power", "Puissance"],
  ["synergy", "Synergie"],
  ["curve", "Courbe"],
  ["mana", "Mana"],
  ["interaction", "Interaction"],
];

function element(id) {
  return document.getElementById(id);
}

function node(tag, className, content) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (content !== undefined) item.textContent = content;
  return item;
}

function setStatus(message, kind = "info") {
  const status = element("deck-lab-status");
  status.textContent = message;
  status.dataset.kind = kind;
}

function updateCount() {
  const text = element("deck-lab-text").value;
  const count = element("deck-lab-count");
  if (!text.trim()) {
    count.textContent =
      "40 cartes pour noter le deck ; jusqu'à 45 cartes, réserve comprise, pour le pimp.";
    return;
  }
  try {
    const parsed = parseMtgaDeckText(text);
    count.textContent = `${parsed.totalCount} carte(s) de maindeck · ${parsed.sideboardCount} en réserve · ${parsed.totalCount + parsed.sideboardCount} au total`;
  } catch (error) {
    count.textContent = error.message;
  }
}

function invalidateResult() {
  latestResult = null;
  element("deck-lab-result").replaceChildren(
    node("p", "", "La liste a changé. Relancez l'analyse pour afficher le nouveau résultat."),
  );
}

function displayName(name, translations) {
  return getCardDisplayName({ name, frenchName: translations?.[name] }, readCardLanguage());
}

function renderRating(parent, rating, label, translations) {
  const section = node("section", "deck-lab-rating");
  section.append(node("h3", "", label));
  const headline = node("p", "deck-lab-score");
  headline.append(node("strong", "", `${rating.score}/100`));
  headline.append(node("span", "", `Repère ${rating.tier} · ${rating.archetype}`));
  section.append(headline);
  const axes = node("div", "deck-lab-axes");
  for (const [key, axisLabel] of AXES) {
    const row = node("div", "deck-lab-axis");
    row.append(node("span", "", axisLabel));
    const meter = node("meter");
    meter.min = 0;
    meter.max = 100;
    meter.value = rating.axes[key];
    meter.setAttribute("aria-label", axisLabel);
    row.append(meter, node("strong", "", `${rating.axes[key]}/100`));
    axes.append(row);
  }
  section.append(axes);
  const names = (cards) => cards.map((name) => displayName(name, translations)).join(", ");
  const evidence = rating.evidence;
  const explanations = [
    [
      "Quelles cartes portent la puissance ?",
      `Score moyen des sorts : ${evidence.power.average.toFixed(1)}/55. Exemples : ${names(evidence.power.examples) || "aucun sort"}.`,
    ],
    [
      "Le plan est-il assemblé ?",
      evidence.synergy.archetype
        ? `${evidence.synergy.alignedCount} carte(s) alignée(s) avec ${evidence.synergy.archetype}. ${names(evidence.synergy.examples)}`
        : "Aucune famille d'archétype confirmée par le profil du cube.",
    ],
    [
      "Le deck démarre-t-il assez tôt ?",
      `${evidence.curve.earlyActions} action(s) précoces ; coût moyen effectif ${evidence.curve.averageCost.toFixed(1)}.`,
    ],
    [
      "Le mana soutient-il les couleurs ?",
      `${evidence.mana.lands} terrains. ${evidence.mana.colors.map(({ color, sources, target }) => `${color} ${sources}/${target} sources visées`).join(" · ") || "Aucune couleur requise"}.`,
    ],
    [
      "Comment répondre aux menaces ?",
      `${evidence.interaction.count} réponse(s) repérée(s). ${names(evidence.interaction.examples) || "Aucun exemple"}.`,
    ],
  ];
  const why = node("div", "deck-lab-evidence");
  for (const [question, answer] of explanations) {
    const item = node("p");
    item.append(node("strong", "", question), document.createTextNode(` ${answer}`));
    why.append(item);
  }
  section.append(why);
  for (const [heading, items] of [
    ["Points forts", rating.strengths],
    ["Points à surveiller", rating.weaknesses],
    ["Pistes", rating.recommendations],
  ]) {
    if (!items?.length) continue;
    section.append(node("h4", "", heading));
    const list = node("ul");
    for (const message of items) list.append(node("li", "", message));
    section.append(list);
  }
  section.append(node("p", "deck-lab-hint", `${rating.formulaVersion} · ${rating.scoreMeaning}`));
  const audit = node("details", "deck-lab-audit");
  audit.append(node("summary", "", "Détail du score et facteurs"));
  const breakdown = node("ul");
  for (const contribution of rating.audit.contributions) {
    const axisLabel = AXES.find(([key]) => key === contribution.axis)?.[1] ?? contribution.axis;
    breakdown.append(
      node(
        "li",
        "",
        `${axisLabel} : ${contribution.weightedPoints.toFixed(1)} point(s) (${contribution.score}/100 × ${Math.round(contribution.weight * 100)} %).`,
      ),
    );
  }
  const { bombDensityBonus, fastManaBonus } = rating.audit.power.components;
  if (bombDensityBonus > 0) {
    breakdown.append(node("li", "", `Bonus de densité de bombes : +${bombDensityBonus}.`));
  }
  if (fastManaBonus > 0) {
    breakdown.append(node("li", "", `Bonus de mana rapide : +${fastManaBonus}.`));
  }
  for (const pack of rating.audit.synergy.packages) {
    if (pack.contribution > 0) {
      breakdown.append(node("li", "", `${pack.label} : +${pack.contribution} en synergie.`));
    }
    if (pack.fragilityPenalty > 0) {
      breakdown.append(
        node("li", "", `${pack.label} : −${pack.fragilityPenalty} pour fragilité du plan.`),
      );
    }
  }
  audit.append(breakdown);
  section.append(audit);
  parent.append(section);
}

function renderCardList(parent, heading, cards, translations) {
  const section = node("section", "deck-lab-card-list");
  const total = cards.reduce((sum, card) => sum + card.count, 0);
  section.append(node("h4", "", `${heading} (${total})`));
  if (cards.length === 0) {
    section.append(node("p", "deck-lab-hint", "Aucune."));
  } else {
    const list = node("ul");
    for (const card of cards) {
      list.append(node("li", "", `${card.count} × ${displayName(card.name, translations)}`));
    }
    section.append(list);
  }
  parent.append(section);
}

function renderResult(result) {
  const root = element("deck-lab-result");
  root.replaceChildren();
  root.append(
    node(
      "p",
      "deck-lab-hint",
      `Cube ${result.context.cubeKey} · ${result.context.snapshotId ? `snapshot ${result.context.snapshotId}` : "snapshot indisponible"} · ${result.input.poolCount} carte(s) en entrée`,
    ),
  );
  if (result.before) {
    root.append(node("p", "deck-lab-before", `Avant : ${result.before.score}/100`));
  }
  renderRating(
    root,
    result.rating,
    result.mode === "rate" ? "Note du deck" : "Construction proposée",
    result.translations,
  );
  const provenance = result.context.provenance;
  const sources = node("details", "deck-lab-provenance");
  sources.append(node("summary", "", "Sources et versions des données"));
  const sourceList = node("ul");
  for (const [label, value] of [
    ["Couverture", result.context.coverage],
    ["Source", provenance.source],
    ["Catalogue", `${provenance.catalogCardCount} cartes · ${provenance.catalogGeneratedAt}`],
    ["Classement de puissance", provenance.powerRankingId],
    ["SHA-256 du snapshot", provenance.snapshotSha256],
    ["SHA-256 de la source", provenance.snapshotSourceSha256],
    ["SHA-256 du profil", provenance.profileSourceSha256],
    ["Version du profil", provenance.archetypeModelVersion],
  ]) {
    if (value) sourceList.append(node("li", "", `${label} : ${value}`));
  }
  sources.append(sourceList);
  root.append(sources);
  if (result.build) {
    const build = result.build;
    root.append(node("h3", "deck-lab-build-title", build.title));
    const lists = node("div", "deck-lab-card-grid");
    renderCardList(lists, "À ajouter au maindeck", build.add, result.translations);
    renderCardList(lists, "À retirer du maindeck", build.remove, result.translations);
    renderCardList(lists, "Cartes retenues", build.keep, result.translations);
    renderCardList(lists, "Cartes écartées", build.reserve, result.translations);
    root.append(lists);
    const basics = Object.entries(build.basicLands).filter(([, count]) => count > 0);
    root.append(
      node(
        "p",
        "deck-lab-basics",
        `Terrains de base : ${basics.map(([name, count]) => `${count} × ${displayName(name, result.translations)}`).join(" · ") || "aucun"}`,
      ),
    );
    const copy = node("button", "deck-lab-copy", "Copier la liste (format MTGA)");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(
          formatMtgaDeckText({
            deckName: build.title,
            cards: build.final,
            basicLands: build.basicLands,
          }),
        );
        setStatus("Deck proposé copié au format MTGA.", "success");
      } catch {
        setStatus("Copie impossible sur cet appareil.", "error");
      }
    });
    root.append(copy);
    root.append(
      node("p", "deck-lab-hint", "La disponibilité de chaque carte dans Arena n'est pas vérifiée."),
    );
  }
  if (result.warnings?.length) {
    const warnings = node("ul", "deck-lab-warnings");
    for (const warning of result.warnings) warnings.append(node("li", "", warning));
    root.append(warnings);
  }
}

async function readResponse(response) {
  const body = await response.json();
  if (!response.ok || body.ok !== true) {
    throw new Error(body.error?.message ?? "L'analyse a échoué.");
  }
  return body;
}

async function analyze(mode) {
  if (photoReviewRequired && !element("deck-lab-photo-confirm").checked) {
    setStatus("Vérifiez et confirmez la liste issue de la photo avant l'analyse.", "error");
    return;
  }
  const text = element("deck-lab-text").value;
  const cubeKey = element("deck-lab-cube").value;
  if (!cubeKey) {
    setStatus("Choisissez un cube de référence.", "error");
    return;
  }
  try {
    const parsed = parseMtgaDeckText(text);
    if (mode === "rate" && parsed.totalCount !== 40) {
      throw new Error("Rate my deck attend exactement 40 cartes dans le maindeck.");
    }
    if (mode === "pimp" && parsed.totalCount + parsed.sideboardCount > 45) {
      throw new Error("Pimp my deck accepte au maximum 45 cartes, réserve comprise.");
    }
  } catch (error) {
    setStatus(error.message, "error");
    return;
  }
  const buttons = [element("deck-lab-rate"), element("deck-lab-pimp")];
  buttons.forEach((button) => (button.disabled = true));
  setStatus("Analyse du deck en cours…");
  try {
    const response = await fetch("/api/deck-lab/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode, cubeKey }),
    });
    const result = await readResponse(response);
    if (text !== element("deck-lab-text").value || cubeKey !== element("deck-lab-cube").value) {
      setStatus(
        "La liste a changé pendant l'analyse. Relancez-la pour obtenir le nouveau résultat.",
      );
      return;
    }
    latestResult = result;
    renderResult(result);
    setStatus(mode === "rate" ? "Deck noté." : "Construction proposée.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    updatePhotoGate();
  }
}

async function recognizePhoto(file) {
  if (!file) return;
  const cubeKey = element("deck-lab-cube").value;
  if (!cubeKey) {
    setStatus("Choisissez un cube avant d'importer une photo.", "error");
    return;
  }
  const currentText = element("deck-lab-text").value;
  setStatus("Reconnaissance de la photo en cours…");
  try {
    const images = await prepareDeckPhotoRegions(file);
    const response = await fetch("/api/tournaments/recognize-deck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, cubeKey }),
    });
    const recognized = await readResponse(response);
    if (currentText !== element("deck-lab-text").value) {
      setStatus(
        "La liste a changé pendant la reconnaissance. La photo n'a pas remplacé votre texte.",
      );
      return;
    }
    element("deck-lab-text").value = formatMtgaDeckText({
      deckName: recognized.archetype,
      cards: recognized.cards,
      basicLands: recognized.basicLands,
    });
    photoReviewRequired = true;
    element("deck-lab-photo-review").hidden = false;
    element("deck-lab-photo-confirm").checked = false;
    const unresolved = element("deck-lab-unverified");
    const titles = Array.isArray(recognized.unverifiedTitles) ? recognized.unverifiedTitles : [];
    unresolved.replaceChildren();
    if (titles.length > 0) {
      unresolved.append(node("p", "", "Titres à vérifier et ajouter manuellement si présents :"));
      const list = node("ul", "");
      for (const title of titles) list.append(node("li", "", title));
      unresolved.append(list);
    }
    updatePhotoGate();
    latestResult = null;
    element("deck-lab-result").replaceChildren(
      node("p", "", "Vérifiez la liste reconnue puis lancez l'analyse."),
    );
    updateCount();
    setStatus("Photo analysée : liste partielle. Vérifiez chaque carte et quantité avant l'analyse.");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    element("deck-lab-photo").value = "";
  }
}

export async function initDeckLabView(preferredCubeKey) {
  if (initialized && element("deck-lab-cube").options.length > 1) return;
  if (!initialized) {
    initialized = true;
    element("deck-lab-text").addEventListener("input", () => {
      if (photoReviewRequired) element("deck-lab-photo-confirm").checked = false;
      updatePhotoGate();
      updateCount();
      invalidateResult();
    });
    element("deck-lab-cube").addEventListener("change", invalidateResult);
    element("deck-lab-photo-confirm").addEventListener("change", updatePhotoGate);
    element("deck-lab-rate").addEventListener("click", () => void analyze("rate"));
    element("deck-lab-pimp").addEventListener("click", () => void analyze("pimp"));
    element("deck-lab-photo-trigger").addEventListener("click", () =>
      element("deck-lab-photo").click(),
    );
    element("deck-lab-photo").addEventListener(
      "change",
      (event) => void recognizePhoto(event.target.files?.[0]),
    );
    window.addEventListener("draftmaster:card-language-change", () => {
      if (latestResult) renderResult(latestResult);
    });
  }
  if (cubeLoading) return;
  cubeLoading = true;
  try {
    const response = await fetch("/api/tournaments/cubes");
    const body = await readResponse(response);
    const select = element("deck-lab-cube");
    select.replaceChildren(node("option", "", "Choisir un cube"));
    select.firstChild.value = "";
    for (const cube of body.cubes) {
      const option = node("option", "", cube.cubeName);
      option.value = cube.cubeKey;
      select.append(option);
    }
    if (body.cubes.some((cube) => cube.cubeKey === preferredCubeKey)) {
      select.value = preferredCubeKey;
    }
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    cubeLoading = false;
  }
}
