// Harbour & Light — a spot-the-difference game (Node 22, standard library only). Two
// near-identical pictures of a harbour sit side by side, and the player hunts the changes
// between them. Three scenes in all, one continuous day: Dawn Harbour (easy, 2:00), Midday
// Market (medium, 2:30) and Night Harbour (hard, 3:00) — seven differences in each,
// twenty-one to find across the whole game, each scene a genuinely different drawing
// rather than a palette swap. Every find moves the day's light: at dawn the sun's glow
// climbs and the water sparkles more, at midday the sun's glow grows and the shadows
// shorten, at night the lighthouse beam reaches further and the stars brighten. Differences
// are found by clicking (or tapping) them directly, or by steering the keyboard crosshair
// and confirming with Enter. A wrong click costs five seconds, shakes the field, flashes
// it red and floats a "-5s" up from the timer; a hint rings one unfound difference. The
// layout is responsive, with a touch-friendly stacked view on narrow screens, and every
// sound effect — the tick of a found difference, the soft thud of a miss, the chime of a
// finished scene — is synthesized live with procedural WebAudio, so there are no audio
// assets to ship. Each scene keeps its own best score and best time left, and a mastery
// star for clearing it with no hints and no misses. The game itself is the plain static
// files in this directory's game/ folder (game/index.html and its ES modules, no library
// and no network request). This program hands it in: it copies game/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
