# Verification

Run npx vitest run tests/unit/tournaments/deck-photo-service-fallback.test.ts tests/unit/tournaments/deck-photo-recognition.test.ts tests/unit/cards/import-printed-names.test.ts for deterministic recognition/import regressions.

Run npx playwright test tests/browser/deck-lab.spec.ts for fixture upload, real cropping, editable list and keyboard review. These replay OCR evidence and do not measure live vision accuracy.

Run npm run check and affected HTTP/reference/replay suites. Explicit source refresh: node scripts/import-printed-card-names.mjs --cube nico_candyshop.
