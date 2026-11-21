[![make.fun](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/c/best-spot-the-difference-game-20261121-0451)
[![make.fun](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/irwan11795/makefun-best-spot-the-difference-game-20261121-0451-v2/rank.svg)](https://make.fun/c/best-spot-the-difference-game-20261121-0451)
[![make.fun](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/irwan11795/makefun-best-spot-the-difference-game-20261121-0451-v2/reward.svg)](https://make.fun/c/best-spot-the-difference-game-20261121-0451)

> Badge repo name: the rank/reward badges above use repo
> `makefun-best-spot-the-difference-game-20261121-0451-v2`. That name is assumed, not yet
> confirmed — the repo does not exist yet at submit time, so confirm or adjust it when the
> repo is created.

# Harbour & Light — Spot the Difference

A spot-the-difference game for the [make.fun bounty](https://make.fun/c/best-spot-the-difference-game-20261121-0451): two near-identical pictures of a harbour, side by side. One day, three harbours: dawn, midday, night. Find the seven differences in each picture before the clock runs out.

## How to play

- **Click** a difference in either picture — or steer the crosshair with the **arrow keys** and press **Enter**.
- A found difference gets a bright ring on both pictures, with a checkmark and its name, and a green dot in the "Found:" row.
- **H** asks for a hint (3 per scene, −50 points, rings one unfound difference for a few seconds). The HUD shows `Hint (N)`.
- A wrong click costs 5 seconds and breaks your streak — and you feel it: the field shakes, flashes red, and a "-5s" floats up from the timer.
- Finding two in a row without a miss builds a streak bonus, shown next to the score as `Streak ×N`.
- **P** pauses (or tap the **Pause** button in the bottom bar), **M** mutes (or tap the **Mute** button next to it), **Space** starts and continues.
- Three scenes, 21 differences in all: *Dawn Harbour* (easy, 2:00), *Midday Market* (medium, 2:30), *Night Harbour* (hard, 3:00). Clearing one banks a time bonus.

## The day moves on

Every find advances the scene's light — the signature mechanic:

- **Dawn:** the sun's glow climbs and the water sparkles more with every find.
- **Midday:** the sun's glow grows and the shadows under the stalls shorten with every find.
- **Night:** the lighthouse beam reaches further and the stars brighten with every find.

Each scene keeps its own best score and best time left, shown on the title screen, and a mastery star (★) for clearing it with no hints and no misses.

## What is in the box

- `game/` — the whole game as static files, no build step, no network request. Open `game/index.html` in desktop Chrome and play.
- `game/src/config.js` — every tuning number, colour and scene definition (per-scene timers, warm harbour palette).
- `game/src/scenes.js` — the harbour itself, drawn in code (no borrowed art): the dawn lighthouse and sailboats, the night lanterns and sweeping beam, the midday market stalls.
- `game/src/world.js` — the game state: finds, per-scene clocks, score, streak, hints, per-scene bests and mastery.
- `game/src/input.js` — mouse and keyboard, with a crosshair for keyboard play.
- `game/src/audio.js` — all sound made with the Web Audio API (chimes, thuds, arpeggios); no audio files.
- `game/src/render.js` — every screen: title, play, pause, scene clear, game over, win — labels above the pictures, "N to find", the "Found:" dots, miss shake/flash/"-5s".
- `game/src/shots.js` — the four screenshot scenes, staged through the real rules.
- `main.ts` — the hand-in program (Node 22, standard library only): copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Hand it in (outside the grader, `MAKEFUN_OUTPUT_DIR` stands in for `/output`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
