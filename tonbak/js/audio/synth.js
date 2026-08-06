/**
 * Renders each tonbak stroke offline, once, into an AudioBuffer.
 *
 * The model is excitation → resonators, which is how the drum actually works:
 * a finger striking the skin injects a broadband impulse, and the membrane
 * and cavity ring in response. Everything the ear uses to identify a drum
 * lives in the first few milliseconds of that contact noise — a bank of
 * independent sine oscillators reproduces the pitch and none of the identity,
 * and reads as a synth bass rather than a struck skin.
 *
 * So each stroke is built from three layers:
 *
 *   contact    1–4 ms of filtered noise: the finger meeting the skin
 *   resonance  that same excitation through parallel bandpass resonators,
 *              whose Q sets both the ring time and the bandwidth — physically
 *              coupled, as they are on a real head
 *   body       sine partials for the deep cavity modes only, where a filter
 *              would need an impractical Q to ring that long that low
 *
 * Rendering offline once buys sample-accurate playback at one node per hit,
 * so a Riz roll can fire forty times a second on a phone without glitching.
 *
 * Decay times below are **T60** — seconds to fall 60 dB — so the numbers mean
 * what they say when compared against a recording.
 */

const VARIANTS = 4;

// e^(-t/τ) reaches -60 dB at t = ln(1000)·τ, so this converts T60 to the
// time-constant setTargetAtTime wants.
const T60_TO_TAU = 1 / Math.log(1000);

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

/**
 * A resonator's ring time and its bandwidth are the same physical property.
 * Q = π·f·T60/ln(1000). Capped because very high Q at low frequency is both
 * numerically fragile and starts to sound like a tuned filter rather than a
 * drum head.
 */
function qForDecay(freq, t60) {
  return Math.min(240, Math.max(0.7, Math.PI * freq * t60 * T60_TO_TAU));
}

function renderVariant(spec, sampleRate, seed) {
  const rand = mulberry32(seed);
  const dur = spec.duration;
  const ctx = new OfflineAudioContext(1, Math.ceil(dur * sampleRate), sampleRate);
  const jitter = (amt) => 1 + (rand() * 2 - 1) * amt;

  const sum = ctx.createGain();
  sum.gain.value = 1;

  // Block DC and sub-audible rumble the low modes accumulate.
  const dcBlock = ctx.createBiquadFilter();
  dcBlock.type = 'highpass';
  dcBlock.frequency.value = 32;
  dcBlock.Q.value = 0.7;
  sum.connect(dcBlock);
  dcBlock.connect(ctx.destination);

  // ── Excitation ────────────────────────────────────────────────────────
  // One short noise burst drives everything, which is what couples the
  // layers: the transient and the ring share a source, as they do on a drum.
  const ex = spec.exciter;
  const exSrc = ctx.createBufferSource();
  exSrc.buffer = noiseBuffer(ctx, Math.min(dur, ex.decay * 8 + 0.01), rand);

  // Contact stiffness — a fingertip is softer than a fingernail, and the
  // corner frequency here is most of what separates Tom from Pelang.
  const exTilt = ctx.createBiquadFilter();
  exTilt.type = 'lowpass';
  exTilt.frequency.value = ex.tilt * jitter(0.06);
  exTilt.Q.value = 0.6;

  const exEnv = ctx.createGain();
  const atk = ex.attack || 0.0004;
  exEnv.gain.setValueAtTime(0, 0);
  exEnv.gain.linearRampToValueAtTime(ex.level * jitter(0.05), atk);
  exEnv.gain.exponentialRampToValueAtTime(0.0001, atk + ex.decay * jitter(0.12));

  exSrc.connect(exTilt);
  exTilt.connect(exEnv);
  exSrc.start(0);

  // ── Contact transient ─────────────────────────────────────────────────
  // The part you hear before the head has begun to ring. Without it a stroke
  // has no attack, only pitch.
  if (spec.contact) {
    const c = spec.contact;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = c.hp * jitter(0.05);
    hp.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(c.level * jitter(0.07), 0.0002);
    g.gain.exponentialRampToValueAtTime(0.0001, 0.0002 + c.decay * jitter(0.15));

    exEnv.connect(hp);
    hp.connect(g);
    g.connect(sum);
  }

  // ── Membrane resonances ───────────────────────────────────────────────
  // Driven by an impulse rather than the noise burst. A narrow resonator only
  // captures the sliver of a burst's energy that falls inside its band, so a
  // few milliseconds of noise leaves it barely ringing — measurably ~27 dB
  // under where it should sit. An impulse excites every mode fully, and its
  // response is exact enough to solve for the gain instead of trimming by ear.
  let impulse = null;
  if ((spec.modes || []).length) {
    const buf = ctx.createBuffer(1, 2, sampleRate);
    buf.getChannelData(0)[0] = 1;
    impulse = ctx.createBufferSource();
    impulse.buffer = buf;
    impulse.start(0);
  }

  // A little of the contact noise goes in alongside, so the modes are dirtied
  // by the strike rather than ringing like struck glass.
  const grit = ctx.createGain();
  grit.gain.value = 0.35;
  exEnv.connect(grit);

  for (const m of spec.modes || []) {
    const f = m.f * jitter(0.02);
    const t60 = m.d * jitter(0.1);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = qForDecay(f, t60);

    // A bandpass at unity peak gain answers an impulse with a decaying
    // sinusoid peaking near ω₀/Q. A one-sample impulse carries area 1/sr, so
    // scaling by Q·sr/(2πf) makes `a` land as the mode's actual peak
    // amplitude — the numbers in strokes.js then mean what they say.
    const g = ctx.createGain();
    g.gain.value = (m.a * jitter(0.08) * bp.Q.value * sampleRate) / (2 * Math.PI * f);

    if (impulse) impulse.connect(bp);
    grit.connect(bp);
    bp.connect(g);
    g.connect(sum);
  }

  // ── Cavity / low body partials ────────────────────────────────────────
  // Sines, because a resonator ringing half a second at 90 Hz needs a Q that
  // is both unstable and audibly artificial.
  for (const b of spec.body || []) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const f = b.f * jitter(0.012);

    if (b.glide) {
      // A struck head tightens under the blow and settles as it recovers.
      osc.frequency.setValueAtTime(f * b.glide, 0);
      osc.frequency.exponentialRampToValueAtTime(f, b.gt || 0.03);
    } else {
      osc.frequency.setValueAtTime(f, 0);
    }

    const g = ctx.createGain();
    const t60 = b.d * jitter(0.08);
    // Sub-millisecond attack. Anything slower and the low end swells in after
    // the strike instead of arriving with it.
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(b.a * jitter(0.06), 0.0006);
    g.gain.setTargetAtTime(0, 0.0006, t60 * T60_TO_TAU);

    osc.connect(g);
    g.connect(sum);
    osc.start(0);
    osc.stop(dur);
  }

  return ctx.startRendering();
}

/**
 * A short, dark room. Not a hall — a tonbak played in a large space loses its
 * attack, and the attack is where the technique lives. Closer to a carpeted
 * room with the drum a metre away.
 */
export function renderRoomImpulse(ctx, seconds = 0.9) {
  const rate = ctx.sampleRate;
  const len = Math.ceil(seconds * rate);
  const off = new OfflineAudioContext(2, len, rate);
  const buf = off.createBuffer(2, len, rate);
  const rand = mulberry32(0x5eed);

  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (rand() * 2 - 1) * Math.pow(1 - t, 3.4);
    }
    // One-pole lowpass that closes as the tail fades, so it darkens with time.
    let z = 0;
    for (let i = 0; i < len; i++) {
      const coef = 0.3 + 0.5 * (i / len);
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
 * Called once at startup; well under a second on a modern phone.
 */
/**
 * Renders one stroke's variants and normalises them together.
 *
 * Peak is fixed per stroke, with a single factor across its variants so their
 * relative dynamics survive. Resonator output level depends on Q and mode
 * count for reasons unrelated to how loud a stroke should be, so normalising
 * here leaves `gain` in strokes.js as the only thing setting balance.
 *
 * Exposed separately from renderAllStrokes so the tuning panel can re-render
 * a single stroke while a rhythm is playing.
 */
export async function renderStrokeVariants(key, spec, sampleRate) {
  const bank = await Promise.all(
    Array.from({ length: VARIANTS }, (_, v) => {
      // Seed from the stroke name so variants are stable across sessions.
      let seed = v * 7919 + 13;
      for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
      return renderVariant(spec, sampleRate, seed);
    })
  );

  let peak = 0;
  for (const buf of bank) {
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
    }
  }
  if (peak > 1e-6) {
    const scale = 0.95 / peak;
    for (const buf of bank) {
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] *= scale;
    }
  }

  return bank;
}

export async function renderAllStrokes(strokes, sampleRate, specFor) {
  const keys = Object.keys(strokes);
  const banks = await Promise.all(
    keys.map((k) => renderStrokeVariants(k, specFor ? specFor(k) : strokes[k].spec, sampleRate))
  );
  return Object.fromEntries(keys.map((k, i) => [k, banks[i]]));
}

export const VARIANT_COUNT = VARIANTS;
