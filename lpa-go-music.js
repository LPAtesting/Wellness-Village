// LPA GO! in-game music. 31 looping cues and 9 stings, all original, synthesised in the browser in the manner of the
// intro videos: an 8-bit handheld RPG palette (pulse leads with delayed vibrato and an echo voice, a 4-bit wave-table
// bass, LFSR noise drums, kompang hand drums) plus the calm music-box / pad / flute bed. Title, Lisa's theme, the
// Tenang town theme, the chope oom-pah and the capacity music box are carried over from the intro.
// Cues render on demand in a worker (main thread fallback), are cached, and crossfade; loops resume where they left off.
export const SR = 24000;
const MUSIC_RMS = 0.045;
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, SC = [0, 2, 4, 5, 7, 9, 11];
const acc = s => s === '#' ? 1 : s === 'b' ? -1 : 0, hz = m => 440 * Math.pow(2, (m - 69) / 12);
const midi = s => { const m = /^([A-G])([#b]?)(\d)$/.exec(s); if (!m) throw new Error('bad note ' + s); return 12 * (+m[3] + 1) + PC[m[1]] + acc(m[2]); };
function melody(str) { let p = 0; const out = []; for (const t of str.split(/[\s|]+/)) { if (!t) continue; const [n, d] = t.split(':'); if (n !== 'r') out.push({ p, len: +d, m: midi(n) }); p += +d; } out.steps = p; return out; }
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m6: [0, 3, 7, 9], sus4: [0, 5, 7], '6': [0, 4, 7, 9], dim: [0, 3, 6], m7b5: [0, 3, 6, 10], add9: [0, 4, 7, 14] };
function chordList(str, B) {
  const out = [];
  str.split('|').forEach((bar, b) => {
    const cs = bar.trim().split(/\s+/);
    cs.forEach((c, i) => {
      const [h, sl] = c.split('/'), m = /^([A-G])([#b]?)(.*)$/.exec(h), root = (PC[m[1]] + acc(m[2]) + 12) % 12;
      if (!QUAL[m[3]]) throw new Error('bad chord ' + c);
      out.push({ p: b * B + i * B / cs.length, root, iv: QUAL[m[3]], bass: sl ? (PC[sl[0]] + acc(sl.slice(1)) + 12) % 12 : root });
    });
  });
  return out;
}
const isTone = (ch, n) => ch.iv.some(v => ((n - ch.root - v) % 12 + 12) % 12 === 0);
function harmNote(q, ch, key) {
  const pc = ((q.m - key) % 12 + 12) % 12, i = SC.indexOf(pc), t = i < 0 ? null : q.m - ((pc - SC[(i + 5) % 7] + 12) % 12);
  if (t != null && (isTone(ch, t) || (q.p % 4 && q.len < 4))) return t;
  for (let n = q.m - 3; n > q.m - 10; n--) if (isTone(ch, n)) return n;
  return t != null ? t : q.m - 4;
}
function bassNote(ch, dg) {
  const r = 40 + ((ch.bass - 4 + 12) % 12), up = v => r + ((ch.root + v - ch.bass + 24) % 12);
  return dg === 'F' ? up(7) : dg === 'O' ? r + 12 : dg === '3' ? up(ch.iv[1]) : r;
}
class Biquad {
  constructor(type, f, q) {
    q = q || 0.707; const w = 2 * Math.PI * f / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q); let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al; this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * c / a0; this.a2 = (1 - al) / a0; this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  run(x) { const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}
function filt(x, type, f) { const b = new Biquad(type, f); for (let i = 0; i < x.length; i++) x[i] = b.run(x[i]); }
const blep = (t, dt) => t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0;
const WAVE = Array.from({ length: 32 }, (_, i) => (i < 16 ? i : 31 - i) / 7.5 - 1);
const panG = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
function voice(L, R, pan, t0, d, m, o, vol) {
  const f0 = hz(m), rel = o.r, i0 = Math.round(t0 * SR), n = Math.min(L.length - i0, Math.round((d + rel) * SR)), [gl, gr] = panG(pan);
  const du = o.duty || 0.5, dc = 2 * du - 1, vib = o.vib, arp = o.arp;
  let ph = 0;
  for (let j = 0; j < n; j++) {
    const u = j / SR;
    let e = u < o.a ? u / o.a : o.s + (1 - o.s) * Math.exp(-(u - o.a) / o.d);
    if (u > d) e *= 1 - (u - d) / rel;
    let f = f0;
    if (arp) f *= arp[Math.floor(u / o.ar) % arp.length];
    if (vib && u > vib[0]) f *= 1 + 0.0578 * vib[1] * Math.min(1, (u - vib[0]) / 0.15) * Math.sin(2 * Math.PI * vib[2] * (u - vib[0]));
    const dt = f / SR; ph += dt; if (ph >= 1) ph -= 1;
    const v = o.w === 'pulse' ? (ph < du ? 1 : -1) - dc + blep(ph, dt) - blep((ph - du + 1) % 1, dt)
      : o.w === 'wave' ? WAVE[(ph * 32) | 0] : Math.sin(2 * Math.PI * ph) + 0.22 * Math.sin(4 * Math.PI * ph) + 0.08 * Math.sin(6 * Math.PI * ph);
    const s = v * e * vol; L[i0 + j] += s * gl; R[i0 + j] += s * gr;
  }
}
function bell(L, R, pan, t0, d, m, o, vol) {
  const f = hz(m), i0 = Math.round(t0 * SR), n = Math.min(L.length - i0, Math.round((d + o.ring) * SR)), [gl, gr] = panG(pan);
  const P = [[1, 1, 1.5], [2, 0.38, 0.55], [3, 0.12, 0.3], [4.2, 0.07, 0.14]].filter(p => f * p[0] < SR * 0.45)
    .map(([r, a, k]) => { const th = 2 * Math.PI * f * r / SR; return { c: 1, s: 0, cr: Math.cos(th), sr: Math.sin(th), e: a, dk: Math.exp(-1 / (k * SR)) }; });
  const damp = Math.exp(-1 / (0.35 * SR)), off = (d + 0.4) * SR; let g = 1;
  for (let j = 0; j < n; j++) {
    let v = 0;
    for (const q of P) { const c = q.c * q.cr - q.s * q.sr; q.s = q.s * q.cr + q.c * q.sr; q.c = c; q.e *= q.dk; v += q.e * q.s; }
    if (j > off) g *= damp;
    const s = v * g * Math.min(1, j / 48) * vol; L[i0 + j] += s * gl; R[i0 + j] += s * gr;
  }
}
function lfsr(short) { let r = 0x7fff; return () => { const b = (r ^ (r >> 1)) & 1; r = (r >> 1) | (b << 14); if (short) r = (r & ~0x40) | (b << 6); return r & 1 ? -1 : 1; }; }
// k kick, s snare, r rim, h/o closed and open hat, c crash; d/p kompang dung and pak; t/u woodblock tick and tock
const DLEN = { k: 0.25, s: 0.28, r: 0.06, h: 0.06, o: 0.3, c: 1.6, d: 0.4, p: 0.16, t: 0.06, u: 0.06 };
const DPAN = { h: 0.25, o: 0.25, c: -0.2, d: -0.25, p: 0.25, t: 0.15, u: -0.15 };
const DV = { k: 0.9, s: 0.5, r: 0.45, h: 0.2, o: 0.18, c: 0.32, d: 0.65, p: 0.5, t: 0.12, u: 0.12 };
function drum(L, R, k, t0, vol) {
  const i0 = Math.round(t0 * SR), n = Math.min(L.length - i0, Math.round(DLEN[k] * SR)), [gl, gr] = panG(DPAN[k] || 0);
  const nz = lfsr(k === 'h' || k === 'o'), bp = k === 'p' ? new Biquad('bp', 1900, 1.3) : null, tau = k === 'h' ? 0.016 : k === 'o' ? 0.08 : 0.45;
  let ph = 0, prev = 0;
  for (let j = 0; j < n; j++) {
    const u = j / SR; let v;
    if (k === 'k') { ph += (48 + 120 * Math.exp(-u / 0.022)) / SR; v = Math.sin(2 * Math.PI * ph) * Math.exp(-u / 0.11) + (u < 0.004 ? nz() * 0.3 * (1 - u / 0.004) : 0); }
    else if (k === 's') v = nz() * 0.75 * Math.exp(-u / 0.08) + Math.sin(2 * Math.PI * 190 * u) * 0.4 * Math.exp(-u / 0.03);
    else if (k === 'r') v = nz() * 0.5 * Math.exp(-u / 0.012) + Math.sin(2 * Math.PI * 1150 * u) * 0.5 * Math.exp(-u / 0.01);
    else if (k === 'h' || k === 'o' || k === 'c') { const x = nz(); v = (x - prev) * 0.5 * Math.exp(-u / tau); prev = x; }
    else if (k === 'd') { ph += 158 * (1 + 0.3 * Math.exp(-u / 0.018)) / SR; v = Math.sin(2 * Math.PI * ph) * Math.exp(-u / 0.13); }
    else if (k === 'p') v = bp.run(nz()) * 1.6 * Math.exp(-u / 0.03) + Math.sin(2 * Math.PI * 390 * u) * 0.3 * Math.exp(-u / 0.018);
    else { const f = k === 't' ? 2500 : 1900; v = (Math.sin(2 * Math.PI * f * u) + 0.4 * Math.sin(2 * Math.PI * f * 1.48 * u)) * Math.exp(-u / 0.011); }
    L[i0 + j] += v * vol * gl; R[i0 + j] += v * vol * gr;
  }
}
const INS = {
  lead25: { w: 'pulse', duty: 0.25, a: 0.004, d: 0.12, s: 0.7, r: 0.05, vib: [0.22, 0.2, 5.6] },
  lead50: { w: 'pulse', duty: 0.5, a: 0.004, d: 0.16, s: 0.6, r: 0.05, vib: [0.26, 0.16, 5.2] },
  lead12: { w: 'pulse', duty: 0.125, a: 0.003, d: 0.08, s: 0.6, r: 0.03, vib: [0.2, 0.18, 6] },
  harm12: { w: 'pulse', duty: 0.125, a: 0.004, d: 0.12, s: 0.6, r: 0.05 },
  piano: { w: 'pulse', duty: 0.5, a: 0.003, d: 0.5, s: 0, r: 0.2 },
  stab: { w: 'pulse', duty: 0.25, a: 0.002, d: 0.06, s: 0.35, r: 0.03, ar: 0.021 },
  broken: { w: 'pulse', duty: 0.125, a: 0.002, d: 0.06, s: 0.4, r: 0.04 },
  bass: { w: 'wave', a: 0.003, d: 0.25, s: 0.85, r: 0.02 },
  pad: { w: 'soft', a: 0.45, d: 0.6, s: 0.85, r: 0.9 },
  flute: { w: 'soft', a: 0.07, d: 0.4, s: 0.8, r: 0.25, vib: [0.3, 0.12, 4.8] },
  bell: { w: 'bell', ring: 1.1 },
  bellLong: { w: 'bell', ring: 2.4 }
};
const OCT8 = [[0, 2, 'R'], [2, 2, 'O'], [4, 2, 'R'], [6, 2, 'O'], [8, 2, 'R'], [10, 2, 'O'], [12, 2, 'R'], [14, 2, 'O']];
const TRES = [[0, 3, 'R'], [3, 3, 'F'], [6, 2, 'O'], [8, 3, 'R'], [11, 3, 'F'], [14, 2, 'O']];
const PUMP = [[0, 4, 'R'], [4, 4, 'F'], [8, 4, 'R'], [12, 4, 'F']], HOLD = [[0, 16, 'R']], HALF = [[0, 6, 'R'], [8, 6, 'F']];
const BEAT = { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, FILL = { k: 'x.......x.x.....', s: '....x.......x.xx', h: 'x.x.x.x.x.x.....' }, CRASH = Object.assign({ c: 'x...............' }, BEAT);
const KOMPANG = { A: { d: 'x.....x.x.......', p: '....x......x.x..', h: '..x...x...x...x.' }, B: { d: 'x.....x.x.....x.', p: '....x......xxx.x', h: '..x...x...x.....' }, C: { d: 'x.....x.x.......', p: '....x......x.x..', c: 'x...............' } };
const S8 = 'A A A B A A A B', S8C = 'C A A B A A A B';
const TOWN = {
  bpm: 112, key: 'C', bars: 16, chords: 'C | Am | F | G | C | Am | Dm7 G | C | F | G | Em7 | Am | F | G | Dm7 G7 | C',
  lead: 'E5:4 G5:2 A5:2 G5:4 E5:4 | D5:2 E5:2 C5:4 A4:8 | C5:4 D5:2 F5:2 A5:4 G5:4 | G5:6 E5:2 D5:8 | E5:4 G5:2 A5:2 C6:4 A5:4 | G5:2 A5:2 G5:2 E5:2 D5:4 C5:4 | D5:4 E5:2 D5:2 C5:2 A4:2 G4:4 | C5:8 r:4 E5:2 G5:2 | A5:3 G5:1 A5:2 C6:2 A5:4 G5:4 | G5:3 E5:1 G5:2 A5:2 G5:4 D5:4 | E5:3 D5:1 E5:2 G5:2 E5:4 D5:4 | C5:4 D5:2 E5:2 A4:8 | F5:4 E5:2 D5:2 C5:4 A4:4 | D5:4 E5:2 G5:2 A5:4 G5:4 | F5:3 E5:1 D5:2 C5:2 D5:4 B4:4 | C5:8 G4:2 A4:2 C5:2 D5:2'
};
const HOST = {
  bpm: 108, swing: 0.6, key: 'G', bars: 16, chords: 'G | Em | Am7 | D7 | G | Em | C D7 | G | C | G/B | Am7 | D7 | Bm7 | E7 | Am7 D7 | G',
  lead: 'D5:2 B4:2 D5:2 G5:4 r:2 F#5:2 G5:2 | A5:3 G5:1 E5:4 r:4 B4:2 D5:2 | E5:2 C5:2 E5:2 A5:4 r:2 G5:2 A5:2 | B5:3 A5:1 F#5:4 r:2 D5:2 E5:2 F#5:2 | G5:2 D5:2 B4:2 D5:2 G5:4 B5:4 | A5:3 G5:1 F#5:2 E5:2 D5:4 r:4 | E5:2 G5:2 C6:4 B5:2 A5:2 F#5:2 D5:2 | G5:4 r:4 D5:2 G5:2 r:4 | E5:6 D5:2 C5:4 E5:4 | D5:6 C5:2 B4:4 D5:4 | C5:4 E5:4 A5:4 G5:4 | F#5:6 E5:2 D5:4 r:4 | D5:2 F#5:2 A5:2 B5:4 r:2 A5:2 B5:2 | G#5:3 F#5:1 E5:4 r:4 D5:2 E5:2 | C6:2 B5:2 A5:2 G5:2 F#5:2 E5:2 D5:2 C5:2 | B4:2 D5:2 G5:4 r:8'
};
const CAPACITY = {
  bpm: 84, key: 'D', bars: 5, level: 0.85, chords: 'Dmaj7 | A/C# | Bm7 | Gm6 | Asus4 A',
  lead: 'r:4 A5:2 B5:2 D6:8 | A6:6 G6:2 F#6:4 E6:4 | F#6:6 E6:2 D6:4 B5:4 | Bb5:6 A5:2 G5:4 Bb5:4 | D6:8 C#6:8',
  parts: [
    { k: 'lead', ins: 'bellLong', vol: 0.5 },
    { k: 'lead', ins: 'piano', vol: 0.1, shift: -12, gate: 1 },
    { k: 'pad', ins: 'pad', vol: 0.06, oct: 4 },
    { k: 'bass', ins: 'bass', vol: 0.22, gate: 0.97, pats: { A: HOLD } },
    { k: 'drums', vol: 0.3, pats: { A: { t: 'x.......x.......', u: '....x.......x...' } } }
  ]
};
const BAND = (lead, extra) => [{ k: 'lead', ins: lead || 'lead25', vol: 0.45, pan: -0.08, echo: [1, 0.28, 0.4] }, { k: 'harm', ins: 'harm12', vol: 0.15, pan: 0.3 }].concat(extra || []);

export const CUES = {
  // ---------------- world ----------------
  title: {
    group: 'World', title: 'LPA GO! — title theme', when: 'Title screen', style: 'Chiptune fanfare from the intro: three-note “L-P-A” pickup, the “GO!” leap, pulse lead with echo, noise drums',
    bpm: 132, key: 'D', bars: 10, intro: 2, chords: 'D | C A | D | A/C# | Bm | G A | D | G | Em7 A7 | D',
    lead: 'D5:3 D5:3 F#5:2 A5:8 | C5:3 C5:3 E5:2 G5:2 A4:2 B4:2 D5:2 | A5:6 G5:2 F#5:4 D5:4 | E5:6 F#5:2 E5:2 B4:2 C#5:2 E5:2 | B5:6 A5:2 F#5:4 D5:4 | E5:3 F#5:1 G5:4 F#5:2 A4:2 B4:2 D5:2 | A5:6 G5:2 F#5:4 A5:4 | B5:6 A5:2 G5:4 B5:4 | D6:4 C#6:2 B5:2 A5:4 G5:2 E5:2 | D5:8 r:2 A4:2 B4:2 D5:2',
    parts: [
      { k: 'lead', ins: 'lead25', vol: 0.5, pan: -0.08, echo: [1, 0.3, 0.4] },
      { k: 'harm', ins: 'harm12', vol: 0.2, pan: 0.3 },
      { k: 'bass', ins: 'bass', vol: 0.42, gate: 0.8, seq: 'F G A A A A A A A A', pats: { A: OCT8, F: [[0, 3, 'R'], [3, 3, 'R'], [6, 2, 'R'], [8, 8, 'R']], G: [[0, 3, 'R'], [3, 3, 'R'], [6, 2, 'R'], [8, 2, 'R'], [10, 2, 'R'], [12, 2, 'O'], [14, 2, 'F']] } },
      { k: 'drums', vol: 0.5, seq: 'F G C A A B C A A B', pats: { F: { k: 'x..x..x.x.......', s: '..........xxxxxx', c: 'x...............' }, G: { k: 'x..x..x.x.......', s: '..........x.xxxx' }, A: BEAT, B: FILL, C: CRASH } }
    ]
  },
  morning: {
    group: 'World', title: 'Kampung Morning', when: 'Outdoors, 06:00–11:00', style: 'Pastoral G-major pentatonic on music box, flute joins in bar 5, broken-chord pulse, soft kompang',
    bpm: 100, key: 'G', bars: 8, chords: 'G | Em | C | D | G | Bm7 | C D | G',
    lead: 'D5:4 G5:4 A5:2 B5:2 A5:4 | G5:4 E5:4 D5:8 | E5:2 G5:2 A5:4 G5:2 E5:2 D5:4 | D5:4 E5:2 F#5:2 A5:8 | B5:4 A5:2 G5:2 A5:4 B5:4 | D6:4 B5:4 A5:2 F#5:2 D5:4 | E5:2 G5:2 C6:4 B5:2 A5:2 F#5:4 | G5:12 r:4',
    parts: [
      { k: 'lead', ins: 'bell', vol: 0.32 },
      { k: 'lead', ins: 'flute', vol: 0.16, shift: -12, bars: [4, 8], pan: -0.2, gate: 0.95 },
      { k: 'broken', ins: 'broken', vol: 0.08, pan: 0.35, oct: 4, every: 2, pat: [0, 1, 2, 1] },
      { k: 'bass', ins: 'bass', vol: 0.3, gate: 0.75, pats: { A: HALF } },
      { k: 'drums', vol: 0.22, pats: { A: { d: 'x.......x.......', h: '..x...x...x...x.' } } }
    ]
  },
  tenang: Object.assign({
    group: 'World', title: 'Tenang — town theme', when: 'Outdoors, 11:00–15:00', style: 'The intro’s pentatonic town theme with the full band: echo lead, kompang hand drums, music-box counter-melody',
    level: 1.05, parts: BAND('lead25', [
      { k: 'lead', ins: 'bell', vol: 0.16, shift: 12, bars: [8, 16], pan: -0.3 },
      { k: 'bass', ins: 'bass', vol: 0.4, gate: 0.8, pats: { A: TRES } },
      { k: 'drums', vol: 0.45, seq: 'A A A A A A A B A A A A A A A B', pats: KOMPANG }
    ])
  }, TOWN),
  evening: {
    group: 'World', title: 'Void Deck Evening', when: 'Outdoors, 15:00–20:00', style: 'Swung F-major lounge: soft square lead, piano-like stabs, walking wave bass, rim and brushed hats',
    bpm: 92, swing: 0.6, key: 'F', bars: 8, chords: 'Fmaj7 | Dm7 | Gm7 | C7 | Am7 | Dm7 | Gm7 C7 | F',
    lead: 'A5:3 G5:1 F5:4 C5:4 r:4 | D5:2 F5:2 A5:4 G5:4 F5:4 | Bb5:3 A5:1 G5:4 D5:4 r:4 | E5:2 G5:2 Bb5:4 A5:4 G5:4 | C6:3 A5:1 G5:4 E5:4 C5:4 | D5:2 E5:2 F5:4 A5:4 C6:4 | Bb5:4 A5:2 G5:2 E5:4 C5:4 | F5:12 r:4',
    parts: [
      { k: 'lead', ins: 'lead50', vol: 0.32, gate: 0.75 },
      { k: 'stab', ins: 'stab', vol: 0.1, pan: 0.3, oct: 4, at: [2, 6, 10, 14], len: 1 },
      { k: 'bass', ins: 'bass', vol: 0.34, gate: 0.7, pats: { A: [[0, 4, 'R'], [4, 4, '3'], [8, 4, 'F'], [12, 4, 'O']] } },
      { k: 'drums', vol: 0.24, pats: { A: { k: 'x.......x.......', r: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } } }
    ]
  },
  night: {
    group: 'World', title: 'Kampung Night', when: 'Outdoors, 20:00–06:00', style: 'The calm intro bed: Eb-major music-box arpeggio, warm pad, sparse flute tune, no drums',
    bpm: 72, key: 'Eb', bars: 8, level: 0.8, chords: 'Ebmaj7 | Cm7 | Abmaj7 | Bb | Gm7 | Cm7 | Ab Bb | Eb',
    lead: 'G5:8 Bb5:4 G5:4 | G5:4 F5:4 Eb5:8 | C5:4 Eb5:4 G5:4 F5:4 | F5:12 r:4 | Bb5:8 G5:4 F5:4 | Eb5:4 G5:4 Bb5:8 | C6:4 Bb5:4 Ab5:4 F5:4 | Eb5:12 r:4',
    parts: [
      { k: 'lead', ins: 'flute', vol: 0.2, gate: 0.95, pan: -0.12 },
      { k: 'broken', ins: 'bell', vol: 0.12, pan: 0.2, oct: 5, every: 2, pat: [0, 2, 1, 3, 2, 1, 0, 2] },
      { k: 'pad', ins: 'pad', vol: 0.05, oct: 4 },
      { k: 'bass', ins: 'bass', vol: 0.18, gate: 0.97, pats: { A: HOLD } }
    ]
  },
  // ---------------- rooms ----------------
  kopitiam: {
    group: 'Rooms', title: 'Kopi-O Shuffle', when: 'Kopitiam', style: 'Swung Bb-major chip shuffle with echo lead and kompang, like the morning coffee crowd',
    bpm: 116, swing: 0.62, key: 'Bb', bars: 8, chords: 'Bb | Gm7 | Cm7 | F7 | Bb | Eb | Cm7 F7 | Bb',
    lead: 'F5:2 Bb5:2 D6:2 r:2 C6:2 Bb5:2 G5:4 | Bb5:2 G5:2 D5:2 r:2 F5:4 G5:4 | Eb5:2 G5:2 C6:2 r:2 Bb5:2 G5:2 Eb5:4 | F5:2 A5:2 C6:4 Eb6:4 C6:4 | D6:3 C6:1 Bb5:4 F5:4 D5:4 | Eb5:2 G5:2 Bb5:4 G5:2 Eb5:2 G5:4 | Eb5:2 G5:2 C6:4 A5:2 F5:2 Eb5:4 | D5:4 Bb4:4 Bb5:4 r:4',
    parts: [
      { k: 'lead', ins: 'lead25', vol: 0.4, pan: -0.08, echo: [1, 0.25, 0.4], gate: 0.8 },
      { k: 'stab', ins: 'stab', vol: 0.12, pan: 0.3, oct: 4, at: [2, 6, 10, 14], len: 1 },
      { k: 'bass', ins: 'bass', vol: 0.4, gate: 0.75, pats: { A: TRES } },
      { k: 'drums', vol: 0.38, seq: S8, pats: KOMPANG }
    ]
  },
  hawker: {
    group: 'Rooms', title: 'Hawker Rush', when: 'Hawker Centre', style: 'Busy C-major 8-bit march: thin 12.5% lead in quick arpeggios, octave bass, backbeat',
    bpm: 126, key: 'C', bars: 8, chords: 'C | F | G | C | Am | F | D7 | G7',
    lead: 'C5:2 E5:2 G5:2 C6:2 B5:2 G5:2 E5:4 | F5:2 A5:2 C6:2 A5:2 G5:2 F5:2 A5:4 | G5:2 B5:2 D6:2 B5:2 A5:2 G5:2 D5:4 | E5:4 G5:4 C6:8 | A5:2 C6:2 E6:2 C6:2 B5:2 A5:2 E5:4 | F5:2 A5:2 C6:4 A5:2 F5:2 C5:4 | F#5:2 A5:2 D6:2 C6:2 A5:2 F#5:2 D5:4 | G5:2 A5:2 B5:2 D6:2 F6:4 D6:4',
    parts: BAND('lead12', [
      { k: 'bass', ins: 'bass', vol: 0.4, gate: 0.8, pats: { A: OCT8 } },
      { k: 'drums', vol: 0.42, seq: S8, pats: { A: BEAT, B: FILL } }
    ])
  },
  minimart: {
    group: 'Rooms', title: 'Aisle Three', when: 'Minimart', style: 'A-major chip bossa: music box doubled by a soft square, syncopated bass, rim clave',
    bpm: 104, key: 'A', bars: 8, chords: 'Amaj7 | F#m7 | Bm7 | E7 | Amaj7 | C#m7 | Bm7 E7 | A',
    lead: 'C#6:4 B5:2 A5:2 E5:4 r:4 | F#5:2 A5:2 C#6:4 B5:4 A5:4 | D6:4 C#6:2 B5:2 F#5:4 r:4 | G#5:2 B5:2 D6:4 C#6:4 B5:4 | C#6:4 E6:4 C#6:2 B5:2 A5:4 | G#5:2 E5:2 C#5:4 E5:4 G#5:4 | F#5:2 A5:2 D6:2 C#6:2 B5:4 G#5:4 | A5:12 r:4',
    parts: [
      { k: 'lead', ins: 'bell', vol: 0.26 },
      { k: 'lead', ins: 'lead50', vol: 0.14, gate: 0.7, pan: -0.15 },
      { k: 'broken', ins: 'broken', vol: 0.07, pan: 0.35, oct: 4, every: 2, pat: [0, 2, 1, 3] },
      { k: 'bass', ins: 'bass', vol: 0.36, gate: 0.8, pats: { A: [[0, 3, 'R'], [3, 5, 'F'], [8, 3, 'F'], [11, 5, 'R']] } },
      { k: 'drums', vol: 0.28, pats: { A: { r: 'x..x..x...x..x..', h: 'x.x.x.x.x.x.x.x.', k: 'x.......x.......' } } }
    ]
  },
  library: {
    group: 'Rooms', title: 'Quiet Please', when: 'Public Library', style: 'Hushed C-major music box over a faint pad, no drums',
    bpm: 76, key: 'C', bars: 8, level: 0.75, chords: 'C | Am7 | Fmaj7 | G | Em7 | Am7 | Dm7 G | C',
    lead: 'E5:4 G5:4 C6:8 | B5:4 A5:4 E5:8 | F5:4 A5:4 C6:4 E6:4 | D6:12 r:4 | B5:4 G5:4 E5:4 G5:4 | C6:8 A5:8 | F5:4 A5:4 G5:4 B5:4 | C6:12 r:4',
    parts: [
      { k: 'lead', ins: 'bellLong', vol: 0.34 },
      { k: 'broken', ins: 'bell', vol: 0.07, pan: 0.25, oct: 4, every: 2, pat: [0, 1, 2, 3] },
      { k: 'pad', ins: 'pad', vol: 0.04, oct: 4 },
      { k: 'bass', ins: 'bass', vol: 0.14, gate: 0.97, pats: { A: HOLD } }
    ]
  },
  cc: {
    group: 'Rooms', title: 'Roadshow at the CC', when: 'Community Club hall', style: 'Festive D-major parade: echo lead, harmony third, tresillo bass, full kompang with crash',
    bpm: 120, key: 'D', bars: 8, chords: 'D | G | A | D | Bm | G | Em7 A7 | D',
    lead: 'A4:2 D5:2 F#5:2 A5:2 B5:4 A5:4 | G5:2 B5:2 D6:4 B5:2 G5:2 D5:4 | E5:2 A5:2 C#6:4 B5:2 A5:2 E5:4 | F#5:4 A5:4 D6:4 r:4 | D6:2 C#6:2 B5:2 F#5:2 D5:4 F#5:4 | G5:2 A5:2 B5:4 D6:4 B5:4 | E5:2 G5:2 B5:2 E6:2 C#6:4 A5:4 | D6:8 A5:2 F#5:2 D5:4',
    parts: BAND('lead25', [
      { k: 'bass', ins: 'bass', vol: 0.4, gate: 0.8, pats: { A: TRES } },
      { k: 'drums', vol: 0.46, seq: S8C, pats: KOMPANG }
    ])
  },
  boutique: {
    group: 'Rooms', title: 'Batik Waltz', when: 'Ketapang Boutique', style: 'F-major waltz in 3/4: legato square lead, oom-pah-pah bass and chord stabs, music-box sparkle',
    bpm: 138, spb: 12, key: 'F', bars: 8, chords: 'F | C7 | C7 | F | Bb | F | C7 | F',
    lead: 'C6:6 A5:2 F5:4 | E5:4 G5:4 Bb5:4 | Bb5:6 A5:2 G5:4 | A5:8 r:4 | D6:6 C6:2 Bb5:4 | A5:4 C6:4 F5:4 | G5:4 Bb5:4 E5:4 | F5:8 r:4',
    parts: [
      { k: 'lead', ins: 'lead50', vol: 0.34, gate: 0.85 },
      { k: 'lead', ins: 'bell', vol: 0.12, shift: 12, bars: [4, 8], pan: 0.3 },
      { k: 'stab', ins: 'stab', vol: 0.11, pan: 0.3, oct: 4, at: [4, 8], len: 2 },
      { k: 'bass', ins: 'bass', vol: 0.36, gate: 0.6, pats: { A: [[0, 4, 'R']] } },
      { k: 'drums', vol: 0.18, pats: { A: { h: '....x...x...' } } }
    ]
  },
  council: {
    group: 'Rooms', title: 'Queue Number 47', when: 'Town Council office', style: 'Polite C-major office tune over a woodblock clock tick, half-time bass',
    bpm: 96, key: 'C', bars: 8, chords: 'C | G/B | Am7 | Em7 | F | C/E | Dm7 | G',
    lead: 'G5:4 E5:2 F5:2 G5:4 C6:4 | B5:4 A5:2 G5:2 D5:8 | C5:2 E5:2 A5:4 G5:4 E5:4 | G5:4 B5:2 A5:2 G5:8 | A5:4 G5:2 F5:2 C5:4 F5:4 | E5:4 G5:4 C6:4 G5:4 | F5:2 E5:2 D5:2 F5:2 A5:4 C6:4 | B5:8 G5:4 r:4',
    parts: [
      { k: 'lead', ins: 'lead50', vol: 0.32, gate: 0.7 },
      { k: 'stab', ins: 'stab', vol: 0.09, pan: 0.3, oct: 4, at: [4, 12], len: 1 },
      { k: 'bass', ins: 'bass', vol: 0.32, gate: 0.7, pats: { A: [[0, 4, 'R'], [8, 4, 'F']] } },
      { k: 'drums', vol: 0.24, pats: { A: { t: 'x.......x.......', u: '....x.......x...' } } }
    ]
  },
  lawfirm: {
    group: 'Rooms', title: 'Lee & Lim, Counsel', when: 'Law firm office', style: 'Serious D-minor chamber piece: plucked square piano, low pad, slow clock',
    bpm: 84, key: 'F', bars: 8, level: 0.85, chords: 'Dm | Bb | Gm6 | A | Dm | F/C | Bbmaj7 | Asus4 A',
    lead: 'D5:4 F5:4 A5:6 G5:2 | F5:4 D5:4 Bb4:8 | G5:4 Bb5:4 D6:4 E5:4 | C#5:8 E5:4 A5:4 | A5:4 D6:4 C6:4 A5:4 | C6:4 A5:4 F5:8 | D5:4 F5:4 A5:4 G5:4 | E5:8 C#5:8',
    parts: [
      { k: 'lead', ins: 'piano', vol: 0.36, gate: 1 },
      { k: 'pad', ins: 'pad', vol: 0.05, oct: 4 },
      { k: 'bass', ins: 'bass', vol: 0.24, gate: 0.95, pats: { A: [[0, 8, 'R'], [8, 8, 'O']] } },
      { k: 'drums', vol: 0.14, pats: { A: { u: 'x...x...x...x...' } } }
    ]
  },
  hall: {
    group: 'Rooms', title: 'Warm-Up Set', when: 'Sports Hall & Gym', style: 'E-minor workout chiptune: four-on-the-floor kick, octave bass, echo lead',
    bpm: 140, key: 'G', bars: 8, chords: 'Em | C | D | Em | Em | C | D | B7',
    lead: 'E5:2 E5:2 G5:2 B5:2 E6:4 D6:2 B5:2 | C6:2 B5:2 G5:2 E5:2 G5:4 r:4 | D5:2 F#5:2 A5:2 D6:2 C6:2 A5:2 F#5:4 | E5:4 G5:2 B5:2 E5:8 | B5:2 B5:2 B5:2 A5:2 G5:2 A5:2 B5:4 | C6:2 C6:2 E6:2 C6:2 G5:4 E5:4 | D6:2 C6:2 A5:2 F#5:2 D5:4 A5:4 | B5:4 D#6:4 F#6:4 B5:4',
    parts: BAND('lead25', [
      { k: 'bass', ins: 'bass', vol: 0.42, gate: 0.8, pats: { A: OCT8 } },
      { k: 'drums', vol: 0.44, seq: S8, pats: { A: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' }, B: { k: 'x...x...x...x...', s: '....x.......x.xx', o: '..x...x...x.....' } } }
    ])
  },
  school: {
    group: 'Rooms', title: 'Primary 4 Recess', when: 'Tenang Primary classroom', style: 'Playful C-major nursery chip: 12.5% lead doubled on glockenspiel, bouncy bass',
    bpm: 120, key: 'C', bars: 8, chords: 'C | Am | Dm7 | G | C | Am | F G | C',
    lead: 'C5:2 D5:2 E5:2 G5:2 E5:2 D5:2 C5:4 | E5:2 G5:2 A5:2 C6:2 A5:2 G5:2 E5:4 | F5:2 E5:2 D5:2 F5:2 A5:4 F5:4 | G5:4 B5:2 A5:2 G5:8 | C6:2 B5:2 A5:2 G5:2 E5:2 G5:2 C6:4 | A5:2 G5:2 E5:2 C5:2 E5:4 A5:4 | F5:2 A5:2 C6:4 B5:2 D6:2 G5:4 | C6:8 G5:2 E5:2 C5:4',
    parts: [
      { k: 'lead', ins: 'lead12', vol: 0.4, gate: 0.65 },
      { k: 'lead', ins: 'bell', vol: 0.16, shift: 12, pan: 0.3 },
      { k: 'bass', ins: 'bass', vol: 0.36, gate: 0.6, pats: { A: PUMP } },
      { k: 'drums', vol: 0.34, seq: S8, pats: { A: BEAT, B: FILL } }
    ]
  },
  // ---------------- conversation & menus ----------------
  doubt: Object.assign({
    group: 'Conversation', title: 'Lisa’s Theme', when: 'A Doubt conversation with a neighbour', style: 'The intro’s swung G-major walk for Lisa explaining, set back so the words come first',
    level: 0.75, parts: [
      { k: 'lead', ins: 'lead50', vol: 0.34, gate: 0.78 },
      { k: 'stab', ins: 'stab', vol: 0.1, pan: 0.3, oct: 4, at: [2, 6, 10, 14], len: 1 },
      { k: 'bass', ins: 'bass', vol: 0.36, gate: 0.7, pats: { A: [[0, 3, 'R'], [4, 3, 'F'], [8, 3, 'O'], [12, 3, 'F']] } },
      { k: 'drums', vol: 0.22, pats: { A: { k: 'x.......x.......', r: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } } }
    ]
  }, HOST),
  notebook: {
    group: 'Conversation', title: 'Lisa’s Notebook', when: 'Notebook open (clock paused)', style: 'The title motif slowed onto a music box over a pad; a pause-menu lullaby',
    bpm: 70, key: 'D', bars: 8, level: 0.75, chords: 'Dmaj7 | Bm7 | Gmaj7 | A | Dmaj7 | F#m7 | Gmaj7 A | D',
    lead: 'D5:3 D5:3 F#5:2 A5:8 | B5:6 A5:2 F#5:8 | G5:3 G5:3 B5:2 D6:8 | C#6:6 B5:2 A5:8 | D6:6 C#6:2 A5:4 F#5:4 | E5:4 F#5:4 A5:4 C#6:4 | B5:4 A5:4 E5:4 G5:4 | F#5:12 r:4',
    parts: [
      { k: 'lead', ins: 'bellLong', vol: 0.4 },
      { k: 'pad', ins: 'pad', vol: 0.05, oct: 4 },
      { k: 'bass', ins: 'bass', vol: 0.15, gate: 0.97, pats: { A: HOLD } }
    ]
  },
  news: {
    group: 'Conversation', title: 'Tenang Times', when: 'Story events (Mdm Tan, Ah Gong)', style: 'A short G-major news bulletin with a teletype woodblock',
    bpm: 96, key: 'G', bars: 4, level: 0.8, chords: 'G | C | Am7 D7 | G',
    lead: 'D5:2 G5:2 B5:2 D6:2 B5:4 G5:4 | E5:2 G5:2 C6:4 E6:4 C6:4 | A5:2 C6:2 E6:2 C6:2 F#5:2 A5:2 D6:4 | B5:8 G5:4 r:4',
    parts: [
      { k: 'lead', ins: 'lead50', vol: 0.32, gate: 0.7 },
      { k: 'bass', ins: 'bass', vol: 0.3, gate: 0.7, pats: { A: PUMP } },
      { k: 'drums', vol: 0.2, pats: { A: { t: 'x.x.x.x.x.x.x.x.', u: '....x.......x...' } } }
    ]
  },
  fate: Object.assign({ group: 'Conversation', title: 'Capacity', when: 'Fate Event (a neighbour loses capacity)', style: 'The intro’s “why now” music box: clock ticking, the minor iv where capacity goes' }, CAPACITY),
  // ---------------- minigames ----------------
  mrt: {
    group: 'Minigames', title: 'Tenang Line', when: 'MRT seat game', style: 'Driving E-minor chiptune over a steady backbeat',
    bpm: 132, key: 'G', bars: 8, chords: 'Em | Em | C | D | Em | Em | Am | B7',
    lead: 'B4:2 E5:2 G5:2 B5:2 A5:2 G5:2 E5:4 | r:4 E5:2 F#5:2 G5:4 B5:4 | C6:2 B5:2 G5:2 E5:2 C5:4 E5:4 | D5:2 F#5:2 A5:2 D6:2 C6:4 A5:4 | B5:4 A5:2 G5:2 F#5:2 G5:2 E5:4 | E6:4 D6:2 B5:2 G5:4 E5:4 | A5:2 C6:2 E6:2 C6:2 A5:4 E5:4 | D#5:4 F#5:4 A5:4 B5:4',
    parts: [
      { k: 'lead', ins: 'lead12', vol: 0.45, gate: 0.7, echo: [1, 0.25, 0.4] },
      { k: 'bass', ins: 'bass', vol: 0.42, gate: 0.8, pats: { A: OCT8 } },
      { k: 'drums', vol: 0.4, pats: { A: { k: 'x.......x.......', s: '....x.......x...' } } },
      { k: 'drums', vol: 0.16, pats: { A: { h: 'x.x.x.x.x.x.x.x.' } } }
    ]
  },
  chope: {
    group: 'Minigames', title: 'Musical Chairs', when: 'Chope a table — while the music plays', style: 'The intro’s oom-pah minigame tune in F; it cuts dead when the round’s music stops',
    bpm: 152, key: 'F', bars: 16, chords: 'F | F | Bb | C7 | F | D7 | Gm C7 | F | Bb | F/C | G7 | C7 | F | D7 | Gm7 C7 | F',
    lead: 'C5:2 F5:2 A5:2 r:2 G#5:1 A5:1 C6:2 A5:2 r:2 | G5:2 F5:2 D5:2 F5:2 C5:4 r:4 | D5:2 F5:2 Bb5:2 r:2 A5:1 Bb5:1 D6:2 Bb5:2 r:2 | C6:2 Bb5:2 G5:2 E5:2 C5:4 r:4 | C5:2 F5:2 A5:2 r:2 G#5:1 A5:1 C6:2 F6:2 r:2 | F#5:2 A5:2 D6:2 C6:2 A5:2 F#5:2 D5:4 | Bb5:2 A5:2 G5:2 D5:2 E5:2 F5:2 G5:2 Bb5:2 | A5:4 F5:2 C5:2 F5:4 r:4 | D6:3 C6:1 Bb5:2 F5:2 D5:2 F5:2 Bb5:4 | A5:3 G5:1 F5:2 C5:2 A4:2 C5:2 F5:4 | G5:2 B4:2 D5:2 F5:2 G5:2 A5:2 B5:4 | C6:2 r:2 C6:2 Bb5:2 G5:2 E5:2 C5:4 | C5:2 F5:2 A5:2 r:2 G#5:1 A5:1 C6:2 A5:2 r:2 | D6:2 C6:2 A5:2 F#5:2 G5:2 A5:2 D5:4 | Bb5:2 A5:2 G5:2 F5:2 E5:2 C5:2 E5:2 G5:2 | F5:2 r:2 C5:2 r:2 F5:4 r:4',
    parts: [
      { k: 'lead', ins: 'lead12', vol: 0.55, gate: 0.6, pan: -0.05 },
      { k: 'stab', ins: 'stab', vol: 0.16, pan: 0.3, oct: 4, at: [2, 6, 10, 14], len: 1.2 },
      { k: 'bass', ins: 'bass', vol: 0.42, gate: 0.65, pats: { A: [[0, 2, 'R'], [4, 2, 'F'], [8, 2, 'R'], [12, 2, 'F']] } },
      { k: 'drums', vol: 0.45, seq: 'C A A B A A A B C A A B A A A B', pats: { A: BEAT, B: FILL, C: CRASH } }
    ]
  },
  scramble: {
    group: 'Minigames', title: 'Music Stops!', when: 'Chope a table — the scramble', style: 'A low pulsing kick and bass under a quiet two-note alarm',
    bpm: 150, key: 'F', bars: 2, level: 0.8, chords: 'F | Gb',
    lead: 'C6:2 r:6 C6:2 r:6 | Db6:2 r:6 Db6:2 r:6',
    parts: [
      { k: 'lead', ins: 'lead12', vol: 0.18, gate: 0.8 },
      { k: 'bass', ins: 'bass', vol: 0.4, gate: 0.6, pats: { A: [[0, 1, 'R'], [2, 1, 'R'], [8, 1, 'R'], [10, 1, 'R']] } },
      { k: 'drums', vol: 0.32, pats: { A: { k: 'x.x.....x.x.....', h: '....x.......x...' } } }
    ]
  },
  chop: {
    group: 'Minigames', title: 'Chicken Rice Cleaver', when: 'Chicken rice stall', style: 'Pentatonic C-major stall tune with rim and kompang “chop” rhythm',
    bpm: 112, key: 'C', bars: 8, chords: 'C | Am | F | G | C | Am | Dm G | C',
    lead: 'E5:2 G5:2 A5:4 G5:2 E5:2 D5:4 | C5:2 D5:2 E5:4 A4:8 | A5:2 G5:2 C6:4 A5:4 G5:4 | G5:2 E5:2 D5:4 G5:8 | C6:2 A5:2 G5:4 E5:2 G5:2 A5:4 | E5:2 D5:2 C5:4 E5:4 A5:4 | D5:2 E5:2 G5:4 A5:2 G5:2 D5:4 | C5:8 r:4 E5:2 G5:2',
    parts: [
      { k: 'lead', ins: 'lead25', vol: 0.42, gate: 0.75, echo: [1, 0.22, 0.4] },
      { k: 'bass', ins: 'bass', vol: 0.38, gate: 0.75, pats: { A: TRES } },
      { k: 'drums', vol: 0.4, pats: { A: { k: 'x.......x.......', r: '..x...x...x.x.x.', p: '....x.......x...' } } }
    ]
  },
  tray: {
    group: 'Minigames', title: 'Lunch Service', when: 'Tray return', style: 'A-minor chase at 144 bpm with a harmonic-minor lead, octave bass and fills',
    bpm: 144, key: 'C', bars: 8, chords: 'Am | Am | Dm | E7 | Am | F | Dm E7 | Am',
    lead: 'A5:2 C6:2 E6:2 C6:2 A5:2 E5:2 A5:4 | G#5:2 A5:2 B5:2 C6:2 B5:2 A5:2 E5:4 | D5:2 F5:2 A5:2 D6:2 C6:2 A5:2 F5:4 | E5:2 G#5:2 B5:2 E6:2 D6:4 B5:4 | C6:2 B5:2 A5:2 E5:2 C5:2 E5:2 A5:4 | A5:2 C6:2 F6:4 E6:2 C6:2 A5:4 | F5:2 A5:2 D6:2 A5:2 G#5:2 B5:2 E6:4 | A5:4 E5:4 A4:4 r:4',
    parts: BAND('lead12', [
      { k: 'bass', ins: 'bass', vol: 0.42, gate: 0.8, pats: { A: OCT8 } },
      { k: 'drums', vol: 0.44, seq: S8, pats: { A: BEAT, B: FILL } }
    ])
  },
  jetty: {
    group: 'Minigames', title: 'Still Water', when: 'Fishing — waiting for a bite', style: 'The calm intro bed in F: music-box arpeggio, flute, pad, round bass',
    bpm: 80, key: 'F', bars: 8, level: 0.85, chords: 'F | Dm | Bb | C | F | Am | Bb | C',
    lead: 'A5:8 F5:4 G5:4 | E5:12 r:4 | F5:8 D5:4 F5:4 | E5:8 C5:8 | C6:8 A5:4 C6:4 | E5:4 G5:4 C6:8 | D6:4 C6:4 Bb5:4 F5:4 | G5:12 r:4',
    parts: [
      { k: 'lead', ins: 'flute', vol: 0.2, gate: 0.95, pan: -0.12 },
      { k: 'broken', ins: 'bell', vol: 0.1, pan: 0.2, oct: 5, every: 2, pat: [0, 1, 2, 3, 2, 1] },
      { k: 'pad', ins: 'pad', vol: 0.05, oct: 4 },
      { k: 'bass', ins: 'bass', vol: 0.2, gate: 0.9, pats: { A: [[0, 11, 'R'], [12, 4, 'F']] } }
    ]
  },
  reel: {
    group: 'Minigames', title: 'Fish On!', when: 'Fishing — reeling in', style: 'D-minor tension loop: running arpeggio lead, octave bass, 16th hats',
    bpm: 150, key: 'F', bars: 4, chords: 'Dm | Bb | Gm | A7',
    lead: 'D6:2 A5:2 F5:2 A5:2 D6:2 A5:2 F5:2 A5:2 | D6:2 Bb5:2 F5:2 Bb5:2 D6:2 Bb5:2 F5:2 Bb5:2 | D6:2 Bb5:2 G5:2 Bb5:2 D6:2 Bb5:2 G5:2 Bb5:2 | C#6:2 A5:2 E5:2 A5:2 C#6:2 E6:2 G6:2 E6:2',
    parts: [
      { k: 'lead', ins: 'lead12', vol: 0.36, gate: 0.6 },
      { k: 'bass', ins: 'bass', vol: 0.42, gate: 0.8, pats: { A: OCT8 } },
      { k: 'drums', vol: 0.4, pats: { A: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' } } }
    ]
  },
  // ---------------- sports ----------------
  football: {
    group: 'Sports', title: 'Kampung Cup', when: 'Football on the school field', style: 'A-major stadium anthem: echo lead, harmony, octave bass, kompang with crash',
    bpm: 144, key: 'A', bars: 8, chords: 'A | D | E | A | F#m | D | B7 | E7',
    lead: 'E5:2 A5:2 C#6:2 E6:2 C#6:4 A5:4 | F#5:2 A5:2 D6:4 F#6:4 D6:4 | E6:4 D6:2 C#6:2 B5:4 G#5:4 | A5:4 E5:2 A5:2 C#6:8 | C#6:2 B5:2 A5:2 F#5:2 C#5:4 F#5:4 | D6:2 C#6:2 A5:2 F#5:2 D5:4 A5:4 | D#6:2 C#6:2 B5:2 F#5:2 D#5:4 B5:4 | E6:4 D6:4 B5:4 G#5:4',
    parts: BAND('lead25', [
      { k: 'bass', ins: 'bass', vol: 0.42, gate: 0.8, pats: { A: OCT8 } },
      { k: 'drums', vol: 0.46, seq: S8C, pats: { A: Object.assign({ k: 'x.......x.......' }, KOMPANG.A), B: Object.assign({ s: '............xxxx' }, KOMPANG.B), C: Object.assign({ k: 'x.......x.......' }, KOMPANG.C) } }
    ])
  },
  basketball: {
    group: 'Sports', title: 'Court Hoops', when: 'Basketball in the Sports Hall', style: 'Swung E-minor chip funk: syncopated bass, laid-back square lead, boom-bap drums',
    bpm: 98, swing: 0.58, key: 'G', bars: 8, chords: 'Em7 | Am7 | Em7 | B7 | Em7 | Am7 | Cmaj7 | B7',
    lead: 'E5:2 r:2 G5:2 A5:2 B5:4 r:2 A5:2 | C6:2 r:2 B5:2 A5:2 E5:4 r:4 | G5:2 A5:2 B5:2 D6:2 B5:2 A5:2 G5:4 | F#5:4 A5:2 B5:2 D#6:8 | E6:2 r:2 D6:2 B5:2 G5:4 r:2 A5:2 | C6:2 B5:2 A5:2 G5:2 E5:4 r:4 | B5:2 C6:2 E6:4 D6:2 B5:2 G5:4 | F#5:2 A5:2 B5:4 r:8',
    parts: [
      { k: 'lead', ins: 'lead50', vol: 0.38, gate: 0.6, echo: [2, 0.2, 0.4] },
      { k: 'stab', ins: 'stab', vol: 0.1, pan: 0.3, oct: 4, at: [3, 11], len: 1 },
      { k: 'bass', ins: 'bass', vol: 0.44, gate: 0.75, pats: { A: [[0, 3, 'R'], [3, 1, 'R'], [6, 2, 'O'], [10, 2, 'F'], [12, 2, 'R'], [14, 2, 'O']] } },
      { k: 'drums', vol: 0.42, pats: { A: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } } }
    ]
  },
  badminton: {
    group: 'Sports', title: 'Shuttle Rally', when: 'Badminton in the Sports Hall', style: 'Bright G-major rally: quick 12.5% lead that bats notes back and forth, pumping bass',
    bpm: 128, key: 'G', bars: 8, chords: 'G | C | D | G | Em | C | A7 | D7',
    lead: 'G5:1 r:1 B5:1 r:1 D6:2 B5:2 G5:2 D5:2 G5:4 | E5:2 G5:2 C6:2 E6:2 D6:2 C6:2 G5:4 | F#5:2 A5:2 D6:2 F#6:2 E6:2 D6:2 A5:4 | B5:4 G5:4 D5:4 r:4 | E6:2 D6:2 B5:2 G5:2 E5:2 G5:2 B5:4 | C6:2 B5:2 G5:2 E5:2 C5:4 E5:4 | C#6:2 E6:2 G6:2 E6:2 C#6:2 A5:2 E5:4 | F#5:2 A5:2 C6:2 D6:2 F#6:4 D6:4',
    parts: [
      { k: 'lead', ins: 'lead12', vol: 0.42, gate: 0.6, pan: -0.25, echo: [2, 0.3, 0.45] },
      { k: 'harm', ins: 'harm12', vol: 0.14, pan: 0.3 },
      { k: 'bass', ins: 'bass', vol: 0.4, gate: 0.7, pats: { A: PUMP } },
      { k: 'drums', vol: 0.4, seq: S8, pats: { A: BEAT, B: FILL } }
    ]
  },
  // ---------------- Legacy Day ----------------
  legacy: {
    group: 'Legacy Day', title: 'Legacy Day', when: 'Sunday results (Bronze to Platinum)', style: 'The title motif as a D-major kompang march with crash, harmony and a music-box descant',
    bpm: 120, key: 'D', bars: 8, chords: 'D | G | A | D | Bm | G | Em7 A7 | D',
    lead: 'D5:3 D5:3 F#5:2 A5:8 | B5:3 B5:3 D6:2 G5:8 | C#6:3 B5:1 A5:4 E5:4 C#5:4 | D5:4 F#5:4 A5:4 D6:4 | D6:3 C#6:1 B5:4 F#5:4 D5:4 | G5:2 A5:2 B5:4 D6:4 B5:4 | E6:4 D6:2 C#6:2 B5:4 C#6:4 | D6:8 A5:4 r:4',
    parts: BAND('lead25', [
      { k: 'lead', ins: 'bell', vol: 0.16, shift: 12, bars: [4, 8], pan: -0.3 },
      { k: 'bass', ins: 'bass', vol: 0.42, gate: 0.8, pats: { A: TRES } },
      { k: 'drums', vol: 0.48, seq: S8C, pats: KOMPANG }
    ])
  },
  legacyQuiet: {
    group: 'Legacy Day', title: 'Next Year, Maybe', when: 'Sunday results with no tier', style: 'B-minor music box over a pad: rueful, ending on an open suspension',
    bpm: 76, key: 'D', bars: 8, level: 0.8, chords: 'Bm | G | D | A | Bm | G | Em7 | Asus4 A',
    lead: 'F#5:8 D5:4 B4:4 | D5:8 B4:4 G4:4 | A4:4 D5:4 F#5:8 | E5:12 r:4 | F#5:4 B5:4 A5:4 F#5:4 | G5:4 B5:4 D6:8 | E6:4 D6:4 B5:4 G5:4 | A5:12 r:4',
    parts: [
      { k: 'lead', ins: 'bellLong', vol: 0.4 },
      { k: 'pad', ins: 'pad', vol: 0.05, oct: 4 },
      { k: 'bass', ins: 'bass', vol: 0.16, gate: 0.97, pats: { A: HOLD } }
    ]
  },
  // ---------------- stings (play once over the bed) ----------------
  booked: {
    group: 'Stings', title: 'Booked!', when: 'A neighbour takes a Roadshow Flyer', style: 'Two-bar D-major fanfare with crash',
    sting: true, bpm: 150, key: 'D', bars: 2, tail: 2, chords: 'D | G D',
    lead: 'A5:2 D6:2 F#6:2 A6:2 r:2 F#6:2 A6:4 | B6:2 A6:2 G6:2 F#6:2 D6:8',
    parts: BAND('lead25', [{ k: 'bass', ins: 'bass', vol: 0.4, gate: 0.8, pats: { A: OCT8 } }, { k: 'drums', vol: 0.5, seq: 'A B', pats: { A: { k: 'x.......x.......', s: '..........xxxxxx', c: 'x...............' }, B: { k: 'x.......x.......', c: '........x.......' } } }])
  },
  good: {
    group: 'Stings', title: 'Good Answer', when: 'A ✔ reply in a Doubt', style: 'Rising C-major chime',
    sting: true, bpm: 160, key: 'C', bars: 1, tail: 1.6, chords: 'C', lead: 'E6:2 G6:2 C7:4 r:8',
    parts: [{ k: 'lead', ins: 'bell', vol: 0.5 }, { k: 'lead', ins: 'lead12', vol: 0.16, gate: 0.6, shift: -12 }]
  },
  okay: {
    group: 'Stings', title: 'Half There', when: 'A ◐ reply in a Doubt', style: 'Unresolved two-note music box',
    sting: true, bpm: 140, key: 'C', bars: 1, tail: 1.6, chords: 'Dm7', lead: 'D6:2 F6:2 E6:4 r:8',
    parts: [{ k: 'lead', ins: 'bell', vol: 0.45 }]
  },
  backfire: {
    group: 'Stings', title: 'Backfire', when: 'A ✘ reply in a Doubt', style: 'Sagging “wah-wah” chromatic slide on a square lead',
    sting: true, bpm: 120, key: 'C', bars: 1, tail: 1, chords: 'C', lead: 'G4:3 F#4:3 F4:3 E4:7',
    parts: [{ k: 'lead', ins: 'lead50', vol: 0.4, gate: 0.9 }, { k: 'bass', ins: 'bass', vol: 0.3, gate: 0.9, pats: { A: [[0, 16, 'R']] } }]
  },
  win: {
    group: 'Stings', title: 'Victory', when: 'A minigame or match won', style: 'Two-bar C-major RPG victory jingle with snare roll',
    sting: true, bpm: 140, key: 'C', bars: 2, tail: 2, chords: 'C | F G C',
    lead: 'G5:2 C6:2 E6:2 G6:2 r:2 E6:2 G6:4 | A6:3 G6:1 F6:2 A6:2 G6:2 E6:2 C7:4',
    parts: BAND('lead25', [{ k: 'bass', ins: 'bass', vol: 0.4, gate: 0.8, pats: { A: OCT8 } }, { k: 'drums', vol: 0.5, seq: 'A B', pats: { A: { k: 'x.......x.......', s: '....x.......x...' }, B: { s: 'x.x.x.x.xxxxxxxx', c: '............x...' } } }])
  },
  lose: {
    group: 'Stings', title: 'Not This Time', when: 'A minigame lost, a fish lost', style: 'Falling chromatic line onto a minor chord',
    sting: true, bpm: 110, key: 'C', bars: 2, tail: 1.6, chords: 'Ab | Gm', lead: 'C6:4 B5:4 Bb5:4 A5:4 | Ab5:4 G5:8 r:4',
    parts: [{ k: 'lead', ins: 'lead50', vol: 0.36, gate: 0.85 }, { k: 'bass', ins: 'bass', vol: 0.3, gate: 0.9, pats: { A: HOLD } }]
  },
  catch: {
    group: 'Stings', title: 'Up She Comes', when: 'Something lands on the line', style: 'Quick F-major run up to a music-box sparkle',
    sting: true, bpm: 160, key: 'F', bars: 1, tail: 1.6, chords: 'F', lead: 'C6:1 D6:1 E6:1 F6:1 A6:4 C7:4 r:4',
    parts: [{ k: 'lead', ins: 'lead12', vol: 0.3, gate: 0.8 }, { k: 'lead', ins: 'bell', vol: 0.36 }]
  },
  card: {
    group: 'Stings', title: 'Fact Card', when: 'A Fact Card goes into the Notebook', style: 'Gmaj7 music-box shimmer',
    sting: true, bpm: 120, key: 'G', bars: 1, tail: 2, chords: 'Gmaj7', lead: 'B5:2 D6:2 F#6:2 B6:10',
    parts: [{ k: 'lead', ins: 'bellLong', vol: 0.45 }, { k: 'pad', ins: 'pad', vol: 0.05, oct: 4 }]
  },
  newday: {
    group: 'Stings', title: 'New Day', when: 'Waking up to a new morning', style: 'Two-bar G-major music-box wake-up call',
    sting: true, bpm: 112, key: 'G', bars: 2, tail: 2, chords: 'G | D G', lead: 'D5:2 G5:2 B5:2 D6:2 B5:4 G5:4 | A5:2 F#5:2 D5:4 G5:8',
    parts: [{ k: 'lead', ins: 'bell', vol: 0.42 }, { k: 'broken', ins: 'broken', vol: 0.06, oct: 4, every: 2, pat: [0, 1, 2, 1] }, { k: 'bass', ins: 'bass', vol: 0.26, gate: 0.8, pats: { A: HALF } }]
  }
};
export const CUE_NAMES = Object.keys(CUES);
export const LOOPS = CUE_NAMES.filter(n => !CUES[n].sting), STINGS = CUE_NAMES.filter(n => CUES[n].sting);

// a cue as stereo samples; loops fold their ringing tail back onto the loop start so the seam is seamless
export function renderCue(name) {
  const c = CUES[name]; if (!c) throw new Error('no cue ' + name);
  const beat = 60 / c.bpm, sw = c.swing || 0, loop = !c.sting, B = c.spb || 16;
  const tAt = p => { const b = Math.floor(p / 4), f = p / 4 - b; return (b + (sw ? (f < 0.5 ? f * 2 * sw : sw + (f - 0.5) * 2 * (1 - sw)) : f)) * beat; };
  const steps = c.bars * B, len = tAt(steps), n = Math.ceil((len + (loop ? 2.5 : c.tail || 2)) * SR);
  const L = new Float32Array(n), R = new Float32Array(n), CH = chordList(c.chords, B), tune = melody(c.lead), key = (PC[c.key[0]] + acc(c.key.slice(1)) + 12) % 12;
  const chAt = p => { let k = CH[0]; for (const q of CH) if (q.p <= p + 1e-6) k = q; return k; };
  const play = (q, o, vol, pan, gate, dly) => { const t0 = tAt(q.p) + (dly || 0), d = Math.max(0.03, (tAt(q.p + q.len) - tAt(q.p)) * gate); (o.w === 'bell' ? bell : voice)(L, R, pan, t0, d, q.m, o, vol); };
  for (const pt of c.parts) {
    const o = INS[pt.ins], vol = pt.vol, pan = pt.pan || 0, gate = pt.gate || 0.9, ids = pt.seq ? pt.seq.split(' ') : [], id = b => ids[b] || 'A';
    if (pt.k === 'lead' || pt.k === 'harm') for (const q of tune) {
      if (pt.bars && (q.p < pt.bars[0] * B || q.p >= pt.bars[1] * B)) continue;
      const nq = { p: q.p, len: q.len, m: pt.k === 'harm' ? harmNote(q, chAt(q.p), key) : q.m + (pt.shift || 0) };
      play(nq, o, vol, pan, gate);
      if (pt.echo) play(nq, o, vol * pt.echo[1], pt.echo[2], gate, pt.echo[0] * beat / 4);
    }
    else if (pt.k === 'bass') { for (let b = 0; b < c.bars; b++) for (const [s, l, dg] of pt.pats[id(b)] || []) play({ p: b * B + s, len: Math.min(l, B - s), m: bassNote(chAt(b * B + s), dg) }, o, vol, pan, gate); }
    else if (pt.k === 'stab') { for (let b = 0; b < c.bars; b++) for (const s of pt.at) { const ch = chAt(b * B + s); play({ p: b * B + s, len: pt.len, m: 12 * (pt.oct + 1) + ch.root }, Object.assign({}, o, { arp: ch.iv.map(v => Math.pow(2, v / 12)) }), vol, pan, 1); } }
    else if (pt.k === 'broken') { for (let s = 0, i = 0; s < steps; s += pt.every, i++) { const ch = chAt(s), tn = ch.iv.length > 3 ? ch.iv : ch.iv.concat(12); play({ p: s, len: pt.every, m: 12 * (pt.oct + 1) + ch.root + tn[pt.pat[i % pt.pat.length] % tn.length] }, o, vol, pan, gate); } }
    else if (pt.k === 'pad') CH.forEach((ch, i) => { const end = i + 1 < CH.length ? CH[i + 1].p : steps; ch.iv.forEach(v => play({ p: ch.p, len: end - ch.p, m: 12 * (pt.oct + 1) + ch.root + v }, o, vol, pan, 1)); });
    else if (pt.k === 'drums') for (let b = 0; b < c.bars; b++) { const P = pt.pats[id(b)]; if (P) for (const ln in P) for (let s = 0; s < B; s++) if (P[ln][s] === 'x') drum(L, R, ln, tAt(b * B + s), vol * DV[ln]); }
  }
  const ls = tAt((c.intro || 0) * B), e = Math.round(len * SR);
  let N = n;
  if (loop) { const s0 = Math.round(ls * SR); for (let i = e; i < n; i++) { L[s0 + i - e] += L[i]; R[s0 + i - e] += R[i]; } N = e; }
  const out = [L.subarray(0, N), R.subarray(0, N)];
  let s = 0; for (const y of out) { filt(y, 'hp', 35); filt(y, 'lp', 7000); for (let i = 0; i < N; i++) s += y[i] * y[i]; }
  const g = MUSIC_RMS * (c.level || 1) * (c.sting ? 1.5 : 1) / Math.sqrt(s / (2 * N) + 1e-12);
  for (const y of out) for (let i = 0; i < N; i++) { const v = y[i] * g, a = Math.abs(v); y[i] = a > 0.6 ? Math.sign(v) * (0.6 + 0.4 * Math.tanh((a - 0.6) / 0.4)) : v; }
  return { L: out[0], R: out[1], ls, le: N / SR, loop };
}

// ---- in a worker: render on request ----
const IN_WORKER = typeof window === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function';
if (IN_WORKER) self.onmessage = e => {
  const n = e.data;
  try { const c = renderCue(n), L = c.L.slice(), R = c.R.slice(); self.postMessage({ n, L, R, ls: c.ls, le: c.le, loop: c.loop }, [L.buffer, R.buffer]); }
  catch (err) { self.postMessage({ n, err: String(err && err.message || err) }); }
};

// ---- the player ----
// set(name, { duck, cut }) every frame with the cue the scene wants (null = silence); sting(name) for one-shots.
export function createMusic(opt) {
  opt = opt || {};
  const KEY = 'lpa-go-music', MAXLOOPS = 12, RESUME_MS = 60000;
  let pref = {}; try { pref = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { }
  const S = { on: pref.on !== false, level: pref.level != null ? pref.level : 0.7, now: null, title: '', running: false };
  const subs = new Set(), emit = () => subs.forEach(f => { try { f(S); } catch (e) { } });
  const cache = new Map(), queue = [], pos = {};
  let busy = null, worker = null, ctx = null, bus = null, mus = null, sb = null, cur = null, target = null, duck = false, stingEnd = 0;
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ on: S.on, level: S.level })); } catch (e) { } };
  function done(d) {
    busy = null;
    if (d.err) console.error('music cue', d.n, d.err);
    else {
      const buf = new AudioBuffer({ length: d.L.length, sampleRate: SR, numberOfChannels: 2 });
      buf.copyToChannel(d.L, 0); buf.copyToChannel(d.R, 1);
      cache.set(d.n, { buf, ls: d.ls, le: d.le, loop: d.loop, used: performance.now() });
      evict();
    }
    setTimeout(pump, 0); apply();
  }
  function mainRender(n) { setTimeout(() => { try { const c = renderCue(n); done({ n, L: c.L, R: c.R, ls: c.ls, le: c.le, loop: c.loop }); } catch (e) { done({ n, err: String(e) }); } }, 20); }
  try {
    worker = new Worker(import.meta.url, { type: 'module' });
    worker.onmessage = e => done(e.data);
    worker.onerror = e => { e.preventDefault && e.preventDefault(); worker = null; if (busy) { const n = busy; busy = null; queue.unshift(n); } pump(); };
  } catch (e) { worker = null; }
  function pump() {
    if (busy) return;
    while (queue.length && cache.has(queue[0])) queue.shift();
    if (!queue.length) return;
    busy = queue.shift();
    if (worker) worker.postMessage(busy); else mainRender(busy);
  }
  function need(n, urgent) {
    if (!n || !CUES[n] || cache.has(n) || busy === n) return;
    const i = queue.indexOf(n); if (i >= 0) queue.splice(i, 1);
    if (urgent) queue.unshift(n); else queue.push(n);
    pump();
  }
  function evict() {
    const loops = [...cache].filter(([n, c]) => c.loop && n !== target && !(cur && cur.n === n)).sort((a, b) => a[1].used - b[1].used);
    while (loops.length > MAXLOOPS) cache.delete(loops.shift()[0]);
  }
  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -8; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.2; lim.connect(ctx.destination);
    bus = ctx.createGain(); bus.gain.value = S.on ? S.level : 0; bus.connect(lim);
    mus = ctx.createGain(); mus.connect(bus); sb = ctx.createGain(); sb.connect(bus);
    ctx.onstatechange = () => { S.running = ctx.state === 'running'; emit(); apply(); };
  }
  const wake = () => { ensure(); if (ctx && ctx.state !== 'running') ctx.resume().then(apply).catch(() => { }); };
  window.addEventListener('pointerdown', wake, true); window.addEventListener('keydown', wake, true);
  const musGain = () => duck ? 0.45 : 1;
  function setMus(t) { if (!mus) return; mus.gain.cancelScheduledValues(t); mus.gain.setTargetAtTime(t < stingEnd ? musGain() * 0.22 : musGain(), t, 0.12); if (t < stingEnd) mus.gain.setTargetAtTime(musGain(), stingEnd, 0.35); }
  function stopCur(fade) {
    if (!cur) return;
    const t = ctx.currentTime, c = cur; cur = null;
    if (c.c.loop) { const el = t - c.t0, span = c.c.le - c.c.ls; pos[c.n] = { t: el < c.c.le ? el : c.c.ls + ((el - c.c.ls) % span), at: performance.now() }; }
    c.g.gain.cancelScheduledValues(t); c.g.gain.setValueAtTime(c.g.gain.value, t); c.g.gain.setTargetAtTime(0, t, fade / 4);
    try { c.src.stop(t + fade + 0.1); } catch (e) { }
  }
  function startCur(n) {
    const c = cache.get(n); c.used = performance.now();
    const at = ctx.currentTime + 0.03, src = ctx.createBufferSource(), g = ctx.createGain(), p = pos[n];
    src.buffer = c.buf; if (c.loop) { src.loop = true; src.loopStart = c.ls; src.loopEnd = c.le; }
    const off = c.loop && p && performance.now() - p.at < RESUME_MS ? p.t : 0;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1, at + (off ? 0.9 : 0.04));
    src.connect(g); g.connect(mus); src.start(at, off);
    cur = { n, src, g, c, t0: at - off };
  }
  function apply(cut) {
    if (!ctx || ctx.state !== 'running') return;
    const have = cur ? cur.n : null;
    if (have !== target) {
      if (cur) stopCur(cut ? 0.06 : 0.8);
      if (target) { if (cache.has(target)) startCur(target); else need(target, true); }
    }
    const now = cur ? cur.n : null;
    if (now !== S.now) { S.now = now; S.title = now ? CUES[now].title : ''; emit(); }
  }
  const api = {
    state: S, cues: CUES, loops: LOOPS, stings: STINGS,
    subscribe(f) { subs.add(f); f(S); return () => subs.delete(f); },
    set(name, o) {
      o = o || {};
      if (name && !CUES[name]) name = null;
      const d = !!o.duck;
      if (d !== duck) { duck = d; if (ctx) setMus(ctx.currentTime); }
      if (name === target) return;
      target = name; need(name, true); apply(!!o.cut);
    },
    sting(name) {
      if (!CUES[name] || !S.on) return;
      if (!cache.has(name)) { need(name, true); return; }
      if (!ctx || ctx.state !== 'running') return;
      const c = cache.get(name), at = ctx.currentTime + 0.02, src = ctx.createBufferSource();
      src.buffer = c.buf; src.connect(sb); src.start(at);
      stingEnd = at + c.buf.duration * 0.75; setMus(ctx.currentTime);
    },
    prefetch(list) { (list || []).forEach(n => need(n, false)); },
    toggle(on) {
      S.on = on == null ? !S.on : !!on; persist();
      if (S.on) wake();
      if (bus) bus.gain.setTargetAtTime(S.on ? S.level : 0, ctx.currentTime, 0.08);
      emit();
    },
    setLevel(v) { S.level = Math.max(0, Math.min(1, v)); persist(); if (bus && S.on) bus.gain.setTargetAtTime(S.level, ctx.currentTime, 0.08); emit(); },
    unlock: wake
  };
  need('title', true); api.prefetch(STINGS.concat(opt.prefetch || ['morning', 'tenang', 'doubt', 'evening', 'night', 'notebook']));
  return api;
}
