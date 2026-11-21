// All sound is made here with the Web Audio API — no audio files, nothing to download.
// A find is a bright two-note chime, a miss a low thud, a hint a soft ping, a cleared
// scene a little arpeggio, and a win the full tune. The clock ticks when time runs low.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx === null) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, start, dur, type, vol) {
    if (muted) return;
    const ac = ensure();
    if (ac === null) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ac.currentTime + start);
    gain.gain.linearRampToValueAtTime(vol, ac.currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + start);
    osc.stop(ac.currentTime + start + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    find() {
      tone(880, 0, 0.18, 'sine', 0.25);
      tone(1318, 0.08, 0.25, 'sine', 0.22);
    },
    miss() {
      tone(140, 0, 0.2, 'triangle', 0.25);
    },
    hint() {
      tone(1174, 0, 0.15, 'sine', 0.18);
      tone(1568, 0.07, 0.2, 'sine', 0.15);
    },
    clear() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.22, 'sine', 0.22));
    },
    win() {
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.11, 0.28, 'sine', 0.22));
    },
    tick() {
      tone(1200, 0, 0.05, 'square', 0.06);
    },
  };
}
