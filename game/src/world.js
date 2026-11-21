// The game state: which scene, what is found, the clock, the score. Pure logic — no
// drawing here. A click is a find when it lands inside an unfound difference of the
// current scene, in either panel; a miss costs seconds and breaks the combo. Each scene
// has its own clock (the scene's `time`), and each scene keeps its own record: the best
// score and the best time left ever banked on it, and a mastery mark — a star earned by
// clearing it with no hints and no misses. Those records live in localStorage under the
// harbour-and-light prefix and are only ever written from real clears.

import { HINTS_PER_SCENE, HINT_COST, MISS_PENALTY, POINTS, SCENES, SCENE_BESTS_KEY } from './config.js';

export const EVENT_FIND = 1;
export const EVENT_MISS = 2;
export const EVENT_SCENE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_TIMEOUT = 16;
export const EVENT_HINT = 32;

/** Read the per-scene records from storage; an empty object when there are none yet. */
export function readSceneBests() {
  try {
    const raw = window.localStorage.getItem(SCENE_BESTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSceneBests(bests) {
  try {
    window.localStorage.setItem(SCENE_BESTS_KEY, JSON.stringify(bests));
  } catch {
    // Storage can be off (private windows): the records then last this visit only.
  }
}

export function createWorld() {
  const state = {
    sceneIndex: 0,
    found: new Set(),
    hinted: null,
    hintEndsAt: 0,
    timeLeft: SCENES[0].time,
    score: 0,
    combo: 0,
    hintsLeft: HINTS_PER_SCENE,
    elapsed: 0,
    cleared: 0,
    totalFinds: 0,
    // Per-scene counters, reset by resetScene: how cleanly this scene is being played.
    hintsUsed: 0,
    misses: 0,
    sceneScore: 0,
    // The last clear, for the overlay: whether it earned the mastery star.
    lastClear: null,
  };

  function scene() {
    return SCENES[state.sceneIndex];
  }

  function resetScene(index) {
    state.sceneIndex = index;
    state.found = new Set();
    state.hinted = null;
    state.hintEndsAt = 0;
    state.timeLeft = scene().time;
    state.hintsLeft = HINTS_PER_SCENE;
    state.hintsUsed = 0;
    state.misses = 0;
    state.sceneScore = 0;
    state.lastClear = null;
  }

  function reset() {
    state.score = 0;
    state.combo = 0;
    state.elapsed = 0;
    state.cleared = 0;
    state.totalFinds = 0;
    resetScene(0);
  }

  /** Advance the clock; returns EVENT_TIMEOUT when the scene's time runs out. */
  function step(dt) {
    state.elapsed += dt;
    state.timeLeft -= dt;
    if (state.hinted !== null && state.elapsed >= state.hintEndsAt) state.hinted = null;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      return EVENT_TIMEOUT;
    }
    return 0;
  }

  /**
   * Record a clear of the current scene: bank its score and time left into the stored
   * per-scene records, and mark mastery when it was cleared with no hints and no misses.
   * Returns the mastery flag for the overlay.
   */
  function recordClear() {
    const current = scene();
    const mastery = state.hintsUsed === 0 && state.misses === 0;
    const bests = readSceneBests();
    const prev = bests[current.id] || {};
    bests[current.id] = {
      bestScore: Math.max(prev.bestScore || 0, state.sceneScore),
      bestTimeLeft: Math.max(prev.bestTimeLeft || 0, Math.round(state.timeLeft)),
      mastery: Boolean(prev.mastery || mastery),
    };
    saveSceneBests(bests);
    state.lastClear = { mastery, sceneScore: state.sceneScore, timeLeft: Math.round(state.timeLeft) };
    return mastery;
  }

  /**
   * Try a click at scene coordinates (x, y) inside one picture. Returns an event mask and,
   * on a find, the difference that was found.
   */
  function click(x, y) {
    const current = scene();
    for (const diff of current.differences) {
      if (state.found.has(diff.id)) continue;
      const dx = x - diff.x;
      const dy = y - diff.y;
      if (dx * dx + dy * dy <= diff.r * diff.r) {
        state.found.add(diff.id);
        state.totalFinds += 1;
        state.combo = Math.min(state.combo + 1, POINTS.maxCombo);
        const gained = POINTS.find + (state.combo - 1) * POINTS.comboStep;
        state.score += gained;
        state.sceneScore += gained;
        state.hinted = null;
        let events = EVENT_FIND;
        if (state.found.size === current.differences.length) {
          const bonus = Math.round(state.timeLeft) * POINTS.timeBonus;
          state.score += bonus;
          state.sceneScore += bonus;
          state.cleared += 1;
          state.combo = 0;
          recordClear();
          events |= EVENT_SCENE_CLEAR;
          if (state.sceneIndex + 1 >= SCENES.length) events |= EVENT_WIN;
        }
        return { events, diff, gained };
      }
    }
    state.combo = 0;
    state.misses += 1;
    state.timeLeft = Math.max(0, state.timeLeft - MISS_PENALTY);
    return { events: state.timeLeft <= 0 ? EVENT_MISS | EVENT_TIMEOUT : EVENT_MISS, diff: null, gained: 0 };
  }

  /** Ring one unfound difference for a while; costs points and a hint. */
  function hint() {
    if (state.hintsLeft <= 0) return null;
    const remaining = scene().differences.filter((d) => !state.found.has(d.id));
    if (remaining.length === 0) return null;
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    state.hintsLeft -= 1;
    state.hintsUsed += 1;
    state.score = Math.max(0, state.score - HINT_COST);
    state.hinted = pick.id;
    state.hintEndsAt = state.elapsed + 2.5;
    return pick;
  }

  function nextScene() {
    resetScene(state.sceneIndex + 1);
  }

  return {
    state,
    scene,
    reset,
    resetScene,
    step,
    click,
    hint,
    nextScene,
    readSceneBests,
  };
}
