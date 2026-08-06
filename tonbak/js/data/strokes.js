/**
 * Tonbak (تنبک) stroke definitions.
 *
 * The tonbak is a goblet drum: a goat-skin head stretched over a hollow
 * carved mulberry body that narrows to a stem and opens at the bell. Its
 * voice comes from two coupled systems — the circular membrane, whose modes
 * follow the Bessel-zero ratios (1 : 1.593 : 2.136 : 2.296 : 2.653 ...), and
 * the air cavity, whose Helmholtz resonance sits below the membrane's
 * fundamental and gives the Tom its depth.
 *
 * Each stroke is described as the hand striking that system:
 *   exciter  – the strike itself. `tilt` is contact stiffness: a fingertip
 *              on a taut skin is dark and slow, a snapped nail is bright and
 *              instant, and that difference is most of what separates Tom
 *              from Pelang before a single resonance is involved.
 *   contact  – the audible thud of finger meeting skin, heard before the
 *              head has begun to ring. Without it a stroke has pitch and no
 *              attack, which is what makes a drum sound synthetic.
 *   modes    – membrane resonances, driven by the excitation through
 *              bandpass resonators. `d` is T60 — seconds to fall 60 dB.
 *   body     – deep cavity partials as sines, where a resonator would need
 *              an impractical Q to ring that long that low.
 *
 * A rim strike (Bak) barely couples to the cavity, so it has almost no low
 * energy and the high membrane modes dominate. A centre strike (Tom) drives
 * the cavity hard and the low modes carry. That difference is what the
 * numbers here encode.
 *
 * Pitch glide (`glide`/`gt`): a struck head tightens under the blow and
 * settles as it recovers, so the low partials start sharp and fall.
 */

export const STROKES = {
  tom: {
    id: 'tom',
    name: 'Tom',
    fa: 'تم',
    letter: 'T',
    hand: 'Right hand, centre',
    color: '#e8b44a',
    description:
      'The deep open tone. Struck near the centre of the skin with the flat of the right-hand fingers, then lifted immediately so the head rings free. Drives the air cavity — this is the drum\'s bass voice and the anchor of every cycle.',
    pan: 0.0,
    gain: 1.0,
    spec: {
      duration: 0.95,
      // Flat fingers on a taut skin: a soft, broad contact, so the excitation
      // is dark and lasts a few milliseconds rather than cracking. The tilt
      // must still clear the contact highpass below, or the thud of hand
      // meeting skin is filtered away and only the pitch survives.
      exciter: { attack: 0.0006, decay: 0.0045, tilt: 3800, level: 1.0 },
      contact: { level: 0.95, hp: 900, decay: 0.0028 },
      // Helmholtz cavity coupled to the (0,1) membrane mode — the bass voice.
      body: [
        { f: 89, a: 1.0, d: 0.52, glide: 1.10, gt: 0.045 },
        { f: 139, a: 0.44, d: 0.34, glide: 1.07, gt: 0.034 },
      ],
      // (1,1) (2,1) (0,2) at the Bessel ratios, then the mulberry shell.
      modes: [
        { f: 221, a: 0.30, d: 0.20 },
        { f: 297, a: 0.19, d: 0.14 },
        { f: 319, a: 0.13, d: 0.12 },
        { f: 450, a: 0.10, d: 0.085 },
        { f: 640, a: 0.055, d: 0.05 },
        // The slap of the fingers themselves. Quiet and brief, but it is what
        // stops an open tone reading as a sine with an envelope on it.
        { f: 880, a: 0.055, d: 0.032 },
        { f: 1320, a: 0.030, d: 0.022 },
      ],
    },
  },

  bak: {
    id: 'bak',
    name: 'Bak',
    fa: 'بک',
    letter: 'B',
    hand: 'Left hand, rim',
    color: '#4fd1c5',
    description:
      'The bright rim slap. Fingers of the left hand strike close to the edge of the skin, where the membrane is stiffest. Almost no cavity coupling, so it is dry, crisp and short — the counterweight to Tom that gives a rhythm its edge.',
    pan: 0.16,
    gain: 0.86,
    spec: {
      duration: 0.30,
      // Fingertips at the stiff edge of the head: hard, fast, bright contact.
      exciter: { attack: 0.00025, decay: 0.0024, tilt: 7200, level: 1.0 },
      contact: { level: 0.85, hp: 3400, decay: 0.0016 },
      // A rim strike barely couples to the cavity, so almost nothing low.
      body: [{ f: 154, a: 0.075, d: 0.085 }],
      modes: [
        { f: 612, a: 0.30, d: 0.090 },
        { f: 1128, a: 0.42, d: 0.075 },
        { f: 1795, a: 0.40, d: 0.058 },
        { f: 2740, a: 0.30, d: 0.044 },
        { f: 3980, a: 0.19, d: 0.033 },
        { f: 5700, a: 0.10, d: 0.024 },
      ],
    },
  },

  eshareh: {
    id: 'eshareh',
    name: 'Eshareh',
    fa: 'اشاره',
    letter: 'E',
    hand: 'Index finger, mid-skin',
    color: '#9f8fd6',
    description:
      'A light pointing-finger tap between rim and centre. Quiet, unaccented filler — the strokes that sit between the main beats and give a Persian rhythm its forward lean rather than its pulse.',
    pan: -0.12,
    gain: 0.52,
    spec: {
      duration: 0.24,
      exciter: { attack: 0.0004, decay: 0.0020, tilt: 4600, level: 0.85 },
      contact: { level: 0.52, hp: 2400, decay: 0.0013 },
      body: [{ f: 132, a: 0.05, d: 0.055 }],
      modes: [
        { f: 524, a: 0.28, d: 0.072 },
        { f: 988, a: 0.27, d: 0.056 },
        { f: 1565, a: 0.18, d: 0.041 },
        { f: 2420, a: 0.10, d: 0.030 },
        { f: 3620, a: 0.05, d: 0.021 },
      ],
    },
  },

  pelang: {
    id: 'pelang',
    name: 'Pelang',
    fa: 'پلنگ',
    letter: 'P',
    hand: 'Snapped finger',
    color: '#f2765c',
    description:
      'The "leopard" — a finger snapped off the thumb onto the skin. A sharp crack with almost no pitch, used as a whip-like accent. The fastest transient the drum makes.',
    pan: 0.22,
    gain: 0.72,
    spec: {
      duration: 0.26,
      // A fingernail snapping off the thumb — the hardest, fastest contact
      // the hand makes, and nearly all of the sound.
      exciter: { attack: 0.00015, decay: 0.0014, tilt: 11000, level: 1.0 },
      contact: { level: 1.0, hp: 4800, decay: 0.0009 },
      // Barely any low end, and gone quickly — a snap that leaves a lingering
      // thump behind it stops sounding like a snap.
      body: [{ f: 128, a: 0.055, d: 0.028 }],
      modes: [
        { f: 905, a: 0.22, d: 0.048 },
        { f: 1620, a: 0.30, d: 0.040 },
        { f: 2640, a: 0.36, d: 0.032 },
        { f: 4250, a: 0.30, d: 0.023 },
        { f: 6900, a: 0.18, d: 0.016 },
      ],
    },
  },

  qom: {
    id: 'qom',
    name: 'Qom',
    fa: 'قم',
    letter: 'Q',
    hand: 'Right hand, damped',
    color: '#c98a5b',
    description:
      'A muted low tone — the centre struck with the hand left resting on the skin, so the head is damped and the cavity choked. Shorter and drier than Tom, it marks weak beats without filling the bar.',
    pan: -0.05,
    gain: 0.80,
    spec: {
      duration: 0.36,
      // Same strike as Tom, but the resting hand loads the skin: the cavity
      // is choked and everything dies away far sooner.
      exciter: { attack: 0.0006, decay: 0.0040, tilt: 3200, level: 0.95 },
      contact: { level: 0.78, hp: 850, decay: 0.0025 },
      body: [
        { f: 96, a: 0.90, d: 0.155, glide: 1.09, gt: 0.028 },
        { f: 151, a: 0.30, d: 0.110 },
      ],
      modes: [
        { f: 240, a: 0.16, d: 0.070 },
        { f: 332, a: 0.09, d: 0.050 },
        { f: 525, a: 0.05, d: 0.035 },
      ],
    },
  },

  // The individual grain of a Riz roll. Never placed on the grid directly —
  // the engine sprays these across a step when it meets an R.
  riztap: {
    id: 'riztap',
    name: 'Riz grain',
    fa: 'ریز',
    letter: 'R',
    hand: 'Four fingers, rolling',
    hidden: true,
    color: '#7fb3e8',
    description:
      'One grain of a Riz roll. Too quiet to use alone — the roll is the sound of many of these in succession.',
    pan: 0.0,
    gain: 0.34,
    spec: {
      duration: 0.16,
      exciter: { attack: 0.0003, decay: 0.0016, tilt: 5200, level: 0.8 },
      contact: { level: 0.55, hp: 2700, decay: 0.0011 },
      modes: [
        { f: 562, a: 0.26, d: 0.052 },
        { f: 1062, a: 0.25, d: 0.042 },
        { f: 1700, a: 0.16, d: 0.031 },
        { f: 2620, a: 0.08, d: 0.022 },
      ],
    },
  },
};

/**
 * Riz is a technique, not a single hit, so it lives beside the strokes rather
 * than among them: on the grid it means "roll from here until the next event".
 */
export const RIZ = {
  id: 'riz',
  name: 'Riz',
  fa: 'ریز',
  letter: 'R',
  hand: 'Four fingers, rolling',
  color: '#7fb3e8',
  isRoll: true,
  description:
    'The roll. The four fingers of the right hand fall in rapid succession so the strokes blur into a continuous shimmer. On the grid a Riz fills forward until the next stroke, so its length follows the rhythm rather than the tempo.',
};

/** Everything the Sounds library shows, in playing order. */
export const STROKE_LIST = [
  STROKES.tom,
  STROKES.bak,
  STROKES.eshareh,
  STROKES.pelang,
  STROKES.qom,
  RIZ,
];

export const LETTER_TO_STROKE = {
  T: 'tom',
  B: 'bak',
  E: 'eshareh',
  P: 'pelang',
  Q: 'qom',
  R: 'riz',
};

/** Order used when tapping a cell in the pattern builder cycles through strokes. */
export const CYCLE_ORDER = ['tom', 'bak', 'eshareh', 'pelang', 'qom', 'riz'];
