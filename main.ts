// Vice Cover Studio v2 — the entrypoint for gta6-cover-art-01 (Node 22,
// standard library only). The grader runs this file: it gathers the app
// and the screenshots from beside it into /output and writes
// /output/dossier.json, the summary the judge reads, using the vendored
// make.fun library. Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The app itself is plain static files under app/: index.html plus its ES
// modules, fonts and sample photos, nothing fetched from the network.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error(`vice-cover-studio v2 main.ts: ${message}`);
}

function checkShot(name, dir) {
  const bytes = statSync(join(dir, name)).size;
  if (bytes > 262144) fail(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
}

// The gate refuses more than four screenshots or one over 256 KiB, and an
// app/ over 993 files or 48 MiB, so refuse early here instead of handing
// in an entry the scorer would reject.
const appIndex = join(repoRoot, 'app', 'index.html');
if (!existsSync(appIndex) || !statSync(appIndex).isFile()) {
  fail('app/index.html is missing');
}
const shotDir = join(repoRoot, 'screenshots');
const shotNames = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => !name.startsWith('.'))
  : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  fail(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
for (const name of shotNames) checkShot(name, shotDir);

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotDir, join(outputDir, 'screenshots'), { recursive: true });

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
