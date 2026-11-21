export * from "./types.ts";
export {
  extractBestFrenchData,
  translateFallbackRulesText,
  translateTypeLineToFrench,
} from "./french-translator.ts";
export {
  classifyTreatmentLabel,
  getIllustrationId,
  getPrimaryImageUris,
  isAllowedScryfallImageUrl,
  isEligiblePaperPrint,
  isMatchingCardPrint,
  scoreClassicPrint,
  scoreOriginalPopularPrint,
  selectBestProxyVariants,
  toProxyScanVariant,
  type ProxyVariantSelectionResult,
} from "./print-selector.ts";
export {
  A4_GRID_COLUMNS,
  A4_GRID_ROWS,
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  CARDS_PER_A4_SHEET,
  MTG_CARD_HEIGHT_MM,
  MTG_CARD_WIDTH_MM,
  computeA4GridGeometry,
  paginateProxySheets,
  type A4GridGeometry,
} from "./print-layout.ts";
