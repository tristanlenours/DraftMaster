const BASIC_LANDS = ["Plains", "Island", "Swamp", "Mountain", "Forest"];
const BASIC_ALIASES = new Map([
  ["plains", "Plains"],
  ["plaine", "Plains"],
  ["island", "Island"],
  ["ile", "Island"],
  ["swamp", "Swamp"],
  ["marais", "Swamp"],
  ["mountain", "Mountain"],
  ["montagne", "Mountain"],
  ["forest", "Forest"],
  ["foret", "Forest"],
]);

function normalizedKey(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .toLowerCase();
}

function basicLandName(name) {
  return BASIC_ALIASES.get(normalizedKey(name)) ?? null;
}

function validQuantity(value) {
  return Number.isInteger(value) && value >= 1 && value <= 99;
}

export class MtgaDeckTextError extends Error {
  constructor(message, line = null) {
    super(message);
    this.name = "MtgaDeckTextError";
    this.line = line;
  }
}

export function parseMtgaDeckText(text) {
  if (typeof text !== "string" || text.length > 100_000) {
    throw new MtgaDeckTextError("La liste MTGA est absente ou trop longue.");
  }

  const cardsByName = new Map();
  const sideboardByName = new Map();
  const basicLands = Object.fromEntries(BASIC_LANDS.map((name) => [name, 0]));
  const sideboardBasicLands = Object.fromEntries(BASIC_LANDS.map((name) => [name, 0]));
  let section = "deck";
  let deckName = null;
  let sideboardCount = 0;

  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    const lineNumber = index + 1;

    if (/^#\s*Export MTGA partiel non importable/iu.test(line)) {
      throw new MtgaDeckTextError(
        "Cet export MTGA est partiel : corrigez les cartes incompatibles avant de l'importer.",
        lineNumber,
      );
    }
    if (/^About$/iu.test(line)) {
      section = "about";
      continue;
    }
    if (/^Deck$/iu.test(line)) {
      section = "deck";
      continue;
    }
    if (/^(Sideboard|Réserve|Reserve)$/iu.test(line)) {
      section = "sideboard";
      continue;
    }
    if (section === "about" && /^Name\s+(.+)$/iu.test(line)) {
      deckName = line.replace(/^Name\s+/iu, "").trim();
      continue;
    }

    const match = /^(\d{1,3})x?\s+(.+)$/iu.exec(line);
    if (!match || section === "about") {
      throw new MtgaDeckTextError(
        `Ligne ${String(lineNumber)} MTGA invalide : ${line}`,
        lineNumber,
      );
    }
    const quantity = Number(match[1]);
    if (!validQuantity(quantity)) {
      throw new MtgaDeckTextError(
        `Ligne ${String(lineNumber)} : la quantité doit être comprise entre 1 et 99.`,
        lineNumber,
      );
    }
    const name = (match[2] ?? "").replace(/\s+\([a-zA-Z0-9]{2,10}\)\s+\d+[a-zA-Z]?$/u, "").trim();
    if (!name) {
      throw new MtgaDeckTextError(
        `Ligne ${String(lineNumber)} : nom de carte manquant.`,
        lineNumber,
      );
    }
    const basic = basicLandName(name);
    if (basic) {
      if (section === "sideboard") {
        sideboardBasicLands[basic] += quantity;
        sideboardCount += quantity;
      } else {
        basicLands[basic] += quantity;
      }
      continue;
    }
    const target = section === "sideboard" ? sideboardByName : cardsByName;
    const key = normalizedKey(name);
    const previous = target.get(key);
    target.set(key, {
      name: previous?.name ?? name,
      count: (previous?.count ?? 0) + quantity,
    });
    if (section === "sideboard") sideboardCount += quantity;
  }

  const cards = [...cardsByName.values()];
  const totalCount =
    cards.reduce((sum, card) => sum + card.count, 0) +
    Object.values(basicLands).reduce((sum, count) => sum + count, 0);
  if (totalCount === 0) {
    throw new MtgaDeckTextError("Le maindeck MTGA est vide.");
  }

  return {
    deckName,
    cards,
    basicLands,
    sideboardCards: [...sideboardByName.values()],
    sideboardBasicLands,
    sideboardCount,
    totalCount,
  };
}

export function formatMtgaDeckText({ deckName = null, cards = [], basicLands = {} }) {
  const lines = [];
  const cleanDeckName =
    typeof deckName === "string" ? deckName.replace(/[\r\n]+/gu, " ").trim() : "";
  if (cleanDeckName) lines.push("About", `Name ${cleanDeckName}`, "");
  lines.push("Deck");

  for (const card of cards) {
    const quantity = card.count ?? 1;
    const name = typeof card.name === "string" ? card.name.replace(/[\r\n]+/gu, " ").trim() : "";
    if (!validQuantity(quantity) || !name) {
      throw new MtgaDeckTextError("Le Deck déclaré contient une carte ou une quantité invalide.");
    }
    lines.push(`${String(quantity)} ${name}`);
  }
  for (const basic of BASIC_LANDS) {
    const quantity = basicLands[basic] ?? 0;
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
      throw new MtgaDeckTextError("Le Deck déclaré contient une quantité de terrains invalide.");
    }
    if (quantity > 0) lines.push(`${String(quantity)} ${basic}`);
  }
  return `${lines.join("\n")}\n`;
}
