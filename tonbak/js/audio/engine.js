/**
 * The rhythm engine.
 *
 * Timing is the whole job here. `setTimeout` drifts by tens of milliseconds
 * under load, which is audible as sloppiness within a bar or two, so the
 * timer never plays anything — it only looks a short way into the future and
 * books strokes at exact AudioContext timestamps. The audio clock, not the
 * JavaScript clock, decides when a stroke happens.
 *
 * The UI reads from a queue of scheduled steps on requestAnimationFrame, so
 * the ring stays locked to what you hear even when the main thread stutters.
 */

import { getContext, getNodes } from './context.js';
import { STROKES } from '../data/strokes.js';
import { parsePattern, totalSteps, stepDuration, groupStartSteps } from '../data/rhythms.js';
import { LETTER_TO_STROKE } from '../data/strokes.js';
import { VARIANT_COUNT } from './synth.js';

const LOOKAHEAD_MS = 25; // how often the scheduler wakes
const SCHEDULE_AHEAD = 0.14; // seconds of future booked on each wake

export class RhythmEngine {
  constructor(buffers) {
    this.buffers = buffers;
    this.playing = false;
    this.rhythm = null;
    this.steps = [];
    this.bpm = 100;

    this.stepIndex = 0;
    this.nextStepTime = 0;
    this.cycle = 0;
    this.timer = null;

    // Round-robin cursor per stroke, so consecutive hits never reuse a variant.
    this.variantCursor = {};

    this.queue = []; // { step, time, cycle, countIn }
    this.countInCycles = 0;
    this.countInRemaining = 0;

    this.trainer = null; // { every, delta, max, onChange }
    this.muted = new Set();

    this.onStep = null; // (step, cycle, countIn) => void
    this.onCycle = null; // (cycle) => void
    this.onBpm = null; // (bpm) => void
  }

  /** Load a rhythm; `steps` may be supplied directly for unsaved editor work. */
  setRhythm(rhythm, steps) {
    this.rhythm = rhythm;
    this.steps = steps || parsePattern(rhythm.pattern, LETTER_TO_STROKE);
    const n = totalSteps(rhythm);
    while (this.steps.length < n) this.steps.push(null);
    this.steps.length = n;
    if (this.stepIndex >= n) this.stepIndex = 0;
  }

  setSteps(steps) {
    this.steps = steps.slice();
  }

  setBpm(bpm) {
    this.bpm = Math.max(20, Math.min(500, Math.round(bpm)));
    if (this.onBpm) this.onBpm(this.bpm);
  }

  setMuted(strokeId, muted) {
    if (muted) this.muted.add(strokeId);
    else this.muted.delete(strokeId);
  }

  setTrainer(cfg) {
    this.trainer = cfg;
  }

  setCountIn(cycles) {
    this.countInCycles = cycles;
  }

  start() {
    if (this.playing || !this.rhythm) return;
    const ctx = getContext();
    if (!ctx) return;

    this.playing = true;
    this.stepIndex = 0;
    this.cycle = 0;
    this.queue.length = 0;
    this.countInRemaining = this.countInCycles;
    // Small offset so the very first stroke is scheduled, not fired late.
    this.nextStepTime = ctx.currentTime + 0.08;
    this._tick();
  }

  stop() {
    this.playing = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue.length = 0;
    this.stepIndex = 0;
  }

  toggle() {
    if (this.playing) this.stop();
    else this.start();
  }

  _tick() {
    if (!this.playing) return;
    const ctx = getContext();
    const horizon = ctx.currentTime + SCHEDULE_AHEAD;

    while (this.nextStepTime < horizon && this.playing) {
      this._scheduleStep(this.stepIndex, this.nextStepTime);
      this._advance();
    }

    this.timer = setTimeout(() => this._tick(), LOOKAHEAD_MS);
  }

  _advance() {
    const r = this.rhythm;
    const n = totalSteps(r);
    this.nextStepTime += stepDuration(r, this.bpm);
    this.stepIndex++;

    if (this.stepIndex >= n) {
      this.stepIndex = 0;
      if (this.countInRemaining > 0) {
        this.countInRemaining--;
      } else {
        this.cycle++;
        this._applyTrainer();
      }
    }
  }

  /** Nudge the tempo up every N cycles once the trainer is on. */
  _applyTrainer() {
    const t = this.trainer;
    if (!t || !t.enabled) return;
    if (this.cycle === 0 || this.cycle % t.every !== 0) return;

    const next = this.bpm + t.delta;
    if (next > t.max) {
      if (t.loop) this.setBpm(t.start);
      return;
    }
    this.setBpm(next);
  }

  _scheduleStep(index, time) {
    const r = this.rhythm;
    const counting = this.countInRemaining > 0;

    this.queue.push({ step: index, time, cycle: this.cycle, countIn: counting });

    if (counting) {
      this._scheduleCountIn(index, time);
      return;
    }

    const cell = this.steps[index];
    if (!cell) return;

    if (cell.stroke === 'riz') {
      this._scheduleRiz(index, time, cell.vel);
      return;
    }
    if (this.muted.has(cell.stroke)) return;
    this.play(cell.stroke, time, cell.vel);
  }

  /** Count-in clicks the felt beats, not every grid step. */
  _scheduleCountIn(index, time) {
    const starts = groupStartSteps(this.rhythm);
    const pos = starts.indexOf(index);
    if (pos === -1) return;
    this.play(pos === 0 ? 'bak' : 'eshareh', time, pos === 0 ? 0.85 : 0.5);
  }

  /**
   * A Riz runs from its own step until the next event, so its length follows
   * the music rather than a fixed note value. Grain density is chosen to keep
   * the roll around 30 strokes a second at any tempo — below that it reads as
   * separate taps, above it turns to mush.
   */
  _scheduleRiz(index, time, vel) {
    if (this.muted.has('riz')) return;
    const r = this.rhythm;
    const n = totalSteps(r);
    const sd = stepDuration(r, this.bpm);

    let span = 1;
    for (let i = 1; i < n; i++) {
      if (this.steps[(index + i) % n]) break;
      span++;
    }
    const seconds = span * sd;

    const perStep = Math.max(2, Math.min(8, Math.round(sd * 30)));
    const count = Math.max(3, Math.round(perStep * span));
    const gap = seconds / count;

    for (let i = 0; i < count; i++) {
      // Accent the first grain, then a light waver so it breathes.
      const shape = i === 0 ? 1.0 : 0.62 + 0.16 * Math.sin(i * 1.7);
      this.play('riztap', time + i * gap, vel * shape, 0.03);
    }
  }

  /**
   * Fire one stroke at an exact time. `time` in the past is clamped forward —
   * BufferSource.start() with a stale timestamp plays immediately and out of
   * place, which is worse than a fraction of a millisecond late.
   */
  play(strokeId, time, vel = 0.9, humanise = 0.012) {
    const ctx = getContext();
    const nodes = getNodes();
    if (!ctx || !nodes) return;

    const id = strokeId === 'riz' ? 'riztap' : strokeId;
    const bank = this.buffers[id];
    const def = STROKES[id];
    if (!bank || !def) return;

    const cursor = (this.variantCursor[id] || 0) % VARIANT_COUNT;
    this.variantCursor[id] = cursor + 1;

    const src = ctx.createBufferSource();
    src.buffer = bank[cursor];
    // A hair of pitch drift stands in for hitting a slightly different spot.
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * humanise;

    const g = ctx.createGain();
    const v = Math.max(0, Math.min(1, vel));
    // Perceptual curve — velocity should feel like force, not like a fader.
    g.gain.value = def.gain * Math.pow(v, 1.6) * (1 + (Math.random() * 2 - 1) * 0.04);

    let tail = g;
    if (ctx.createStereoPanner && def.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = def.pan;
      g.connect(p);
      tail = p;
    }

    src.connect(g);
    tail.connect(nodes.dry);
    tail.connect(nodes.send);

    const when = Math.max(time, ctx.currentTime);
    src.start(when);
    src.stop(when + src.buffer.duration / src.playbackRate.value + 0.05);
    src.onended = () => {
      try {
        src.disconnect();
        g.disconnect();
        if (tail !== g) tail.disconnect();
      } catch {
        /* already torn down */
      }
    };
  }

  /** One-off audition from the Sounds library or the pattern editor. */
  preview(strokeId, vel = 0.95) {
    const ctx = getContext();
    if (!ctx) return;
    if (strokeId === 'riz') {
      const gap = 1 / 30;
      for (let i = 0; i < 14; i++) {
        this.play('riztap', ctx.currentTime + 0.02 + i * gap, i === 0 ? vel : vel * 0.68);
      }
      return;
    }
    this.play(strokeId, ctx.currentTime + 0.02, vel);
  }

  /**
   * Steps whose scheduled time has arrived, for the UI to draw. Everything
   * still in the future stays queued.
   */
  drainDue() {
    const ctx = getContext();
    if (!ctx) return [];
    const now = ctx.currentTime;
    const due = [];
    while (this.queue.length && this.queue[0].time <= now) due.push(this.queue.shift());
    return due;
  }
}
