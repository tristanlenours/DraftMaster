import { extractBestFrenchData } from "./french-translator.ts";
import type {
  ProxyCardFallbackInput,
  ProxyCardFrenchData,
  ProxyScanBackFace,
  ProxyScanVariant,
  ScryfallImageUris,
  ScryfallPrint,
} from "./types.ts";

const POPULAR_ALT_ART_SETS = new Set([
  "sld", // Secret Lair Drop
  "spg", // Special Guests
  "sta", // Strixhaven Mystical Archive
  "wot", // Wilds of Eldraine: Enchanting Tales
  "otp", // Breaking News
  "brr", // Brothers' War Retro Artifacts
  "mps", // Kaladesh Inventions
  "mp2", // Amonkhet Invocations
  "exp", // Zendikar Expeditions
  "zne", // Zendikar Rising Expeditions
  "mul", // Multiverse Legends
  "fca", // Final Fantasy Through the Ages
  "big", // The Big Score
  "blc", // Bloomburrow Commander Imagine/Alt
  "dsk", // Duskmourn
  "mh3", // Modern Horizons 3
  "mh2", // Modern Horizons 2
  "cmm", // Commander Masters
  "2x2", // Double Masters 2022
  "2xm", // Double Masters
  "dmr", // Dominaria Remastered
  "inr", // Innistrad Remastered
  "tsr", // Time Spiral Remastered
  "slc", // Secret Lair Countdown
  "ppro", // Pro Tour Promos
  "pf23",
  "pf24",
  "pf25",
  "j20",
  "j21",
  "pjudge",
]);

const ICONIC_ALT_SET_LABELS: Readonly<Record<string, string>> = {
  sld: "Secret Lair",
  slc: "Secret Lair",
  spg: "Special Guests",
  sta: "Archives Mystiques",
  wot: "Contes Enchanteurs",
  otp: "Breaking News",
  brr: "Artefact Rétro",
  mps: "Masterpiece",
  mp2: "Invocation",
  exp: "Expédition",
  zne: "Expédition",
  mul: "Légendes du Multivers",
};

const ALT_FRAME_EFFECTS = new Set([
  "showcase",
  "extendedart",
  "inverted",
  "etched",
  "shatteredglass",
  "tombstone",
  "waxingandwaningmoondfc",
  "fullart",
  "borderless",
]);

const ALLOWED_IMAGE_HOSTS = new Set(["cards.scryfall.io", "c1.scryfall.com"]);

/**
 * Strict allowlist validator for remote Scryfall image URLs proxied by the local server.
 * Prevents SSRF by allowing only HTTPS requests to official Scryfall CDN hosts.
 */
export function isAllowedScryfallImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) return false;
    if (parsed.username || parsed.password) return false;
    if (!/\.(png|jpg|jpeg|webp)$/iu.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function getPrimaryImageUris(print: ScryfallPrint): ScryfallImageUris | undefined {
  return print.image_uris ?? print.card_faces?.[0]?.image_uris;
}

export function getIllustrationId(print: ScryfallPrint): string | undefined {
  return print.illustration_id ?? print.card_faces?.[0]?.illustration_id;
}

/**
 * Verifies a print actually belongs to the requested card (never matching a secondary
 * adventure/split face such as "Emeritus of Ideation // Ancestral Recall").
 */
export function isMatchingCardPrint(print: ScryfallPrint, cardName: string): boolean {
  const target = cardName.trim().toLowerCase();
  if (!target) return false;
  const printName = print.name.trim().toLowerCase();
  if (printName === target) return true;
  const frontFace = print.card_faces?.[0];
  if (frontFace) {
    const frontName = frontFace.name.trim().toLowerCase();
    const frontPrinted = (frontFace.printed_name ?? "").trim().toLowerCase();
    if (frontName === target || frontPrinted === target) {
      return true;
    }
  }
  return false;
}

export function isEligiblePaperPrint(print: ScryfallPrint): boolean {
  if (print.digital) return false;
  if (print.oversized) return false;
  if (print.layout === "art_series" || print.layout === "token" || print.layout === "emblem") {
    return false;
  }
  if (print.image_status === "missing" || print.image_status === "placeholder") {
    return false;
  }
  const uris = getPrimaryImageUris(print);
  if (!uris || (!uris.png && !uris.large && !uris.normal)) {
    return false;
  }
  return true;
}

function hasSpecialTreatment(print: ScryfallPrint): boolean {
  const effects = print.frame_effects ?? [];
  const promoTypes = print.promo_types ?? [];
  return (
    Boolean(print.full_art) ||
    print.border_color === "borderless" ||
    effects.some((effect) => ALT_FRAME_EFFECTS.has(effect)) ||
    promoTypes.includes("boosterfun") ||
    promoTypes.includes("textured") ||
    promoTypes.includes("serialized") ||
    promoTypes.includes("surgefoil") ||
    print.set === "sld" ||
    print.set === "slc" ||
    print.set === "spg" ||
    print.set === "sta" ||
    print.set === "wot" ||
    print.set === "otp" ||
    print.set === "mps" ||
    print.set === "mp2" ||
    print.set === "exp"
  );
}

export function classifyTreatmentLabel(print: ScryfallPrint, isClassicSlot = false): string {
  const langSuffix = print.lang === "fr" ? "FR" : "EN";
  if (isClassicSlot && !hasSpecialTreatment(print)) {
    if (print.frame === "1997" || print.frame === "1993") {
      return `Classique Rétro ${langSuffix}`;
    }
    return print.highres_image ? `Classique ${langSuffix} HD` : `Classique ${langSuffix}`;
  }

  const iconicSet = ICONIC_ALT_SET_LABELS[print.set];
  if (iconicSet) {
    return `${iconicSet} (${langSuffix})`;
  }

  const effects = new Set(print.frame_effects ?? []);
  if (print.border_color === "borderless" || effects.has("borderless")) {
    return `Borderless (${langSuffix})`;
  }
  if (effects.has("showcase")) {
    return `Showcase (${langSuffix})`;
  }
  if (effects.has("extendedart")) {
    return `Extended Art (${langSuffix})`;
  }
  if (print.full_art || effects.has("fullart")) {
    return `Full-Art (${langSuffix})`;
  }
  if (print.frame === "1997" || print.frame === "1993") {
    return `Cadre Rétro (${langSuffix})`;
  }
  if (print.textless) {
    return `Sans texte (${langSuffix})`;
  }
  if (print.promo) {
    return `Promo (${langSuffix})`;
  }
  return `Illustration Alt. (${langSuffix})`;
}

function getReleaseYear(print: ScryfallPrint): number {
  const year = Number.parseInt((print.released_at ?? "1993").slice(0, 4), 10);
  return Number.isFinite(year) ? year : 1993;
}

/**
 * Deterministic score for the "Scan Classique" slot:
 * Prioritizes crisp high-res paper scans with a classic readable frame and official French text.
 */
export function scoreClassicPrint(print: ScryfallPrint): number {
  let score = 0;
  const uris = getPrimaryImageUris(print);

  if (uris?.png) score += 20;
  if (print.highres_image) score += 35;
  if (print.image_status === "highres_scan") score += 25;
  if (print.image_status === "lowres") score -= 40;

  // Official French scan is strongly preferred for classic proxies
  if (print.lang === "fr") {
    score += 55;
  } else if (print.lang === "en") {
    score += 10;
  } else {
    score -= 80;
  }

  // Prefer authentic readable black-bordered classic frame
  if (print.border_color === "black") score += 22;
  else if (print.border_color === "white") score -= 18;
  else if (print.border_color === "gold" || print.border_color === "silver") score -= 60;
  else if (print.border_color === "borderless") score -= 18;

  if (print.frame === "2015") score += 24;
  else if (print.frame === "2003") score += 14;
  else if (print.frame === "1997") score += 6;
  else if (print.frame === "1993") score -= 4;

  // Classic slot avoids collector alt-arts, textless, memorabilia, promos
  if (hasSpecialTreatment(print)) score -= 32;
  if (print.textless) score -= 70;
  if (print.set_type === "memorabilia") score -= 90;
  if (print.promo) score -= 12;
  if (print.booster) score += 8;

  // Favor modern crisp scans (2015+) over older blurry scans
  const year = getReleaseYear(print);
  if (year >= 2021) score += 12;
  else if (year >= 2015) score += 8;
  else if (year >= 2008) score += 2;
  else score -= 6;

  return score;
}

/**
 * Deterministic score for the "Illustration Originale Populaire" slot:
 * Prioritizes a distinct artwork with popular collector treatments (Borderless, Showcase,
 * Secret Lair, Special Guests, Mystical Archive, Full-Art, Retro Frame) in high resolution.
 */
export function scoreOriginalPopularPrint(
  print: ScryfallPrint,
  classicPrint: ScryfallPrint | null,
): number {
  let score = 0;
  const uris = getPrimaryImageUris(print);

  if (uris?.png) score += 18;
  if (print.highres_image) score += 32;
  if (print.image_status === "highres_scan") score += 22;
  if (print.image_status === "lowres") score -= 45;
  if (print.set_type === "memorabilia") score -= 85;
  if (print.border_color === "gold" || print.border_color === "silver") score -= 60;
  if (print.border_color === "white") score -= 25;

  // Huge preference for a genuinely different illustration from the classic scan
  const printIllus = getIllustrationId(print);
  const classicIllus = classicPrint ? getIllustrationId(classicPrint) : undefined;
  if (printIllus && classicIllus) {
    if (printIllus !== classicIllus) {
      score += 65;
    } else {
      // Same art is only interesting if it's a major visual upgrade (borderless / full art / retro)
      score -= 10;
    }
  } else if (classicPrint && print.id !== classicPrint.id) {
    score += 12;
  }

  // Collector / popular illustration treatments
  const effects = new Set(print.frame_effects ?? []);
  const promoTypes = new Set(print.promo_types ?? []);

  if (print.border_color === "borderless" || effects.has("borderless")) score += 42;
  if (print.full_art || effects.has("fullart")) score += 34;
  if (effects.has("showcase")) score += 38;
  if (effects.has("extendedart")) score += 22;
  if (effects.has("inverted") || effects.has("shatteredglass") || effects.has("tombstone")) {
    score += 28;
  }

  if (print.set === "sld" || print.set === "slc") score += 40;
  else if (print.set === "spg" || print.set === "sta" || print.set === "wot") score += 38;
  else if (
    print.set === "mps" ||
    print.set === "mp2" ||
    print.set === "exp" ||
    print.set === "zne"
  ) {
    score += 36;
  } else if (print.set === "otp" || print.set === "brr" || print.set === "mul") score += 30;
  else if (POPULAR_ALT_ART_SETS.has(print.set)) score += 16;

  if (promoTypes.has("boosterfun")) score += 14;
  if (promoTypes.has("judgegift") || promoTypes.has("buyabox")) score += 16;

  // Iconic classic retro frame alternative (e.g., Timeshifted / Retro Frame reprints)
  if (
    (print.frame === "1997" || print.frame === "1993") &&
    classicPrint?.frame === "2015" &&
    print.highres_image
  ) {
    score += 24;
  }

  // Textless is art-forward but slightly less practical for reading than showcase/borderless
  if (print.textless) score -= 12;

  // Prefer official French version of the same popular alt-art when both FR and EN exist!
  if (print.lang === "fr") {
    score += 18;
  } else if (print.lang === "en") {
    score += 4;
  } else {
    score -= 80;
  }

  const year = getReleaseYear(print);
  if (year >= 2020) score += 10;
  else if (year >= 2015) score += 5;

  return score;
}

export function toProxyScanVariant(
  print: ScryfallPrint,
  score: number,
  isClassicSlot: boolean,
): ProxyScanVariant {
  const uris = getPrimaryImageUris(print);
  const pngUrl = uris?.png ?? uris?.large ?? uris?.normal ?? "";
  const largeUrl = uris?.large ?? uris?.normal ?? pngUrl;
  const illustrationId = getIllustrationId(print);
  const borderless =
    print.border_color === "borderless" || (print.frame_effects ?? []).includes("borderless");
  const isOfficialFrenchScan = print.lang === "fr";

  let backFace: ProxyScanBackFace | undefined;
  if (print.card_faces && print.card_faces.length >= 2) {
    const back = print.card_faces[1];
    if (back?.image_uris) {
      const backPng = back.image_uris.png ?? back.image_uris.large ?? back.image_uris.normal ?? "";
      const backLarge = back.image_uris.large ?? back.image_uris.normal ?? backPng;
      if (backPng) {
        backFace = {
          name: back.name,
          ...(back.printed_name ? { printedName: back.printed_name } : {}),
          ...(back.mana_cost ? { manaCost: back.mana_cost } : {}),
          typeLine: back.type_line ?? "",
          ...(back.printed_type_line ? { printedTypeLine: back.printed_type_line } : {}),
          oracleText: back.oracle_text ?? "",
          ...(back.printed_text ? { printedText: back.printed_text } : {}),
          ...(back.power ? { power: back.power } : {}),
          ...(back.toughness ? { toughness: back.toughness } : {}),
          ...(back.loyalty ? { loyalty: back.loyalty } : {}),
          pngUrl: backPng,
          largeUrl: backLarge,
          ...(back.image_uris.art_crop ? { artCropUrl: back.image_uris.art_crop } : {}),
        };
      }
    }
  }

  return {
    scryfallId: print.id,
    ...(illustrationId ? { illustrationId } : {}),
    lang: print.lang,
    setCode: print.set,
    setName: print.set_name ?? print.set.toUpperCase(),
    collectorNumber: print.collector_number ?? "",
    releasedAt: print.released_at ?? "",
    artist: print.artist ?? print.card_faces?.[0]?.artist ?? "Inconnu",
    frame: print.frame ?? "2015",
    frameEffects: [...(print.frame_effects ?? [])],
    borderColor: print.border_color ?? "black",
    promoTypes: [...(print.promo_types ?? [])],
    fullArt: Boolean(print.full_art),
    borderless,
    highresImage: Boolean(print.highres_image),
    imageStatus: print.image_status ?? "unknown",
    treatmentLabel: classifyTreatmentLabel(print, isClassicSlot),
    pngUrl,
    largeUrl,
    ...(uris?.border_crop ? { borderCropUrl: uris.border_crop } : {}),
    ...(uris?.art_crop ? { artCropUrl: uris.art_crop } : {}),
    ...(backFace ? { backFace } : {}),
    isOfficialFrenchScan,
    needsFrenchProxyRender: !isOfficialFrenchScan,
    score,
  };
}

export interface ProxyVariantSelectionResult {
  readonly classic: ProxyScanVariant | null;
  readonly original: ProxyScanVariant | null;
  readonly french: ProxyCardFrenchData;
  readonly candidates: readonly ProxyScanVariant[];
}

/**
 * Selects the best Classic scan and the best Popular Original / Alt-Art scan from
 * all Scryfall prints of a card, alongside the richest available French metadata.
 */
export function selectBestProxyVariants(
  prints: readonly ScryfallPrint[],
  card: ProxyCardFallbackInput,
): ProxyVariantSelectionResult {
  const matching = prints.filter(
    (print) =>
      isMatchingCardPrint(print, card.name) && (print.lang === "fr" || print.lang === "en"),
  );
  const paperEligible = matching.filter(isEligiblePaperPrint);
  const pool =
    paperEligible.length > 0
      ? paperEligible
      : matching.filter((p) => Boolean(getPrimaryImageUris(p)));

  const french = extractBestFrenchData(matching, card);

  if (pool.length === 0) {
    return {
      classic: null,
      original: null,
      french,
      candidates: [],
    };
  }

  const rankedForClassic = [...pool]
    .map((print) => ({ print, score: scoreClassicPrint(print) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.print.released_at ?? "").localeCompare(a.print.released_at ?? "");
    });

  const bestClassicPair = rankedForClassic[0];
  if (!bestClassicPair) {
    return { classic: null, original: null, french, candidates: [] };
  }

  const classic = toProxyScanVariant(bestClassicPair.print, bestClassicPair.score, true);

  // Exclude exact same scryfallId; also avoid picking merely an EN twin of the exact same classic frame/art
  // unless no genuinely different art or special treatment exists.
  const classicIllus = getIllustrationId(bestClassicPair.print);
  const altCandidates = pool.filter((print) => {
    if (print.id === bestClassicPair.print.id) return false;
    const sameArt = Boolean(classicIllus && getIllustrationId(print) === classicIllus);
    const sameBasicLook =
      sameArt &&
      !hasSpecialTreatment(print) &&
      print.frame === bestClassicPair.print.frame &&
      print.border_color === bestClassicPair.print.border_color;
    return !sameBasicLook;
  });

  const rankedForOriginal = altCandidates
    .map((print) => ({ print, score: scoreOriginalPopularPrint(print, bestClassicPair.print) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.print.released_at ?? "").localeCompare(a.print.released_at ?? "");
    });

  const bestOriginalPair = rankedForOriginal[0];
  const original = bestOriginalPair
    ? toProxyScanVariant(bestOriginalPair.print, bestOriginalPair.score, false)
    : null;

  // Build deduplicated candidate list for the interactive Print Picker UI
  // (preferring FR over EN when two prints share the exact same set + collector_number)
  const bySetCollector = new Map<string, ScryfallPrint>();
  for (const print of pool) {
    const key = `${print.set}#${print.collector_number ?? print.id}`;
    const existing = bySetCollector.get(key);
    if (!existing) {
      bySetCollector.set(key, print);
    } else if (existing.lang !== "fr" && print.lang === "fr") {
      bySetCollector.set(key, print);
    }
  }

  const candidates = [...bySetCollector.values()]
    .map((print) =>
      toProxyScanVariant(
        print,
        scoreOriginalPopularPrint(print, bestClassicPair.print),
        print.id === bestClassicPair.print.id,
      ),
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.releasedAt.localeCompare(a.releasedAt);
    });

  return {
    classic,
    original,
    french,
    candidates,
  };
}
