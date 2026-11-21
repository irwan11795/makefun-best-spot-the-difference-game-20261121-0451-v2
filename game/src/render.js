// Everything the player sees. The renderer paints one logical field and scales it to the
// window, letterboxed so circles stay circles — the canvas keeps the field's aspect ratio
// and sits centred, never stretched. Two layouts: wide (1280x720, the two pictures side by
// side) and stacked (680x1180, the pictures one above the other, used when a side-by-side
// picture would shrink under ~300 CSS px, i.e. phones in portrait). The pictures themselves
// stay 600x460 in both layouts, so the world logic never changes — only where they sit.
// Screens: title, play, paused, scene clear, game over, win.
//
// The labels sit ABOVE each picture ("LEFT — original" / "RIGHT — spot the changes"), the
// HUD's centre is a big "N to find" with the streak next to the score, and a "Found:" row
// of seven dots sits under the pictures: green filled for found, grey outline for not.
// A miss shakes the field, flashes red, and floats a "-5s" up from the timer.

import { FONT, LAYOUTS, PALETTE, SCENES, chooseLayout } from './config.js';
import { drawScene } from './scenes.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_CLEAR = 3;
export const SCREEN_OVER = 4;
export const SCREEN_WIN = 5;

/** The clickable Pause button in the bottom bar (wide layout); the stacked one is below. */
const PAUSE_BUTTON_WIDE = { x: 1140, y: 588, w: 120, h: 34 };
const PAUSE_BUTTON_STACKED = { x: 560, y: 1096, w: 100, h: 32 };
/** The clickable Mute button, to the left of Pause in both layouts. */
const MUTE_BUTTON_WIDE = { x: 1004, y: 588, w: 120, h: 34 };
const MUTE_BUTTON_STACKED = { x: 450, y: 1096, w: 100, h: 32 };

function drawPanelFrame(ctx, panel) {
  ctx.fillStyle = PALETTE.panelFrameDark;
  ctx.fillRect(panel.x - 6, panel.y - 6, panel.w + 12, panel.h + 12);
  ctx.fillStyle = PALETTE.panelFrame;
  ctx.fillRect(panel.x - 3, panel.y - 3, panel.w + 6, panel.h + 6);
}

function drawMarker(ctx, x, y, r, pulse) {
  ctx.save();
  ctx.strokeStyle = PALETTE.marker;
  ctx.lineWidth = 4 + pulse;
  ctx.beginPath();
  ctx.arc(x, y, r + 6 + pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.markerRing;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r + 6 + pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFoundCheck(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#1d2a18';
  ctx.fillStyle = PALETTE.good;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5ead6';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x - 1, y + 4);
  ctx.lineTo(x + 6, y - 4);
  ctx.stroke();
  ctx.restore();
}

function drawPauseButton(ctx, rect) {
  ctx.fillStyle = PALETTE.button;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fill();
  ctx.strokeStyle = PALETTE.buttonLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
  ctx.stroke();
  // Two pause bars, then the word.
  const bx = rect.x + 14;
  const by = rect.y + rect.h / 2;
  ctx.fillStyle = PALETTE.text;
  ctx.fillRect(bx, by - 7, 4, 14);
  ctx.fillRect(bx + 7, by - 7, 4, 14);
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Pause', bx + 16, by + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawMuteButton(ctx, rect, muted) {
  ctx.fillStyle = PALETTE.button;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fill();
  ctx.strokeStyle = PALETTE.buttonLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
  ctx.stroke();
  // A speaker, then the word — waves when sound is on, a cross when it is off.
  const bx = rect.x + 14;
  const by = rect.y + rect.h / 2;
  ctx.fillStyle = PALETTE.text;
  ctx.beginPath();
  ctx.moveTo(bx, by - 4);
  ctx.lineTo(bx + 5, by - 4);
  ctx.lineTo(bx + 10, by - 8);
  ctx.lineTo(bx + 10, by + 8);
  ctx.lineTo(bx + 5, by + 4);
  ctx.lineTo(bx, by + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.text;
  ctx.lineWidth = 1.5;
  if (muted) {
    ctx.beginPath();
    ctx.moveTo(bx + 13, by - 5);
    ctx.lineTo(bx + 19, by + 5);
    ctx.moveTo(bx + 19, by - 5);
    ctx.lineTo(bx + 13, by + 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(bx + 11, by, 5, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx + 11, by, 8, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(muted ? 'Muted' : 'Mute', bx + 24, by + 1);
  ctx.textBaseline = 'alphabetic';
}

export function createRenderer(canvas, options = {}) {
  const ctx = canvas.getContext('2d');
  // ?layout=wide|stacked pins the layout (the screenshot runner uses it so a staged
  // frame is always the wide one); otherwise the window size decides.
  const forced = options.layout === 'wide' || options.layout === 'stacked' ? options.layout : null;
  let currentLayout = LAYOUTS.wide;

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mode = forced ?? chooseLayout(vw, vh);
    currentLayout = LAYOUTS[mode];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = currentLayout.field.width * dpr;
    canvas.height = currentLayout.field.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Letterbox: keep the field's aspect ratio, centred in the window, so a portrait
    // phone shows the whole stacked field instead of a squashed wide one.
    const scale = Math.min(vw / currentLayout.field.width, vh / currentLayout.field.height);
    const cssW = Math.max(1, Math.round(currentLayout.field.width * scale));
    const cssH = Math.max(1, Math.round(currentLayout.field.height * scale));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${Math.round((vw - cssW) / 2)}px`;
    canvas.style.top = `${Math.round((vh - cssH) / 2)}px`;
    canvas.style.right = 'auto';
    canvas.style.bottom = 'auto';
  }
  window.addEventListener('resize', resize);
  resize();

  function drawPanels(state, time, crosshair) {
    const layout = currentLayout;
    const scene = SCENES[state.sceneIndex];
    const applied = new Set(scene.differences.map((d) => d.id));
    const found = state.found;
    const light = found.size;
    const [first, second] = layout.panels;

    for (const [panel, useApplied] of [[first, new Set()], [second, applied]]) {
      drawPanelFrame(ctx, panel);
      ctx.save();
      ctx.beginPath();
      ctx.rect(panel.x, panel.y, panel.w, panel.h);
      ctx.clip();
      ctx.translate(panel.x, panel.y);
      drawScene(ctx, scene, useApplied, time, light);
      ctx.restore();
      // Rings on every found difference, on both pictures.
      for (const diff of scene.differences) {
        if (!found.has(diff.id)) continue;
        drawMarker(ctx, panel.x + diff.x, panel.y + diff.y, diff.r, 0);
        drawFoundCheck(ctx, panel.x + diff.x, panel.y + diff.y - diff.r - 16);
      }
      // A pulsing ring on the hinted difference, on both pictures.
      if (state.hinted !== null) {
        const diff = scene.differences.find((d) => d.id === state.hinted);
        if (diff) {
          const pulse = 2 + Math.sin(time * 6) * 2;
          ctx.save();
          ctx.strokeStyle = '#7ec8f7';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(panel.x + diff.x, panel.y + diff.y, diff.r + 10 + pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    // Labels ABOVE each picture, bold and readable — the first thing a new player reads.
    const firstLabel = layout.mode === 'stacked' ? 'TOP — original' : 'LEFT — original';
    const secondLabel = layout.mode === 'stacked' ? 'BOTTOM — spot the changes' : 'RIGHT — spot the changes';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(firstLabel, first.x + 2, first.y - 10);
    ctx.textAlign = 'right';
    ctx.fillText(secondLabel, second.x + second.w - 2, second.y - 10);
    ctx.textAlign = 'left';
    // The crosshair, drawn over the picture the pointer is in.
    if (crosshair !== null) {
      ctx.save();
      ctx.strokeStyle = 'rgba(247, 234, 208, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(crosshair.x, crosshair.y, 12, 0, Math.PI * 2);
      ctx.moveTo(crosshair.x - 18, crosshair.y);
      ctx.lineTo(crosshair.x - 8, crosshair.y);
      ctx.moveTo(crosshair.x + 8, crosshair.y);
      ctx.lineTo(crosshair.x + 18, crosshair.y);
      ctx.moveTo(crosshair.x, crosshair.y - 18);
      ctx.lineTo(crosshair.x, crosshair.y - 8);
      ctx.moveTo(crosshair.x, crosshair.y + 8);
      ctx.lineTo(crosshair.x, crosshair.y + 18);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** The "Found:" dots row under the pictures: green filled = found, grey = not yet. */
  function drawFoundDots(state) {
    const layout = currentLayout;
    const fw = layout.field.width;
    const scene = SCENES[state.sceneIndex];
    const y = layout.dotsY;
    const cx = fw / 2;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('Found:', cx - 78, y + 5);
    scene.differences.forEach((diff, i) => {
      const dx = cx - 60 + i * 20;
      ctx.beginPath();
      ctx.arc(dx, y, 5.5, 0, Math.PI * 2);
      if (state.found.has(diff.id)) {
        ctx.fillStyle = PALETTE.good;
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fill();
        ctx.strokeStyle = PALETTE.muted;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
    ctx.textAlign = 'left';
  }

  function drawHud(state, best) {
    const layout = currentLayout;
    const fw = layout.field.width;
    const scene = SCENES[state.sceneIndex];
    const foundCount = state.found.size;
    const total = scene.differences.length;
    const remaining = total - foundCount;
    const low = state.timeLeft <= 30;
    const mins = Math.floor(state.timeLeft / 60);
    const secs = Math.floor(state.timeLeft % 60);
    const streak = state.combo > 1 ? ` · Streak ×${state.combo}` : '';
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, fw, layout.hudHeight);
    ctx.strokeStyle = PALETTE.hudLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, layout.hudHeight);
    ctx.lineTo(fw, layout.hudHeight);
    ctx.stroke();

    if (layout.mode === 'stacked') {
      // Narrow HUD: title left, clock right; scene line left, counter centred, score right.
      // The timer bar runs full width along the bottom of the HUD. The title is set
      // smaller than the wide one so it never runs into the centred counter.
      ctx.fillStyle = PALETTE.accent;
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('HARBOUR & LIGHT', 20, 32);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`${scene.name} · ${scene.difficulty}`, 20, 58);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 26px ${FONT}`;
      ctx.fillText(`${remaining} to find`, fw / 2, 36);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`${foundCount} found`, fw / 2, 60);
      ctx.textAlign = 'right';
      ctx.fillStyle = low ? PALETTE.timerLow : PALETTE.text;
      ctx.font = `bold 26px ${FONT}`;
      ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, fw - 20, 34);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`Score ${state.score} · Best ${best}${streak}`, fw - 20, 58);
      ctx.fillStyle = '#1d3a52';
      ctx.fillRect(20, 74, fw - 40, 4);
      ctx.fillStyle = low ? PALETTE.timerLow : PALETTE.accent;
      ctx.fillRect(20, 74, (fw - 40) * Math.max(0, state.timeLeft / scene.time), 4);
      ctx.textAlign = 'left';
      return;
    }

    ctx.fillStyle = PALETTE.accent;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('HARBOUR & LIGHT', 20, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`${scene.name} · ${scene.difficulty} · Scene ${state.sceneIndex + 1} of ${SCENES.length}`, 20, 52);

    // The counter of how many remain — the number the screenshots must show.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText(`${remaining} to find`, fw / 2, 32);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`${foundCount} found`, fw / 2, 52);

    // Timer and score, with the streak surfaced next to the score.
    ctx.textAlign = 'right';
    ctx.fillStyle = low ? PALETTE.timerLow : PALETTE.text;
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, fw - 20, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`Score ${state.score} · Best ${best}${streak}`, fw - 20, 52);
    ctx.fillStyle = '#1d3a52';
    ctx.fillRect(20, 60, fw - 40, 4);
    ctx.fillStyle = low ? PALETTE.timerLow : PALETTE.accent;
    ctx.fillRect(20, 60, (fw - 40) * Math.max(0, state.timeLeft / scene.time), 4);
    ctx.textAlign = 'left';
  }

  /** The "-5s" that floats up from the timer after a miss; `frac` is 1 just after the miss, 0 when gone. */
  function drawMissText(frac) {
    const layout = currentLayout;
    const fw = layout.field.width;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = PALETTE.bad;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'right';
    // Beside the timer, not over it: it rises a little and fades over one second.
    ctx.fillText('-5s', fw - 95, 30 + (1 - frac) * 18);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  function drawBottomBar(state, muted) {
    const layout = currentLayout;
    const fw = layout.field.width;
    const bar = layout.bottomBar;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, bar.y, fw, bar.height);
    ctx.strokeStyle = PALETTE.hudLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, bar.y);
    ctx.lineTo(fw, bar.y);
    ctx.stroke();

    if (layout.mode === 'stacked') {
      // Short copy so nothing clips at 680 logical px across.
      ctx.fillStyle = PALETTE.text;
      ctx.font = `16px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('Tap a difference in either picture.', 20, bar.y + 28);
      drawMuteButton(ctx, MUTE_BUTTON_STACKED, muted);
      drawPauseButton(ctx, PAUSE_BUTTON_STACKED);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`Scene ${state.sceneIndex + 1} of ${SCENES.length} · H — hint · P — pause · M — mute · wrong tap −5s`, 20, bar.y + 58);
      ctx.textAlign = 'right';
      ctx.fillStyle = state.hintsLeft > 0 ? PALETTE.accent : PALETTE.muted;
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`Hint (${state.hintsLeft})`, fw - 20, bar.y + 58);
      ctx.textAlign = 'left';
      return;
    }

    ctx.fillStyle = PALETTE.text;
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('Click a difference in either picture — or steer with the arrow keys and press Enter.', 20, bar.y + 32);
    ctx.fillStyle = state.hintsLeft > 0 ? PALETTE.accent : PALETTE.muted;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Hint (${state.hintsLeft})`, MUTE_BUTTON_WIDE.x - 16, bar.y + 32);
    drawMuteButton(ctx, MUTE_BUTTON_WIDE, muted);
    drawPauseButton(ctx, PAUSE_BUTTON_WIDE);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('H — hint (3 per scene, −50 pts) · P — pause · M — mute · a wrong click costs 5 seconds', 20, bar.y + 58);
    ctx.textAlign = 'right';
    const combo = state.combo > 1 ? `Streak ×${state.combo} — keep finding without a miss` : 'Find two in a row without a miss for a streak bonus';
    ctx.fillText(combo, fw - 20, bar.y + 58);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('Every find moves the light: the dawn sun climbs, the midday shadows shorten, the night beam reaches further.', 20, bar.y + 86);
    ctx.textAlign = 'left';
  }

  function drawOverlay(title, lines, accent) {
    const layout = currentLayout;
    const fw = layout.field.width;
    const fh = layout.field.height;
    const cx = fw / 2;
    const dy = layout.titleOffsetY;
    ctx.fillStyle = 'rgba(8, 14, 24, 0.82)';
    ctx.fillRect(0, 0, fw, fh);
    ctx.fillStyle = accent;
    ctx.font = `bold 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(title, cx, 280 + dy);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `20px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, cx, 330 + i * 34 + dy));
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText('Press Space or click to continue', cx, 330 + lines.length * 34 + 30 + dy);
    ctx.textAlign = 'left';
  }

  function drawTitle(best, time, sceneBests) {
    const layout = currentLayout;
    const fw = layout.field.width;
    const fh = layout.field.height;
    const cx = fw / 2;
    const dy = layout.titleOffsetY;
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, fw, fh);
    // A quiet backdrop: the dawn harbour, full-bleed and dimmed, behind the title —
    // drawn with a little light already in it, so the sun glows.
    ctx.save();
    ctx.globalAlpha = 0.32;
    const cover = Math.max(fw / 600, fh / 460);
    ctx.translate((fw - 600 * cover) / 2, (fh - 460 * cover) / 2);
    ctx.scale(cover, cover);
    drawScene(ctx, SCENES[0], new Set(), time, 3);
    ctx.restore();
    ctx.fillStyle = 'rgba(8, 14, 24, 0.55)';
    ctx.fillRect(0, 0, fw, fh);

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `bold 60px ${FONT}`;
    ctx.fillText('HARBOUR & LIGHT', cx, 236 + dy);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `24px ${FONT}`;
    ctx.fillText('One day, three harbours: dawn, midday, night.', cx, 282 + dy);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT}`;
    ctx.fillText('Two pictures. Seven differences. One sharp eye.', cx, 318 + dy);
    ctx.fillText('Dawn 2:00 · Midday 2:30 · Night 3:00 — 21 differences in all.', cx, 346 + dy);
    // Per-scene bests, read from real stored records only — a scene with no record
    // yet says so, rather than showing a made-up number.
    let y = 388 + dy;
    ctx.font = `15px ${FONT}`;
    const anyBest = SCENES.some((s) => sceneBests[s.id]);
    if (!anyBest) {
      ctx.fillText('No harbour cleared yet — your bests will appear here.', cx, y);
      y += 26;
    } else {
      for (const s of SCENES) {
        const rec = sceneBests[s.id];
        if (rec) {
          const mins = Math.floor((rec.bestTimeLeft || 0) / 60);
          const secs = String((rec.bestTimeLeft || 0) % 60).padStart(2, '0');
          ctx.fillText(`${s.name} — best ${rec.bestScore} · ${mins}:${secs} left${rec.mastery ? ' ★' : ''}`, cx, y);
        } else {
          ctx.fillText(`${s.name} — not cleared yet`, cx, y);
        }
        y += 26;
      }
    }
    const pulse = 0.7 + Math.sin(time * 3) * 0.3;
    ctx.fillStyle = `rgba(247, 234, 208, ${pulse})`;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText('Press Space or click to start', cx, y + 28);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText(`Best score: ${best}`, cx, y + 62);
    ctx.fillText('Click a difference in either picture · H for a hint · P to pause · M to mute', cx, y + 90);
    ctx.textAlign = 'left';
  }

  return {
    draw(state, screen, best, time, crosshair, fx = null, sceneBests = {}, muted = false) {
      const layout = currentLayout;
      ctx.clearRect(0, 0, layout.field.width, layout.field.height);
      if (screen === SCREEN_TITLE) {
        drawTitle(best, time, sceneBests);
        return;
      }
      // A miss shakes the whole field for a beat.
      ctx.save();
      if (fx && fx.shake > 0) {
        const k = fx.shake * 7;
        ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      }
      drawPanels(state, time, screen === SCREEN_PLAY ? crosshair : null);
      drawHud(state, best);
      drawFoundDots(state);
      drawBottomBar(state, muted);
      ctx.restore();
      // ...then a red flash over it, and the "-5s" floating up from the timer.
      if (fx && fx.flash > 0) {
        ctx.fillStyle = `rgba(229, 83, 75, ${0.20 * fx.flash})`;
        ctx.fillRect(0, 0, layout.field.width, layout.field.height);
      }
      if (fx && fx.missText > 0) drawMissText(fx.missText);
      if (screen === SCREEN_PAUSED) {
        drawOverlay('Paused', ['The harbour waits for you.'], PALETTE.accent);
      } else if (screen === SCREEN_CLEAR) {
        const last = state.sceneIndex + 1 >= SCENES.length;
        const mastery = state.lastClear && state.lastClear.mastery;
        if (last) {
          drawOverlay(
            'Harbour Complete!',
            [
              'All 21 differences found across three harbours.',
              `Final score ${state.score} · Best ${best}.`,
              SCENES[state.sceneIndex].transition,
            ],
            PALETTE.good,
          );
        } else {
          const next = SCENES[state.sceneIndex + 1];
          drawOverlay(
            'Scene Clear!',
            [
              `All ${SCENES[state.sceneIndex].differences.length} differences found — time bonus banked.`,
              SCENES[state.sceneIndex].transition,
              mastery ? '★ Mastery — cleared with no hints and no misses!' : `Next: ${next.name} · ${next.difficulty} · ${Math.floor(next.time / 60)}:${String(next.time % 60).padStart(2, '0')}.`,
            ],
            PALETTE.good,
          );
        }
      } else if (screen === SCREEN_OVER) {
        const scene = SCENES[state.sceneIndex];
        drawOverlay(
          'Out of Time',
          [`The clock ran out with ${scene.differences.length - state.found.size} differences still hiding.`, `Score ${state.score} · Best ${best}.`],
          PALETTE.bad,
        );
      } else if (screen === SCREEN_WIN) {
        const stars = SCENES.filter((s) => sceneBests[s.id] && sceneBests[s.id].mastery).length;
        drawOverlay(
          'Harbour Complete!',
          [
            'All 21 differences found across three harbours.',
            `Final score ${state.score} · Best ${best}.`,
            stars > 0 ? `Mastery stars: ${stars} of 3 harbours cleared clean.` : 'One day, three harbours — the light is yours.',
          ],
          PALETTE.good,
        );
      }
    },
    getLayout() {
      return currentLayout;
    },
    /** The clickable Pause button rect in the current layout's logical coordinates. */
    getPauseButton() {
      return currentLayout.mode === 'stacked' ? PAUSE_BUTTON_STACKED : PAUSE_BUTTON_WIDE;
    },
    /** The clickable Mute button rect in the current layout's logical coordinates. */
    getMuteButton() {
      return currentLayout.mode === 'stacked' ? MUTE_BUTTON_STACKED : MUTE_BUTTON_WIDE;
    },
  };
}
