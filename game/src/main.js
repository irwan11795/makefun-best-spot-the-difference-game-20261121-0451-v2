// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between six screens:
// title, play, paused, scene clear, game over and win. The crosshair follows the mouse
// over the pictures, or the arrow keys when the mouse is away. A miss shakes the field,
// flashes it red and floats a "-5s" up from the timer — the miss FX state lives here and
// decays every frame. The Pause and Mute buttons in the bottom bar are rects the click
// handler checks before the pictures, so they work with the same Pointer Events as
// everything else.
// ?seed=N fixes the scene order's randomness. ?shot=play|play2|play3|start|hint|clear|win
// (with &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_FIND, EVENT_HINT, EVENT_MISS, EVENT_SCENE_CLEAR, EVENT_TIMEOUT, EVENT_WIN, readSceneBests } from './world.js';
import { ACTION_CONFIRM, ACTION_HINT, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const CROSSHAIR_SPEED = 520;
/** How long each part of the miss feedback lasts, in seconds. */
const FX_SHAKE = 0.2;
const FX_FLASH = 0.35;
const FX_MISS_TEXT = 1.0;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
// ?layout=wide|stacked pins the layout (the screenshot runner uses it); otherwise the
// window size decides (wide side-by-side, stacked on a portrait phone).
const layoutParam = params.get('layout');
const forcedLayout = layoutParam === 'wide' || layoutParam === 'stacked' ? layoutParam : null;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, { layout: forcedLayout });
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // The staged run clears scenes for real, so the stored per-scene records are real
  // too — the win shot shows the mastery stars the run actually earned.
  const bests = readSceneBests();
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 1.2, null, null, bests);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, () => renderer.getLayout().field);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let sceneBests = readSceneBests();
  let accumulator = 0;
  let last = performance.now();
  let lastTickSecond = -1;
  const crosshair = { x: 640, y: 320, keyboard: false };
  // Miss feedback, in seconds remaining for each part; 0 means quiet.
  const fx = { shake: 0, flash: 0, missText: 0 };

  /** The crosshair's home: the middle of the first picture, in the current layout. */
  function homeCrosshair() {
    const layout = renderer.getLayout();
    crosshair.x = layout.field.width / 2;
    crosshair.y = layout.panels[0].y + layout.panels[0].h / 2;
    crosshair.keyboard = false;
  }
  homeCrosshair();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    homeCrosshair();
    screen = SCREEN_PLAY;
    announce(`Playing. ${world.scene().name} — find 7 differences.`);
  }

  function endGame(win) {
    screen = win ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    sceneBests = readSceneBests();
    announce(win ? `Harbour complete. Score ${world.state.score}.` : `Out of time. Score ${world.state.score}.`);
  }

  /** Turn a click in logical coordinates into a find attempt on the picture it is in. */
  function tryClick(lx, ly) {
    // The Mute button in the bottom bar is checked before the pictures, so a tap on
    // it never costs five seconds as a "miss" on the harbour — same as Pause below.
    const mb = renderer.getMuteButton();
    if (lx >= mb.x && lx < mb.x + mb.w && ly >= mb.y && ly < mb.y + mb.h) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
      return true;
    }
    // The Pause button in the bottom bar is checked before the pictures, so a tap on
    // it never costs five seconds as a "miss" on the harbour.
    const pb = renderer.getPauseButton();
    if (lx >= pb.x && lx < pb.x + pb.w && ly >= pb.y && ly < pb.y + pb.h) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return true;
    }
    const layout = renderer.getLayout();
    for (const panel of layout.panels) {
      if (lx >= panel.x && lx < panel.x + panel.w && ly >= panel.y && ly < panel.y + panel.h) {
        const result = world.click(lx - panel.x, ly - panel.y);
        if (result.events & EVENT_FIND) {
          audio.find();
          announce(`Found: ${result.diff.name}. ${world.scene().differences.length - world.state.found.size} still hiding.`);
        } else if (result.events & EVENT_MISS) {
          audio.miss();
          fx.shake = FX_SHAKE;
          fx.flash = FX_FLASH;
          fx.missText = FX_MISS_TEXT;
          announce('Not a difference. Five seconds lost.');
        }
        if (result.events & EVENT_WIN) {
          audio.win();
          endGame(true);
        } else if (result.events & EVENT_TIMEOUT) {
          endGame(false);
        } else if (result.events & EVENT_SCENE_CLEAR) {
          audio.clear();
          sceneBests = readSceneBests();
          screen = SCREEN_CLEAR;
          announce('Scene clear. Press Space for the next scene.');
        }
        return true;
      }
    }
    return false;
  }

  function handleActions(clickConfirm) {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_HINT && screen === SCREEN_PLAY) {
      const pick = world.hint();
      if (pick) {
        audio.hint();
        announce(`Hint: look near the ${pick.name.toLowerCase()}.`);
      } else {
        announce('No hints left in this scene.');
      }
    }
    if ((actions & ACTION_CONFIRM) || clickConfirm) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_CLEAR) {
        world.nextScene();
        screen = SCREEN_PLAY;
        announce(`Playing. ${world.scene().name} — find 7 differences.`);
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (screen === SCREEN_PLAY && crosshair.keyboard) {
        tryClick(crosshair.x, crosshair.y);
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step(dt) {
    if (screen === SCREEN_TITLE) return;
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(dt);
    if (events & EVENT_TIMEOUT) {
      endGame(false);
      return;
    }
    const second = Math.ceil(world.state.timeLeft);
    if (world.state.timeLeft <= 10 && second !== lastTickSecond) {
      lastTickSecond = second;
      audio.tick();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += dt;
    last = now;
    // The miss feedback decays in real time, whatever the screen.
    fx.shake = Math.max(0, fx.shake - dt);
    fx.flash = Math.max(0, fx.flash - dt);
    fx.missText = Math.max(0, fx.missText - dt);
    handleActions();
    // The crosshair follows the mouse, or the arrow keys when they steer.
    const mouse = input.mouse();
    const steer = input.steer();
    if (steer.x !== 0 || steer.y !== 0) {
      crosshair.keyboard = true;
      const field = renderer.getLayout().field;
      crosshair.x = Math.min(field.width, Math.max(0, crosshair.x + steer.x * CROSSHAIR_SPEED * STEP));
      crosshair.y = Math.min(field.height, Math.max(0, crosshair.y + steer.y * CROSSHAIR_SPEED * STEP));
    } else if (mouse.inside) {
      crosshair.keyboard = false;
      crosshair.x = mouse.x;
      crosshair.y = mouse.y;
    }
    const click = input.takeClick();
    if (click && screen === SCREEN_PLAY) tryClick(click.x, click.y);
    else if (click && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN || screen === SCREEN_CLEAR || screen === SCREEN_PAUSED)) {
      // A click on a menu screen counts as the confirm the screen promises
      // ("Press Space or click to start / continue").
      handleActions(true);
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
        step(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(
      world.state,
      screen,
      best,
      now / 1000,
      screen === SCREEN_PLAY ? crosshair : null,
      { shake: fx.shake / FX_SHAKE, flash: fx.flash / FX_FLASH, missText: fx.missText / FX_MISS_TEXT },
      sceneBests,
      audio.isMuted(),
    );
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Harbour and Light. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
