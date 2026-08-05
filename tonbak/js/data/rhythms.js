/**
 * Rhythm library.
 *
 * A cycle is described by:
 *   pulse   – base pulses per cycle (the denominator unit: eighths in 6/8, quarters in 4/4)
 *   div     – grid subdivisions per pulse
 *   groups  – how the pulses cluster into felt beats; 7/8 as 3+2+2 feels
 *             completely different from 2+2+3, and this is what encodes that
 *   bpmUnit – pulses per BPM beat, so tempo means what a musician expects:
 *             quarter note in simple metres, dotted quarter in compound,
 *             eighth note in the irregular ones
 *
 * Patterns are written as `pulse * div` tokens:
 *   T Tom · B Bak · E Eshareh · P Pelang · Q Qom · R Riz · . rest
 * UPPERCASE is accented, lowercase is unaccented, and a trailing digit 1-9
 * sets velocity explicitly (b3 is a very soft Bak).
 *
 * A note on provenance: these are idiomatic accompaniment patterns, the kind
 * a tonbak player would lay under a melody, not transcriptions of any single
 * master's playing. Regional and school-to-school variation is wide — the
 * Build tab exists so you can bend any of them to what you actually play.
 */

export const CATEGORIES = {
  persian: { id: 'persian', name: 'Persian cycles', fa: 'اوزان ایرانی' },
  simple: { id: 'simple', name: 'Plain metres', fa: 'میزان‌های ساده' },
  custom: { id: 'custom', name: 'My patterns', fa: 'الگوهای من' },
};

export const RHYTHMS = [
  // ─── 6/8 · the heart of Persian rhythm ────────────────────────────────
  {
    id: 'shesh-o-hasht',
    name: 'Shesh-o-Hasht',
    fa: 'شش و هشت',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 104,
    bpmRange: [50, 190],
    category: 'persian',
    style: 'Dance',
    tags: ['6/8', 'compound', 'dance', 'classic', 'reng'],
    description:
      'The rhythm most people mean when they say "Persian music" — two dotted beats to the bar, Tom on the first of each and Bak answering on the third pulse. Everything from a wedding dance to a classical reng sits on this.',
    pattern: 'T . . e b . T . . e B .',
  },
  {
    id: 'shesh-o-hasht-riz',
    name: 'Shesh-o-Hasht bā Riz',
    fa: 'شش و هشت با ریز',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 92,
    bpmRange: [50, 160],
    category: 'persian',
    style: 'Dance',
    tags: ['6/8', 'riz', 'roll', 'ornament'],
    description:
      'The same skeleton with the second half of the bar filled by a roll. The Riz stretches to the next stroke rather than to a fixed number of notes, so it stays even as you change tempo.',
    pattern: 'T . . e b . T . R . . .',
  },
  {
    id: 'shesh-o-hasht-sadeh',
    name: 'Shesh-o-Hasht Sādeh',
    fa: 'شش و هشت ساده',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 100,
    bpmRange: [40, 190],
    category: 'persian',
    style: 'Basic',
    tags: ['6/8', 'simple', 'beginner', 'skeleton'],
    description:
      'The bare bones — Tom, Bak, Tom, Bak with nothing between. The clearest thing to practise a melody against, and the frame every ornamented 6/8 hangs on.',
    pattern: 'T . . . b . T . . . b .',
  },
  {
    id: 'reng',
    name: 'Reng',
    fa: 'رنگ',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 126,
    bpmRange: [80, 200],
    category: 'persian',
    style: 'Dance',
    tags: ['6/8', 'reng', 'dance', 'radif', 'fast'],
    description:
      'The dance piece that closes a classical suite. Lighter and quicker than a plain 6/8, with taps on the offbeats keeping it airborne.',
    pattern: 'T . e . B e t . e . B e',
  },
  {
    id: 'bandari',
    name: 'Bandari',
    fa: 'بندری',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 138,
    bpmRange: [90, 210],
    category: 'persian',
    style: 'Folk',
    region: 'Persian Gulf',
    tags: ['6/8', 'bandari', 'folk', 'south', 'gulf', 'dance', 'fast'],
    description:
      'From the Gulf coast — denser and more driving than the northern 6/8, with the bar packed rather than left open. Built for dancing.',
    pattern: 'T . b . B . T e b . B e',
  },
  {
    id: 'chahar-mezrab',
    name: 'Chahār-Mezrāb',
    fa: 'چهارمضراب',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 118,
    bpmRange: [70, 200],
    category: 'persian',
    style: 'Classical',
    tags: ['6/8', 'chahar mezrab', 'classical', 'radif', 'virtuoso', 'santur', 'tar'],
    description:
      'The relentless running accompaniment under a chahār-mezrāb — a continuous stream with no gaps, so a santur or tar can play against a solid moving floor. Practise your own piece over this one slowly.',
    pattern: 'T e b e b e T e b e b e',
  },
  {
    id: 'kereshmeh',
    name: 'Kereshmeh',
    fa: 'کرشمه',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 84,
    bpmRange: [45, 150],
    category: 'persian',
    style: 'Classical',
    tags: ['6/8', 'kereshmeh', 'classical', 'radif', 'gusheh'],
    description:
      'The lilting long-short figure that gives the kereshmeh gusheh its name. Leaves the bar open at the start and crowds the end — the asymmetry is the point.',
    pattern: 'T . . . b . T . b . b .',
  },
  {
    id: 'masnavi',
    name: 'Masnavi',
    fa: 'مثنوی',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 58,
    bpmRange: [34, 100],
    category: 'persian',
    style: 'Classical',
    tags: ['6/8', 'masnavi', 'slow', 'meditative', 'classical', 'avaz'],
    description:
      'Slow and spacious, three strokes to the bar. Meant to mark time under a sung āvāz without ever pushing it — leave it under a free-rhythm melody and it stays out of the way.',
    pattern: 'T . . . . . b . . . B .',
  },

  // ─── 2/4 ──────────────────────────────────────────────────────────────
  {
    id: 'yek-zarbi',
    name: 'Yek-Zarbi',
    fa: 'یک ضربی',
    sig: '2/4',
    pulse: 2,
    div: 4,
    groups: [1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 108,
    bpmRange: [50, 200],
    category: 'persian',
    style: 'Classical',
    tags: ['2/4', 'zarbi', 'classical', 'radif'],
    description:
      'A brisk duple cycle used for zarbi sections — pieces in strict metre inside an otherwise free āvāz. Tom down, Bak up, taps filling the gaps.',
    pattern: 'T . e . B . e .',
  },
  {
    id: 'do-zarbi',
    name: 'Do-Zarbi',
    fa: 'دو ضربی',
    sig: '2/4',
    pulse: 2,
    div: 4,
    groups: [1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 96,
    bpmRange: [40, 200],
    category: 'persian',
    style: 'Basic',
    tags: ['2/4', 'simple', 'beginner', 'march'],
    description:
      'Two strokes, nothing else. The plainest possible frame for checking your time against.',
    pattern: 'T . . . B . . .',
  },

  // ─── 3/4 ──────────────────────────────────────────────────────────────
  {
    id: 'se-zarbi',
    name: 'Se-Zarbi',
    fa: 'سه ضربی',
    sig: '3/4',
    pulse: 3,
    div: 4,
    groups: [1, 1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 116,
    bpmRange: [50, 200],
    category: 'persian',
    style: 'Dance',
    tags: ['3/4', 'waltz', 'vals', 'triple'],
    description:
      'Triple time — the Persian waltz feel that turns up in tasnif and lighter pieces. Weight on one, lighter answers on two and three.',
    pattern: 'T . . . B . e . B . e .',
  },

  // ─── 4/4 ──────────────────────────────────────────────────────────────
  {
    id: 'chahar-zarbi',
    name: 'Chahār-Zarbi',
    fa: 'چهار ضربی',
    sig: '4/4',
    pulse: 4,
    div: 4,
    groups: [1, 1, 1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 96,
    bpmRange: [40, 190],
    category: 'persian',
    style: 'Classical',
    tags: ['4/4', 'zarbi', 'classical', 'common time'],
    description:
      'A four-square cycle with a double Tom pushing into beat three. Common under tasnif and modern Persian song.',
    pattern: 'T . . e B . e . T . T . B . e .',
  },
  {
    id: 'zarb-e-osul',
    name: 'Zarb-e Osul',
    fa: 'ضرب اصول',
    sig: '4/4',
    pulse: 4,
    div: 4,
    groups: [1, 1, 1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 62,
    bpmRange: [32, 130],
    category: 'persian',
    style: 'Classical',
    tags: ['4/4', 'osul', 'slow', 'ceremonial', 'pishdaramad'],
    description:
      'Broad and unhurried, the kind of cycle laid under a pishdarāmad. Long gaps between strokes leave room for the melody to breathe.',
    pattern: 'T . . . . . b . B . . . t . b .',
  },
  {
    id: 'chahar-zarbi-riz',
    name: 'Chahār-Zarbi bā Riz',
    fa: 'چهار ضربی با ریز',
    sig: '4/4',
    pulse: 4,
    div: 4,
    groups: [1, 1, 1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 78,
    bpmRange: [40, 150],
    category: 'persian',
    style: 'Classical',
    tags: ['4/4', 'riz', 'roll', 'ornament'],
    description:
      'Four-four with the third beat given over to a roll. Good for hearing whether your own phrasing holds steady while the drum is shimmering rather than marking.',
    pattern: 'T . . . B . . . R . . . B . e .',
  },

  // ─── Irregular / aksak cycles ─────────────────────────────────────────
  {
    id: 'lang-7-322',
    name: 'Lang (3+2+2)',
    fa: 'لنگ',
    sig: '7/8',
    pulse: 7,
    div: 2,
    groups: [3, 2, 2],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 240,
    bpmRange: [120, 420],
    category: 'persian',
    style: 'Folk',
    tags: ['7/8', 'lang', 'limping', 'aksak', 'irregular', 'odd'],
    description:
      'Lang means limping, and that is exactly the feel: a long beat followed by two short ones. Count 1-2-3, 1-2, 1-2 and let the first of each group land heavy.',
    pattern: 'T . . e b . B . e . B . b e',
  },
  {
    id: 'lang-7-223',
    name: 'Lang (2+2+3)',
    fa: 'لنگ',
    sig: '7/8',
    pulse: 7,
    div: 2,
    groups: [2, 2, 3],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 240,
    bpmRange: [120, 420],
    category: 'persian',
    style: 'Folk',
    tags: ['7/8', 'lang', 'aksak', 'irregular', 'odd'],
    description:
      'The same seven pulses grouped the other way round — two short beats then a long one. Sounds like a different rhythm entirely, which is the best argument for practising both.',
    pattern: 'T . e . B . e . T . b . b e',
  },
  {
    id: 'panj-zarbi-32',
    name: 'Panj-Zarbi (3+2)',
    fa: 'پنج ضربی',
    sig: '5/8',
    pulse: 5,
    div: 2,
    groups: [3, 2],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 230,
    bpmRange: [110, 400],
    category: 'persian',
    style: 'Folk',
    tags: ['5/8', 'five', 'aksak', 'irregular', 'odd'],
    description:
      'Five pulses as long-short. Once the ear accepts that the bar simply ends sooner than it expects, this becomes one of the easier odd metres to sit inside.',
    pattern: 'T . . e b . B . b e',
  },
  {
    id: 'panj-zarbi-23',
    name: 'Panj-Zarbi (2+3)',
    fa: 'پنج ضربی',
    sig: '5/8',
    pulse: 5,
    div: 2,
    groups: [2, 3],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 230,
    bpmRange: [110, 400],
    category: 'persian',
    style: 'Folk',
    tags: ['5/8', 'five', 'aksak', 'irregular', 'odd'],
    description:
      'Short-long. The bar leans forward instead of settling back — the mirror of the 3+2 grouping.',
    pattern: 'T . e . B . . e b .',
  },
  {
    id: 'noh-zarbi',
    name: 'Noh-Zarbi (2+2+2+3)',
    fa: 'نه ضربی',
    sig: '9/8',
    pulse: 9,
    div: 2,
    groups: [2, 2, 2, 3],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 260,
    bpmRange: [130, 440],
    category: 'persian',
    style: 'Folk',
    tags: ['9/8', 'nine', 'aksak', 'irregular', 'odd'],
    description:
      'Three even beats and a long one to close. The extended fourth group is where the cycle turns over — land on it and the rest follows.',
    pattern: 'T . e . B . e . T . e . B . . e b .',
  },
  {
    id: 'dah-zarbi',
    name: 'Dah-Zarbi',
    fa: 'ده ضربی',
    sig: '10/8',
    pulse: 10,
    div: 2,
    groups: [3, 2, 2, 3],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 260,
    bpmRange: [130, 440],
    category: 'persian',
    style: 'Classical',
    tags: ['10/8', 'ten', 'aksak', 'irregular', 'odd', 'long cycle'],
    description:
      'A long cycle bracketed by two three-pulse groups with two short ones between. Symmetrical end to end, which makes it easier to hold than its length suggests.',
    pattern: 'T . . e b . B . e . B . b . T . . e b .',
  },
  {
    id: 'davazdah-zarbi',
    name: 'Davāzdah-Zarbi',
    fa: 'دوازده ضربی',
    sig: '12/8',
    pulse: 12,
    div: 2,
    groups: [3, 3, 3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 88,
    bpmRange: [40, 160],
    category: 'persian',
    style: 'Classical',
    tags: ['12/8', 'twelve', 'compound', 'long cycle'],
    description:
      'Four dotted beats — a doubled 6/8 that gives you room to vary the second half. The third beat is deliberately lighter so the cycle has a shape rather than just repeating.',
    pattern: 'T . . e b . T . . e b . t . . e b . T . . e B e',
  },

  // ─── Plain metres · pick a time signature and go ──────────────────────
  {
    id: 'plain-2-4',
    name: '2/4',
    fa: '۲/۴',
    sig: '2/4',
    pulse: 2,
    div: 4,
    groups: [1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 100,
    bpmRange: [30, 240],
    category: 'simple',
    style: 'Metronome',
    tags: ['2/4', 'metronome', 'plain', 'count'],
    description: 'Two beats, accent on the first.',
    pattern: 'T . . . B . . .',
  },
  {
    id: 'plain-3-4',
    name: '3/4',
    fa: '۳/۴',
    sig: '3/4',
    pulse: 3,
    div: 4,
    groups: [1, 1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 100,
    bpmRange: [30, 240],
    category: 'simple',
    style: 'Metronome',
    tags: ['3/4', 'metronome', 'plain', 'waltz', 'count'],
    description: 'Three beats, accent on the first.',
    pattern: 'T . . . B . . . B . . .',
  },
  {
    id: 'plain-4-4',
    name: '4/4',
    fa: '۴/۴',
    sig: '4/4',
    pulse: 4,
    div: 4,
    groups: [1, 1, 1, 1],
    bpmUnit: 1,
    bpmLabel: '♩',
    defaultBpm: 100,
    bpmRange: [30, 240],
    category: 'simple',
    style: 'Metronome',
    tags: ['4/4', 'metronome', 'plain', 'common time', 'count'],
    description: 'Four beats, accent on the first, a lighter Tom on the third.',
    pattern: 'T . . . B . . . t . . . B . . .',
  },
  {
    id: 'plain-5-8',
    name: '5/8 (3+2)',
    fa: '۵/۸',
    sig: '5/8',
    pulse: 5,
    div: 2,
    groups: [3, 2],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 220,
    bpmRange: [80, 440],
    category: 'simple',
    style: 'Metronome',
    tags: ['5/8', 'metronome', 'plain', 'odd', 'count'],
    description: 'Five pulses grouped long-short, one stroke per group.',
    pattern: 'T . . . . . B . . .',
  },
  {
    id: 'plain-6-8',
    name: '6/8',
    fa: '۶/۸',
    sig: '6/8',
    pulse: 6,
    div: 2,
    groups: [3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 100,
    bpmRange: [30, 220],
    category: 'simple',
    style: 'Metronome',
    tags: ['6/8', 'metronome', 'plain', 'compound', 'count'],
    description: 'Two dotted beats, one stroke each.',
    pattern: 'T . . . . . B . . . . .',
  },
  {
    id: 'plain-7-8',
    name: '7/8 (3+2+2)',
    fa: '۷/۸',
    sig: '7/8',
    pulse: 7,
    div: 2,
    groups: [3, 2, 2],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 230,
    bpmRange: [80, 440],
    category: 'simple',
    style: 'Metronome',
    tags: ['7/8', 'metronome', 'plain', 'odd', 'lang', 'count'],
    description: 'Seven pulses as 3+2+2, one stroke per group.',
    pattern: 'T . . . . . B . . . B . . .',
  },
  {
    id: 'plain-9-8',
    name: '9/8 (2+2+2+3)',
    fa: '۹/۸',
    sig: '9/8',
    pulse: 9,
    div: 2,
    groups: [2, 2, 2, 3],
    bpmUnit: 1,
    bpmLabel: '♪',
    defaultBpm: 250,
    bpmRange: [80, 440],
    category: 'simple',
    style: 'Metronome',
    tags: ['9/8', 'metronome', 'plain', 'odd', 'count'],
    description: 'Nine pulses as 2+2+2+3, one stroke per group.',
    pattern: 'T . . . B . . . B . . . B . . . . .',
  },
  {
    id: 'plain-12-8',
    name: '12/8',
    fa: '۱۲/۸',
    sig: '12/8',
    pulse: 12,
    div: 2,
    groups: [3, 3, 3, 3],
    bpmUnit: 3,
    bpmLabel: '♩.',
    defaultBpm: 88,
    bpmRange: [30, 200],
    category: 'simple',
    style: 'Metronome',
    tags: ['12/8', 'metronome', 'plain', 'compound', 'count'],
    description: 'Four dotted beats, one stroke each.',
    pattern: 'T . . . . . B . . . . . t . . . . . B . . . . .',
  },
];

/** Parse a pattern string into an array of `{ stroke, vel }` or null per step. */
export function parsePattern(str, letterMap) {
  return str
    .trim()
    .split(/\s+/)
    .map((tok) => {
      if (tok === '.' || tok === '-') return null;
      const m = /^([TBEPQRtbepqr])([1-9])?$/.exec(tok);
      if (!m) return null;
      const stroke = letterMap[m[1].toUpperCase()];
      if (!stroke) return null;
      const accented = m[1] === m[1].toUpperCase();
      const vel = m[2] ? Number(m[2]) / 9 : accented ? 0.95 : 0.58;
      return { stroke, vel };
    });
}

/** Serialise steps back to the compact token form (used when saving custom patterns). */
export function serialisePattern(steps, strokeToLetter) {
  return steps
    .map((s) => {
      if (!s) return '.';
      const letter = strokeToLetter[s.stroke] || '.';
      const digit = Math.max(1, Math.min(9, Math.round(s.vel * 9)));
      return letter + digit;
    })
    .join(' ');
}

export function totalSteps(r) {
  return r.pulse * r.div;
}

/** Seconds per grid step at a given tempo. */
export function stepDuration(r, bpm) {
  return 60 / bpm / (r.bpmUnit * r.div);
}

/** Grid index at which each accent group begins. */
export function groupStartSteps(r) {
  const starts = [];
  let pulse = 0;
  for (const g of r.groups) {
    starts.push(pulse * r.div);
    pulse += g;
  }
  return starts;
}
