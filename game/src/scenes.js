// The harbour itself, drawn in code — no borrowed art. drawScene paints one picture of
// the harbour into a 600x460 panel. `applied` is the set of difference ids whose changed
// version to draw: the left panel draws with an empty set, the right panel with every
// difference of the scene. `time` (seconds) drives the gentle motion (waves, bobbing boats,
// flickering lanterns) so the game feels alive without moving a difference. `light` is the
// number of differences found so far (0..7) and drives the signature mechanic, "The Day
// Moves On": each find advances the scene's light — at dawn the sun's glow climbs and the
// water sparkles more, at night the beam reaches further and the stars brighten, at midday
// the sun's glow grows and the shadows shorten. The light changes brightness and glow,
// never an object's position, so every difference stays exactly where config.js says it is.

import { PANEL } from './config.js';

const W = PANEL.width;
const H = PANEL.height;

const SAND = '#e8c98f';
const WOOD = '#8a6a42';
const WOOD_DARK = '#5d4526';
const ROPE = '#6a5a3a';

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function star(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function gear(ctx, x, y, r, teeth, color, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  for (let i = 0; i < teeth; i += 1) {
    const a = (i / teeth) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(-3, -r - 5, 6, 10);
    ctx.restore();
  }
  circle(ctx, 0, 0, r);
  ctx.fillStyle = '#2a2118';
  circle(ctx, 0, 0, r * 0.32);
  ctx.restore();
}

// A soft cloud: three overlapping ellipses, white with a warm edge at dawn.
function cloud(ctx, x, y, s, color = '#fff3e0') {
  ctx.fillStyle = color;
  ellipse(ctx, x, y, 42 * s, 13 * s);
  ellipse(ctx, x - 26 * s, y + 5 * s, 26 * s, 10 * s);
  ellipse(ctx, x + 26 * s, y + 5 * s, 26 * s, 10 * s);
}

// A bird in flight: two curved wing strokes. `s` scales it; a gull is the same shape
// in white and a little larger.
function birdShape(ctx, x, y, s, color = '#2a2118') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y);
  ctx.quadraticCurveTo(x - 5 * s, y - 8 * s, x, y);
  ctx.quadraticCurveTo(x + 5 * s, y - 8 * s, x + 12 * s, y);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// A little fish, head left, tail right. `s` scales it.
function fishShape(ctx, x, y, s, color = '#7a9ab0') {
  ctx.fillStyle = color;
  ellipse(ctx, x, y, 14 * s, 6 * s);
  ctx.beginPath();
  ctx.moveTo(x + 12 * s, y);
  ctx.lineTo(x + 22 * s, y - 7 * s);
  ctx.lineTo(x + 22 * s, y + 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1d2a18';
  circle(ctx, x - 8 * s, y - 1 * s, 1.5 * s);
}

// A house on the far shore: `x` is its centre, `y` its base. Body 46 wide, roof a
// triangle above it, a door and one window so it reads as a house, not a block.
function house(ctx, x, y, roofColor) {
  ctx.fillStyle = '#f5ead6';
  ctx.fillRect(x - 23, y - 22, 46, 22);
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - 27, y - 22);
  ctx.lineTo(x, y - 40);
  ctx.lineTo(x + 27, y - 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5d4526';
  ctx.fillRect(x - 5, y - 13, 10, 13);
  ctx.fillStyle = '#3a6ea6';
  ctx.fillRect(x + 10, y - 17, 8, 8);
  ctx.fillStyle = '#3a6ea6';
  ctx.fillRect(x - 18, y - 17, 8, 8);
}

// A sailboat on the water: `x, y` is the waterline under the hull, `s` its scale.
// The sail is one big triangle off the mast, so a red sail reads instantly.
function sailboat(ctx, x, y, sailColor, s = 1) {
  ctx.fillStyle = '#6b3a2a';
  ctx.beginPath();
  ctx.moveTo(x - 26 * s, y);
  ctx.lineTo(x + 26 * s, y);
  ctx.lineTo(x + 18 * s, y + 10 * s);
  ctx.lineTo(x - 18 * s, y + 10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4a2c1c';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 52 * s);
  ctx.stroke();
  ctx.fillStyle = sailColor;
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 50 * s);
  ctx.lineTo(x + 2, y - 4 * s);
  ctx.lineTo(x + 26 * s, y - 4 * s);
  ctx.closePath();
  ctx.fill();
  // A small jib on the other side of the mast.
  ctx.fillStyle = '#f5ead6';
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 44 * s);
  ctx.lineTo(x - 2, y - 4 * s);
  ctx.lineTo(x - 18 * s, y - 4 * s);
  ctx.closePath();
  ctx.fill();
}

// A lighthouse: `x` is its centre, `top` the gallery floor, `bottom` its base.
// Red bands over white, a lamp room on top; `lampOn` decides whether the glass glows.
// Returns the lamp bulb's centre so the caller can draw the glow around it.
function lighthouse(ctx, x, top, bottom, lampOn, bandColor = '#b0392e') {
  const w = 34;
  const h = bottom - top;
  // Tower, white with two red bands.
  ctx.fillStyle = '#efe6d2';
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.fillStyle = bandColor;
  ctx.fillRect(x - w / 2, top + h * 0.30, w, h * 0.16);
  ctx.fillRect(x - w / 2, top + h * 0.62, w, h * 0.16);
  ctx.strokeStyle = '#8a5f2e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, top, w, h);
  // Gallery platform and lamp room.
  ctx.fillStyle = '#3d4450';
  ctx.fillRect(x - w / 2 - 6, top - 6, w + 12, 6);
  const lampY = top - 18;
  ctx.fillStyle = '#2a2f38';
  ctx.fillRect(x - 11, top - 30, 22, 24);
  if (lampOn) {
    ctx.fillStyle = '#ffdf6b';
    circle(ctx, x, lampY, 7);
  } else {
    ctx.fillStyle = '#4a4a52';
    circle(ctx, x, lampY, 7);
  }
  // Little roof cone on the lamp room.
  ctx.fillStyle = '#b0392e';
  ctx.beginPath();
  ctx.moveTo(x - 13, top - 30);
  ctx.lineTo(x, top - 40);
  ctx.lineTo(x + 13, top - 30);
  ctx.closePath();
  ctx.fill();
  return { x, y: lampY };
}

// A wooden crate, `x, y` its centre, with cross planks so it reads as a crate.
function crateBox(ctx, x, y, w = 40, h = 30) {
  ctx.fillStyle = WOOD;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h / 2);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.moveTo(x + w / 2, y - h / 2);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.stroke();
}

// A barrel standing on the quay, `x, y` its centre.
function barrelShape(ctx, x, y) {
  ctx.fillStyle = WOOD;
  roundRect(ctx, x - 18, y - 22, 36, 44, 8);
  ctx.strokeStyle = '#3d4450';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 10);
  ctx.lineTo(x + 18, y - 10);
  ctx.moveTo(x - 18, y + 10);
  ctx.lineTo(x + 18, y + 10);
  ctx.stroke();
}

// A lantern post on the quay: post from `baseY` up, lamp head at the top. `on` decides
// whether the bulb glows. Returns the bulb centre.
function lanternPost(ctx, x, baseY, on, time) {
  const topY = baseY - 62;
  ctx.strokeStyle = '#1d2a18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, topY);
  ctx.stroke();
  ctx.fillStyle = '#1d2a18';
  ctx.fillRect(x - 3, baseY - 2, 6, 4);
  ctx.fillStyle = '#2a2f38';
  ctx.fillRect(x - 8, topY - 12, 16, 14);
  if (on) {
    const flicker = 0.8 + Math.sin(time * 3 + x) * 0.06;
    const glow = ctx.createRadialGradient(x, topY - 5, 2, x, topY - 5, 42);
    glow.addColorStop(0, `rgba(255, 215, 107, ${0.35 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 215, 107, 0)');
    ctx.fillStyle = glow;
    circle(ctx, x, topY - 5, 42);
    ctx.fillStyle = '#ffd76b';
    circle(ctx, x, topY - 5, 6);
  } else {
    ctx.fillStyle = '#4a4a52';
    circle(ctx, x, topY - 5, 6);
  }
  return { x, y: topY - 5 };
}

// One market stall: `x` is its left edge, `w` its width. Two posts, a striped awning
// (canvas + `awningColor`), a counter with goods. The awning stripes are what the
// awning difference changes.
function stall(ctx, x, w, awningColor, goods) {
  const top = 255;
  const counterTop = 352;
  // Posts.
  ctx.fillStyle = WOOD_DARK;
  ctx.fillRect(x + 6, top + 34, 6, counterTop - top - 30);
  ctx.fillRect(x + w - 12, top + 34, 6, counterTop - top - 30);
  // Striped awning: a trapezoid with alternating stripes.
  const stripes = 6;
  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? awningColor : '#f5ead6';
    const sx0 = x + (i / stripes) * w;
    const sx1 = x + ((i + 1) / stripes) * w;
    ctx.beginPath();
    ctx.moveTo(sx0, top);
    ctx.lineTo(sx1, top);
    ctx.lineTo(sx1 - 8, top + 34);
    ctx.lineTo(sx0 - 8, top + 34);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8, top + 34);
  ctx.lineTo(x + w - 8, top + 34);
  ctx.stroke();
  // Counter.
  ctx.fillStyle = WOOD;
  ctx.fillRect(x, counterTop, w, 48);
  ctx.fillStyle = WOOD_DARK;
  ctx.fillRect(x, counterTop, w, 6);
  // Goods on the counter, drawn by the caller.
  if (goods) goods(x, w, counterTop);
}

// A hanging fishing net: a diamond mesh in a w x h patch, `x, y` its centre.
function netShape(ctx, x, y, w, h) {
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = 1.5;
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + (i * h) / 6);
    ctx.lineTo(x + w / 2, y - (i * h) / 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - (i * h) / 6);
    ctx.lineTo(x + w / 2, y + (i * h) / 6);
    ctx.stroke();
  }
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
}

// A wavy white line on the water, `y` its height, `phase` its offset.
function waveLine(ctx, y, phase, alpha = 0.5) {
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  for (let x = 0; x <= W; x += 60) {
    ctx.quadraticCurveTo(x + 30, y + Math.sin(x / 60 + phase) * 4, x + 60, y);
  }
  ctx.stroke();
}

function vignette(ctx, strength) {
  const vig = ctx.createRadialGradient(300, 230, 180, 300, 230, 420);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------------------
// Scene 1 — Dawn Harbour. Warm orange sky, the sun low, blue water, a sandy beach
// in front, a red/white lighthouse on rocks at the left, three little houses on the
// far shore, two sailboats. The light mechanic: the sun's glow grows and the water
// sparkles more with every find.
// ---------------------------------------------------------------------------
function drawDawn(ctx, applied, time, light) {
  const has = (id) => applied.has(id);
  // Sky: warm orange at the top fading to pale peach at the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, 205);
  sky.addColorStop(0, '#f9a85c');
  sky.addColorStop(1, '#fcd9a8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 205);

  // The sun, low in the sky, with a glow that grows as the day moves on.
  const glowR = 44 + light * 7;
  const glow = ctx.createRadialGradient(478, 92, 8, 478, 92, glowR);
  glow.addColorStop(0, `rgba(255, 223, 107, ${0.45 + light * 0.03})`);
  glow.addColorStop(1, 'rgba(255, 223, 107, 0)');
  ctx.fillStyle = glow;
  circle(ctx, 478, 92, glowR);
  ctx.fillStyle = '#ffdf6b';
  circle(ctx, 478, 92, 30);
  ctx.fillStyle = '#fff3c4';
  circle(ctx, 478, 92, 20);
  // Changed version: a cloud drifts over the sun and hides its lower half.
  if (has('sun')) {
    cloud(ctx, 478, 112, 1.1, '#fff3e0');
  }

  // Clouds: two decorative ones, and the difference cloud at (300, 60).
  cloud(ctx, 140, 62, 0.9);
  if (!has('cloud')) cloud(ctx, 300, 60, 1.0);
  cloud(ctx, 380, 140, 0.7);

  // Birds: the difference bird at (150, 78), two more that never change.
  if (!has('bird')) birdShape(ctx, 150, 78, 1.0);
  birdShape(ctx, 215, 52, 0.8);
  birdShape(ctx, 90, 122, 0.7);

  // The sea, with wave lines and sparkles that multiply as the light grows.
  ctx.fillStyle = '#3a7ca8';
  ctx.fillRect(0, 205, W, 120);
  ctx.fillStyle = '#2a6a96';
  ctx.fillRect(0, 205, W, 4);
  waveLine(ctx, 232, time * 0.4, 0.45);
  waveLine(ctx, 262, time * 0.4 + 2, 0.35);
  waveLine(ctx, 292, time * 0.4 + 4, 0.3);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  const sparkles = [[120, 240], [260, 280], [380, 250], [520, 300], [80, 300], [440, 230], [200, 310], [340, 300], [560, 250], [40, 260], [300, 320], [480, 270], [160, 270], [420, 310]];
  for (let i = 0; i < 4 + light * 2 && i < sparkles.length; i += 1) {
    const [sx, sy] = sparkles[i];
    ctx.fillRect(sx, sy, 10, 2);
  }

  // Three little houses on the far shore. The middle roof is red — or blue, changed.
  house(ctx, 250, 208, '#e8a13a');
  house(ctx, 330, 208, has('roof-blue') ? '#3a6ea6' : '#c0392b');
  house(ctx, 410, 208, '#4a8c5d');

  // The lighthouse on its rocks, at the left.
  ctx.fillStyle = '#5d5a52';
  ellipse(ctx, 78, 330, 58, 16);
  ellipse(ctx, 30, 338, 26, 10);
  ellipse(ctx, 122, 340, 24, 9);
  const lamp = lighthouse(ctx, 75, 150, 322, !has('lamp'));
  if (!has('lamp')) {
    const lg = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 56);
    lg.addColorStop(0, 'rgba(255, 223, 107, 0.35)');
    lg.addColorStop(1, 'rgba(255, 223, 107, 0)');
    ctx.fillStyle = lg;
    circle(ctx, lamp.x, lamp.y, 56);
  }

  // Two sailboats, bobbing gently. The near one's sail is white — or red, changed.
  ctx.save();
  ctx.translate(0, Math.sin(time * 0.8) * 2);
  sailboat(ctx, 190, 262, has('sail-red') ? '#c0392b' : '#f5ead6', 1.0);
  ctx.restore();
  ctx.save();
  ctx.translate(0, Math.sin(time * 0.8 + 2) * 2);
  sailboat(ctx, 470, 288, '#f5ead6', 0.75);
  ctx.restore();

  // The sandy beach in front, with rocks, a bucket, and the fish on the sand.
  ctx.fillStyle = SAND;
  ctx.fillRect(0, 325, W, 135);
  ctx.fillStyle = '#d9b878';
  ctx.fillRect(0, 325, W, 4);
  ctx.fillStyle = '#c9a86a';
  for (const [sx, sy] of [[200, 360], [260, 440], [360, 380], [40, 400], [580, 360]]) circle(ctx, sx, sy, 2);
  // Rocks.
  ctx.fillStyle = '#8a8578';
  ellipse(ctx, 90, 422, 26, 12);
  ellipse(ctx, 120, 430, 16, 8);
  // A red bucket.
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(420, 402);
  ctx.lineTo(444, 402);
  ctx.lineTo(440, 428);
  ctx.lineTo(424, 428);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5d4526';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(432, 402, 10, Math.PI, 0);
  ctx.stroke();
  // The fish on the sand — or an empty patch of sand where it was.
  if (!has('fish')) fishShape(ctx, 520, 405, 1.2);

  vignette(ctx, 0.08);
}

// ---------------------------------------------------------------------------
// Scene 3 — Night Harbour. Dark navy sky, a crescent moon, stars, lantern posts
// glowing on the quay, fishing boats with lit cabin windows, the lighthouse beam
// sweeping the water, a cat on the quay. The light mechanic: the beam reaches
// further and the stars brighten with every find.
// ---------------------------------------------------------------------------
function drawNight(ctx, applied, time, light) {
  const has = (id) => applied.has(id);
  // Sky: dark navy, deeper at the top.
  const sky = ctx.createLinearGradient(0, 0, 0, 195);
  sky.addColorStop(0, '#0b1730');
  sky.addColorStop(1, '#1d3355');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 195);

  // Stars, brightening as the night's light grows. The bright star at (150, 58)
  // is a difference: it is simply gone in the changed picture.
  const starAlpha = Math.min(1, 0.35 + light * 0.09);
  const stars = [[60, 40], [220, 30], [340, 90], [420, 40], [540, 130], [80, 130], [260, 120], [560, 60], [180, 150], [380, 160], [40, 90], [300, 40], [460, 170], [120, 170]];
  for (const [sx, sy] of stars) star(ctx, sx, sy, 3, `rgba(245, 234, 214, ${starAlpha})`);
  if (!has('star')) star(ctx, 150, 58, 7, `rgba(255, 240, 180, ${Math.min(1, starAlpha + 0.3)})`);

  // The moon: a crescent — or full, changed. Its glow grows with the light.
  const mg = ctx.createRadialGradient(478, 78, 6, 478, 78, 42 + light * 5);
  mg.addColorStop(0, `rgba(242, 234, 208, ${0.30 + light * 0.03})`);
  mg.addColorStop(1, 'rgba(242, 234, 208, 0)');
  ctx.fillStyle = mg;
  circle(ctx, 478, 78, 42 + light * 5);
  ctx.fillStyle = '#f2ead0';
  circle(ctx, 478, 78, 24);
  if (!has('moon')) {
    // Bite a crescent out of the disc with a sky-coloured circle.
    ctx.fillStyle = '#12233f';
    circle(ctx, 488, 72, 21);
  }

  // The sea, with a moonlit shimmer under the moon.
  ctx.fillStyle = '#142c46';
  ctx.fillRect(0, 195, W, 120);
  ctx.fillStyle = `rgba(242, 234, 208, ${0.10 + light * 0.015})`;
  ctx.fillRect(448, 195, 60, 120);
  waveLine(ctx, 225, time * 0.3, 0.25);
  waveLine(ctx, 260, time * 0.3 + 2, 0.2);
  waveLine(ctx, 295, time * 0.3 + 4, 0.18);

  // Fishing boats with lit cabin windows. The near boat's window is the difference:
  // lit warm yellow, or dark when changed.
  function fishingBoat(bx, by, windowLit) {
    ctx.save();
    ctx.translate(0, Math.sin(time * 0.7 + bx) * 2);
    ctx.fillStyle = '#3a2c1c';
    ctx.beginPath();
    ctx.moveTo(bx - 34, by);
    ctx.lineTo(bx + 34, by);
    ctx.lineTo(bx + 26, by + 12);
    ctx.lineTo(bx - 26, by + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d4526';
    ctx.fillRect(bx - 14, by - 20, 28, 20);
    if (windowLit) {
      ctx.fillStyle = '#ffd76b';
      ctx.fillRect(bx - 8, by - 15, 10, 10);
      const wg = ctx.createRadialGradient(bx - 3, by - 10, 2, bx - 3, by - 10, 26);
      wg.addColorStop(0, 'rgba(255, 215, 107, 0.30)');
      wg.addColorStop(1, 'rgba(255, 215, 107, 0)');
      ctx.fillStyle = wg;
      circle(ctx, bx - 3, by - 10, 26);
    } else {
      ctx.fillStyle = '#2a3442';
      ctx.fillRect(bx - 8, by - 15, 10, 10);
    }
    ctx.strokeStyle = '#2a2118';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 10, by - 20);
    ctx.lineTo(bx + 10, by - 44);
    ctx.stroke();
    ctx.restore();
  }
  fishingBoat(170, 262, !has('cabin-window'));
  fishingBoat(360, 282, true);

  // The lighthouse on its rocks, at the right, and its beam.
  ctx.fillStyle = '#3a3f4a';
  ellipse(ctx, 525, 322, 58, 16);
  ellipse(ctx, 478, 332, 24, 9);
  ellipse(ctx, 572, 334, 22, 9);
  const lamp = lighthouse(ctx, 525, 120, 315, true, '#8a2a22');
  // The beam: a wedge of light. It points left — or right, changed — and it reaches
  // further with every find.
  const beamLen = 280 + light * 14;
  const beam = ctx.createLinearGradient(lamp.x, lamp.y, lamp.x - beamLen, lamp.y + 40);
  beam.addColorStop(0, 'rgba(255, 240, 180, 0.22)');
  beam.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(lamp.x, lamp.y);
  if (has('beam')) {
    ctx.lineTo(600, lamp.y - 6);
    ctx.lineTo(600, lamp.y + 42);
  } else {
    ctx.lineTo(lamp.x - beamLen, lamp.y + 12);
    ctx.lineTo(lamp.x - beamLen, lamp.y + 62);
  }
  ctx.closePath();
  ctx.fill();
  // The lamp's own glow.
  const lg = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 46);
  lg.addColorStop(0, 'rgba(255, 240, 180, 0.35)');
  lg.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = lg;
  circle(ctx, lamp.x, lamp.y, 46);

  // The stone quay.
  ctx.fillStyle = '#232833';
  ctx.fillRect(0, 315, W, 145);
  ctx.fillStyle = '#3a4356';
  ctx.fillRect(0, 315, W, 4);
  ctx.strokeStyle = '#171c26';
  ctx.lineWidth = 2;
  for (const sy of [360, 405]) {
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(W, sy);
    ctx.stroke();
  }

  // Lantern posts along the quay. The middle one's lamp is the difference.
  lanternPost(ctx, 120, 392, true, time);
  lanternPost(ctx, 300, 392, !has('lantern'), time);
  lanternPost(ctx, 470, 392, true, time);

  // A gull on a post at the left — or just the post, changed.
  ctx.strokeStyle = '#1d2a18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(90, 392);
  ctx.lineTo(90, 300);
  ctx.stroke();
  if (!has('gull-post')) {
    ctx.fillStyle = '#e8e4da';
    ellipse(ctx, 90, 292, 12, 7);
    circle(ctx, 96, 286, 5);
    ctx.fillStyle = '#e8a13a';
    ctx.beginPath();
    ctx.moveTo(100, 285);
    ctx.lineTo(106, 287);
    ctx.lineTo(100, 289);
    ctx.closePath();
    ctx.fill();
  }

  // A stack of crates — or an empty patch of quay where it was.
  if (!has('crate')) {
    crateBox(ctx, 420, 412, 44, 32);
    crateBox(ctx, 414, 382, 36, 26);
  }

  // The quay cat, sitting in the dark with bright eyes.
  ctx.fillStyle = '#14181f';
  ellipse(ctx, 250, 420, 20, 12);
  circle(ctx, 250, 402, 10);
  ctx.beginPath();
  ctx.moveTo(242, 394);
  ctx.lineTo(240, 384);
  ctx.lineTo(247, 392);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(254, 392);
  ctx.lineTo(256, 382);
  ctx.lineTo(260, 393);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd76b';
  circle(ctx, 246, 401, 1.8);
  circle(ctx, 254, 401, 1.8);

  // A coiled net and a capstan wheel on the quay.
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = 2;
  for (const r of [8, 14, 20]) {
    ctx.beginPath();
    ctx.arc(545, 425, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  gear(ctx, 60, 428, 12, 6, '#3d4450', time * 0.2);

  vignette(ctx, 0.22);
}

// ---------------------------------------------------------------------------
// Scene 2 — Midday Market. Bright blue sky, the sun high, a turquoise strip of
// sea, and the fish market on the quay: three stalls with striped awnings, crates
// of fish, barrels, nets, a chalkboard, a bicycle, gulls. The light mechanic: the
// sun's glow grows and the shadows under the stalls shorten with every find.
// ---------------------------------------------------------------------------
function drawMarket(ctx, applied, time, light) {
  const has = (id) => applied.has(id);
  // Sky: bright blue, pale at the horizon. The sun is high, its glow growing.
  const sky = ctx.createLinearGradient(0, 0, 0, 165);
  sky.addColorStop(0, '#57a8e6');
  sky.addColorStop(1, '#bfe6f7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 165);
  const sg = ctx.createRadialGradient(520, 58, 8, 520, 58, 40 + light * 6);
  sg.addColorStop(0, `rgba(255, 240, 180, ${0.45 + light * 0.03})`);
  sg.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = sg;
  circle(ctx, 520, 58, 40 + light * 6);
  ctx.fillStyle = '#ffdf6b';
  circle(ctx, 520, 58, 26);
  ctx.fillStyle = '#fff3c4';
  circle(ctx, 520, 58, 17);

  // Gulls: the difference gull at (400, 90), two more that never change.
  birdShape(ctx, 200, 70, 0.9, '#f5ead6');
  if (!has('gull')) birdShape(ctx, 400, 90, 1.0, '#f5ead6');
  birdShape(ctx, 120, 112, 0.8, '#f5ead6');

  // A turquoise strip of sea behind the quay.
  ctx.fillStyle = '#2fb3a8';
  ctx.fillRect(0, 165, W, 60);
  ctx.fillStyle = '#28a297';
  ctx.fillRect(0, 165, W, 4);
  waveLine(ctx, 188, time * 0.5, 0.4);
  waveLine(ctx, 208, time * 0.5 + 2, 0.3);

  // The stone quay.
  ctx.fillStyle = '#d9c9a3';
  ctx.fillRect(0, 225, W, 235);
  ctx.strokeStyle = '#b8a67e';
  ctx.lineWidth = 2;
  for (const sy of [280, 340, 400]) {
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(W, sy);
    ctx.stroke();
  }

  // Shadows under the stalls, shortening as the sun climbs with every find.
  const shadowLen = 22 - light * 2;
  ctx.fillStyle = 'rgba(90, 70, 40, 0.25)';
  for (const sx of [120, 290, 480]) ellipse(ctx, sx, 404 + shadowLen, 72, 8);

  // The three stalls. The middle awning is red-striped — or blue, changed.
  stall(ctx, 60, 120, '#4a8c5d', (x, w, top) => {
    // Fish on ice on the counter.
    ctx.fillStyle = '#cfe8ef';
    roundRect(ctx, x + 12, top + 12, w - 24, 22, 4);
    fishShape(ctx, x + 34, top + 23, 0.8, '#7a9ab0');
    fishShape(ctx, x + 66, top + 23, 0.8, '#c0392b');
    fishShape(ctx, x + 94, top + 23, 0.8, '#7a9ab0');
  });
  // A net hangs on the first stall's right post — or the post stands bare, changed.
  if (!has('net')) netShape(ctx, 140, 330, 44, 40);
  stall(ctx, 230, 120, has('awning') ? '#3a6ea6' : '#c0392b', (x, w, top) => {
    // Crates of catch on the counter.
    crateBox(ctx, x + 30, top + 22, 34, 24);
    crateBox(ctx, x + 82, top + 22, 34, 24);
    fishShape(ctx, x + 30, top + 6, 0.7);
    fishShape(ctx, x + 82, top + 6, 0.7);
  });
  stall(ctx, 420, 120, '#e8a13a', (x, w, top) => {
    // Baskets on the counter.
    ctx.fillStyle = '#a8763e';
    ctx.beginPath();
    ctx.moveTo(x + 16, top + 12);
    ctx.lineTo(x + 48, top + 12);
    ctx.lineTo(x + 44, top + 34);
    ctx.lineTo(x + 20, top + 34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 68, top + 12);
    ctx.lineTo(x + 100, top + 12);
    ctx.lineTo(x + 96, top + 34);
    ctx.lineTo(x + 72, top + 34);
    ctx.closePath();
    ctx.fill();
    fishShape(ctx, x + 32, top + 6, 0.7);
    fishShape(ctx, x + 84, top + 6, 0.7);
  });
  // A flag on the third stall's pole — or just the pole, changed.
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(480, 255);
  ctx.lineTo(480, 222);
  ctx.stroke();
  if (!has('flag')) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(480, 222);
    ctx.lineTo(508, 229);
    ctx.lineTo(480, 237);
    ctx.closePath();
    ctx.fill();
  }

  // The chalkboard, leaning between the stalls: FISH 5 — or FISH 9, changed.
  ctx.fillStyle = WOOD_DARK;
  roundRect(ctx, 344, 330, 52, 44, 4);
  ctx.fillStyle = '#2a2f38';
  ctx.fillRect(348, 334, 44, 36);
  ctx.fillStyle = '#f5ead6';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FISH', 370, 346);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(has('chalkboard') ? '9' : '5', 370, 364);
  ctx.textAlign = 'left';

  // A crate of fish on the quay — or an empty crate, changed.
  crateBox(ctx, 150, 424, 54, 30);
  if (!has('crate-fish')) {
    fishShape(ctx, 132, 404, 0.9);
    fishShape(ctx, 152, 402, 0.9, '#c0392b');
    fishShape(ctx, 170, 405, 0.9);
  }

  // A barrel on the quay — or an empty patch of stone where it was.
  if (!has('barrel')) barrelShape(ctx, 490, 418);

  // A bicycle leaning by the first stall.
  ctx.strokeStyle = '#2a2f38';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(56, 428, 13, 0, Math.PI * 2);
  ctx.arc(104, 428, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(56, 428);
  ctx.lineTo(80, 404);
  ctx.lineTo(104, 428);
  ctx.moveTo(80, 404);
  ctx.lineTo(74, 392);
  ctx.moveTo(80, 404);
  ctx.lineTo(96, 404);
  ctx.stroke();

  vignette(ctx, 0.08);
}

/**
 * Paint one picture. `scene` is the scene definition from config.js, `applied` the set of
 * difference ids drawn in their changed form, `time` the seconds for gentle motion, and
 * `light` the number of differences found so far (0..7) — the day moving on.
 * The picture is 600x460; the caller translates it into a panel.
 */
export function drawScene(ctx, scene, applied, time, light = 0) {
  if (scene.id === 'dawn-harbour') drawDawn(ctx, applied, time, light);
  else if (scene.id === 'night-harbour') drawNight(ctx, applied, time, light);
  else drawMarket(ctx, applied, time, light);
}
