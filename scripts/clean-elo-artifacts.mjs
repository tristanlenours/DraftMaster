import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();
const itemsDir = resolve(rootDir, 'data/cards/items');

let modifiedCount = 0;
const files = readdirSync(itemsDir).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const filePath = join(itemsDir, file);
  const content = readFileSync(filePath, 'utf8');
  let doc;
  try {
    doc = JSON.parse(content);
  } catch (err) {
    console.error(`Failed to parse ${file}:`, err.message);
    continue;
  }

  let modified = false;
  const score = doc.powerScore?.score ?? 25;

  // 1. Clean powerScore
  if (doc.powerScore) {
    if (doc.powerScore.source === 'cubecobra_elo') {
      doc.powerScore.source = 'expert_heuristic';
      modified = true;
    }
    if (typeof doc.powerScore.rawSourceScore === 'number' && doc.powerScore.rawSourceScore > 55) {
      doc.powerScore.rawSourceScore = doc.powerScore.score;
      modified = true;
    }
  }

  // 2. Clean objectiveAnalysis
  if (doc.objectiveAnalysis) {
    if (doc.objectiveAnalysis.summary) {
      const orig = doc.objectiveAnalysis.summary;
      let s = orig.replace(/\s*\(ELO\s*CubeCobra:\s*\d+\)/gi, ` (Score : ${score.toFixed(1)})`);
      s = s.replace(/\s*\(ELO:\s*\d+\)/gi, ` (Score : ${score.toFixed(1)})`);
      if (s !== orig) {
        doc.objectiveAnalysis.summary = s;
        modified = true;
      }
    }

    // If summary was auto-generated, align floor/ceiling ratings to powerScore
    if (doc.objectiveAnalysis.summary && doc.objectiveAnalysis.summary.includes('sélectionné')) {
      const newFloor = Math.min(9.5, Math.max(1, Math.round((score / 5.5) * 0.85 * 10) / 10));
      const newCeiling = Math.min(10, Math.max(2, Math.round((score / 5.5) * 1.05 * 10) / 10));
      if (doc.objectiveAnalysis.floorRating !== newFloor || doc.objectiveAnalysis.ceilingRating !== newCeiling) {
        doc.objectiveAnalysis.floorRating = newFloor;
        doc.objectiveAnalysis.ceilingRating = newCeiling;
        modified = true;
      }
    }
  }

  // 3. Clean cubeAnalyses
  if (doc.cubeAnalyses) {
    for (const [cubeKey, analysis] of Object.entries(doc.cubeAnalyses)) {
      if (analysis.analysis) {
        const orig = analysis.analysis;
        let a = orig.replace(/\s*\(ELO\s*CubeCobra:\s*\d+\)/gi, ` (Score : ${score.toFixed(1)})`);
        a = a.replace(/\s*\(ELO:\s*\d+\)/gi, ` (Score : ${score.toFixed(1)})`);
        if (a !== orig) {
          analysis.analysis = a;
          modified = true;
        }
      }

      // Strict invariant: no Tier S if powerScore < 38
      if (analysis.tier === 'S' && score < 38) {
        analysis.tier = score >= 26 ? 'A' : score >= 17 ? 'B' : score >= 10 ? 'C' : 'D';
        analysis.fit = analysis.fit === 'build_around' ? 'build_around' : 'support';
        analysis.scoreModifier = analysis.tier === 'A' ? 6 : analysis.tier === 'B' ? 0 : -5;
        modified = true;
      }

      if (analysis.pedagogy?.archetypeFit) {
        for (const fit of analysis.pedagogy.archetypeFit) {
          if (fit.winrateOrScore && fit.winrateOrScore !== `Score ${score.toFixed(1)}`) {
            fit.winrateOrScore = `Score ${score.toFixed(1)}`;
            modified = true;
          }
          if (fit.comment && /ELO/i.test(fit.comment)) {
            fit.comment = fit.comment.replace(/ELO/gi, 'Score');
            modified = true;
          }
          if (analysis.tier && fit.grade !== analysis.tier) {
            fit.grade = analysis.tier;
            modified = true;
          }
        }
      }
    }
  }

  if (modified) {
    writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    modifiedCount++;
  }
}

console.log(`✅ Cleaned ELO artifacts from ${modifiedCount} card item files.`);
