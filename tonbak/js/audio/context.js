/**
 * The shared audio graph, plus the handful of things iOS needs to be told
 * before it will behave like an instrument rather than a web page.
 *
 *   sources ──┬─→ dryGain ──────────────┐
 *             └─→ sendGain → convolver ─┴─→ master → limiter → out
 */

import { renderRoomImpulse } from './synth.js';

let ctx = null;
let nodes = null;
let unlocked = false;

/** Gentle brickwall so a dense Riz over a drone never clips on a phone speaker. */
function makeLimiter(c) {
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -8;
  comp.knee.value = 6;
  comp.ratio.value = 12;
  comp.attack.value = 0.002;
  comp.release.value = 0.14;
  return comp;
}

export function getContext() {
  return ctx;
}

export function getNodes() {
  return nodes;
}

/**
 * Must be called from inside a user gesture — iOS refuses to start an
 * AudioContext otherwise, and silently produces nothing if you try.
 */
export async function initAudio() {
  if (ctx) {
    await resumeAudio();
    return { ctx, nodes };
  }

  const Ctor = window.AudioContext || window.webkitAudioContext;
  // 'interactive' asks the platform for the smallest buffer it will give us.
  ctx = new Ctor({ latencyHint: 'interactive' });

  // iOS 16.4+: without this, everything we play is muted by the ringer switch,
  // which is wrong for an instrument the user deliberately opened.
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch {
    /* not supported — audio still works, just respects the silent switch */
  }

  const master = ctx.createGain();
  master.gain.value = 0.9;

  const limiter = makeLimiter(ctx);
  master.connect(limiter);
  limiter.connect(ctx.destination);

  const dry = ctx.createGain();
  dry.gain.value = 1;
  dry.connect(master);

  const send = ctx.createGain();
  send.gain.value = 0.18;

  const convolver = ctx.createConvolver();
  convolver.normalize = true;
  send.connect(convolver);
  convolver.connect(master);

  // Drone runs on its own trim so it can sit under the drum independently.
  const drone = ctx.createGain();
  drone.gain.value = 0.0;
  drone.connect(master);
  const droneSend = ctx.createGain();
  droneSend.gain.value = 0.5;
  drone.connect(droneSend);
  droneSend.connect(convolver);

  nodes = { master, dry, send, convolver, drone, limiter };

  renderRoomImpulse(ctx).then((ir) => {
    convolver.buffer = ir;
  });

  await resumeAudio();
  return { ctx, nodes };
}

/**
 * iOS suspends the context on backgrounding, phone calls, and route changes,
 * and does not always resume it on its own.
 */
export async function resumeAudio() {
  if (!ctx) return;
  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      /* will retry on the next gesture */
    }
  }
  if (!unlocked && ctx.state === 'running') {
    // A silent one-sample buffer settles the output route on older iOS.
    const b = ctx.createBuffer(1, 1, ctx.sampleRate);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start(0);
    unlocked = true;
  }
}

export function setMasterVolume(v) {
  if (!nodes) return;
  nodes.master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

export function setReverbAmount(v) {
  if (!nodes) return;
  nodes.send.gain.setTargetAtTime(v * 0.45, ctx.currentTime, 0.05);
}

export function setDroneVolume(v) {
  if (!nodes) return;
  nodes.drone.gain.setTargetAtTime(v, ctx.currentTime, 0.06);
}

/** Keep the graph alive across backgrounding and interruptions. */
export function watchInterruptions() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resumeAudio();
  });
  window.addEventListener('focus', () => resumeAudio());
  if (ctx) ctx.addEventListener('statechange', () => {
    if (ctx.state === 'interrupted' || ctx.state === 'suspended') resumeAudio();
  });
}
