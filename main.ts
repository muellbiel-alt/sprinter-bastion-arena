// Sprinter Bastion: Overdrive Protocol — make.fun best-game-01 submission entrypoint (Node 22).
// Copies static offline files under game/ and real browser screenshots under screenshots/ to /output,
// validates all gate constraints locally, and writes /output/dossier.json deterministically.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, htmlFacts, readGameTree } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function validateGateConstraints(targetDir: string): void {
  const tree = readGameTree(targetDir, {
    game_max_files: GATE_CAPS.game_max_files,
    game_max_bytes: GATE_CAPS.game_max_bytes,
    game_path_max_bytes: GATE_CAPS.game_path_max_bytes,
  });
  if (tree.files.length === 0) {
    throw new Error('game/ must contain at least index.html and source modules');
  }

  const indexHtml = readFileSync(join(targetDir, 'game', 'index.html'), 'utf8');
  const facts = htmlFacts(indexHtml);
  const tagList = Array.isArray(facts) ? facts : (facts.tags ?? []);
  for (const tag of tagList) {
    const ref = tag.src ?? tag.href ?? '';
    if (/^(?:https?:)?\/\//i.test(ref)) {
      throw new Error(`Disallowed external network reference in index.html: ${ref}`);
    }
  }

  const shotsDir = join(targetDir, 'screenshots');
  const shotFiles = readdirSync(shotsDir)
    .filter((name) => !name.startsWith('.'))
    .sort();
  if (shotFiles.length < 3 || shotFiles.length > GATE_CAPS.screenshots.max) {
    throw new Error(`Expected 3 to 4 screenshots, found ${shotFiles.length}`);
  }
  for (const file of shotFiles) {
    const stats = statSync(join(shotsDir, file));
    if (stats.size > GATE_CAPS.screenshots.max_bytes) {
      throw new Error(`Screenshot ${file} exceeds 256 KiB (${stats.size} bytes)`);
    }
  }
  if (tree.entries > GATE_CAPS.game_max_files) {
    throw new Error(`game/ entry count ${tree.entries} exceeds ${GATE_CAPS.game_max_files}`);
  }
}

mkdirSync(out, { recursive: true });
rmSync(join(out, 'game'), { recursive: true, force: true });
rmSync(join(out, 'screenshots'), { recursive: true, force: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

validateGateConstraints(out);

const dossierBytes = buildDossier(out, GATE_CAPS);
writeFileSync(join(out, 'dossier.json'), dossierBytes);
