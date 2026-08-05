# Tonbak · تنبک

A Persian tonbak rhythm trainer you install on your phone. Pick a cycle, set
the tempo, and play your own instrument over it.

Built as an installable PWA, so it goes on an iPhone home screen with its own
icon, runs full-screen with no browser chrome, and works with no network at
all.

---

## Install on iPhone

1. Open the app URL in **Safari** (it must be Safari — Chrome on iOS cannot
   install web apps).
2. Tap the **Share** button (the square with the arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

It now behaves like any other app: own icon, full-screen, appears in the app
switcher. Open it once with a signal and everything is cached — after that it
runs in airplane mode.

**On Android**, Chrome shows an "Install app" prompt in the address-bar menu.

### Why this isn't an `.ipa`

Producing an installable `.ipa` requires macOS, Xcode, and a paid Apple
Developer account to sign the binary — Apple does not allow unsigned apps on
a device. A PWA is the only route onto an iPhone that skips all three, and
for an audio app it gives up nothing that matters: the Web Audio API drives
the same low-latency audio path a native app would.

---

## What's in it

### The strokes

Nothing is sampled. Each stroke is synthesised from a physical model of the
drum — the coupled membrane modes and cavity resonance of a goat-skin head
over a hollow mulberry body — rendered into buffers at launch.

| Stroke | فارسی | Technique |
| --- | --- | --- |
| **Tom** | تم | Deep open tone, right hand at the centre. Drives the air cavity. |
| **Bak** | بک | Bright rim slap, left hand. Almost no cavity coupling — dry and short. |
| **Eshareh** | اشاره | Light index-finger tap between rim and centre. |
| **Pelang** | پلنگ | The "leopard" — a finger snapped onto the skin. Sharp crack. |
| **Qom** | قم | Muted low tone, hand resting on the skin. |
| **Riz** | ریز | The roll. Fills forward to the next stroke, so its length follows the music. |

Every stroke is rendered in four variants with the modal tuning and decays
jittered, and playback cycles through them — a repeated Tom never hits the
same spot twice, which is the difference between a drum and a drum machine.

### Rhythms

29 cycles, searchable by name (English or Persian), metre, style or region.

- **6/8** — Shesh-o-Hasht (plain, ornamented, and with Riz), Reng, Bandari,
  Chahār-Mezrāb, Kereshmeh, Masnavi
- **2/4, 3/4, 4/4** — Yek-Zarbi, Do-Zarbi, Se-Zarbi, Chahār-Zarbi, Zarb-e Osul
- **Irregular** — Lang 7/8 in both 3+2+2 and 2+2+3, Panj-Zarbi 5/8 both ways,
  Noh-Zarbi 9/8, Dah-Zarbi 10/8, Davāzdah-Zarbi 12/8
- **Plain metres** — bare one-stroke-per-beat patterns for 2/4 through 12/8,
  for when you just want a metre and a tempo

Grouping is first-class: 7/8 as 3+2+2 and 7/8 as 2+2+3 are separate rhythms,
because they feel like different music. The cycle ring marks where each felt
beat begins.

These are idiomatic accompaniment patterns, not transcriptions of any one
master's playing — regional and school-to-school variation is wide. The Build
tab is there so you can bend any of them to what you actually play.

### Playing along

- **Cycle ring** — the whole bar at a glance, coloured by stroke, with a
  playhead and group markers so you always know where you are
- **Count-in** — one or two cycles of the felt beats before the rhythm starts
- **Tuning drone** — sustained tonic with optional fourth, fifth or octave.
  Supports Persian quarter tones (koron ᶲ / sori ⁄), has suggested tonics for
  all twelve dastgāh, fine tuning in cents, and an adjustable A reference for
  playing with an instrument that isn't at 440.
- **Tempo trainer** — raises the tempo automatically every N cycles up to a
  ceiling, so you can take a piece up to speed without stopping
- **Tap tempo**, stroke mutes, and a room control

### Build

A step grid: set pulses, unit and subdivision, edit the grouping, then tap to
place strokes. Tapping a placed stroke cycles it accent → normal → ghost →
off. Copy the rhythm you're currently playing as a starting point. Saved
patterns persist locally and appear in the library alongside the built-in
cycles.

---

## Running it

```sh
npm start          # serves on :8080
```

No build step and no dependencies — it is static files plus a small Node
server that gets the MIME types right (a service worker served as
`text/plain` will not register).

Service workers require HTTPS, or `localhost` for development.

## Layout

```
index.html              app shell
css/styles.css
js/app.js               UI wiring, views, persistence
js/audio/
  context.js            shared graph; iOS audio-session and interruption handling
  synth.js              offline physical-model rendering of each stroke
  engine.js             lookahead scheduler, Riz expansion, tempo trainer
  drone.js              sustained drone voices
js/data/
  strokes.js            stroke definitions — modal frequencies, decays, noise
  rhythms.js            the rhythm library and its pattern notation
  dastgah.js            pitches, quarter tones, dastgāh presets
sw.js                   offline precache
server.js               static host
tools-make-icons.py     regenerates the app icons
```

### Pattern notation

Patterns are written as one token per grid step:

```
T Tom · B Bak · E Eshareh · P Pelang · Q Qom · R Riz · . rest
```

Uppercase is accented, lowercase is unaccented, and a trailing digit sets
velocity explicitly (`b3` is a very soft Bak). Shesh-o-Hasht is:

```
T . . e b . T . . e B .
```

### A note on timing

The scheduler never plays anything from a timer. A 25 ms interval looks
about 140 ms into the future and books strokes at exact `AudioContext`
timestamps, so the audio clock decides when a stroke happens rather than the
JavaScript one. Measured in-browser, strokes land on the grid with zero
deviation and nothing is ever scheduled late.
