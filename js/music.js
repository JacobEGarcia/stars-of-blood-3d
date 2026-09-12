/* STARS OF BLOOD - music data: note tables + patch specs for Web Audio.
   Everything is plain data (this file has no audio code) so the lead's engine
   can consume it directly. Conventions:
   - steps are 16th notes; tracks loop after loopSteps, stingers play once
   - notes: [step, "A4", lengthInSteps, velocity(0..1, optional)]
   - drum parts: {patch, pattern:{every, at:[steps]}} expands across loopSteps
   - note names: C4 = middle C; freq = 440 * 2^((midi-69)/12), A4 = midi 69
   - patches: kind "tone" (osc voice) or "drum" (one-shot synth hit)          */
var STARS_OF_BLOOD = (function () {
  "use strict";

  // ------------------------------------------------------------- patches
  var patches = {
    padSpace:   { kind:"tone", osc:"sawtooth", osc2:{ type:"sawtooth", detune:7, mix:0.8 },
                  attack:0.8, release:2.5, sustain:0.7, cutoff:900, q:0.7, gain:0.16,
                  send:{ delay:0.1, reverb:0.55 } },
    padBright:  { kind:"tone", osc:"sawtooth", osc2:{ type:"sawtooth", detune:6, mix:0.8 },
                  attack:0.15, release:1.2, sustain:0.75, cutoff:2200, q:0.7, gain:0.16,
                  send:{ delay:0.15, reverb:0.4 } },
    twangLead:  { kind:"tone", osc:"sawtooth", attack:0.005, release:0.25, sustain:0.85,
                  cutoff:2600, q:2, glide:0.06, vibrato:{ rate:5.2, depth:14 }, gain:0.3,
                  send:{ delay:0.35, reverb:0.25 } },
    subBass:    { kind:"tone", osc:"sine", attack:0.005, release:0.1, sustain:0.9, gain:0.5 },
    softBass:   { kind:"tone", osc:"triangle", attack:0.02, release:0.15, sustain:0.85,
                  cutoff:500, q:0.5, gain:0.4 },
    driveBass:  { kind:"tone", osc:"sawtooth", attack:0.003, release:0.08, sustain:0.6,
                  cutoff:700, q:4, gain:0.34 },
    pluck:      { kind:"tone", osc:"square", attack:0.002, release:0.18, sustain:0,
                  cutoff:3200, q:1, filterEnv:-2, gain:0.22, send:{ delay:0.3, reverb:0.2 } },
    stab:       { kind:"tone", osc:"sawtooth", osc2:{ type:"sawtooth", detune:-6, mix:0.7 },
                  attack:0.003, release:0.12, sustain:0, cutoff:1800, q:2, gain:0.2 },
    arp:        { kind:"tone", osc:"square", attack:0.001, release:0.07, sustain:0,
                  cutoff:4000, q:1, gain:0.14, send:{ delay:0.45, reverb:0.15 } },
    rhodes:     { kind:"tone", osc:"sine", osc2:{ type:"sine", ratio:2, mix:0.3 },
                  attack:0.004, release:0.6, sustain:0, gain:0.22, send:{ delay:0.1, reverb:0.4 } },
    flute:      { kind:"tone", osc:"triangle", attack:0.03, release:0.3, sustain:0.8,
                  vibrato:{ rate:4.5, depth:8 }, gain:0.26, send:{ delay:0.2, reverb:0.35 } },
    shimmer:    { kind:"tone", osc:"sine", attack:0.02, release:1.4, sustain:0,
                  gain:0.1, send:{ delay:0.6, reverb:0.6 } },
    droneDark:  { kind:"tone", osc:"sawtooth", osc2:{ type:"sawtooth", detune:-10, mix:0.9 },
                  attack:1.2, release:3, sustain:0.9, cutoff:320, q:1, gain:0.2,
                  send:{ reverb:0.5 } },
    kick:       { kind:"drum", drum:"kick", from:150, to:38, sweep:0.12, decay:0.28, gain:0.9 },
    snare:      { kind:"drum", drum:"noise", hp:1800, decay:0.14, gain:0.28 },
    hat:        { kind:"drum", drum:"noise", hp:7500, decay:0.045, gain:0.1 },
    shaker:     { kind:"drum", drum:"noise", hp:6000, decay:0.06, gain:0.055 }
  };

  // ------------------------------------------------------------- helpers (build-time only)
  function bar(b) { return b * 16; }
  function drums(every, at, steps) {            // expand a drum pattern across the track
    var out = [];
    for (var s = 0; s + every <= steps; s += every) at.forEach(function (a) { out.push([s + a, "-", 1]); });
    return out;
  }
  function eighths(b, notes) {                  // one bar of driving 8ths at bar b
    return notes.map(function (n, i) { return [bar(b) + i * 2, n, 2]; });
  }
  function arpBar(b, tones) {                   // one bar of 16th arp at bar b
    var out = [];
    for (var i = 0; i < 16; i++) out.push([bar(b) + i, tones[i % tones.length], 1]);
    return out;
  }
  function chord(b, tones, len, vel) {
    return tones.map(function (n) { return [bar(b), n, len || 16, vel]; });
  }

  // ------------------------------------------------------------- tracks
  var tracks = {};

  // TITLE - mournful space-western, D minor, 70bpm, 8 bars
  tracks.title = {
    bpm: 70, loopSteps: 128,
    parts: [
      { patch: "padSpace", notes: [].concat(
        chord(0, ["D3", "F3", "A3"]),  chord(1, ["Bb2", "D3", "F3", "A3"]),
        chord(2, ["G2", "Bb2", "D3"]), chord(3, ["A2", "E3", "A3"]),
        chord(4, ["D3", "F3", "A3"]),  chord(5, ["Bb2", "D3", "F3"]),
        chord(6, ["F2", "A2", "C3"]),  chord(7, ["A2", "E3", "A3"])) },
      { patch: "subBass", notes: [
        [0, "D2", 6], [8, "A2", 4],   [16, "Bb1", 6], [24, "F2", 4],
        [32, "G1", 6], [40, "D2", 4], [48, "A1", 6],  [56, "E2", 4],
        [64, "D2", 6], [72, "A2", 4], [80, "Bb1", 6], [88, "F2", 4],
        [96, "F2", 6], [104, "C3", 4],[112, "A1", 6], [120, "E2", 4]] },
      { patch: "twangLead", notes: [
        [0, "D5", 10], [12, "C5", 6], [20, "A4", 10],
        [32, "F4", 4], [36, "G4", 4], [40, "A4", 8],
        [48, "D5", 12],
        [64, "E5", 6], [72, "C5", 6],
        [80, "A4", 4], [84, "D5", 4], [88, "F5", 6],
        [96, "E5", 8], [104, "D5", 4],
        [112, "D5", 16]] },
      { patch: "shimmer", notes: [
        [8, "A5", 2], [40, "D6", 2], [72, "F6", 2], [104, "A5", 2], [120, "D6", 2]] }
    ]
  };

  // COMBAT - driving, A minor, 132bpm, 8 bars
  tracks.combat = {
    bpm: 132, loopSteps: 128,
    parts: [
      { patch: "kick", notes: drums(16, [0, 4, 8, 12], 128) },
      { patch: "snare", notes: drums(16, [4, 12], 128) },
      { patch: "hat", notes: drums(2, [0], 128) },
      { patch: "driveBass", notes: [].concat(
        eighths(0, ["A1", "A1", "A2", "A1", "A1", "A1", "A2", "A1"]),
        eighths(1, ["A1", "A1", "A2", "A1", "C2", "A1", "A2", "A1"]),
        eighths(2, ["F1", "F1", "F2", "F1", "F1", "F1", "F2", "F1"]),
        eighths(3, ["G1", "G1", "G2", "G1", "G1", "G1", "G2", "G1"]),
        eighths(4, ["A1", "A1", "A2", "A1", "A1", "A1", "A2", "A1"]),
        eighths(5, ["A1", "A1", "A2", "A1", "C2", "A1", "G1", "A1"]),
        eighths(6, ["F1", "F1", "F2", "F1", "F1", "F1", "F2", "F1"]),
        eighths(7, ["E1", "E1", "E2", "E1", "E1", "E1", "E2", "E1"])) },
      { patch: "stab", notes: [].concat(
        chord(0, ["A3", "C4", "E4"], 3, 0.8), [[12, "A3", 3], [12, "C4", 3], [12, "E4", 3]],
        chord(2, ["F3", "A3", "C4"], 3, 0.8), chord(3, ["G3", "B3", "D4"], 3, 0.8),
        chord(4, ["A3", "C4", "E4"], 3, 0.8), [[60, "A3", 3], [60, "C4", 3], [60, "E4", 3]],
        chord(6, ["F3", "A3", "C4"], 3, 0.8), chord(7, ["E3", "G3", "B3"], 3, 0.8)) },
      { patch: "arp", notes: [].concat(
        arpBar(0, ["A3", "C4", "E4", "A4"]), arpBar(1, ["A3", "C4", "E4", "A4"]),
        arpBar(2, ["F3", "A3", "C4", "F4"]), arpBar(3, ["G3", "B3", "D4", "G4"]),
        arpBar(4, ["A3", "C4", "E4", "A4"]), arpBar(5, ["A3", "C4", "E4", "A4"]),
        arpBar(6, ["F3", "A3", "C4", "F4"]), arpBar(7, ["E3", "G3", "B3", "E4"])) },
      { patch: "twangLead", notes: [[112, "E5", 4, 0.9], [116, "G5", 4, 0.9], [120, "A5", 8, 0.9]] }
    ]
  };

  // FREE PORT - warm port ambience, F major, 84bpm, 8 bars
  tracks.freeport = {
    bpm: 84, loopSteps: 128,
    parts: [
      { patch: "rhodes", notes: [].concat(
        chord(0, ["F3", "A3", "C4", "E4"]), chord(1, ["E3", "G3", "B3", "D4"]),
        chord(2, ["D3", "F3", "A3", "C4"]), chord(3, ["C3", "E3", "G3", "B3"]),
        chord(4, ["F3", "A3", "C4", "E4"]), chord(5, ["Bb2", "D3", "F3", "A3"]),
        chord(6, ["C3", "E3", "G3", "Bb3"]), chord(7, ["F3", "A3", "C4", "E4"])) },
      { patch: "softBass", notes: [
        [0, "F2", 7], [8, "F2", 6],   [16, "E2", 7], [24, "E2", 6],
        [32, "D2", 7], [40, "D2", 6], [48, "C2", 7], [56, "C2", 6],
        [64, "F2", 7], [72, "F2", 6], [80, "Bb1", 7],[88, "Bb1", 6],
        [96, "C2", 7], [104, "C2", 6],[112, "F2", 12]] },
      { patch: "shaker", notes: drums(2, [0], 128) },
      { patch: "flute", notes: [
        [0, "A4", 8], [16, "G4", 4], [24, "E4", 4], [32, "F4", 12],
        [52, "G4", 2], [54, "A4", 2], [64, "C5", 8],
        [80, "Bb4", 6], [88, "A4", 6], [96, "G4", 4], [100, "F4", 4], [104, "E4", 4],
        [112, "F4", 16]] },
      { patch: "shimmer", notes: [[40, "F6", 2], [104, "A5", 2], [120, "C6", 2]] }
    ]
  };

  // ------------------------------------------------------------- stingers
  var stingers = {};

  // DOCK - warm arrival, D major, 100bpm, 2 bars
  stingers.dock = {
    bpm: 100, loopSteps: 32,
    parts: [
      { patch: "pluck", notes: [
        [0, "D3", 2], [2, "A3", 2], [4, "D4", 2], [6, "F#4", 2], [8, "A4", 4]] },
      { patch: "padBright", notes: chord(0, [], 0).concat(
        [[8, "D3", 24], [8, "F#3", 24], [8, "A3", 24], [8, "C#4", 24]]) },
      { patch: "shimmer", notes: [[16, "A5", 6]] }
    ]
  };

  // DEATH - dark descent, D minor, 60bpm, 2.5 bars
  stingers.death = {
    bpm: 60, loopSteps: 40,
    parts: [
      { patch: "droneDark", notes: [[0, "D2", 40], [0, "A1", 40]] },
      { patch: "twangLead", notes: [
        [0, "A3", 5], [6, "F3", 5], [12, "D3", 5], [18, "C3", 5], [24, "A2", 8, 0.7]] }
    ]
  };

  // VICTORY - bright fanfare, A major, 120bpm, 2 bars
  stingers.victory = {
    bpm: 120, loopSteps: 32,
    parts: [
      { patch: "twangLead", notes: [
        [0, "A3", 2, 0.9], [2, "C#4", 2, 0.9], [4, "E4", 2, 0.9], [6, "A4", 2, 0.9]] },
      { patch: "stab", notes: [
        [8, "A3", 3], [8, "C#4", 3], [8, "E4", 3],
        [12, "A3", 3], [12, "C#4", 3], [12, "E4", 3]] },
      { patch: "padBright", notes: [
        [16, "A3", 16], [16, "C#4", 16], [16, "E4", 16], [16, "A4", 16]] },
      { patch: "shimmer", notes: [[24, "E6", 6]] }
    ]
  };

  return { patches: patches, tracks: tracks, stingers: stingers };
})();
if (typeof module !== "undefined") module.exports = STARS_OF_BLOOD;
