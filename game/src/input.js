// Mouse and keyboard. The mouse clicks straight into a picture; the arrow keys steer a
// crosshair for players who prefer the keyboard, and Enter or Space clicks where it stands.
// One-shot presses (confirm, pause, hint, mute) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_HINT = 4;
export const ACTION_MUTE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const HINT = new Set(['KeyH']);
const MUTE = new Set(['KeyM']);

export function createInput(target, getField) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let mouse = { x: 640, y: 320, inside: false };
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (HINT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_HINT;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });
  window.addEventListener('blur', () => {
    left = right = up = down = false;
  });

  function toLogical(event) {
    // Map the pointer into the current logical field. The canvas is letterboxed, never
    // stretched, so the field's aspect always matches the canvas box and this is exact.
    const rect = target.getBoundingClientRect();
    const field = getField();
    return {
      x: ((event.clientX - rect.left) / rect.width) * field.width,
      y: ((event.clientY - rect.top) / rect.height) * field.height,
    };
  }
  target.addEventListener('pointermove', (event) => {
    mouse = { ...toLogical(event), inside: true };
  });
  target.addEventListener('pointerleave', () => {
    mouse.inside = false;
  });
  target.addEventListener('pointerdown', (event) => {
    // Only the primary button (a mouse click, a pen, or a finger tap) counts as a click;
    // a right-click must not cost the player five seconds.
    if (event.button !== 0) return;
    click = toLogical(event);
  });
  // No context menu over the pictures: a right-click is not a find attempt.
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** -1/0/1 on each axis from the held arrow keys. */
    steer() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    mouse() {
      return mouse;
    },
    /** The last pointer click since the last call, in logical 1280x720 coordinates. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
