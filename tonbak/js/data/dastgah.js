/**
 * Drone pitches and dastgāh presets.
 *
 * Persian music does not fit a twelve-note keyboard. The koron (کرن) lowers a
 * note by roughly a quarter tone and the sori (سری) raises it by roughly the
 * same, and several dastgāh are unplayable without them — Segāh sits on a
 * koron degree, so a chromatic-only drone is simply the wrong note there.
 *
 * The 50-cent figure below is the conventional approximation. Real intonation
 * shifts by dastgāh, by region and by player, which is why there is a fine
 * tuning control in cents next to the preset list.
 */

export const KORON = -50;
export const SORI = 50;

/** Persian solfège alongside the Western letter — both are in daily use. */
export const NOTES = [
  { pc: 0, letter: 'C', fa: 'دو', solfege: 'Do' },
  { pc: 1, letter: 'C♯', fa: 'دو دیز', solfege: 'Do♯' },
  { pc: 2, letter: 'D', fa: 'ر', solfege: 'Re' },
  { pc: 3, letter: 'E♭', fa: 'می بمل', solfege: 'Mi♭' },
  { pc: 4, letter: 'E', fa: 'می', solfege: 'Mi' },
  { pc: 5, letter: 'F', fa: 'فا', solfege: 'Fa' },
  { pc: 6, letter: 'F♯', fa: 'فا دیز', solfege: 'Fa♯' },
  { pc: 7, letter: 'G', fa: 'سل', solfege: 'Sol' },
  { pc: 8, letter: 'A♭', fa: 'لا بمل', solfege: 'La♭' },
  { pc: 9, letter: 'A', fa: 'لا', solfege: 'La' },
  { pc: 10, letter: 'B♭', fa: 'سی بمل', solfege: 'Si♭' },
  { pc: 11, letter: 'B', fa: 'سی', solfege: 'Si' },
];

export const ACCIDENTALS = [
  { id: 'natural', symbol: '♮', name: 'Natural', fa: 'بکار', cents: 0 },
  { id: 'koron', symbol: 'ᶲ', name: 'Koron', fa: 'کرن', cents: KORON },
  { id: 'sori', symbol: '⁄', name: 'Sori', fa: 'سری', cents: SORI },
];

export const INTERVALS = [
  { id: 'tonic', name: 'Tonic only', fa: 'شاهد', ratios: [1] },
  { id: 'fifth', name: 'Tonic + fifth', fa: 'شاهد و پنجم', ratios: [1, 1.5] },
  { id: 'fourth', name: 'Tonic + fourth', fa: 'شاهد و چهارم', ratios: [1, 4 / 3] },
  { id: 'octave', name: 'Tonic + octave', fa: 'شاهد و اکتاو', ratios: [1, 2] },
];

/**
 * Suggested tonics only. Dastgāh are performed at whatever pitch suits the
 * singer or the instrument's tuning, so treat these as a starting point and
 * move the drone to wherever you actually play.
 */
export const DASTGAH = [
  {
    id: 'shur',
    name: 'Shur',
    fa: 'شور',
    pc: 7,
    accidental: 'natural',
    octave: 3,
    interval: 'fifth',
    note: 'The largest and most-played dastgāh. Sol is a common tonic; La is just as usual.',
  },
  {
    id: 'abu-ata',
    name: 'Abu-Atā',
    fa: 'ابوعطا',
    pc: 2,
    accidental: 'natural',
    octave: 3,
    interval: 'tonic',
    note: 'A derivative (āvāz) of Shur, resting a fourth above its parent.',
  },
  {
    id: 'bayat-tork',
    name: 'Bayāt-e Tork',
    fa: 'بیات ترک',
    pc: 10,
    accidental: 'natural',
    octave: 3,
    interval: 'fifth',
    note: 'Bright and open for a Shur derivative — often heard on Si♭.',
  },
  {
    id: 'afshari',
    name: 'Afshāri',
    fa: 'افشاری',
    pc: 2,
    accidental: 'natural',
    octave: 3,
    interval: 'tonic',
    note: 'Plaintive āvāz of the Shur family, usually taken around Re.',
  },
  {
    id: 'dashti',
    name: 'Dashti',
    fa: 'دشتی',
    pc: 7,
    accidental: 'natural',
    octave: 3,
    interval: 'fifth',
    note: 'The pastoral one. Shares Shur\'s tonic and leans on its fifth degree.',
  },
  {
    id: 'homayoun',
    name: 'Homāyun',
    fa: 'همایون',
    pc: 7,
    accidental: 'natural',
    octave: 3,
    interval: 'fifth',
    note: 'Grave and ceremonial. Sol is the usual reference.',
  },
  {
    id: 'esfahan',
    name: 'Bayāt-e Esfahān',
    fa: 'بیات اصفهان',
    pc: 2,
    accidental: 'natural',
    octave: 3,
    interval: 'tonic',
    note: 'Derivative of Homāyun, and the closest thing in the radif to a minor scale.',
  },
  {
    id: 'segah',
    name: 'Segāh',
    fa: 'سه‌گاه',
    pc: 4,
    accidental: 'koron',
    octave: 3,
    interval: 'fifth',
    note: 'Sits on a koron degree — Mi-koron. The quarter tone is not optional here.',
  },
  {
    id: 'chahargah',
    name: 'Chahārgāh',
    fa: 'چهارگاه',
    pc: 0,
    accidental: 'natural',
    octave: 3,
    interval: 'fifth',
    note: 'Dramatic and wide-intervalled, with koron and sori degrees above a Do tonic.',
  },
  {
    id: 'mahur',
    name: 'Māhur',
    fa: 'ماهور',
    pc: 0,
    accidental: 'natural',
    octave: 3,
    interval: 'fifth',
    note: 'The one that maps closest to a Western major scale. Do or Sol.',
  },
  {
    id: 'rast-panjgah',
    name: 'Rāst-Panjgāh',
    fa: 'راست‌پنجگاه',
    pc: 0,
    accidental: 'natural',
    octave: 3,
    interval: 'fifth',
    note: 'Shares Māhur\'s footing and ranges widely through the other dastgāh.',
  },
  {
    id: 'nava',
    name: 'Navā',
    fa: 'نوا',
    pc: 2,
    accidental: 'natural',
    octave: 3,
    interval: 'fifth',
    note: 'Calm and resolved, usually taken on Re or Sol.',
  },
];

/** Hz for a pitch class, octave, accidental and fine offset, against an A4 reference. */
export function noteFrequency({ pc, octave, cents = 0, a4 = 440 }) {
  const midi = 12 * (octave + 1) + pc;
  return a4 * Math.pow(2, (midi - 69) / 12) * Math.pow(2, cents / 1200);
}

export function accidentalCents(id) {
  const a = ACCIDENTALS.find((x) => x.id === id);
  return a ? a.cents : 0;
}

export function noteLabel(pc, accidentalId) {
  const n = NOTES[pc];
  const a = ACCIDENTALS.find((x) => x.id === accidentalId);
  if (!a || a.id === 'natural') return n.letter;
  return n.letter + a.symbol;
}
