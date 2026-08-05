/**
 * Renders each tonbak stroke offline, once, into an AudioBuffer.
 *
 * Doing the physical modelling up front rather than per-hit buys two things
 * that matter for a rhythm app: playback costs a single node per stroke (a
 * Riz roll can fire forty times a second on a phone without glitching), and
 * scheduling stays sample-accurate because nothing is being built during the
 * bar.
 *
 * Each stroke is rendered in several variants with the modal frequencies and
 * decays jittered slightly. Cycling through them is what stops a repeated
 * Tom from sounding like a machine gun — no real drummer hits the same spot
 * twice, and the ear notices immediately when one does.
 */

const VARIANTS = 4;

/** Deterministic PRNG so a given variant renders identically every launch. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noiseBuffer(ctx, seconds, rand) {
  const len = Math.max(1, Math.ceil(seconds * ctx.sampleRate));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = rand() * 2 - 1;
  return buf;
}

/** Soft asymmetric saturation — stands in for the nonlinearity of a driven skin. */
function saturationCurve(drive) {
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

/**
 * Exponential decay shaped like a struck resonator: near-instant attack, then
 * a fall that never quite reaches zero (setTargetAtTime), closed off by a
 * short ramp so the buffer ends silent instead of clicking.
 */
function ring(param, peak, decay, t0, duration) {
  param.setValueAtTime(0, t0);
  param.linearRampToValueAtTime(peak, t0 + 0.0008);
  param.setTargetAtTime(0, t0 + 0.0008, decay / 3.2);
  const tail = Math.min(t0 + duration, t0 + decay * 3.6);
  if (tail > t0 + 0.002) param.setTargetAtTime(0, tail, 0.008);
}

function renderVariant(spec, sampleRate, seed) {
  const rand = mulberry32(seed);
  const dur = spec.duration;
  const ctx = new OfflineAudioContext(1, Math.ceil(dur * sampleRate), sampleRate);

  // Per-variant drift: a couple of percent on tuning, a little more on decay.
  const jitter = (amt) => 1 + (rand() * 2 - 1) * amt;

  const out = ctx.createGain();
  out.gain.value = 1;

  const shaper = ctx.createWaveShaper();
  shaper.curve = saturationCurve(spec.drive || 1);
  shaper.oversample = '2x';
  shaper.connect(out);

  // Block DC and the sub-audible rumble the low modes can accumulate.
  const dcBlock = ctx.createBiquadFilter();
  dcBlock.type = 'highpass';
  dcBlock.frequency.value = 34;
  dcBlock.Q.value = 0.7;
  out.connect(dcBlock);
  dcBlock.connect(ctx.destination);

  // --- Ringing partials -------------------------------------------------
  for (const m of spec.modes || []) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const f = m.f * jitter(0.015);
    const decay = m.d * jitter(0.08);

    if (m.glide) {
      // Head sharpens under the strike, then settles.
      osc.frequency.setValueAtTime(f * m.glide, 0);
      osc.frequency.exponentialRampToValueAtTime(f, m.gt || 0.03);
    } else {
      osc.frequency.setValueAtTime(f, 0);
    }

    const g = ctx.createGain();
    ring(g.gain, m.a * jitter(0.06), decay, 0, dur);
    osc.connect(g);
    g.connect(shaper);
    osc.start(0);
    osc.stop(dur);
  }

  // --- Skin and finger-contact noise ------------------------------------
  for (const n of spec.noise || []) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, Math.min(dur, n.d * 6 + 0.02), rand);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = n.f * jitter(0.04);
    bp.Q.value = n.q;

    const g = ctx.createGain();
    const attack = n.attack || 0.0008;
    const decay = n.d * jitter(0.1);
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(n.a * jitter(0.07), attack);
    g.gain.setTargetAtTime(0, attack, decay / 3);

    src.connect(bp);
    bp.connect(g);
    g.connect(shaper);
    src.start(0);
  }

  // --- Impact transient -------------------------------------------------
  if (spec.click) {
    const c = spec.click;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, Math.min(dur, 0.02), rand);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = c.f;
    hp.Q.value = 0.6;

    const g = ctx.createGain();
    g.gain.setValueAtTime(c.a * jitter(0.08), 0);
    g.gain.exponentialRampToValueAtTime(0.0001, c.d);

    src.connect(hp);
    hp.connect(g);
    g.connect(shaper);
    src.start(0);
  }

  return ctx.startRendering();
}

/**
 * A short, dark room. Not a concert hall — a tonbak played in a large space
 * loses its attack, and the attack is where the technique lives. This is
 * closer to a carpeted room with the drum a metre away.
 */
export function renderRoomImpulse(ctx, seconds = 1.1) {
  const rate = ctx.sampleRate;
  const len = Math.ceil(seconds * rate);
  const off = new OfflineAudioContext(2, len, rate);
  const buf = off.createBuffer(2, len, rate);
  const rand = mulberry32(0x5eed);

  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Slight pre-delay, exponential decay, and a gentle high-frequency roll-off
      // baked in by tilting the noise as it decays.
      const env = Math.pow(1 - t, 3.2);
      data[i] = (rand() * 2 - 1) * env;
    }
    // Cheap one-pole lowpass so the tail darkens as it fades.
    let z = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const coef = 0.28 + 0.5 * t;
      z += (data[i] - z) * (1 - coef);
      data[i] = z * 0.9;
    }
  }

  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start(0);
  return off.startRendering();
}

/**
 * Renders every stroke's variants. Returns { tom: [AudioBuffer x4], ... }.
 * Called once at startup; takes well under a second on a modern phone.
 */
export async function renderAllStrokes(strokes, sampleRate) {
  const out = {};
  const jobs = [];

  for (const key of Object.keys(strokes)) {
    const stroke = strokes[key];
    out[key] = new Array(VARIANTS);
    for (let v = 0; v < VARIANTS; v++) {
      // Seed from the stroke name so variants are stable across sessions.
      let seed = v * 7919 + 13;
      for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
      jobs.push(
        renderVariant(stroke.spec, sampleRate, seed).then((buf) => {
          out[key][v] = buf;
        })
      );
    }
  }

  await Promise.all(jobs);

  // Scale each stroke to a known peak. The modal sums are additive, so a
  // stroke with many partials lands hotter than one with few for reasons
  // that have nothing to do with how loud it should be. Normalising here
  // makes the `gain` field in strokes.js the only thing that sets balance,
  // and leaves consistent headroom under the limiter.
  for (const key of Object.keys(out)) {
    let peak = 0;
    for (const buf of out[key]) {
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
      }
    }
    if (peak < 1e-6) continue;
    // One factor across all variants, so their relative dynamics survive.
    const scale = 0.95 / peak;
    for (const buf of out[key]) {
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] *= scale;
    }
  }

  return out;
}

export const VARIANT_COUNT = VARIANTS;
