// Every tuning number, colour and scene definition in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule depends on the
// screen size. Each scene is one picture of the harbour at a different time of day — dawn,
// midday, night — and the right-hand panel draws the same picture with every one of its
// differences applied, the left-hand panel with none. A difference is fair when a careful
// look finds it and a careless one does not.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/**
 * One picture panel (each side of the pair). The scene draws inside it. The panels sit
 * lower than in v1 so their labels fit ABOVE them: HUD 0–64, labels at y 88, panels
 * 96–556, the "Found:" dots row at y 566, bottom bar 576–720.
 */
export const PANEL = { width: 600, height: 460, top: 96 };
export const PANEL_LEFT = { x: 20, y: PANEL.top };
export const PANEL_RIGHT = { x: 660, y: PANEL.top };

/**
 * The two playfield layouts. Wide (1280x720) puts the pictures side by side; stacked
 * (680x1180) puts them one above the other, for phones in portrait, where a side-by-side
 * picture would shrink under ~300 CSS px and be unplayable. The pictures themselves stay
 * 600x460 in both layouts, so the world logic never changes — only where they sit.
 * Stacked geometry: HUD 0–80, top label 102, top picture 110–570, dots row 592, bottom
 * label 614, bottom picture 622–1082, bottom bar 1088–1180.
 */
export const FIELD_STACKED = { width: 680, height: 1180 };
export const PANEL_STACKED_TOP = { x: 40, y: 110 };
export const PANEL_STACKED_BOTTOM = { x: 40, y: 622 };

export const LAYOUTS = {
  wide: {
    mode: 'wide',
    field: FIELD,
    panels: [
      { x: PANEL_LEFT.x, y: PANEL_LEFT.y, w: PANEL.width, h: PANEL.height },
      { x: PANEL_RIGHT.x, y: PANEL_RIGHT.y, w: PANEL.width, h: PANEL.height },
    ],
    hudHeight: 64,
    dotsY: 568,
    bottomBar: { y: 576, height: 144 },
    titleOffsetY: 0,
  },
  stacked: {
    mode: 'stacked',
    field: FIELD_STACKED,
    panels: [
      { x: PANEL_STACKED_TOP.x, y: PANEL_STACKED_TOP.y, w: PANEL.width, h: PANEL.height },
      { x: PANEL_STACKED_BOTTOM.x, y: PANEL_STACKED_BOTTOM.y, w: PANEL.width, h: PANEL.height },
    ],
    hudHeight: 80,
    dotsY: 592,
    bottomBar: { y: 1088, height: 92 },
    titleOffsetY: 230,
  },
};

/**
 * Pick the layout for a window of (vw, vh) CSS pixels. Wide wins while each picture
 * would still be at least 300 CSS px across; below that the pictures stack. At 1024x768
 * the wide scale is 0.8, so each picture is 480px — wide. At 390x844 the wide scale is
 * 0.30, so each picture would be 183px — stacked, where each is 344px.
 */
export function chooseLayout(vw, vh) {
  const wideScale = Math.min(vw / FIELD.width, vh / FIELD.height);
  if (PANEL.width * wideScale >= 300) return 'wide';
  return 'stacked';
}

/** A miss costs five seconds — and, since v2, a shake, a red flash and a "-5s" that floats up. */
export const MISS_PENALTY = 5;

/** Hints per scene; a hint costs points and briefly rings one unfound difference. */
export const HINTS_PER_SCENE = 3;
export const HINT_COST = 50;
export const HINT_SECONDS = 2.5;

/** Points: a find, a time bonus per second left when a scene is cleared, and a combo. */
export const POINTS = { find: 100, timeBonus: 2, comboStep: 25, maxCombo: 4 };

/** Warm harbour palette: deep navy backdrop, warm sand/cream text, coral accent. */
export const PALETTE = {
  backdrop: '#0d1b2a',
  hud: '#14273a',
  hudLine: '#2c4a66',
  panelFrame: '#d9a05b',
  panelFrameDark: '#8a5f2e',
  text: '#f7ead0',
  muted: '#cbb98f',
  accent: '#ff8c5a',
  good: '#7bc96f',
  bad: '#e5534b',
  marker: '#ffcf3d',
  markerRing: '#fff3c4',
  timerLow: '#ff7a5c',
  button: '#1d3a52',
  buttonLine: '#d9a05b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'harbour-and-light.best';
/** Per-scene bests and mastery marks, as one JSON object keyed by scene id. */
export const SCENE_BESTS_KEY = 'harbour-and-light.scenes';

/**
 * The three scenes — one continuous day: dawn, midday, night. Each scene is a genuinely
 * different drawing (different sky, water, quay and props), not a palette swap, and each
 * has its own clock: the easy dawn is the shortest, the hard night the longest. Each
 * difference: an id, a name (shown when found), the spot in the 600x460 picture where it
 * lives, and the radius a click must fall inside. The picture's draw code in scenes.js
 * reads these ids and changes what it draws when one is applied. `transition` is the line
 * the scene-clear overlay shows as the day moves on.
 */
export const SCENES = [
  {
    id: 'dawn-harbour',
    name: 'Dawn Harbour',
    subtitle: 'The sun is up over the quay — seven things are not where they were.',
    difficulty: 'Easy',
    time: 120,
    transition: 'The day moves on — dawn gives way to midday.',
    differences: [
      { id: 'sun', name: 'The sun', x: 478, y: 92, r: 30 },
      { id: 'bird', name: 'A morning bird', x: 150, y: 78, r: 26 },
      { id: 'sail-red', name: 'The red sail', x: 190, y: 245, r: 28 },
      { id: 'roof-blue', name: 'A blue roof', x: 330, y: 192, r: 26 },
      { id: 'lamp', name: 'The lighthouse lamp', x: 75, y: 146, r: 26 },
      { id: 'cloud', name: 'A dawn cloud', x: 300, y: 60, r: 28 },
      { id: 'fish', name: 'The fish on the sand', x: 520, y: 405, r: 26 },
    ],
  },
  {
    id: 'midday-market',
    name: 'Midday Market',
    subtitle: 'The fish market is in full cry — seven things changed under the noon sun.',
    difficulty: 'Medium',
    time: 150,
    transition: 'Midday fades to night — the lanterns are lit.',
    differences: [
      { id: 'awning', name: 'A stall awning', x: 290, y: 272, r: 28 },
      { id: 'crate-fish', name: 'The fish in the crate', x: 150, y: 422, r: 26 },
      { id: 'barrel', name: 'A barrel', x: 490, y: 418, r: 26 },
      { id: 'gull', name: 'A market gull', x: 400, y: 90, r: 24 },
      { id: 'chalkboard', name: 'The chalkboard price', x: 370, y: 352, r: 26 },
      { id: 'net', name: 'A hanging net', x: 140, y: 330, r: 26 },
      { id: 'flag', name: 'A stall flag', x: 480, y: 238, r: 24 },
    ],
  },
  {
    id: 'night-harbour',
    name: 'Night Harbour',
    subtitle: 'Lanterns on the quay, a beam across the water — seven things changed after dark.',
    difficulty: 'Hard',
    time: 180,
    transition: 'One day, three harbours — the light is yours.',
    differences: [
      { id: 'moon', name: 'The moon', x: 478, y: 78, r: 26 },
      { id: 'star', name: 'A bright star', x: 150, y: 58, r: 22 },
      { id: 'lantern', name: 'A quay lantern', x: 300, y: 338, r: 26 },
      { id: 'cabin-window', name: 'A cabin window', x: 170, y: 246, r: 24 },
      { id: 'beam', name: 'The lighthouse beam', x: 385, y: 145, r: 30 },
      { id: 'crate', name: 'A stack of crates', x: 420, y: 402, r: 28 },
      { id: 'gull-post', name: 'The gull on the post', x: 90, y: 292, r: 24 },
    ],
  },
];
