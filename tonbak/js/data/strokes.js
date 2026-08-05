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
 * Each stroke below is described as that physical system responds to it:
 *   modes  – the ringing partials (sine, exponential decay, optional pitch glide)
 *   noise  – band-limited skin/finger contact noise
 *   click  – the initial impact transient
 *
 * A rim strike (Bak) barely couples to the cavity, so it has almost no low
 * energy and the high membrane modes dominate. A centre strike (Tom) drives
 * the cavity hard and the low modes carry. That difference is what the
 * numbers here encode.
 */

// Pitch glide: real drum heads sharpen under the strike and settle back as
// the skin tension normalises, so partials start high and fall.

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
      duration: 1.15,
      drive: 1.35,
      modes: [
        // Helmholtz cavity + coupled (0,1) — the body of the sound
        { f: 87, a: 1.0, d: 0.66, glide: 1.11, gt: 0.048 },
        { f: 138, a: 0.52, d: 0.42, glide: 1.085, gt: 0.038 },
        // (1,1) at ~1.593x, (2,1) at ~2.136x, (0,2) at ~2.296x of 138
        { f: 220, a: 0.24, d: 0.25, glide: 1.06, gt: 0.03 },
        { f: 295, a: 0.13, d: 0.16 },
        { f: 317, a: 0.09, d: 0.13 },
        { f: 366, a: 0.06, d: 0.1 },
        // mulberry shell ring
        { f: 448, a: 0.045, d: 0.07 },
      ],
      noise: [
        { f: 255, q: 0.9, a: 0.5, d: 0.022, attack: 0.0012 },
        { f: 1350, q: 0.8, a: 0.11, d: 0.008, attack: 0.0006 },
      ],
      click: { a: 0.22, d: 0.0035, f: 2600 },
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
    gain: 0.82,
    spec: {
      duration: 0.34,
      drive: 1.15,
      modes: [
        { f: 612, a: 0.42, d: 0.058 },
        { f: 1124, a: 0.38, d: 0.046 },
        { f: 1790, a: 0.28, d: 0.035 },
        { f: 2735, a: 0.17, d: 0.026 },
        { f: 3960, a: 0.09, d: 0.018 },
        // a rim hit still moves a little air in the shell
        { f: 152, a: 0.1, d: 0.055, glide: 1.05, gt: 0.02 },
      ],
      noise: [
        { f: 2600, q: 0.7, a: 0.82, d: 0.04, attack: 0.0006 },
        { f: 5300, q: 0.6, a: 0.34, d: 0.017, attack: 0.0004 },
        { f: 900, q: 1.4, a: 0.2, d: 0.031, attack: 0.0009 },
      ],
      click: { a: 0.4, d: 0.0022, f: 5200 },
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
    gain: 0.46,
    spec: {
      duration: 0.24,
      drive: 1.0,
      modes: [
        { f: 522, a: 0.26, d: 0.052 },
        { f: 985, a: 0.19, d: 0.04 },
        { f: 1565, a: 0.11, d: 0.029 },
        { f: 2410, a: 0.06, d: 0.02 },
      ],
      noise: [
        { f: 1900, q: 0.9, a: 0.4, d: 0.025, attack: 0.0009 },
        { f: 3800, q: 0.7, a: 0.13, d: 0.011, attack: 0.0005 },
      ],
      click: { a: 0.14, d: 0.0026, f: 3400 },
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
    gain: 0.7,
    spec: {
      duration: 0.28,
      drive: 1.5,
      modes: [
        { f: 880, a: 0.2, d: 0.042 },
        { f: 2210, a: 0.16, d: 0.026 },
        { f: 121, a: 0.16, d: 0.075, glide: 1.09, gt: 0.022 },
      ],
      noise: [
        { f: 3650, q: 0.55, a: 1.0, d: 0.023, attack: 0.0003 },
        { f: 7100, q: 0.5, a: 0.48, d: 0.011, attack: 0.0002 },
        { f: 1500, q: 1.0, a: 0.33, d: 0.032, attack: 0.0007 },
      ],
      click: { a: 0.6, d: 0.0015, f: 7000 },
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
    gain: 0.78,
    spec: {
      duration: 0.4,
      drive: 1.2,
      modes: [
        { f: 95, a: 0.85, d: 0.14, glide: 1.1, gt: 0.03 },
        { f: 149, a: 0.34, d: 0.095 },
        { f: 238, a: 0.14, d: 0.055 },
        { f: 330, a: 0.06, d: 0.035 },
      ],
      noise: [
        { f: 300, q: 0.9, a: 0.48, d: 0.019, attack: 0.0011 },
        { f: 1250, q: 0.8, a: 0.11, d: 0.007, attack: 0.0005 },
      ],
      click: { a: 0.2, d: 0.003, f: 2400 },
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
    gain: 0.3,
    spec: {
      duration: 0.16,
      drive: 1.0,
      modes: [
        { f: 560, a: 0.22, d: 0.034 },
        { f: 1060, a: 0.15, d: 0.026 },
        { f: 1680, a: 0.08, d: 0.018 },
      ],
      noise: [
        { f: 2200, q: 0.85, a: 0.42, d: 0.018, attack: 0.0006 },
        { f: 4400, q: 0.7, a: 0.15, d: 0.008, attack: 0.0004 },
      ],
      click: { a: 0.16, d: 0.002, f: 4200 },
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
