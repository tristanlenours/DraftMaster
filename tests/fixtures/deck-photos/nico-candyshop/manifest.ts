// Independently read from the original photos. A readable subset, not a full deck export.
export const nicoPhotoCorpus = {
  cubeKey: "nico_candyshop",
  source: "User-supplied root photos; two views of the same physical Dimir deck.",
  authorization: "User explicitly requested retaining these photos for tests on 2026-10-11.",
  rights:
    "User-supplied photography; depicted Magic card art/text belongs to Wizards of the Coast.",
  photos: [
    {
      file: "1000019031.jpg",
      sha256: "c32a60078d0765f8d258232a43707e58a67ae1c077128c2a93b72f7ccbd3cb62",
      clippedTitles: ["Archonte de la cruauté"],
    },
    {
      file: "1000019032.jpg",
      sha256: "c52dccfe0dc29cbe08f9f9058a7112d9cbe88fa4a207ba9983051070a107366b",
      // Original JPEG coordinates around the complete Serum Visions title ribbon.
      titleBand: { x: 770, y: 1210, width: 60, height: 310 },
      clippedTitles: [],
    },
  ],
  visibleTitles: [
    ["Réanimation", "Reanimate"],
    ["Trois coups d'avance", "Three Steps Ahead"],
    ["Dislocation", "Dismember"],
    ["Convulsion cérébrale", "Mind Twist"],
    ["Précepteur vampirique", "Vampiric Tutor"],
    ["Vision ancestrale", "Ancestral Vision"],
    ["Visions nées du sérum", "Serum Visions"],
    ["Ancestral Recall", "Ancestral Recall"],
    ["Mana Crypt", "Mana Crypt"],
    ["Mox Emerald", "Mox Emerald"],
    ["Library of Alexandria", "Library of Alexandria"],
    ["Estuaire pollué", "Polluted Delta"],
    ["Catacombes verdoyantes", "Verdant Catacombs"],
    ["Coptère de contrebandier", "Smuggler's Copter"],
    ["Hymn to Tourach", "Hymn to Tourach"],
    ["Erreur de calcul", "Miscalculation"],
    ["Liliana of the Veil", "Liliana of the Veil"],
    ["Perceur de coque", "Hullbreacher"],
    ["Preneuse d'otage", "Hostage Taker"],
    ["Carcasse mécanique délétère", "Noxious Gearhulk"],
    ["Archonte de la cruauté", "Archon of Cruelty"],
    ["Persistance", "Persist"],
    ["Crabomination", "Crabomination"],
    ["Traîtrise", "Treachery"],
    ["Anéantir les profanes", "Fell the Profane"],
    ["Lutri, le chasse-sorts", "Lutri, the Spellchaser"],
    ["Égouts de la Citerraine", "Undercity Sewers"],
    ["Échardes d'os", "Bone Shards"],
  ],
  basicTitles: ["Island", "Swamp"],
  unverifiedTitles: ["Malcolm, …"],
  notes:
    "No assertions for hidden cards, glare-obscured titles or total/basic quantities. Vision accuracy is measured separately from title replay.",
} as const;

export function readableNicoTitles(file: string) {
  const photo = nicoPhotoCorpus.photos.find((entry) => entry.file === file);
  return nicoPhotoCorpus.visibleTitles.filter(
    ([title]) => !photo?.clippedTitles.some((clipped) => clipped === title),
  );
}
