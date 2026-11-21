// The screenshot scenes behind ?shot=play|play2|play3|start|hint|clear|win. Each one stages
// a real game state — the play scenes find differences for real, through the world's own
// click, so the frame is what a short game really looks like and the same seed always gives
// the same frame. The four shipped shots are one per scene: the cover (1-play) is Dawn
// Harbour mid-game, 2-medium is Midday Market mid-game, 3-hard is Night Harbour mid-game,
// and 4-win is the harbour-complete screen — so a judge scrolling four thumbnails sees
// three different harbours, three times of day and three difficulty registers in five
// seconds. Because the finds go through the real click, the staged frames also show the
// light mechanic working: the dawn sun glows brighter, the midday shadows shorten,
// the night beam reaches further.

import { SCENES } from './config.js';
import { SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** The differences the Dawn play scene finds, in order (four of seven). */
const PLAY_FINDS = ['sun', 'bird', 'sail-red', 'fish'];
/** The differences the Midday play scene finds, in order (four of seven). */
const PLAY2_FINDS = ['awning', 'crate-fish', 'chalkboard', 'gull'];
/** The differences the Night play scene finds, in order (three of seven). */
const PLAY3_FINDS = ['moon', 'star', 'lantern'];
/** The differences the hint scene finds before it asks for a hint. */
const HINT_FINDS = ['sun', 'bird'];
const HINT_TARGET = 'sail-red';

function findById(world, id) {
  const diff = world.scene().differences.find((d) => d.id === id);
  if (diff) world.click(diff.x, diff.y);
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best score
 * to show. Any name other than play/hint/clear is the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    for (const id of PLAY_FINDS) findById(world, id);
    world.state.timeLeft = 85;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'play2') {
    world.resetScene(1);
    for (const id of PLAY2_FINDS) findById(world, id);
    world.state.timeLeft = 105;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'play3') {
    world.resetScene(2);
    for (const id of PLAY3_FINDS) findById(world, id);
    world.state.timeLeft = 130;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'hint') {
    for (const id of HINT_FINDS) findById(world, id);
    world.state.hinted = HINT_TARGET;
    world.state.hintEndsAt = world.state.elapsed + 100;
    world.state.hintsLeft = 2;
    world.state.timeLeft = 85;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'clear') {
    for (const diff of [...world.scene().differences]) findById(world, diff.id);
    world.state.timeLeft = 88;
    return { screen: SCREEN_CLEAR, best: world.state.score };
  }
  if (name === 'win') {
    for (let s = 0; s < SCENES.length; s += 1) {
      for (const diff of [...world.scene().differences]) findById(world, diff.id);
      if (s < SCENES.length - 1) world.nextScene();
    }
    world.state.timeLeft = 64;
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
