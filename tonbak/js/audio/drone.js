/**
 * Sustained reference drone.
 *
 * A drone you practise against for twenty minutes has to be steady enough to
 * tune to and alive enough not to grate. Both come from the same trick:
 * several detuned oscillators per pitch, each with its own slow, unrelated
 * amplitude drift, so the sound never settles into a fixed beating pattern
 * the ear can lock onto and start resenting.
 */

import { getContext, getNodes } from './context.js';

// Harmonic weights roughly following a bowed string: strong fundamental,
// present low harmonics, nothing sharp above the sixth.
const PARTIALS = [
  { h: 1, a: 1.0, detune: 0 },
  { h: 1, a: 0.55, detune: -7 },
  { h: 1, a: 0.55, detune: 6 },
  { h: 2, a: 0.34, detune: 3 },
  { h: 3, a: 0.17, detune: -4 },
  { h: 4, a: 0.1, detune: 5 },
  { h: 5, a: 0.05, detune: -6 },
  { h: 6, a: 0.032, detune: 4 },
];

export class Drone {
  constructor() {
    this.voices = [];
    this.playing = false;
    this.freqs = [];
  }

  get isPlaying() {
    return this.playing;
  }

  /** Start (or retune to) a set of frequencies. */
  play(freqs) {
    const ctx = getContext();
    const nodes = getNodes();
    if (!ctx || !nodes) return;

    this.freqs = freqs.slice();

    if (this.playing && this.voices.length === freqs.length) {
      this._retune(freqs);
      return;
    }

    this.stop(0.05);
    this.playing = true;

    const now = ctx.currentTime;
    freqs.forEach((f, i) => {
      const voice = this._buildVoice(ctx, nodes, f, i === 0 ? 1 : 0.5);
      voice.gain.gain.setValueAtTime(0, now);
      voice.gain.gain.linearRampToValueAtTime(voice.level, now + 0.7);
      this.voices.push(voice);
    });
  }

  _buildVoice(ctx, nodes, freq, level) {
    const out = ctx.createGain();
    out.gain.value = 0;

    // Roll off the top so the drone sits under the drum instead of over it.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1900;
    lp.Q.value = 0.5;
    lp.connect(out);
    out.connect(nodes.drone);

    // Very slow filter movement — the "breath" of the tone.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 380;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    lfo.start();

    const oscs = [];
    for (const p of PARTIALS) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * p.h;
      osc.detune.value = p.detune;

      const g = ctx.createGain();
      g.gain.value = (p.a * level) / 3.4;

      // Independent slow drift per partial — never in phase with the others.
      const amp = ctx.createOscillator();
      amp.frequency.value = 0.045 + Math.random() * 0.11;
      const ampDepth = ctx.createGain();
      ampDepth.gain.value = g.gain.value * 0.22;
      amp.connect(ampDepth);
      ampDepth.connect(g.gain);
      amp.start();

      osc.connect(g);
      g.connect(lp);
      osc.start();
      oscs.push({ osc, amp, lfoNodes: [ampDepth, g] });
    }

    return { gain: out, lp, lfo, lfoGain, oscs, level: level * 0.85, freq };
  }

  _retune(freqs) {
    const ctx = getContext();
    const now = ctx.currentTime;
    this.voices.forEach((v, i) => {
      const f = freqs[i];
      if (f === undefined) return;
      v.freq = f;
      v.oscs.forEach(({ osc }, j) => {
        // Glide rather than jump — a hard retune clicks.
        osc.frequency.setTargetAtTime(f * PARTIALS[j].h, now, 0.04);
      });
    });
  }

  stop(fade = 0.5) {
    const ctx = getContext();
    if (!ctx) {
      this.voices = [];
      this.playing = false;
      return;
    }
    const now = ctx.currentTime;
    const dying = this.voices;
    this.voices = [];
    this.playing = false;

    for (const v of dying) {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0, now + fade);
      const stopAt = now + fade + 0.05;
      try {
        v.lfo.stop(stopAt);
        v.oscs.forEach(({ osc, amp }) => {
          osc.stop(stopAt);
          amp.stop(stopAt);
        });
      } catch {
        /* already stopped */
      }
      setTimeout(() => {
        try {
          v.gain.disconnect();
          v.lp.disconnect();
        } catch {
          /* torn down */
        }
      }, (fade + 0.2) * 1000);
    }
  }

  toggle(freqs) {
    if (this.playing) this.stop();
    else this.play(freqs);
  }
}
