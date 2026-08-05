/**
 * Tonbak — app wiring.
 *
 * Boot order matters: nothing touches the AudioContext until the user taps
 * the start gate, because iOS will not open one outside a gesture and fails
 * silently if you try.
 */

import { initAudio, resumeAudio, watchInterruptions, setMasterVolume, setReverbAmount, setDroneVolume } from './audio/context.js';
import { renderAllStrokes } from './audio/synth.js';
import { RhythmEngine } from './audio/engine.js';
import { Drone } from './audio/drone.js';
import { STROKES, STROKE_LIST, RIZ, LETTER_TO_STROKE, CYCLE_ORDER } from './data/strokes.js';
import {
  RHYTHMS, CATEGORIES, parsePattern, serialisePattern,
  totalSteps, stepDuration, groupStartSteps,
} from './data/rhythms.js';
import {
  NOTES, ACCIDENTALS, INTERVALS, DASTGAH,
  noteFrequency, accidentalCents, noteLabel,
} from './data/dastgah.js';

const VERSION = '1.0.0';
const $ = (id) => document.getElementById(id);
const STROKE_TO_LETTER = Object.fromEntries(
  Object.entries(LETTER_TO_STROKE).map(([l, s]) => [s, l])
);
const STROKE_COLOR = (id) => (id === 'riz' ? RIZ.color : STROKES[id]?.color || '#888');

/** Renders '♩.' as a note plus a tight augmentation dot rather than a full stop. */
function noteGlyph(label) {
  const l = label || '♩';
  return l.endsWith('.') ? `${l.slice(0, -1)}<span class="aug-dot">·</span>` : l;
}

// ── State ───────────────────────────────────────────────────────────────
let engine = null;
let drone = null;
let wakeLock = null;

const state = {
  rhythm: RHYTHMS[0],
  steps: null,
  bpm: RHYTHMS[0].defaultBpm,
  tab: 'play',
  meterFilter: 'all',
  query: '',
  soundQuery: '',
  droneOn: false,
  trainerOn: false,
  countIn: 0,
  muted: new Set(),
  build: null,
  custom: [],
  settings: { volume: 0.9, reverb: 0.4, a4: 440, wake: true },
  droneCfg: { pc: 7, accidental: 'natural', octave: 3, interval: 'fifth', cents: 0, volume: 0.35, dastgah: 'shur' },
  trainer: { every: 4, delta: 4, max: 160, loop: false },
};

// ── Persistence ─────────────────────────────────────────────────────────
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('tonbak.' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('tonbak.' + key, JSON.stringify(value));
    } catch {
      /* private mode / quota — settings just won't persist */
    }
  },
};

function loadState() {
  Object.assign(state.settings, store.get('settings', {}));
  Object.assign(state.droneCfg, store.get('drone', {}));
  Object.assign(state.trainer, store.get('trainer', {}));
  state.countIn = store.get('countin', 0);
  state.custom = store.get('custom', []);

  const last = store.get('last', null);
  if (last) {
    const found = allRhythms().find((r) => r.id === last.id);
    if (found) {
      state.rhythm = found;
      state.bpm = last.bpm || found.defaultBpm;
    }
  }
}

function allRhythms() {
  return [...RHYTHMS, ...state.custom];
}

// ── Boot ────────────────────────────────────────────────────────────────
async function boot() {
  const btn = $('gate-btn');
  const status = $('gate-status');
  btn.disabled = true;
  status.textContent = 'Starting audio…';

  try {
    const { ctx } = await initAudio();
    status.textContent = 'Modelling the drum…';
    // Yield so the label paints before the render blocks the thread.
    await new Promise((r) => setTimeout(r, 30));

    const buffers = await renderAllStrokes(STROKES, ctx.sampleRate);
    engine = new RhythmEngine(buffers);
    drone = new Drone();
    watchInterruptions();

    applyAudioSettings();
    engine.setRhythm(state.rhythm, state.steps);
    engine.setBpm(state.bpm);
    engine.setCountIn(state.countIn);
    engine.onBpm = (bpm) => {
      state.bpm = bpm;
      syncBpmUI();
    };

    buildUI();
    startRenderLoop();

    // Debug handle — lets the smoke test inspect buffers, timing and the
    // drone's actual output frequency rather than just poking at the DOM.
    window.__tonbak = { engine, drone, state, store, audioNow: () => ctx.currentTime };

    $('gate').classList.add('is-gone');
    $('app').hidden = false;
    setTimeout(() => $('gate').remove(), 500);
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    status.textContent = 'Audio blocked — tap again';
  }
}

$('gate-btn').addEventListener('click', boot, { once: false });

// ── UI construction ─────────────────────────────────────────────────────
function buildUI() {
  buildTabs();
  buildRing();
  buildTransport();
  buildToggles();
  buildDronePanel();
  buildTrainerPanel();
  buildCountInPanel();
  buildMutePanel();
  buildRhythmsView();
  buildSoundsView();
  buildBuildView();
  buildSettings();
  refreshNow();
  syncBpmUI();
}

// ── Tabs ────────────────────────────────────────────────────────────────
function buildTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function switchTab(name) {
  state.tab = name;
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-on', on);
    t.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.view').forEach((v) => {
    v.hidden = v.dataset.view !== name;
  });
}

// ── Cycle ring ──────────────────────────────────────────────────────────
const ring = { dots: [], playhead: null, n: 0 };
const RING_C = 160;
const RING_R = 126;

function stepAngle(i, n) {
  return (i / n) * Math.PI * 2 - Math.PI / 2;
}

function buildRing() {
  const svg = $('ring');
  svg.innerHTML = '';
  const r = state.rhythm;
  const n = totalSteps(r);
  const starts = new Set(groupStartSteps(r));
  ring.dots = [];
  ring.n = n;

  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };

  svg.appendChild(make('circle', {
    cx: RING_C, cy: RING_C, r: RING_R, class: 'ring-arc',
  }));

  // Radial ticks where each felt beat begins.
  for (const s of starts) {
    const a = stepAngle(s, n);
    svg.appendChild(make('line', {
      x1: RING_C + Math.cos(a) * (RING_R + 11),
      y1: RING_C + Math.sin(a) * (RING_R + 11),
      x2: RING_C + Math.cos(a) * (RING_R + 23),
      y2: RING_C + Math.sin(a) * (RING_R + 23),
      class: 'group-tick',
    }));
  }

  const playhead = make('line', { class: 'playhead', x1: 0, y1: 0, x2: 0, y2: 0 });
  playhead.style.opacity = '0';
  svg.appendChild(playhead);
  ring.playhead = playhead;

  for (let i = 0; i < n; i++) {
    const a = stepAngle(i, n);
    const isPulse = i % r.div === 0;
    const isGroup = starts.has(i);
    const base = isGroup ? 7 : isPulse ? 5.5 : 3.6;
    const dot = make('circle', {
      cx: RING_C + Math.cos(a) * RING_R,
      cy: RING_C + Math.sin(a) * RING_R,
      r: base,
      class: 'step-dot' + (isGroup ? ' is-group' : isPulse ? ' is-pulse' : ''),
    });
    dot.dataset.base = base;
    svg.appendChild(dot);
    ring.dots.push(dot);
  }

  paintRingPattern();
}

/** Colour the dots by which stroke sits on each step. */
function paintRingPattern() {
  const steps = currentSteps();
  ring.dots.forEach((dot, i) => {
    const cell = steps[i];
    if (cell) {
      dot.style.fill = STROKE_COLOR(cell.stroke);
      dot.style.opacity = String(0.42 + cell.vel * 0.58);
      dot.setAttribute('r', String(Number(dot.dataset.base) + 1.6));
    } else {
      dot.style.fill = '';
      dot.style.opacity = '';
      dot.setAttribute('r', dot.dataset.base);
    }
  });
}

function setRingActive(i) {
  ring.dots.forEach((d, j) => d.classList.toggle('is-active', j === i));
  if (i < 0) {
    ring.playhead.style.opacity = '0';
    return;
  }
  const a = stepAngle(i, ring.n);
  ring.playhead.setAttribute('x1', RING_C + Math.cos(a) * (RING_R - 26));
  ring.playhead.setAttribute('y1', RING_C + Math.sin(a) * (RING_R - 26));
  ring.playhead.setAttribute('x2', RING_C + Math.cos(a) * (RING_R + 6));
  ring.playhead.setAttribute('y2', RING_C + Math.sin(a) * (RING_R + 6));
  ring.playhead.style.opacity = '1';
}

// ── Render loop ─────────────────────────────────────────────────────────
function startRenderLoop() {
  let lastStep = -1;
  const frame = () => {
    if (engine.playing) {
      const due = engine.drainDue();
      if (due.length) {
        const latest = due[due.length - 1];
        if (latest.step !== lastStep) {
          setRingActive(latest.step);
          lastStep = latest.step;
        }
        const label = latest.countIn
          ? 'count-in'
          : `cycle ${latest.cycle + 1}`;
        $('cycle-count').textContent = label;
      }
    } else if (lastStep !== -1) {
      setRingActive(-1);
      lastStep = -1;
      $('cycle-count').textContent = '—';
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ── Transport ───────────────────────────────────────────────────────────
function buildTransport() {
  $('btn-play').addEventListener('click', togglePlay);
  $('bpm-down').addEventListener('click', () => nudgeBpm(-1));
  $('bpm-up').addEventListener('click', () => nudgeBpm(1));

  // Press-and-hold to run the tempo.
  let holdTimer = null;
  let repeatTimer = null;
  const holdStart = (dir) => {
    holdTimer = setTimeout(() => {
      repeatTimer = setInterval(() => nudgeBpm(dir), 70);
    }, 420);
  };
  const holdEnd = () => {
    clearTimeout(holdTimer);
    clearInterval(repeatTimer);
  };
  for (const [id, dir] of [['bpm-down', -1], ['bpm-up', 1]]) {
    const el = $(id);
    el.addEventListener('pointerdown', () => holdStart(dir));
    el.addEventListener('pointerup', holdEnd);
    el.addEventListener('pointercancel', holdEnd);
    el.addEventListener('pointerleave', holdEnd);
  }

  const slider = $('bpm-slider');
  slider.addEventListener('input', () => setBpm(Number(slider.value)));

  buildTapTempo();
}

async function togglePlay() {
  await resumeAudio();
  engine.toggle();
  const btn = $('btn-play');
  btn.classList.toggle('is-playing', engine.playing);
  // These are SVG elements, and `hidden` is an HTMLElement property — assigning
  // to it on an SVGElement sets a dead expando rather than the attribute.
  btn.querySelector('.ico-play').toggleAttribute('hidden', engine.playing);
  btn.querySelector('.ico-stop').toggleAttribute('hidden', !engine.playing);
  btn.setAttribute('aria-label', engine.playing ? 'Stop' : 'Play');

  if (engine.playing) {
    if (state.trainerOn) {
      engine.setTrainer({ ...state.trainer, enabled: true, start: state.bpm });
    }
    requestWakeLock();
  } else {
    releaseWakeLock();
    $('cycle-count').textContent = '—';
  }
}

function nudgeBpm(delta) {
  setBpm(state.bpm + delta);
}

function setBpm(bpm) {
  const r = state.rhythm;
  const [lo, hi] = r.bpmRange || [30, 300];
  state.bpm = Math.max(lo, Math.min(hi, Math.round(bpm)));
  engine.setBpm(state.bpm);
  syncBpmUI();
  store.set('last', { id: r.id, bpm: state.bpm });
}

function syncBpmUI() {
  const r = state.rhythm;
  const [lo, hi] = r.bpmRange || [30, 300];
  $('bpm-big').textContent = state.bpm;
  $('bpm-label').innerHTML = noteGlyph(r.bpmLabel);
  const slider = $('bpm-slider');
  slider.min = lo;
  slider.max = hi;
  slider.value = state.bpm;
}

function buildTapTempo() {
  const btn = $('btn-tap');
  let taps = [];
  let resetTimer = null;

  btn.addEventListener('click', () => {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2200) taps = [];
    taps.push(now);
    if (taps.length > 5) taps.shift();

    btn.classList.add('is-armed');
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      btn.classList.remove('is-armed');
      taps = [];
      btn.textContent = 'Tap tempo';
    }, 2400);

    if (taps.length < 2) {
      btn.textContent = 'Keep tapping';
      return;
    }
    const gaps = [];
    for (let i = 1; i < taps.length; i++) gaps.push(taps[i] - taps[i - 1]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    setBpm(60000 / avg);
    btn.textContent = `${taps.length} taps`;
  });
}

// ── Toggles ─────────────────────────────────────────────────────────────
function buildToggles() {
  $('tg-drone').addEventListener('click', () => {
    state.droneOn = !state.droneOn;
    applyDrone();
  });
  $('tg-trainer').addEventListener('click', () => {
    state.trainerOn = !state.trainerOn;
    engine.setTrainer({ ...state.trainer, enabled: state.trainerOn, start: state.bpm });
    syncToggles();
  });
  $('tg-countin').addEventListener('click', () => {
    state.countIn = state.countIn > 0 ? 0 : 1;
    engine.setCountIn(state.countIn);
    store.set('countin', state.countIn);
    syncCountInSeg();
    syncToggles();
  });
}

function syncToggles() {
  $('tg-drone').setAttribute('aria-pressed', String(state.droneOn));
  $('tg-trainer').setAttribute('aria-pressed', String(state.trainerOn));
  $('tg-countin').setAttribute('aria-pressed', String(state.countIn > 0));

  $('drone-summary').textContent = state.droneOn ? droneLabel() : 'Off';
  $('trainer-summary').textContent = state.trainerOn
    ? `+${state.trainer.delta} every ${state.trainer.every}`
    : 'Off';
  $('countin-summary').textContent = state.countIn
    ? `${state.countIn} cycle${state.countIn > 1 ? 's' : ''}`
    : 'Off';
}

// ── Drone ───────────────────────────────────────────────────────────────
function droneFreqs() {
  const c = state.droneCfg;
  const cents = accidentalCents(c.accidental) + c.cents;
  const base = noteFrequency({ pc: c.pc, octave: c.octave, cents, a4: state.settings.a4 });
  const iv = INTERVALS.find((x) => x.id === c.interval) || INTERVALS[0];
  return iv.ratios.map((r) => base * r);
}

function droneLabel() {
  const c = state.droneCfg;
  return `${noteLabel(c.pc, c.accidental)}${c.octave}`;
}

function applyDrone() {
  setDroneVolume(state.droneOn ? state.droneCfg.volume : 0);
  if (state.droneOn) drone.play(droneFreqs());
  else drone.stop();
  syncToggles();
  syncDroneReadout();
  store.set('drone', state.droneCfg);
}

function retuneDrone() {
  if (state.droneOn) drone.play(droneFreqs());
  syncDroneReadout();
  syncToggles();
  store.set('drone', state.droneCfg);
}

function syncDroneReadout() {
  const freqs = droneFreqs();
  const c = state.droneCfg;
  const acc = ACCIDENTALS.find((a) => a.id === c.accidental);
  const accName = acc && acc.id !== 'natural' ? ` ${acc.name}` : '';
  $('freq-readout').innerHTML =
    `<strong>${noteLabel(c.pc, c.accidental)}${c.octave}</strong>${accName} · ` +
    freqs.map((f) => `${f.toFixed(1)} Hz`).join(' + ');
}

function buildDronePanel() {
  // Dastgāh presets
  const dg = $('dastgah-grid');
  DASTGAH.forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dastgah-btn';
    b.innerHTML = `${d.name}<span class="dg-fa">${d.fa}</span>`;
    b.addEventListener('click', () => {
      Object.assign(state.droneCfg, {
        pc: d.pc, accidental: d.accidental, octave: d.octave,
        interval: d.interval, cents: 0, dastgah: d.id,
      });
      $('cents-slider').value = 0;
      $('cents-val').textContent = '0¢';
      syncDroneControls();
      retuneDrone();
      $('dastgah-note').textContent = d.note;
    });
    b.dataset.id = d.id;
    dg.appendChild(b);
  });

  // Note picker
  const ng = $('note-grid');
  NOTES.forEach((n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'note-btn';
    b.innerHTML = `${n.letter}<span class="nb-fa">${n.solfege}</span>`;
    b.dataset.pc = n.pc;
    b.addEventListener('click', () => {
      state.droneCfg.pc = n.pc;
      state.droneCfg.dastgah = null;
      syncDroneControls();
      retuneDrone();
    });
    ng.appendChild(b);
  });

  buildSeg($('accidental-seg'), ACCIDENTALS.map((a) => ({ value: a.id, label: a.symbol + ' ' + a.name })),
    () => state.droneCfg.accidental,
    (v) => { state.droneCfg.accidental = v; state.droneCfg.dastgah = null; syncDroneControls(); retuneDrone(); });

  buildSeg($('octave-seg'), [2, 3, 4].map((o) => ({ value: String(o), label: String(o) })),
    () => String(state.droneCfg.octave),
    (v) => { state.droneCfg.octave = Number(v); syncDroneControls(); retuneDrone(); });

  buildSeg($('interval-seg'), INTERVALS.map((i) => ({ value: i.id, label: i.name })),
    () => state.droneCfg.interval,
    (v) => { state.droneCfg.interval = v; syncDroneControls(); retuneDrone(); });

  const cents = $('cents-slider');
  cents.value = state.droneCfg.cents;
  cents.addEventListener('input', () => {
    state.droneCfg.cents = Number(cents.value);
    $('cents-val').textContent = `${cents.value > 0 ? '+' : ''}${cents.value}¢`;
    retuneDrone();
  });

  const dv = $('drone-vol');
  dv.value = Math.round(state.droneCfg.volume * 100);
  dv.addEventListener('input', () => {
    state.droneCfg.volume = Number(dv.value) / 100;
    $('drone-vol-val').textContent = `${dv.value}%`;
    if (state.droneOn) setDroneVolume(state.droneCfg.volume);
    store.set('drone', state.droneCfg);
  });

  // Opening the panel is a strong hint the drone is wanted.
  $('panel-drone').addEventListener('toggle', (e) => {
    if (e.target.open && !state.droneOn) {
      state.droneOn = true;
      applyDrone();
    }
  });

  syncDroneControls();
  syncDroneReadout();
  $('cents-val').textContent = `${state.droneCfg.cents > 0 ? '+' : ''}${state.droneCfg.cents}¢`;
  $('drone-vol-val').textContent = `${Math.round(state.droneCfg.volume * 100)}%`;
  const preset = DASTGAH.find((d) => d.id === state.droneCfg.dastgah);
  if (preset) $('dastgah-note').textContent = preset.note;
}

function syncDroneControls() {
  document.querySelectorAll('#dastgah-grid .dastgah-btn').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.id === state.droneCfg.dastgah);
  });
  document.querySelectorAll('#note-grid .note-btn').forEach((b) => {
    b.classList.toggle('is-on', Number(b.dataset.pc) === state.droneCfg.pc);
  });
  syncSeg($('accidental-seg'), state.droneCfg.accidental);
  syncSeg($('octave-seg'), String(state.droneCfg.octave));
  syncSeg($('interval-seg'), state.droneCfg.interval);
}

/** Generic segmented control: builds buttons and wires selection. */
function buildSeg(el, items, getValue, onPick) {
  el.innerHTML = '';
  items.forEach((it) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn';
    b.textContent = it.label;
    b.dataset.value = it.value;
    b.addEventListener('click', () => onPick(it.value));
    el.appendChild(b);
  });
  syncSeg(el, getValue());
}

function syncSeg(el, value) {
  el.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.value === value);
  });
}

// ── Trainer ─────────────────────────────────────────────────────────────
function buildTrainerPanel() {
  const bind = (id, key, fmt) => {
    const el = $(id);
    el.value = state.trainer[key];
    $(id + '-val').textContent = fmt(el.value);
    el.addEventListener('input', () => {
      state.trainer[key] = Number(el.value);
      $(id + '-val').textContent = fmt(el.value);
      store.set('trainer', state.trainer);
      if (state.trainerOn) {
        engine.setTrainer({ ...state.trainer, enabled: true, start: state.bpm });
      }
      syncToggles();
    });
  };
  bind('tr-every', 'every', (v) => `${v} cycle${v > 1 ? 's' : ''}`);
  bind('tr-delta', 'delta', (v) => `+${v} BPM`);
  bind('tr-max', 'max', (v) => `${v} BPM`);

  $('tr-loop-seg').querySelectorAll('.seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.trainer.loop = b.dataset.loop === '1';
      $('tr-loop-seg').querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('is-on'));
      b.classList.add('is-on');
      store.set('trainer', state.trainer);
      if (state.trainerOn) engine.setTrainer({ ...state.trainer, enabled: true, start: state.bpm });
    });
    b.classList.toggle('is-on', (b.dataset.loop === '1') === Boolean(state.trainer.loop));
  });

  $('panel-trainer').addEventListener('toggle', (e) => {
    if (e.target.open && !state.trainerOn) {
      state.trainerOn = true;
      engine.setTrainer({ ...state.trainer, enabled: true, start: state.bpm });
      syncToggles();
    }
  });
}

// ── Count-in ────────────────────────────────────────────────────────────
function buildCountInPanel() {
  $('countin-seg').querySelectorAll('.seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.countIn = Number(b.dataset.ci);
      engine.setCountIn(state.countIn);
      store.set('countin', state.countIn);
      syncCountInSeg();
      syncToggles();
    });
  });
  syncCountInSeg();
}

function syncCountInSeg() {
  $('countin-seg').querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('is-on', Number(b.dataset.ci) === state.countIn);
  });
}

// ── Stroke mutes ────────────────────────────────────────────────────────
function buildMutePanel() {
  const grid = $('mute-grid');
  grid.innerHTML = '';
  STROKE_LIST.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mute-btn';
    b.innerHTML =
      `<span class="mute-swatch" style="background:${s.color}"></span>` +
      `<span class="mute-name">${s.name}</span>`;
    b.addEventListener('click', () => {
      const muted = state.muted.has(s.id);
      if (muted) state.muted.delete(s.id);
      else state.muted.add(s.id);
      engine.setMuted(s.id, !muted);
      // Riz grains carry their own id inside the engine.
      if (s.id === 'riz') engine.setMuted('riztap', !muted);
      b.classList.toggle('is-muted', !muted);
      $('mute-summary').textContent = state.muted.size
        ? `${state.muted.size} muted`
        : 'All on';
    });
    grid.appendChild(b);
  });
}

// ── Rhythms view ────────────────────────────────────────────────────────
function buildRhythmsView() {
  const meters = ['all', ...new Set(RHYTHMS.map((r) => r.sig))];
  const row = $('meter-filters');
  row.innerHTML = '';
  meters.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filter-chip' + (m === 'all' ? ' is-on' : '');
    b.textContent = m === 'all' ? 'All' : m;
    b.dataset.meter = m;
    b.addEventListener('click', () => {
      state.meterFilter = m;
      row.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('is-on'));
      b.classList.add('is-on');
      renderRhythmList();
    });
    row.appendChild(b);
  });

  const search = $('search');
  const clear = $('search-clear');
  search.addEventListener('input', () => {
    state.query = search.value.trim().toLowerCase();
    clear.hidden = !state.query;
    renderRhythmList();
  });
  clear.addEventListener('click', () => {
    search.value = '';
    state.query = '';
    clear.hidden = true;
    renderRhythmList();
    search.focus();
  });

  renderRhythmList();
}

function matchesQuery(r, q) {
  if (!q) return true;
  const hay = [
    r.name, r.fa, r.sig, r.style, r.region, r.description,
    r.groups.join('+'), ...(r.tags || []),
  ].filter(Boolean).join(' ').toLowerCase();
  // Every whitespace-separated term must appear, so "6/8 dance" narrows.
  return q.split(/\s+/).every((term) => hay.includes(term));
}

function renderRhythmList() {
  const list = $('rhythm-list');
  list.innerHTML = '';
  const q = state.query;
  const items = allRhythms().filter(
    (r) => (state.meterFilter === 'all' || r.sig === state.meterFilter) && matchesQuery(r, q)
  );

  $('rhythm-empty').hidden = items.length > 0;

  for (const catId of ['persian', 'simple', 'custom']) {
    const group = items.filter((r) => r.category === catId);
    if (!group.length) continue;
    const h = document.createElement('div');
    h.className = 'cat-head';
    h.textContent = CATEGORIES[catId].name;
    list.appendChild(h);
    group.forEach((r) => list.appendChild(rhythmCard(r)));
  }
}

function rhythmCard(r) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'rhythm-card' + (r.id === state.rhythm.id ? ' is-on' : '');

  const steps = parsePattern(r.pattern, LETTER_TO_STROKE);
  const starts = new Set(groupStartSteps(r));
  const strip = steps
    .map((s, i) => {
      const gs = starts.has(i) ? ' gs' : '';
      if (!s) return `<span class="rc-cell${gs}"></span>`;
      const h = 6 + Math.round(s.vel * 15);
      return `<span class="rc-cell${gs}" style="height:${h}px;background:${STROKE_COLOR(s.stroke)};opacity:${0.45 + s.vel * 0.55}"></span>`;
    })
    .join('');

  card.innerHTML = `
    <div class="rc-top">
      <span class="rc-name">${r.name}</span>
      <span class="rc-fa">${r.fa || ''}</span>
    </div>
    <div class="rc-meta">
      <span class="rc-tag sig">${r.sig}</span>
      <span class="rc-tag grp">${r.groups.join('+')}</span>
      ${r.style ? `<span class="rc-tag">${r.style}</span>` : ''}
      <span class="rc-tag bpm">${r.defaultBpm} ${noteGlyph(r.bpmLabel)}</span>
    </div>
    ${r.description ? `<p class="rc-desc">${r.description}</p>` : ''}
    <div class="rc-strip">${strip}</div>`;

  card.addEventListener('click', () => selectRhythm(r));
  return card;
}

function selectRhythm(r, keepBpm = false) {
  const wasPlaying = engine.playing;
  if (wasPlaying) engine.stop();

  state.rhythm = r;
  state.steps = null;
  if (!keepBpm) state.bpm = r.defaultBpm;

  engine.setRhythm(r);
  engine.setBpm(state.bpm);
  store.set('last', { id: r.id, bpm: state.bpm });

  refreshNow();
  buildRing();
  syncBpmUI();
  renderRhythmList();

  if (wasPlaying) {
    engine.start();
  }
  switchTab('play');
  toast(`${r.name} · ${r.sig}`);
}

function refreshNow() {
  const r = state.rhythm;
  $('now-name').textContent = r.name;
  $('now-fa').textContent = r.fa || '';
  $('now-sig').textContent = r.sig;
  $('now-groups').textContent = r.groups.join('+');
  syncToggles();
}

function currentSteps() {
  return state.steps || parsePattern(state.rhythm.pattern, LETTER_TO_STROKE);
}

// ── Sounds view ─────────────────────────────────────────────────────────
function buildSoundsView() {
  const search = $('sound-search');
  search.addEventListener('input', () => {
    state.soundQuery = search.value.trim().toLowerCase();
    renderStrokeList();
  });
  renderStrokeList();
}

function renderStrokeList() {
  const list = $('stroke-list');
  list.innerHTML = '';
  const q = state.soundQuery;

  const items = STROKE_LIST.filter((s) => {
    if (!q) return true;
    const hay = [s.name, s.fa, s.hand, s.description, s.letter].join(' ').toLowerCase();
    return q.split(/\s+/).every((t) => hay.includes(t));
  });

  $('stroke-empty').hidden = items.length > 0;

  items.forEach((s) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'stroke-card';
    card.style.color = s.color;
    card.innerHTML = `
      <span class="sc-badge"><span>${s.letter}</span></span>
      <span class="sc-body">
        <span class="sc-top">
          <span class="sc-name">${s.name}</span>
          <span class="sc-fa">${s.fa}</span>
        </span>
        <span class="sc-hand">${s.hand}</span>
        <span class="sc-desc">${s.description}</span>
      </span>`;
    card.addEventListener('click', async () => {
      await resumeAudio();
      engine.preview(s.id);
      card.classList.add('is-hit');
      setTimeout(() => card.classList.remove('is-hit'), 170);
    });
    list.appendChild(card);
  });
}

// ── Build view ──────────────────────────────────────────────────────────
/** A sensible default grouping for a metre the user just dialled in. */
function defaultGroups(pulse, unit) {
  if (unit === 4) return Array(pulse).fill(1);
  if (pulse % 3 === 0) return Array(pulse / 3).fill(3);
  const g = [];
  let left = pulse;
  // Odd metres conventionally take their long group first.
  if (left % 2 === 1) { g.push(3); left -= 3; }
  while (left >= 2) { g.push(2); left -= 2; }
  if (left === 1) g.push(1);
  return g.length ? g : [pulse];
}

function normaliseGroups(groups, pulse) {
  const g = groups.filter((x) => x > 0);
  let sum = g.reduce((a, b) => a + b, 0);
  while (sum > pulse && g.length) {
    const cut = Math.min(g[g.length - 1], sum - pulse);
    g[g.length - 1] -= cut;
    sum -= cut;
    if (g[g.length - 1] === 0) g.pop();
  }
  while (sum < pulse) {
    const add = Math.min(pulse - sum, 4);
    g.push(add);
    sum += add;
  }
  return g.length ? g : [pulse];
}

function deriveBpmUnit(groups, unit) {
  if (unit === 4) return 1;
  return groups.every((g) => g === 3) ? 3 : 1;
}

function newBuild(from) {
  const b = from
    ? {
        pulse: from.pulse, unit: Number(from.sig.split('/')[1]), div: from.div,
        groups: from.groups.slice(),
        steps: parsePattern(from.pattern, LETTER_TO_STROKE),
        name: from.name,
      }
    : { pulse: 6, unit: 8, div: 2, groups: [3, 3], steps: null, name: '' };
  const n = b.pulse * b.div;
  if (!b.steps) b.steps = Array(n).fill(null);
  while (b.steps.length < n) b.steps.push(null);
  b.steps.length = n;
  return b;
}

function buildAsRhythm() {
  const b = state.build;
  return {
    id: 'build-preview',
    name: b.name || 'Untitled',
    fa: '',
    sig: `${b.pulse}/${b.unit}`,
    pulse: b.pulse,
    div: b.div,
    groups: b.groups,
    bpmUnit: deriveBpmUnit(b.groups, b.unit),
    bpmLabel: deriveBpmUnit(b.groups, b.unit) === 3 ? '♩.' : b.unit === 4 ? '♩' : '♪',
    defaultBpm: state.bpm,
    bpmRange: [30, 400],
    category: 'custom',
    style: 'Custom',
    tags: ['custom'],
    description: '',
    pattern: serialisePattern(b.steps, STROKE_TO_LETTER),
  };
}

function buildBuildView() {
  state.build = newBuild(state.rhythm);

  $('bp-minus').addEventListener('click', () => changePulse(-1));
  $('bp-plus').addEventListener('click', () => changePulse(1));

  $('bp-unit-seg').querySelectorAll('.seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.build.unit = Number(b.dataset.unit);
      state.build.groups = defaultGroups(state.build.pulse, state.build.unit);
      syncSeg($('bp-unit-seg'), b.dataset.unit);
      renderBuild();
    });
  });
  $('bp-div-seg').querySelectorAll('.seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      resizeBuild(state.build.pulse, Number(b.dataset.div));
      syncSeg($('bp-div-seg'), b.dataset.div);
      renderBuild();
    });
  });

  $('bp-copy').addEventListener('click', () => {
    // Copy what's loaded in Play, including unsaved editor state, so you can
    // take an existing cycle and bend it rather than starting from an empty grid.
    const r = { ...state.rhythm };
    if (state.steps) r.pattern = serialisePattern(state.steps, STROKE_TO_LETTER);
    state.build = newBuild(r);
    renderBuild();
    toast(`Copied ${state.rhythm.name}`);
  });

  $('bp-clear').addEventListener('click', () => {
    state.build.steps = Array(state.build.pulse * state.build.div).fill(null);
    renderBuild();
  });
  $('bp-preview').addEventListener('click', previewBuild);
  $('bp-save').addEventListener('click', saveBuild);

  renderBuild();
  renderSaved();
}

function changePulse(delta) {
  const b = state.build;
  const next = Math.max(2, Math.min(16, b.pulse + delta));
  if (next === b.pulse) return;
  b.groups = defaultGroups(next, b.unit);
  resizeBuild(next, b.div);
  renderBuild();
}

function resizeBuild(pulse, div) {
  const b = state.build;
  const old = b.steps;
  const oldDiv = b.div;
  b.pulse = pulse;
  b.div = div;
  const n = pulse * div;
  const next = Array(n).fill(null);
  // Keep strokes on the pulses they were written on when the grid changes.
  old.forEach((cell, i) => {
    if (!cell) return;
    const pulseIndex = Math.floor(i / oldDiv);
    const withinPulse = i % oldDiv;
    const scaled = Math.round((withinPulse / oldDiv) * div);
    const target = pulseIndex * div + scaled;
    if (target < n && !next[target]) next[target] = cell;
  });
  b.steps = next;
  b.groups = normaliseGroups(b.groups, pulse);
}

function renderBuild() {
  const b = state.build;
  $('bp-pulse').textContent = b.pulse;
  syncSeg($('bp-unit-seg'), String(b.unit));
  syncSeg($('bp-div-seg'), String(b.div));
  renderGroupEditor();
  renderGrid();
}

function renderGroupEditor() {
  const b = state.build;
  const row = $('bp-groups');
  row.innerHTML = '';

  b.groups.forEach((g, i) => {
    const pill = document.createElement('span');
    pill.className = 'group-pill';
    pill.innerHTML = `<span>${g}</span>`;

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.addEventListener('click', () => {
      const next = b.groups.slice();
      next[i] = Math.max(1, next[i] - 1);
      b.groups = normaliseGroups(next, b.pulse);
      renderBuild();
    });

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.addEventListener('click', () => {
      const next = b.groups.slice();
      next[i] = Math.min(b.pulse, next[i] + 1);
      b.groups = normaliseGroups(next, b.pulse);
      renderBuild();
    });

    pill.append(minus, plus);
    row.appendChild(pill);
  });

  const sum = b.groups.reduce((a, x) => a + x, 0);
  const note = document.createElement('span');
  note.className = 'group-add';
  note.textContent = `= ${sum} pulse${sum > 1 ? 's' : ''}`;
  row.appendChild(note);
}

function renderGrid() {
  const b = state.build;
  const wrap = $('build-grid');
  wrap.innerHTML = '';
  const n = b.pulse * b.div;
  const starts = new Set(groupStartSteps({ groups: b.groups, div: b.div }));

  // Ruler: pulse numbers along the top.
  const ruler = document.createElement('div');
  ruler.className = 'grid-ruler';
  const spacer = document.createElement('span');
  spacer.className = 'grid-label';
  ruler.appendChild(spacer);
  for (let i = 0; i < n; i++) {
    const c = document.createElement('span');
    const isPulse = i % b.div === 0;
    c.className = 'ruler-cell' + (starts.has(i) ? ' beat' : '');
    c.textContent = isPulse ? String(i / b.div + 1) : '';
    ruler.appendChild(c);
  }
  wrap.appendChild(ruler);

  CYCLE_ORDER.forEach((strokeId) => {
    const def = strokeId === 'riz' ? RIZ : STROKES[strokeId];
    const row = document.createElement('div');
    row.className = 'grid-row';

    const label = document.createElement('span');
    label.className = 'grid-label';
    label.textContent = def.name;
    label.style.color = def.color;
    row.appendChild(label);

    for (let i = 0; i < n; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      const isPulse = i % b.div === 0;
      cell.className = 'grid-cell' + (isPulse ? ' pulse' : '') + (starts.has(i) ? ' gs' : '');
      const placed = b.steps[i];
      if (placed && placed.stroke === strokeId) {
        cell.classList.add('on');
        cell.style.background = def.color;
        cell.style.opacity = String(0.35 + placed.vel * 0.65);
      }
      cell.addEventListener('click', () => toggleCell(i, strokeId));
      row.appendChild(cell);
    }
    wrap.appendChild(row);
  });
}

/**
 * One stroke per step — tapping a different row moves the stroke rather than
 * stacking, which matches how the engine reads a pattern. Tapping the same
 * cell walks accent → normal → ghost → empty.
 */
function toggleCell(index, strokeId) {
  const b = state.build;
  const cur = b.steps[index];
  if (!cur || cur.stroke !== strokeId) {
    b.steps[index] = { stroke: strokeId, vel: 0.95 };
  } else if (cur.vel > 0.8) {
    cur.vel = 0.58;
  } else if (cur.vel > 0.42) {
    cur.vel = 0.3;
  } else {
    b.steps[index] = null;
  }
  renderGrid();
  const placed = b.steps[index];
  if (placed) engine.preview(placed.stroke, placed.vel);
}

async function previewBuild() {
  await resumeAudio();
  const r = buildAsRhythm();
  const wasPlaying = engine.playing;
  if (wasPlaying) engine.stop();

  state.rhythm = r;
  state.steps = state.build.steps.slice();
  engine.setRhythm(r, state.steps);
  engine.setBpm(state.bpm);
  refreshNow();
  buildRing();
  syncBpmUI();
  switchTab('play');

  if (!engine.playing) togglePlay();
  else engine.start();
}

function saveBuild() {
  const b = state.build;
  if (b.steps.every((s) => !s)) {
    toast('Place at least one stroke first');
    return;
  }
  const name = prompt('Name this pattern', b.name || `${b.pulse}/${b.unit} pattern`);
  if (name === null) return;

  const r = buildAsRhythm();
  r.id = 'custom-' + Date.now().toString(36);
  r.name = name.trim() || `${b.pulse}/${b.unit} pattern`;
  r.description = '';
  r.defaultBpm = state.bpm;

  state.custom.push(r);
  store.set('custom', state.custom);
  b.name = r.name;

  renderSaved();
  renderRhythmList();
  toast(`Saved “${r.name}”`);
}

function renderSaved() {
  const wrap = $('saved-wrap');
  const list = $('saved-list');
  wrap.hidden = state.custom.length === 0;
  list.innerHTML = '';

  state.custom.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'saved-item';

    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'saved-load';
    load.innerHTML =
      `<span class="saved-name">${r.name}</span>` +
      `<span class="saved-meta">${r.sig} · ${r.groups.join('+')} · ${r.defaultBpm} ${noteGlyph(r.bpmLabel)}</span>`;
    load.addEventListener('click', () => {
      state.build = newBuild(r);
      renderBuild();
      toast(`Loaded “${r.name}”`);
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'saved-del';
    del.textContent = '×';
    del.setAttribute('aria-label', `Delete ${r.name}`);
    del.addEventListener('click', () => {
      if (!confirm(`Delete “${r.name}”?`)) return;
      state.custom = state.custom.filter((x) => x.id !== r.id);
      store.set('custom', state.custom);
      renderSaved();
      renderRhythmList();
    });

    item.append(load, del);
    list.appendChild(item);
  });
}

// ── Settings ────────────────────────────────────────────────────────────
function applyAudioSettings() {
  setMasterVolume(state.settings.volume);
  setReverbAmount(state.settings.reverb);
}

function buildSettings() {
  const open = () => {
    $('sheet-backdrop').hidden = false;
    $('sheet-settings').hidden = false;
  };
  const close = () => {
    $('sheet-backdrop').hidden = true;
    $('sheet-settings').hidden = true;
  };
  $('btn-settings').addEventListener('click', open);
  $('sheet-close').addEventListener('click', close);
  $('sheet-backdrop').addEventListener('click', close);

  const vol = $('vol-slider');
  vol.value = Math.round(state.settings.volume * 100);
  $('vol-val').textContent = `${vol.value}%`;
  vol.addEventListener('input', () => {
    state.settings.volume = Number(vol.value) / 100;
    $('vol-val').textContent = `${vol.value}%`;
    setMasterVolume(state.settings.volume);
    store.set('settings', state.settings);
  });

  const rev = $('rev-slider');
  rev.value = Math.round(state.settings.reverb * 100);
  $('rev-val').textContent = `${rev.value}%`;
  rev.addEventListener('input', () => {
    state.settings.reverb = Number(rev.value) / 100;
    $('rev-val').textContent = `${rev.value}%`;
    setReverbAmount(state.settings.reverb);
    store.set('settings', state.settings);
  });

  const a4 = $('a4-slider');
  a4.value = state.settings.a4;
  $('a4-val').textContent = `A = ${a4.value} Hz`;
  a4.addEventListener('input', () => {
    state.settings.a4 = Number(a4.value);
    $('a4-val').textContent = `A = ${a4.value} Hz`;
    store.set('settings', state.settings);
    retuneDrone();
  });

  const wake = $('sw-wake');
  wake.checked = state.settings.wake;
  wake.addEventListener('change', () => {
    state.settings.wake = wake.checked;
    store.set('settings', state.settings);
    if (!wake.checked) releaseWakeLock();
    else if (engine.playing) requestWakeLock();
  });

  $('sheet-version').textContent = `Version ${VERSION}`;
}

// ── Wake lock ───────────────────────────────────────────────────────────
async function requestWakeLock() {
  if (!state.settings.wake || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    /* denied or unsupported — not worth surfacing */
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && engine?.playing) requestWakeLock();
});

// ── Toast ───────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1900);
}

// ── Service worker ──────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support unavailable — app still runs */
    });
  });
}

// Block the double-tap-to-zoom gesture that would otherwise fire between
// two quick taps on the pattern grid.
document.addEventListener('gesturestart', (e) => e.preventDefault());

loadState();
