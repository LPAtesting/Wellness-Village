const O = '#2c3040';
function mix(hex, t, to) { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; const [tr, tg, tb] = to === 'w' ? [255, 255, 255] : [24, 28, 48]; const f = v => Math.round(v).toString(16).padStart(2, '0'); return '#' + f(r + (tr - r) * t) + f(g + (tg - g) * t) + f(b + (tb - b) * t); }
class Px {
  constructor(w, h) { this.w = w; this.h = h; this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h; this.g = this.c.getContext('2d'); }
  p(x, y, c) { this.g.fillStyle = c; this.g.fillRect(x, y, 1, 1); }
  r(x, y, w, h, c) { this.g.fillStyle = c; this.g.fillRect(x, y, w, h); }
  hl(x, y, w, c) { this.r(x, y, w, 1, c); }
  vl(x, y, h, c) { this.r(x, y, 1, h, c); }
  box(x, y, w, h, c) { this.hl(x, y, w, c); this.hl(x, y + h - 1, w, c); this.vl(x, y, h, c); this.vl(x + w - 1, y, h, c); }
  stamp(rows, pal, x, y) { rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const k = row[i]; if (k === '.') continue; const c = k === 'o' ? O : pal[k]; if (c) this.p(x + i, y + j, c); } }); }
  clip(x, y, w, h, fn) { this.g.save(); this.g.beginPath(); this.g.rect(x, y, w, h); this.g.clip(); fn(); this.g.restore(); }
  url() { return this.c.toDataURL(); }
}
class Mask {
  constructor(w, h) { this.w = w; this.h = h; this.m = new Uint8Array(w * h); }
  rect(x, y, w, h) { for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.m[j * this.w + i] = 1; }
  at(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 1; return this.m[y * this.w + x]; }
  draw(P, fill, edge) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (!this.m[y * this.w + x]) continue; const e = !this.at(x - 1, y) || !this.at(x + 1, y) || !this.at(x, y - 1) || !this.at(x, y + 1); P.p(x, y, e ? edge : fill(x, y)); } }
}
const PAVE = (x, y) => (x % 16 === 0 || y % 16 === 0) ? '#b8b4a4' : ((x * 7 + y * 3) % 31 === 0 ? '#e0dccc' : '#d0ccbc');const SAND = (x, y) => ((x * 7 + y * 5) % 19 === 0) ? '#f4e6b8' : ((x * 3 + y * 7) % 29 === 0) ? '#d8c48c' : '#ead8a4';
const GR = { b: '#70d070', d: '#5ec05e', l: '#94e888' };
function tuft(P, x, y, c) { P.p(x, y, c); P.p(x + 2, y, c); P.p(x + 1, y + 1, c); }
function grass(P, x, y, w, h) {
  P.r(x, y, w, h, GR.b);
  P.clip(x, y, w, h, () => { for (let ty = y - (y % 16); ty < y + h; ty += 16) for (let tx = x - (x % 16); tx < x + w; tx += 16) { const v = ((tx * 7 + ty * 13) >> 4) % 5; tuft(P, tx + 2 + v, ty + 3 + (v % 3), GR.d); tuft(P, tx + 9 + (v % 3), ty + 10 + (v % 2), GR.d); if (v === 2) tuft(P, tx + 6, ty + 7, GR.l); } });
}
function lawn(P, x, y, w, h) { P.r(x, y, w, h, '#8ce480'); P.box(x, y, w, h, '#acf49c'); for (let i = 0; i < (w * h) / 90; i++) tuft(P, x + 2 + ((i * 41) % (w - 5)), y + 2 + ((i * 29) % (h - 4)), '#a8f098'); }
function flowers(P, x, y, w, h, n) { for (let i = 0; i < n; i++) { const fx = x + ((i * 37 + 5) % (w - 3)), fy = y + ((i * 53 + 11) % (h - 3)); P.p(fx + 1, fy, '#ffffff'); P.p(fx, fy + 1, '#ffffff'); P.p(fx + 2, fy + 1, '#ffffff'); P.p(fx + 1, fy + 2, '#ffffff'); P.p(fx + 1, fy + 1, '#f8e070'); } }
const TREE = [
  '.....oooooo.....', '...ooDDDDDDoo...', '..oDDMMMMMMDDo..', '.oDMMLLLLLLMMDo.', '.oDMLLLHHLLLMDo.', 'oDMMLLHHHHLLMMDo', 'oDMLLLHHHHLLLMDo', 'oDMMLLLHHLLLMMDo',
  'oDDMMLLLLLLMMDDo', 'oDDDMMMMMMMMDDDo', '.oDDDMMMMMMDDDo.', '.oDMMLLLLLLMMDo.', 'oDMLLLLLLLLLLMDo', 'oDMLLLLLLLLLLMDo', 'oDDMMLLLLLLMMDDo', 'oDDDMMMMMMMMDDDo',
  '.oDDDDMMMMDDDDo.', '..ooDDDDDDDDoo..', '....ooTTTToo....', '.....oTtTTo.....', '.....oTtTTo.....', '......oooo......'];
const TREE_PAL = { D: '#3c9a48', M: '#5cc45c', L: '#80dc6c', H: '#a8f08c', T: '#7a4a28', t: '#a0703c' };
// Four species, each stamped on the same 16px footprint and bottom-aligned
// to a 22px box so tuned placements and the collision grid don't move:
// round broadleaf, umbrella rain tree, coconut palm, and a flowering tabebuia.
const TREE_RAIN = ['.....oooooooo.....', '...ooDDMMMMDDoo...', '..oDMMLLLLLLMMDo..', '.oDMLLLHHHHLLLMDo.', 'oDMLLLHHHHHHLLLMDo', 'oDMLLLLHHHHLLLLMDo', 'oDMMLLLLLLLLLLMMDo', 'oDDMMMLLLLLLMMMDDo', '.oDDDMMMMMMMMDDDo.', '..ooDDDDDDDDDDoo..', '....oooooooooo....', '......oTooTo......', '......oTttTo......', '.......oTTo.......', '.......oTto.......', '.......oTto.......', '.......oTto.......', '.......oooo.......'];
const TREE_PALM = ['.....oo..oo.....', '...ooLHooHLoo...', '..oMLLHHHHLLMo..', '.oMLLooLLooLLMo.', 'oDMLo.oMMo.oLMDo', 'oDMo.oDMMDo.oMDo', 'oDo.oDMooMDo.oDo', 'oo..oDoCCoDo..oo', '....oo.oTToo....', '.......otTo.....', '.......oTTo.....', '.......oTTo.....', '.......otTo.....', '......oTTo......', '......oTTo......', '......otTo......', '......oTTo......', '......oTTo......', '......otTo......', '......oTTo......', '......oooo......'];
const TREE_BLOOM = TREE.map((r, j) => r.replace(/[LH]/g, (c, i) => ((i * 7 + j * 5) % 4 === 0 ? 'F' : (i * 3 + j * 11) % 7 === 0 ? 'f' : c)));
const TREE_PAL_B = { D: '#2f7f44', M: '#46a857', L: '#6bc46a', H: '#96e089', T: '#6e4326', t: '#96682f' };
const TREE_PAL_C = { D: '#4a9438', M: '#6cbc44', L: '#94d660', H: '#bcec84', T: '#84512c', t: '#ac7840' };
const TREE_PALS = [TREE_PAL, TREE_PAL_B, TREE_PAL_C];
const PALM_PAL = { D: '#2c7c46', M: '#46a450', L: '#6cc45a', H: '#a0e280', T: '#9a7048', t: '#c49a64', C: '#8a6a2a' };
const BLOOM_PAL = { D: '#3c9a48', M: '#5cc45c', L: '#80dc6c', H: '#a8f08c', T: '#7a4a28', t: '#a0703c', F: '#ec6ea4', f: '#ffc8de' };
const TREE_KIND = { round: TREE, rain: TREE_RAIN, palm: TREE_PALM, bloom: TREE_BLOOM };
// unnamed placements (forest edges, title art) draw from the shade trees only
const TREE_POOL = ['round', 'rain', 'round', 'rain', 'round', 'bloom'];
function stampTree(P, rows, pal, x, y) { P.stamp(rows, pal, x + ((16 - rows[0].length) >> 1), y + (22 - rows.length)); }
// tree(P, x, y)            species picked from position
// tree(P, x, y, 'palm')    named species; seed varies the green of round/rain
function tree(P, x, y, k, seed) {
  const s = Math.abs(seed != null ? seed : (Math.imul(x + 7, 73) ^ Math.imul(y + 13, 151)) + (typeof k === 'number' ? k : 0) * 29);
  const kind = typeof k === 'string' ? k : TREE_POOL[s % TREE_POOL.length];
  const pal = kind === 'palm' ? PALM_PAL : kind === 'bloom' ? BLOOM_PAL : TREE_PALS[(s >> 3) % TREE_PALS.length];
  stampTree(P, TREE_KIND[kind] || TREE, pal, x, y);
}
const BUSH = ['...oooooo...', '..oMLLLLMo..', '.oMLLHHLLMo.', 'oMLLHHHHLLMo', 'oMLLLHHLLLMo', 'oMMLLLLLLMMo', 'oDMMLLLLMMDo', '.oDMMMMMMDo.', '..oDDDDDDo..', '...oooooo...'];
const ROCK = ['...oooooo...', '..oLLLMMMo..', '.oLLLMMMMMo.', 'oLLMMMMMDDDo', 'oLMMMMMDDDDo', 'oMMMMDDDDDDo', 'oMMDDDDDDDDo', '.oDDDDDDDDo.', '..oooooooo..'];
const ROCK_PAL = { L: '#c4b4bc', M: '#9c8c9c', D: '#74647c' };
const TABLE = ['....oooooooo....', '..ooLLLLLLLLoo..', '.oLLvLLLLLLvLLo.', 'oLLLLLLvLLLLLLLo', 'oMMMMMMMMMMMMMMo', '.oooooooooooooo.', '......oBBo......', '......oBbo......', '.....oBBBBo.....', '....oBBBBBBo....', '....oooooooo....'];
const TABLE_PAL = { L: '#f6f2ea', v: '#c8c4d4', M: '#d4ccbc', B: '#8a5a30', b: '#b07a48' };
const STOOL = ['.oooo.', 'oRRRRo', 'oRrRRo', '.oooo.', '.o..o.'];
const CHICK = ['..oo..', '.oWWo.', 'oWWWWo', '.oWWo.', '..Y...'];
const CHICK_PAL = { W: '#f8f4ec', Y: '#e8a030' };
const BENCH = ['oooooooooooooo', 'oBBBBBBBBBBBBo', 'oooooooooooooo', 'oBBBBBBBBBBBBo', 'oooooooooooooo', '.oo........oo.', '.oo........oo.'];
const SIGN = ['oooooooooo', 'oBBBBBBBBo', 'oBLLLBLLBo', 'oBBBBBBBBo', 'oBLLBLLLBo', 'oBBBBBBBBo', 'oooooooooo', '...oPPo...', '...oPPo...', '...oPPo...', '...oooo...'];
const BIN = ['.oooo.', 'oBBBBo', 'oBBBBo', 'oBbBBo', 'oBBBBo', 'oBBBBo', 'oBBBBo', '.oooo.'];
const COOLER = ['..oooo..', '.oWWWWo.', '.oWwwWo.', '.oWwwWo.', '.oWWWWo.', 'oGGGGGGo', 'oGgGGGGo', 'oGGGGGGo', 'oGGGGGGo', 'oGGGGGGo', 'oGGGGGGo', 'oGGGGGGo', '.oooooo.'];
const KOI = ['.RR..', 'RWRRR', '.RR..'];
function forestRow(P, y, x0, x1, skip) { for (let x = x0; x < x1; x += 16) { if (skip && x + 8 > skip[0] && x + 8 < skip[1]) continue; tree(P, x, y); } }
function forestCol(P, x, y0, y1) { for (let y = y0; y < y1; y += 28) tree(P, x, y); }
function pond(P, cx, cy, rx, ry) {
  for (let y = cy - ry - 3; y <= cy + ry + 3; y++) for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 0.78) { let c = '#7cc8f4'; if (y % 6 === 0 && ((x + y) % 11) < 5) c = '#c4ecff'; if (y % 6 === 3 && ((x * 2 + y) % 13) < 3) c = '#60b0e8'; P.p(x, y, c); }
    else if (d <= 1) P.p(x, y, '#a8dcf8'); else if (d <= 1.14) P.p(x, y, '#4890c8'); else if (d <= 1.3) P.p(x, y, '#e4d8a8');
  }
}
function ellipse(P, cx, cy, rx, ry, col, edge, hi) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const d = (x / rx) ** 2 + (y / ry) ** 2; if (d > 1) continue; let c = col; if (d > 0.8) c = edge; else if (hi && x < 0 && y < 0 && d < 0.45 && d > 0.2) c = hi; P.p(cx + x, cy + y, c); } }
function fenceH(P, x, y, len) { P.hl(x, y + 4, len, '#f0f0f4'); P.hl(x, y + 5, len, '#b8b8c8'); P.hl(x, y + 8, len, '#f0f0f4'); P.hl(x, y + 9, len, '#b8b8c8'); for (let i = 0; i <= len - 3; i += 8) { P.r(x + i, y + 1, 3, 11, '#f8f8fc'); P.p(x + i + 1, y, '#f8f8fc'); P.vl(x + i + 2, y + 1, 11, '#b8b8c8'); P.p(x + i + 1, y + 11, '#8890a0'); P.p(x + i + 2, y + 11, '#8890a0'); } }
function fenceV(P, x, y, len) { P.vl(x + 1, y, len, '#f0f0f4'); P.vl(x + 2, y, len, '#b8b8c8'); for (let j = 0; j <= len - 6; j += 8) { P.r(x, y + j + 1, 3, 4, '#f8f8fc'); P.p(x + 1, y + j, '#f8f8fc'); P.vl(x + 2, y + j + 1, 4, '#b8b8c8'); P.hl(x, y + j + 5, 3, '#8890a0'); } }
function plots(P, x, y, w, h) { P.r(x, y, w, h, '#b88058'); P.box(x, y, w, h, '#7c5030'); for (let ry = y + 6; ry < y + h - 3; ry += 8) { P.hl(x + 2, ry + 1, w - 4, '#9c6840'); for (let cx = x + 4; cx < x + w - 5; cx += 6) { P.r(cx, ry - 2, 3, 3, '#48a850'); P.p(cx, ry - 2, '#88d878'); P.p(cx + 1, ry - 3, '#88d878'); if ((cx * 3 + ry) % 7 === 0) P.p(cx + 2, ry - 1, '#e83838'); } } }
function flowerbed(P, x, y, w, h) { P.r(x, y, w, h, '#a87850'); P.box(x, y, w, h, '#6c4828'); const cols = ['#f06888', '#f8e868', '#6890f0', '#f89040']; let i = 0; for (let fy = y + 3; fy < y + h - 3; fy += 6) for (let fx = x + 3; fx < x + w - 3; fx += 6, i++) { const c = cols[i % 4]; P.p(fx + 1, fy, c); P.p(fx, fy + 1, c); P.p(fx + 2, fy + 1, c); P.p(fx + 1, fy + 2, c); P.p(fx + 1, fy + 1, '#fff8e0'); P.p(fx + 1, fy + 3, '#48a850'); } }
function win(P, x, y, w, h) { P.r(x, y, w, h, O); P.r(x + 1, y + 1, w - 2, h - 2, '#5ca8e8'); P.r(x + 1, y + 1, w - 2, 2, '#a8dcff'); P.p(x + 1, y + 1, '#eaf8ff'); P.vl(x + (w >> 1), y + 1, h - 2, '#f0f0f0'); P.hl(x + 1, y + (h >> 1), w - 2, '#f0f0f0'); P.hl(x - 1, y + h, w + 2, '#f4f0e8'); }
function door(P, x, y, w, h, col) { P.r(x, y, w, h, O); P.r(x + 1, y + 1, w - 2, h - 1, col); P.hl(x + 1, y + 1, w - 2, mix(col, 0.3, 'w')); P.vl(x + 1, y + 1, h - 1, mix(col, 0.2, 'w')); P.p(x + w - 3, y + (h >> 1), '#f0d060'); }
const HP1 = { roof: '#d8863c', roofL: '#f0b060', roofD: '#a85c28', wall: '#e8d8b0', wallD: '#d0bc90', door: '#6a3a20', post: '#8a5a30' };
const HP2 = { roof: '#4c78b8', roofL: '#78a0d8', roofD: '#304e88', wall: '#f0e8d0', wallD: '#d8ccae', door: '#3a4a7a', post: '#8a5a30' };
const HP3 = { roof: '#8a5c34', roofL: '#a87a4c', roofD: '#5c3c20', wall: '#b88a58', wallD: '#9c7044', door: '#3a5a9a', post: '#6c4a2a' };
const HP4 = { roof: '#4a9a88', roofL: '#78c0b0', roofD: '#2c6c5c', wall: '#ece4cc', wallD: '#d4c8a8', door: '#6a3a20', post: '#8a5a30' };
function house(P, x, y, c) {
  const W = 56, rh = 18;
  P.r(x + 3, y + rh + 26, W - 6, 10, '#58b858');
  roofPitch(P, x, y, W, rh, 14 / (rh - 1), { hi: c.roofL, md: c.roof, mm: mix(c.roof, 0.14, 'd'), dk: c.roofD, seam: mix(c.roof, 0.22, 'd') });
  P.r(x + 24, y + 6, 8, 5, mix(c.roofD, 0.25, 'd')); P.box(x + 24, y + 6, 8, 5, O); for (let j = 0; j < 3; j++) P.hl(x + 25, y + 7 + j, 6, mix(c.roofL, 0.15, 'w'));
  P.hl(x, y + rh, W, O); P.r(x + 3, y + rh + 1, W - 6, 2, mix(c.wall, 0.35, 'd'));
  const wy = y + rh + 3, wh = 22;
  P.r(x + 3, wy, W - 6, wh, c.wall); P.box(x + 3, wy, W - 6, wh, O);
  for (let j = wy + 3; j < wy + wh - 1; j += 3) P.hl(x + 4, j, W - 8, c.wallD);
  [x + 6, x + 35].forEach(wx => {
    P.r(wx, wy + 2, 15, 1, mix(c.wall, 0.42, 'd'));
    glass(P, wx + 4, wy + 4, 7, 8, true);
    [wx + 1, wx + 11].forEach(sx => { P.r(sx, wy + 3, 3, 10, c.door); P.box(sx, wy + 3, 3, 10, O); P.vl(sx + 1, wy + 4, 8, mix(c.door, 0.32, 'w')); });
  });
  door(P, x + 22, wy + 5, 12, wh - 5, c.door);
  P.r(x + 20, wy + 2, 3, 1, '#8f8b7e'); P.p(x + 21, wy + 3, '#f8e0a0'); P.p(x + 21, wy + 4, mix('#f8e0a0', 0.4, 'd'));
  const fy = wy + wh; P.hl(x + 3, fy, W - 6, O);
  [x + 5, x + 14, x + 38, x + 47].forEach(sx => { P.r(sx, fy + 1, 4, 9, c.post); P.vl(sx, fy + 1, 9, O); P.vl(sx + 3, fy + 1, 9, O); P.vl(sx + 1, fy + 1, 9, mix(c.post, 0.3, 'w')); });
  for (let k = 0; k < 5; k++) P.r(x + 21, fy + 1 + k * 2, 14, 2, k % 2 ? '#c8a878' : '#e8d0a0');
  P.box(x + 21, fy + 1, 14, 10, O);
  P.r(x + 9, fy + 4, 6, 6, '#6f8c9a'); P.box(x + 9, fy + 4, 6, 6, O); P.hl(x + 10, fy + 4, 4, '#9fb6c2'); P.hl(x + 10, fy + 6, 4, '#587483');
  potPlant(P, x + 39, fy + 6); potPlant(P, x + 46, fy + 7);
}
// Four shrubs on a shared 14x10 footprint, each with its own green so matched
// pairs read as one planting: round tuft, clipped hedge, flowering hibiscus, fern.
const FERN = ['..o...oo...o..', '.oLo.oHLo.oLo.', '.oMLooLHooLMo.', 'oDoMLoLLoLMoDo', 'oMooMLHLLMooMo', '.oMMoLLLLoMMo.', '..oMMMLLMMMo..', '.oDMMMMMMMMDo.', '..oDDDDDDDDo..', '...oooooooo...'];
const BUSH_KIND = {
  round: { D: '#2e7a3c', M: '#46a84e', L: '#62c85c', H: '#8ce07a' },
  hedge: { D: '#245e36', M: '#357f48', L: '#4b9e5a', H: '#6cbe70' },
  hibiscus: { D: '#286a46', M: '#3c9a58', L: '#58bc6c', H: '#82d888' },
  fern: { D: '#3c7a2c', M: '#5ca83c', L: '#7cc84c', H: '#a8e070' }
};
const BUSH_PAL = BUSH_KIND.round;
const BUSH_POOL = ['round', 'hedge', 'hibiscus', 'fern'];
function disc(m, cx, cy, rx, ry) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) m.rect(cx + x, cy + y, 1, 1); }
function bush(P, x, y, k) {
  const s = Math.abs((Math.imul(x + 3, 61) ^ Math.imul(y + 5, 113)) + (typeof k === 'number' ? k : 0) * 17);
  const kind = typeof k === 'string' ? k : BUSH_POOL[(s >> 3) % BUSH_POOL.length], pal = BUSH_KIND[kind] || BUSH_PAL;
  if (kind === 'round') { P.stamp(BUSH, pal, x, y); return; }
  if (kind === 'fern') { P.stamp(FERN, pal, x, y); return; }
  const Q = new Px(14, 10), m = new Mask(14, 10);
  if (kind === 'hedge') {
    m.rect(1, 2, 12, 8); m.rect(0, 3, 14, 6);
    m.draw(Q, (px, py) => (py <= 3 ? pal.H : py <= 4 ? pal.L : py <= 7 ? ((px + py) % 4 === 0 ? pal.L : pal.M) : pal.D), O);
    P.g.drawImage(Q.c, x, y); return;
  }
  disc(m, 3, 6, 3, 3); disc(m, 7, 4, 4, 4); disc(m, 11, 6, 2, 3); m.rect(2, 7, 10, 3);
  m.draw(Q, (px, py) => (py <= 2 ? pal.H : py <= 4 ? pal.L : py <= 7 ? pal.M : pal.D), O);
  P.g.drawImage(Q.c, x, y);
  [[2, 4], [7, 2], [10, 5]].forEach(([fx, fy]) => { P.p(x + fx, y + fy, '#e8404c'); P.p(x + fx + 1, y + fy, '#e8404c'); P.p(x + fx, y + fy + 1, '#e8404c'); P.p(x + fx + 1, y + fy + 1, '#f8d060'); });
}
function cc(P, x, y) {
  const W = 112;
  P.vl(x + 14, y - 9, 17, '#8f979f'); P.r(x + 15, y - 9, 6, 4, '#d84040'); P.box(x + 15, y - 9, 6, 4, O); P.hl(x + 16, y - 8, 4, '#ee7a6a');
  ellipse(P, x + 56, y + 12, 28, 11, '#5fa8a0', O, '#bfe6e0');
  for (let i = -24; i <= 24; i += 6) for (let j = -9; j <= 9; j++) { const d = (i / 28) ** 2 + (j / 11) ** 2; if (d < 0.9) P.p(x + 56 + i, y + 12 + j, '#4b8c86'); }
  P.r(x, y + 14, W, 9, '#7c8898'); P.box(x, y + 14, W, 9, O); P.hl(x + 1, y + 15, W - 2, '#a8b4c4'); P.hl(x + 1, y + 21, W - 2, '#5a6472');
  signBoard(P, x + 26, y + 14, 60, 9, 'COMMUNITY CLUB', '#c84040', '#f8f0e8');
  P.r(x + 2, y + 23, W - 4, 43, '#e9e2ca'); P.box(x + 2, y + 23, W - 4, 43, O);
  [x + 3, x + 27, x + 81, x + 105].forEach(cx => { P.r(cx, y + 24, 4, 41, '#f6f2e4'); P.vl(cx + 3, y + 24, 41, '#c6bfa8'); P.vl(cx, y + 24, 41, '#fffdf4'); });
  glass(P, x + 9, y + 28, 15, 12, false); glass(P, x + 33, y + 28, 20, 12, true); glass(P, x + 59, y + 28, 20, 12, true); glass(P, x + 88, y + 28, 15, 12, false);
  P.r(x + 9, y + 46, 15, 12, '#2f3a2c'); P.box(x + 9, y + 46, 15, 12, O); P.hl(x + 10, y + 46, 13, '#4e5c46');
  [[11, 48, '#f4f0e0'], [17, 48, '#e8dcc0'], [11, 53, '#dfe8f0'], [17, 53, '#f4f0e0']].forEach(([dx, dy, c]) => P.r(x + dx, y + dy, 5, 4, c));
  P.r(x + 88, y + 46, 15, 12, '#dcd5bd'); P.box(x + 88, y + 46, 15, 12, '#a9a290'); P.r(x + 90, y + 48, 5, 8, '#3878c8'); P.r(x + 97, y + 48, 5, 8, '#c84040'); P.hl(x + 90, y + 48, 5, '#8fb8e8'); P.hl(x + 97, y + 48, 5, '#e88a80');
  [x + 33, x + 74].forEach(bx => { P.r(bx, y + 44, 5, 19, '#c84040'); P.box(bx, y + 44, 5, 19, O); P.hl(bx + 1, y + 45, 3, '#e88a80'); [48, 52, 56].forEach(dy => P.hl(bx + 1, y + dy, 3, '#f8f0e8')); P.p(bx + 2, y + 63, O); });
  P.r(x + 40, y + 44, 32, 4, '#4a8a80'); P.box(x + 40, y + 44, 32, 4, O); P.hl(x + 41, y + 44, 30, '#7fbdb4');
  P.r(x + 46, y + 48, 21, 18, '#f3d99c'); P.box(x + 46, y + 48, 21, 18, O); P.hl(x + 47, y + 49, 19, '#fff2d0');
  P.vl(x + 56, y + 48, 18, '#8f8b7e'); P.vl(x + 46, y + 48, 18, '#8f8b7e'); P.vl(x + 66, y + 48, 18, '#8f8b7e');
  P.r(x + 50, y + 58, 3, 8, '#b08a5e'); P.r(x + 60, y + 60, 3, 6, '#8a7a9a'); P.p(x + 54, y + 57, '#6d757f'); P.p(x + 58, y + 57, '#6d757f');
  P.hl(x + 2, y + 66, W - 4, O);
  tiledStrip(P, x, y + 66, W, 8);
  P.r(x + 44, y + 66, 25, 3, '#dcd6c4'); P.box(x + 44, y + 66, 25, 3, '#a9a290'); P.r(x + 42, y + 69, 29, 3, '#cdc6b4'); P.box(x + 42, y + 69, 29, 3, '#a9a290');
  P.r(x + 76, y + 68, 22, 4, '#c2bcae'); P.box(x + 76, y + 68, 22, 4, '#8f8b7e'); for (let i = 0; i < 20; i += 4) P.p(x + 77 + i, y + 70, '#8f8b7e');
  P.hl(x + 76, y + 66, 22, '#d8dce4'); for (let i = 0; i <= 20; i += 5) P.vl(x + 76 + i, y + 66, 3, '#b4bcc4');
  for (let i = 0; i < 3; i++) { const bx = x + 10 + i * 7; P.hl(bx, y + 68, 5, '#8f979f'); P.vl(bx, y + 68, 4, '#8f979f'); P.vl(bx + 4, y + 68, 4, '#8f979f'); }
  potPlant(P, x + 34, y + 70); potPlant(P, x + 72, y + 70);
}
function depot(P, x, y) {
  const W = 72, R = 36;
  for (let i = 0; i < 18; i++) { const t = (17 - i) / 17, hw = Math.max(4, Math.round(Math.sqrt(1 - t * t) * R)); const x0 = x + R - hw, x1 = x + R + hw; const col = i < 4 ? '#7cb48c' : i < 12 ? '#4c8c5c' : '#3a6c48'; P.r(x0, y + i, x1 - x0, 1, col); P.p(x0, y + i, O); P.p(x1 - 1, y + i, O); if (i > 0) for (let sx = x + 6; sx < x + W - 4; sx += 6) if (sx > x0 + 1 && sx < x1 - 2) P.p(sx, y + i, mix(col, 0.2, 'd')); }
  P.hl(x + R - 4, y, 8, O); P.hl(x, y + 18, W, O);
  P.r(x + 1, y + 19, W - 2, 30, '#8ea89a'); P.box(x + 1, y + 19, W - 2, 31, O);
  for (let j = y + 22; j < y + 48; j += 3) P.hl(x + 2, j, W - 4, '#7c968a');
  signBoard(P, x + 16, y + 20, 40, 7, 'DEPOT', '#2f5450', '#e8f4ee');
  P.r(x + 20, y + 29, 32, 20, O); P.r(x + 21, y + 30, 30, 19, '#a8acb0');
  for (let j = y + 32; j < y + 49; j += 3) P.hl(x + 21, j, 30, '#8c9094');
  P.hl(x + 21, y + 30, 30, '#c8ccd0'); P.r(x + 34, y + 40, 4, 2, '#404850');
  glass(P, x + 5, y + 30, 11, 9, true);
  P.r(x + 56, y + 31, 9, 8, '#e8c040'); P.box(x + 56, y + 31, 9, 8, O); P.hl(x + 57, y + 31, 7, '#f8e080'); P.p(x + 59, y + 34, O); P.p(x + 61, y + 34, O); P.p(x + 60, y + 36, O);
  P.r(x + 56, y + 42, 8, 7, '#b0783c'); P.box(x + 56, y + 42, 8, 7, O); P.hl(x + 57, y + 43, 6, '#d8a060'); P.hl(x + 57, y + 46, 6, '#8a5a28');
  P.r(x + 6, y + 42, 8, 7, '#b0783c'); P.box(x + 6, y + 42, 8, 7, O); P.hl(x + 7, y + 43, 6, '#d8a060'); P.hl(x + 7, y + 46, 6, '#8a5a28');
  P.p(x + 36, y + 16, '#f8e0a0'); P.r(x + 35, y + 15, 3, 1, '#6d757f');
}
function table(P, x, y, sc) { const s = { R: sc || '#c84848', r: mix(sc || '#c84848', 0.35, 'w') }; P.stamp(STOOL, s, x - 6, y + 3); P.stamp(STOOL, s, x + 16, y + 3); P.stamp(TABLE, TABLE_PAL, x, y); P.stamp(STOOL, s, x + 5, y + 10); }
function chicken(P, x, y, flip) { P.stamp(CHICK, CHICK_PAL, x, y); P.p(flip ? x : x + 5, y + 1, '#e04040'); P.p(flip ? x + 4 : x + 1, y, '#e04040'); }
function well(P, x, y) { P.r(x + 2, y, 12, 2, '#8a5a30'); P.r(x + 1, y + 2, 14, 2, '#a85c38'); P.box(x + 1, y, 14, 4, O); P.vl(x + 3, y + 4, 8, '#6c4828'); P.vl(x + 12, y + 4, 8, '#6c4828'); P.hl(x + 3, y + 7, 10, '#d0c8b8'); P.r(x + 7, y + 7, 2, 4, '#606870'); ellipse(P, x + 8, y + 14, 7, 4, '#9c8c9c', O, '#c4b4bc'); ellipse(P, x + 8, y + 14, 4, 2, '#4c98ec', '#2c68b8', null); }
function clothesline(P, x, y, len) { P.r(x, y, 2, 20, '#8a5a30'); P.r(x + len - 2, y, 2, 20, '#8a5a30'); P.hl(x, y + 2, len, '#e8e4dc'); const cols = ['#e04848', '#3c88c0', '#f8d048', '#48a068', '#f4f1ea']; for (let i = 0, cx = x + 5; cx < x + len - 8; cx += 9, i++) { P.r(cx, y + 3, 6, 7, cols[i % 5]); P.box(cx, y + 3, 6, 7, mix(cols[i % 5], 0.3, 'd')); } }
function coop(P, x, y) { P.r(x, y, 24, 6, '#a85c38'); P.box(x, y, 24, 6, O); P.r(x + 1, y + 6, 22, 12, '#c89050'); P.box(x + 1, y + 6, 22, 12, O); for (let i = x + 3; i < x + 22; i += 3) P.vl(i, y + 7, 10, '#6a4020'); chicken(P, x + 8, y + 9); }
function kopitiam(P, x, y) {
  const W = 80;
  roofPitch(P, x, y, W, 10, 1.3, { hi: '#e88a68', md: '#c85040', mm: '#a94436', dk: '#8a3628', seam: '#b04638' });
  P.r(x + 8, y - 4, 10, 5, '#9aa2aa'); P.box(x + 8, y - 4, 10, 5, O); P.hl(x + 9, y - 4, 8, '#c6ced6'); P.r(x + 10, y - 1, 2, 2, '#6d757f');
  acUnit(P, x + 62, y - 4);
  P.hl(x, y + 10, W, O); P.r(x, y + 11, W, 1, '#f4ecd8'); P.r(x, y + 12, W, 1, '#cdc4b0');
  signBoard(P, x + 13, y + 13, 54, 9, 'KOPITIAM', '#2f5490', '#f8f0d8');
  awning(P, x, y + 22, W, '#d84040', 3);
  P.r(x, y + 27, W, 15, '#38343a'); P.hl(x, y + 27, W, '#231f26');
  P.vl(x, y + 27, 15, '#cdc8b8'); P.vl(x + 1, y + 27, 15, '#8f8b7e'); P.vl(x + W - 1, y + 27, 15, '#cdc8b8'); P.vl(x + W - 2, y + 27, 15, '#8f8b7e');
  [x + 5, x + 40, x + 62].forEach(lx => { P.r(lx, y + 28, 11, 1, '#fff6d8'); P.r(lx, y + 29, 11, 1, mix('#f7dfa4', 0.4, 'd')); });
  P.r(x + 3, y + 34, 16, 8, '#b9bfc8'); P.box(x + 3, y + 34, 16, 8, O); P.hl(x + 4, y + 34, 14, '#e3e7ec'); P.hl(x + 4, y + 37, 14, '#8f979f');
  P.r(x + 5, y + 30, 5, 4, '#8a5a30'); P.box(x + 5, y + 30, 5, 4, O); P.hl(x + 6, y + 31, 3, '#c08a50');
  [x + 12, x + 15].forEach(mx => { P.r(mx, y + 31, 2, 3, '#f4f0e4'); P.p(mx, y + 31, '#c8c4b4'); });
  const ex = x + 20;
  P.r(ex, y + 27, 15, 15, '#2a262c');
  for (let j = 0; j < 5; j++) { const iw = 5 + j * 2, fx = ex + Math.round((15 - iw) / 2); P.r(fx, y + 37 + j, iw, 1, j < 2 ? '#7c7870' : j < 4 ? '#a09a8e' : '#c2bcae'); }
  P.vl(ex, y + 27, 15, '#8f8b7e'); P.vl(ex + 14, y + 27, 15, '#8f8b7e');
  P.r(x + 37, y + 30, 20, 12, '#7fb8d8'); P.box(x + 37, y + 30, 20, 12, O); P.hl(x + 38, y + 30, 18, '#cfeaf8');
  for (let j = 0; j < 2; j++) { P.hl(x + 38, y + 34 + j * 4, 18, '#9fc8dc'); ['#e8c060', '#d86a52', '#7fc06a', '#e8e0c8'].forEach((c, k) => P.r(x + 39 + k * 5, y + 35 + j * 4, 3, 2, c)); }
  glass(P, x + 60, y + 31, 16, 9, true);
  P.hl(x, y + 42, W, O);
  tiledStrip(P, x, y + 43, W, 10);
  tableFront(P, x + 5, y + 46, '#c84848'); tableFront(P, x + 56, y + 46, '#3878c8');
  potPlant(P, x + 37, y + 48); litBin(P, x + 26, y + 47, '#3868b8');
}
function mart(P, x, y) {
  const W = 60;
  acUnit(P, x + 6, y - 5); P.r(x + 44, y - 4, 9, 4, '#8f979f'); P.box(x + 44, y - 4, 9, 4, O); P.hl(x + 45, y - 4, 7, '#c6ced6');
  P.r(x, y, W, 9, '#6c7c90'); P.box(x, y, W, 9, O); P.hl(x + 1, y + 1, W - 2, '#9fb0c4'); P.hl(x + 1, y + 7, W - 2, '#4e5c6e');
  signBoard(P, x + 5, y + 1, 50, 7, 'MINIMART', '#1f8f80', '#f0f8f4');
  awning(P, x + 1, y + 9, W - 2, '#2f8f5f', 3);
  P.r(x + 1, y + 14, W - 2, 20, '#e7dcbe'); P.box(x + 1, y + 13, W - 2, 21, O); P.hl(x + 2, y + 14, W - 4, '#fff6d8');
  const shelfWin = (px, pw) => {
    P.box(px, y + 15, pw, 18, '#8f8b7e');
    for (let j = 0; j < 3; j++) { const sy = y + 19 + j * 5; P.hl(px + 1, sy, pw - 2, '#c3b895'); for (let k = 0; k + 4 < pw - 2; k += 5) { const c = ['#c9705e', '#6e9f62', '#5b8bb8', '#cfae6a', '#b08aa0'][(k + j * 3) % 5]; P.r(px + 2 + k, sy - 3, 4, 3, c); P.hl(px + 2 + k, sy - 3, 4, mix(c, 0.28, 'w')); } }
    for (let k = 1; k < 4; k++) P.p(px + pw - 1 - k, y + 16 + k, '#fffbe8');
  };
  shelfWin(x + 3, 16); shelfWin(x + 34, 13); 
  P.r(x + 48, y + 15, 9, 18, '#7fb8d8'); P.box(x + 48, y + 15, 9, 18, O); P.hl(x + 49, y + 15, 7, '#cfeaf8');
  ['#e05c4c', '#4aa34e', '#e8b040', '#e8e4d8'].forEach((c, k) => { P.vl(x + 50 + k * 2, y + 18, 5, c); P.vl(x + 50 + k * 2, y + 25, 5, c); });
  const dx = x + 20;
  P.r(dx, y + 15, 12, 19, '#cfeaf8'); P.box(dx, y + 15, 12, 19, O); P.vl(dx + 6, y + 15, 19, '#8f979f');
  P.r(dx + 1, y + 16, 5, 6, '#e8f6ff'); P.r(dx + 7, y + 16, 4, 4, '#e8f6ff');
  P.r(dx + 2, y + 24, 3, 3, '#d84040'); P.r(dx + 8, y + 24, 3, 3, '#1f8f80');
  P.p(dx + 5, y + 26, '#606870'); P.p(dx + 7, y + 26, '#606870');
  P.hl(x + 1, y + 34, W - 2, O);
  tiledStrip(P, x, y + 35, W, 10);
  P.r(x + 4, y + 38, 14, 6, '#e8eef2'); P.box(x + 4, y + 38, 14, 6, O); P.hl(x + 5, y + 38, 12, '#ffffff'); P.r(x + 5, y + 41, 12, 1, '#3c88c0'); P.r(x + 8, y + 36, 6, 2, '#d84040'); P.box(x + 8, y + 36, 6, 2, O);
  P.r(x + 36, y + 37, 10, 7, '#b0783c'); P.box(x + 36, y + 37, 10, 7, O); for (let j = 0; j < 2; j++) P.r(x + 37, y + 38 + j * 3, 8, 2, '#efe7d6');
  litBin(P, x + 50, y + 38, '#3868b8'); potPlant(P, x + 25, y + 40);
}
function octa(P, x, y, S, col, edge) { const k = S / 4; for (let i = 0; i < S; i++) { const ins = i < k ? k - i : i >= S - k ? i - (S - k - 1) : 0; P.r(x + ins, y + i, S - 2 * ins, 1, (i === 0 || i === S - 1) ? edge : col); P.p(x + ins, y + i, edge); P.p(x + S - 1 - ins, y + i, edge); } }
function fountain(P, x, y) {
  const SD = '#787f8c', S1 = '#9aa0ac', S2 = '#c6cbd6', S3 = '#e8ecf2';
  const W0 = '#22568a', W1 = '#2c689f', W2 = '#3f8ecb', W3 = '#66b6ea', WH = '#cceeff';
  octa(P, x, y + 3, 32, SD, O);
  octa(P, x, y, 32, S1, O);
  octa(P, x + 2, y + 2, 28, S2, SD);
  P.hl(x + 11, y + 2, 11, S3); P.hl(x + 8, y + 3, 9, S3); P.hl(x + 6, y + 4, 6, S3); P.hl(x + 5, y + 5, 4, S3); P.hl(x + 4, y + 6, 3, S3); P.hl(x + 3, y + 7, 3, S3); P.vl(x + 2, y + 8, 7, S3);
  P.vl(x + 16, y, 3, SD); P.vl(x + 15, y + 29, 3, SD); P.hl(x, y + 16, 3, SD); P.hl(x + 29, y + 15, 3, SD);
  [[4, 4], [5, 5], [27, 4], [26, 5], [4, 27], [5, 26], [27, 27], [26, 26]].forEach(([a, b]) => P.p(x + a, y + b, SD));
  octa(P, x + 4, y + 5, 24, W1, SD);
  octa(P, x + 6, y + 8, 20, W2, W1);
  P.hl(x + 11, y + 9, 10, W0); P.hl(x + 9, y + 10, 14, W1); P.hl(x + 8, y + 11, 16, W1);
  octa(P, x + 10, y + 13, 12, W3, W2);
  P.hl(x + 8, y + 20, 4, W3); P.hl(x + 21, y + 21, 3, W3); P.hl(x + 12, y + 25, 7, WH); P.hl(x + 10, y + 17, 3, W3); P.hl(x + 19, y + 16, 4, WH);
  [[12, 23, '#e6c060'], [19, 22, '#e6c060'], [14, 24, '#c89840']].forEach(([a, b, c]) => P.p(x + a, y + b, c));
  P.r(x + 11, y + 17, 10, 4, S2); P.box(x + 11, y + 17, 10, 4, O); P.hl(x + 12, y + 17, 8, S3); P.hl(x + 12, y + 19, 8, S1);
  P.hl(x + 10, y + 21, 12, WH); P.hl(x + 11, y + 22, 10, W3);
  P.vl(x + 13, y + 9, 9, O); P.vl(x + 18, y + 9, 9, O); P.vl(x + 14, y + 9, 9, S3); P.r(x + 15, y + 9, 2, 9, S2); P.vl(x + 17, y + 9, 9, SD);
  P.r(x + 10, y + 6, 12, 3, S2); P.box(x + 10, y + 6, 12, 3, O); P.hl(x + 11, y + 6, 10, S3); P.hl(x + 11, y + 7, 10, W3); P.r(x + 12, y + 9, 8, 1, SD);
  P.r(x + 15, y + 3, 2, 3, S1); P.p(x + 15, y + 3, S2);
  P.vl(x + 16, y - 5, 8, WH); P.vl(x + 15, y - 3, 6, W3); P.vl(x + 17, y - 3, 6, W3); P.p(x + 16, y - 6, W3); P.p(x + 14, y - 4, W3); P.p(x + 18, y - 4, W3);
  [1, -1].forEach(d => {
    [[3, -4, WH], [4, -2, WH], [5, 0, WH], [5, 2, W2], [5, 5, W2], [5, 8, W2], [5, 11, W3]].forEach(([dx, dy, c]) => { P.p(x + 16 + d * dx, y + dy, c); P.p(x + 16 + d * dx + d, y + dy, W1); });
    P.hl(x + 15 + d * 5, y + 13, 3, WH); P.hl(x + 15 + d * 4, y + 14, 3, W3);
    P.vl(x + 16 + d * 5, y + 9, 4, W3); P.p(x + 16 + d * 6, y + 9, W3);
  });
}
const LAMP = ['...oo...', '..oCCo..', '.oCcCCo.', 'oCCCCCCo', '.oYYYYo.', '.oYWWYo.', '.oYWWYo.', '..oYYo..']
  .concat(Array(19).fill('..opPo..'), ['.oBBBBo.', 'oBBBBBBo']);
const LAMP_PAL = { C: '#6a7484', c: '#9aa4b4', Y: '#f0d878', W: '#fffbe8', P: '#5a6474', p: '#8a94a4', B: '#3a4048' };
function lamp(P, x, y) { P.stamp(LAMP, LAMP_PAL, x - 1, y); }
function bench(P, x, y) { const w = 22; [0, 3].forEach(dy => { P.r(x, y + dy, w, 3, '#b08050'); P.hl(x, y + dy, w, O); P.hl(x, y + dy + 2, w, O); P.vl(x, y + dy, 3, O); P.vl(x + w - 1, y + dy, 3, O); P.hl(x + 1, y + dy + 1, w - 2, '#c89860'); }); P.r(x + 2, y + 6, 2, 3, O); P.r(x + w - 4, y + 6, 2, 3, O); }
function bigTree(P, x, y) { ellipse(P, x + 11, y + 16, 9, 7, '#3c9a48', O, null); ellipse(P, x + 11, y + 10, 10, 8, '#5cc45c', O, '#a8f08c'); ellipse(P, x + 11, y + 6, 6, 5, '#80dc6c', '#5cc45c', '#a8f08c'); P.r(x + 9, y + 21, 4, 10, '#7a4a28'); P.vl(x + 10, y + 21, 10, '#a0703c'); P.vl(x + 8, y + 22, 9, O); P.vl(x + 13, y + 22, 9, O); P.hl(x + 8, y + 31, 6, O); }
function sign(P, x, y) { P.stamp(SIGN, { B: '#b08050', L: '#f0e0c0', P: '#8a5a30' }, x, y); }
function bin(P, x, y) { P.stamp(BIN, { B: '#3868b8', b: '#6890d8' }, x, y); }
function cooler(P, x, y) { P.stamp(COOLER, { W: '#e0ecf4', w: '#58a8e0', G: '#c8ccd4', g: '#f4f4f8' }, x, y); }
function rock(P, x, y) { P.stamp(ROCK, ROCK_PAL, x, y); }
function koi(P, x, y) { P.stamp(KOI, { R: '#f08040', W: '#fff4e0' }, x, y); }
function stool(P, x, y) { P.stamp(STOOL, { R: '#8a5a30' }, x, y); }
function chess(P, x, y) { P.r(x, y, 10, 8, O); for (let j = 1; j < 7; j++) for (let i = 1; i < 9; i++) P.p(x + i, y + j, ((i >> 1) + (j >> 1)) % 2 ? '#5a4a3a' : '#f0e8d8'); P.r(x + 1, y + 8, 2, 3, '#6c4828'); P.r(x + 7, y + 8, 2, 3, '#6c4828'); stool(P, x - 5, y + 2); stool(P, x + 11, y + 2); }
function board(P, x, y) { P.r(x, y, 20, 10, O); P.r(x + 1, y + 1, 18, 8, '#8a5a30'); P.r(x + 3, y + 2, 5, 6, '#f8f4e8'); P.r(x + 9, y + 3, 4, 4, '#f8f4e8'); P.r(x + 14, y + 2, 4, 6, '#fff0b0'); P.p(x + 5, y + 2, '#e04040'); P.p(x + 10, y + 3, '#e0b53c'); P.p(x + 15, y + 2, '#e04040'); P.r(x + 3, y + 10, 2, 5, '#6c4828'); P.r(x + 15, y + 10, 2, 5, '#6c4828'); }
const BASE = [
  '................', '.....oooooo.....', '....oHHHHHHo....', '...oHHhhhHHHo...', '..oHHhhhhHHHHo..', '..oHHHHHHHHHHo..', '..oHHHHHHHHHHo..', '..oHsHHHHHHsHo..',
  '..osssssssssso..', '..oswessssweso..', '..oseesssseeso..', '..osssssssssso..', '...osssmmsssso..', '....oossssoo....', '.....oTTTTo.....', '...ooTTTTTTToo..',
  '..osTTTTTTTTso..', '..osTtTTTTtTso..', '..ooTTTTTTTToo..', '...oPPPPPPPPo...', '...oPPPooPPPo...', '...oPPo..oPPo...', '...okko..okko...', '...oooo..oooo...'];
const CHARS = {
  lisa: { hair: '#191a3a', skin: '#e3ab84', shirt: '#c8d2d7', pants: '#6d4cb5', shoes: '#191a32', style: 'long', extra: 'lanyard' },
  andy: { hair: '#1e1a1a', skin: '#e8b98f', shirt: '#d94f3d', pants: '#2f2f2f', shoes: '#f4f1ea' },
  meiLing: { hair: '#3a2a25', skin: '#f1c9a5', shirt: '#5b7fa6', pants: '#3a3a3a', shoes: '#2b2220', style: 'long' },
  suzanne: { hair: '#4a3328', skin: '#f1c9a5', shirt: '#3e3e3e', pants: '#6b6b6b', shoes: '#2b2220', style: 'bun' },
  fauzi: { hair: '#1f2a3a', cap: '#3a5a48', skin: '#b57a4e', shirt: '#4f7f5f', pants: '#4a4a55', shoes: '#2b2220', style: 'hat' },
  gekNeo: { hair: '#8a8a8a', skin: '#f1c9a5', shirt: '#c46a8a', pants: '#7a5a3a', shoes: '#2b2220', style: 'bun' },
  sarojini: { hair: '#e0e0e0', skin: '#b57a4e', shirt: '#7a3f8a', pants: '#7a3f8a', shoes: '#2b2220', style: 'bun' },
  weeKiat: { hair: '#c9c9c9', skin: '#f1c9a5', shirt: '#e5e0d0', pants: '#5a5a5a', shoes: '#2b2220', style: 'bald' },
  carol: { hair: '#6b4a2a', skin: '#e8c39e', shirt: '#a8c4a0', pants: '#4a4a55', shoes: '#2b2220', style: 'long' },
  nadia: { hair: '#7a4f8a', skin: '#c98a5e', shirt: '#7a4f8a', pants: '#3a3a55', shoes: '#2b2220', style: 'scarf' },
  danial: { hair: '#1e1a1a', cap: '#3e8fd0', skin: '#c98a5e', shirt: '#3e8fd0', pants: '#4a4a55', shoes: '#2b2220', style: 'cap' }
};
function charRows(d) {
  const r = BASE.map(s => s.split(''));
  const st = d.style || 'short';
  const map = (y0, y1, from, to) => { for (let y = y0; y <= y1; y++) for (let x = 0; x < 16; x++) { const i = from.indexOf(r[y][x]); if (i >= 0) r[y][x] = to[i]; } };
  if (st === 'long' || st === 'scarf') { for (let y = 8; y <= 16; y++) { r[y][1] = 'o'; r[y][2] = 'H'; r[y][13] = 'H'; r[y][14] = 'o'; } }
  if (st === 'scarf') { r[13][4] = 'H'; r[13][11] = 'H'; r[12][3] = 'H'; r[12][12] = 'H'; }
  if (st === 'bun') { r[0] = '.....oHHHHo.....'.split(''); r[1] = '....ooHHHHoo....'.split(''); }
  if (st === 'cap' || st === 'hat') { map(2, 6, 'Hh', 'CD'); r[7] = (st === 'hat' ? 'occcccccccccccco' : '.occcccccccccco.').split(''); if (st === 'hat') r[6] = 'oCCCCCCCCCCCCCCo'.split(''); }
  if (st === 'bald') { map(2, 7, 'Hh', 'ss'); for (let y = 5; y <= 7; y++) { r[y][3] = 'H'; r[y][12] = 'H'; } }
  if (d.extra === 'lanyard') { r[15][6] = 'y'; r[15][9] = 'y'; r[16][7] = 'y'; r[16][8] = 'y'; r[17][7] = 'y'; r[17][8] = 'y'; }
  return r.map(a => a.join(''));
}
function charPal(d) { const cap = d.cap || d.hair; return { H: d.hair, h: mix(d.hair, 0.28, 'w'), s: d.skin, m: mix(d.skin, 0.3, 'd'), T: d.shirt, t: mix(d.shirt, 0.25, 'd'), P: d.pants, k: d.shoes, w: '#ffffff', e: O, C: cap, D: mix(cap, 0.28, 'w'), c: mix(cap, 0.3, 'd'), y: '#e0b53c' }; }
function charFace(d, mouth) {
  const r = charRows(d).slice(0, 14).map(s => s.split(''));
  if (mouth >= 1) for (let x = 6; x <= 9; x++) r[12][x] = 'm';
  if (mouth >= 2) { r[11][7] = 'm'; r[11][8] = 'm'; r[12][7] = 'X'; r[12][8] = 'X'; }
  return r.map(a => a.join(''));
}
function chr(P, name, x, y) { const d = CHARS[name]; P.stamp(charRows(d), charPal(d), x, y); }
function charUrl(name) { const P = new Px(16, 24); chr(P, name, 0, 0); return P.url(); }
function townKampung() {
  const W = 800, H = 384, P = new Px(W, H);
  grass(P, 0, 0, W, H);
  lawn(P, 60, 156, 56, 18); lawn(P, 256, 156, 56, 18); lawn(P, 60, 226, 80, 26); lawn(P, 328, 282, 56, 20); lawn(P, 660, 100, 72, 24);
  flowers(P, 32, 100, 24, 60, 8); flowers(P, 140, 156, 60, 20, 8); flowers(P, 336, 158, 60, 18, 7); flowers(P, 30, 200, 20, 60, 6); flowers(P, 250, 290, 60, 40, 10); flowers(P, 662, 102, 68, 20, 6); flowers(P, 470, 60, 40, 60, 6); flowers(P, 240, 330, 60, 16, 5);
  plots(P, 48, 32, 152, 44); plots(P, 240, 32, 152, 44);
  const pav = new Mask(W, H); pav.rect(432, 128, 328, 76); pav.rect(460, 100, 140, 30); pav.rect(436, 244, 124, 56); pav.rect(500, 200, 40, 48); pav.rect(656, 200, 104, 120); pav.draw(P, PAVE, '#a09c8c');
  const road = new Mask(W, H); road.rect(600, 20, 40, 364); road.draw(P, () => '#888c96', '#5c606c');
  const sand = new Mask(W, H); sand.rect(208, 74, 24, 278); sand.rect(24, 180, 416, 24); sand.draw(P, SAND, '#c8ae70');
  pond(P, 120, 300, 64, 26);
  fenceH(P, 48, 76, 152); fenceH(P, 240, 76, 152); fenceV(P, 45, 32, 46); fenceV(P, 392, 32, 46);
  forestRow(P, -10, -8, W); forestRow(P, 4, 0, W);
  forestCol(P, -6, 14, 340); forestCol(P, 6, 28, 340); forestCol(P, 776, 14, 340); forestCol(P, 766, 28, 340);
  house(P, 60, 96, HP2); house(P, 132, 96, HP1); house(P, 256, 96, HP3); house(P, 328, 96, HP1); house(P, 256, 222, HP4); house(P, 328, 222, HP3);
  cc(P, 452, 30); depot(P, 660, 34); kopitiam(P, 440, 200); mart(P, 676, 212); fountain(P, 688, 272);
  board(P, 238, 160); sign(P, 190, 168); sign(P, 244, 210); lamp(P, 448, 134); lamp(P, 560, 134); lamp(P, 748, 134); lamp(P, 660, 226); lamp(P, 660, 300); lamp(P, 448, 282);
  bench(P, 500, 140); bench(P, 720, 140); bench(P, 130, 254); bin(P, 570, 110); cooler(P, 536, 106); chess(P, 96, 236); chess(P, 740, 296); stool(P, 44, 296);
  koi(P, 100, 300); koi(P, 140, 292); rock(P, 30, 320); rock(P, 190, 330); rock(P, 400, 330);
  [[116, 104], [190, 96], [312, 100], [388, 96], [312, 226], [388, 222], [188, 250], [30, 262], [572, 36], [572, 60], [740, 40], [740, 62], [396, 300]].forEach(([x, y]) => tree(P, x, y));
  tree(P, 470, 306, 3); tree(P, 540, 306, 5); tree(P, 168, 120, 2);
  bush(P, 400, 150); bush(P, 400, 208); bush(P, 40, 170); bush(P, 40, 210); bush(P, 560, 250); bush(P, 644, 110); bush(P, 644, 300);
  chr(P, 'gekNeo', 300, 46); chr(P, 'suzanne', 150, 150); chr(P, 'weeKiat', 78, 230); chr(P, 'sarojini', 112, 230); chr(P, 'fauzi', 34, 286); chr(P, 'lisa', 214, 290);
  chr(P, 'andy', 520, 150); chr(P, 'meiLing', 700, 150); chr(P, 'carol', 462, 262); chr(P, 'nadia', 486, 262); chr(P, 'danial', 722, 288);
  forestRow(P, 350, -8, W, [588, 652]); forestRow(P, 364, 0, W, [588, 652]);
  return P.url();
}
const ASPH = '#7c8090';
const WATER = (x, y) => (y % 8 === 0 && (x + y) % 16 < 6) ? '#8cc8ff' : (y % 8 === 4 && (x * 3 + y) % 16 < 3) ? '#2c78d0' : '#4c98ec';
Mask.prototype.rim = function (P, col) { const a = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.m[y * this.w + x]; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (this.m[y * this.w + x]) continue; if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) P.p(x, y, col); } };
function roadH(P, x, y, w, h) { P.r(x, y, w, h, ASPH); P.hl(x, y, w, '#5c606c'); P.hl(x, y + h - 1, w, '#5c606c'); P.hl(x, y + 1, w, '#a8acb8'); P.hl(x, y + h - 2, w, '#a8acb8'); for (let dx = x + 4; dx < x + w - 6; dx += 14) P.hl(dx, y + (h >> 1), 7, '#e8e8e0'); }
function roadV(P, x, y, w, h) { P.r(x, y, w, h, ASPH); P.vl(x, y, h, '#5c606c'); P.vl(x + w - 1, y, h, '#5c606c'); P.vl(x + 1, y, h, '#a8acb8'); P.vl(x + w - 2, y, h, '#a8acb8'); for (let dy = y + 4; dy < y + h - 6; dy += 14) P.vl(x + (w >> 1), dy, 7, '#e8e8e0'); }
function cross(P, x, y, w, h) { P.r(x, y, w, h, ASPH); }
function zebraH(P, x, y, w, h) { const x0 = x + 2, w0 = w - 4; P.r(x0, y, w0, h, ASPH); const n = Math.max(2, Math.floor((w0 + 3) / 6)), off = x0 + ((w0 - (n * 6 - 3)) >> 1); for (let i = 0; i < n; i++) P.r(off + i * 6, y, 3, h, '#f0f0ec'); }
function zebraV(P, x, y, w, h) { const y0 = y + 2, h0 = h - 4; P.r(x, y0, w, h0, ASPH); const n = Math.max(2, Math.floor((h0 + 3) / 6)), off = y0 + ((h0 - (n * 6 - 3)) >> 1); for (let i = 0; i < n; i++) P.r(x, off + i * 6, w, 3, '#f0f0ec'); }
const HB1 = { wall: '#ece4d4', slab: '#c8c0b0', accent: '#d86848' }, HB2 = { wall: '#e8ecf0', slab: '#c0c8d0', accent: '#3c88c0' }, HB3 = { wall: '#f0e8c8', slab: '#c8c0a0', accent: '#48a068' };
function hdb(P, x, y, w, n, pal) {
  const sh = 7, vh = 12, h = 6 + n * sh + vh;
  P.r(x + 4, y - 5, 10, 6, '#9aa2aa'); P.box(x + 4, y - 5, 10, 6, O); P.hl(x + 5, y - 5, 8, '#c6ced6'); P.r(x + 6, y - 2, 2, 2, '#6d757f');
  P.r(x + w - 14, y - 4, 11, 5, '#a8acb4'); P.box(x + w - 14, y - 4, 11, 5, O); P.hl(x + w - 13, y - 4, 9, '#d8dce4');
  P.r(x, y, w, 6, '#b0b4bc'); P.hl(x + 1, y + 1, w - 2, '#d8dce4'); P.hl(x + 1, y + 4, w - 2, '#8f979f');
  for (let px = x + 2; px < x + w - 2; px += 4) P.vl(px, y + 1, 3, '#9aa2aa');
  for (let st = 0; st < n; st++) {
    const sy = y + 6 + st * sh;
    P.r(x, sy, w, sh, pal.wall);
    P.hl(x, sy, w, mix(pal.wall, 0.18, 'd'));
    P.hl(x, sy + sh - 1, w, pal.slab); P.hl(x, sy + sh - 2, w, mix(pal.slab, 0.22, 'd'));
    for (let wx = x + 3; wx < x + w - 12; wx += 8) {
      const lit = ((wx * 7 + sy * 3) % 11) < 4;
      P.r(wx, sy + 1, 5, 4, lit ? '#f3d99c' : '#5f8fc4'); P.box(wx, sy + 1, 5, 4, mix(pal.wall, 0.5, 'd'));
      P.hl(wx + 1, sy + 2, 3, lit ? '#fff2d0' : '#a8d0ec'); P.p(wx + 3, sy + 3, lit ? '#e0b45e' : '#dceffb');
      if ((wx * 3 + sy) % 7 < 3) { P.hl(wx - 1, sy + 5, 7, '#a9a9a9'); ['#e04848', '#3c88c0', '#f8d048'].forEach((c, k) => P.r(wx + k * 2, sy + 5, 1, 2, c)); }
      else { P.r(wx + 2, sy + 5, 3, 2, '#b4bcc4'); P.box(wx + 2, sy + 5, 3, 2, mix(pal.wall, 0.4, 'd')); }
    }
  }
  P.r(x + w - 9, y + 3, 8, h - 3, pal.accent); P.vl(x + w - 9, y + 3, h - 3, O); P.vl(x + w - 8, y + 3, h - 3, mix(pal.accent, 0.22, 'w'));
  for (let st = 0; st < n; st++) { const ly = y + 8 + st * sh; P.r(x + w - 6, ly, 3, 3, '#cfe6f8'); P.box(x + w - 6, ly, 3, 3, mix(pal.accent, 0.4, 'd')); }
  const vy = y + 6 + n * sh;
  P.r(x, vy, w - 9, vh, mix(pal.wall, 0.38, 'd'));
  P.hl(x, vy, w - 9, mix(pal.wall, 0.55, 'd'));
  for (let px = x + 2; px < x + w - 11; px += 9) { P.r(px, vy + 1, 3, vh - 1, '#ece8e0'); P.vl(px + 2, vy + 1, vh - 1, '#bdb9b0'); }
  P.r(x + 4, vy + vh - 6, 10, 5, '#2f3a2c'); P.box(x + 4, vy + vh - 6, 10, 5, O); P.r(x + 6, vy + vh - 5, 3, 3, '#f4f0e0'); P.r(x + 10, vy + vh - 5, 3, 3, '#dfe8f0');
  for (let i = 0; i < 2; i++) { const bx = x + w - 26 + i * 7; P.hl(bx, vy + vh - 4, 5, '#8f979f'); P.vl(bx, vy + vh - 4, 4, '#8f979f'); P.vl(bx + 4, vy + vh - 4, 4, '#8f979f'); }
  P.box(x, y, w, h, O);
}
function tower(P, x, y, w, h, g) {
  P.r(x + (w >> 1) - 1, y - 6, 2, 6, O); P.p(x + (w >> 1) - 1, y - 7, '#e04040');
  P.r(x, y, w, 4, '#d0d4dc'); P.box(x, y, w, 4, O);
  P.r(x, y + 4, w, h - 4, g); for (let vx = x + 5; vx < x + w - 2; vx += 6) P.vl(vx, y + 4, h - 4, mix(g, 0.3, 'w')); for (let hy = y + 8; hy < y + h - 1; hy += 5) P.hl(x + 1, hy, w - 2, mix(g, 0.35, 'd')); P.box(x, y + 4, w, h - 4, O);
  P.r(x + (w >> 1) - 4, y + h - 8, 8, 8, '#3c3040'); P.box(x + (w >> 1) - 4, y + h - 8, 8, 8, O); P.r(x - 2, y + h, w + 4, 3, '#c8c4b8'); P.box(x - 2, y + h, w + 4, 3, O);
}
const SH_NM = ['CAFE', 'HERBS', 'PRINT', 'SALON', 'BOOKS'];
const SH = [
  { roof: '#c86848', roofL: '#e08868', roofD: '#984838', wall: '#f4e8c8', shutter: '#3c8c5c', sign: '#d84848', door: '#6a3a20' },
  { roof: '#b06040', roofL: '#d08060', roofD: '#884030', wall: '#c8e0f0', shutter: '#2c5c9c', sign: '#e8a030', door: '#3a4a7a' },
  { roof: '#c86848', roofL: '#e08868', roofD: '#984838', wall: '#f4c8d8', shutter: '#48a068', sign: '#3c88c0', door: '#6a3a20' },
  { roof: '#b06040', roofL: '#d08060', roofD: '#884030', wall: '#c8ecd8', shutter: '#a03c50', sign: '#48a068', door: '#3a4a7a' },
  { roof: '#c86848', roofL: '#e08868', roofD: '#984838', wall: '#f8e8a8', shutter: '#3c5c9c', sign: '#a03c50', door: '#6a3a20' }];
SH.forEach((p, i) => { if (!p.nm) p.nm = SH_NM[i % SH_NM.length]; });
function shophouse(P, x, y, pal) {
  const W = 24;
  roofPitch(P, x, y, W, 8, 0.6, { hi: pal.roofL, md: pal.roof, mm: mix(pal.roof, 0.14, 'd'), dk: pal.roofD, seam: mix(pal.roof, 0.24, 'd') });
  P.hl(x, y + 8, W, O);
  P.r(x + 1, y + 9, W - 2, 17, pal.wall); P.vl(x + 1, y + 9, 17, mix(pal.wall, 0.2, 'w')); P.vl(x + W - 2, y + 9, 17, mix(pal.wall, 0.16, 'd'));
  P.hl(x + 1, y + 9, W - 2, mix(pal.wall, 0.22, 'd')); P.hl(x + 1, y + 24, W - 2, mix(pal.wall, 0.22, 'd'));
  [x + 3, x + 14].forEach((wx, k) => {
    P.r(wx, y + 12, 7, 9, pal.shutter); P.box(wx, y + 12, 7, 9, O); P.vl(wx + 3, y + 13, 7, mix(pal.shutter, 0.35, 'd'));
    P.hl(wx + 1, y + 15, 5, mix(pal.shutter, 0.3, 'd')); P.hl(wx + 1, y + 18, 5, mix(pal.shutter, 0.3, 'd')); P.hl(wx + 1, y + 13, 5, mix(pal.shutter, 0.28, 'w'));
    P.r(wx - 1, y + 21, 9, 1, mix(pal.wall, 0.4, 'd')); P.hl(wx - 1, y + 22, 9, mix(pal.wall, 0.2, 'd'));
    if (k) { ellipse(P, wx + 4, y + 20, 3, 2, '#4aa34e', '#2f7a38', '#7fd070'); P.r(wx + 2, y + 21, 4, 2, '#a8603c'); }
  });
  signBoard(P, x + 1, y + 26, W - 2, 7, pal.nm || 'SHOP', pal.sign, '#fff4e0');
  P.r(x + 1, y + 33, W - 2, 5, '#2f2b31');
  P.vl(x + 1, y + 33, 5, mix(pal.wall, 0.15, 'w')); P.vl(x + W - 2, y + 33, 5, mix(pal.wall, 0.15, 'w'));
  P.r(x + 9, y + 34, 6, 4, pal.door); P.box(x + 9, y + 34, 6, 4, O); P.hl(x + 10, y + 34, 4, mix(pal.door, 0.3, 'w'));
  P.r(x + 4, y + 34, 4, 4, '#8f8b7e'); P.hl(x + 4, y + 34, 4, '#c2bcae');
  P.r(x + 17, y + 35, 4, 3, '#b0783c'); P.box(x + 17, y + 35, 4, 3, O); P.hl(x + 18, y + 35, 2, '#d8a060');
  P.hl(x, y + 38, W, O); P.vl(x, y + 9, 29, O); P.vl(x + W - 1, y + 9, 29, O);
}
function viaduct(P, x, y, len) {
  for (let px = x + 12; px < x + len - 6; px += 32) { P.r(px - 1, y + 25, 8, 2, '#5c6068'); P.r(px, y + 12, 6, 14, '#a8acb4'); P.vl(px, y + 12, 14, O); P.vl(px + 5, y + 12, 14, O); }
  P.r(x, y, len, 12, '#6c7484'); P.hl(x, y, len, O); P.hl(x, y + 11, len, O); P.hl(x, y + 1, len, '#a8acb8'); P.hl(x, y + 10, len, '#a8acb8'); P.hl(x, y + 4, len, '#c8ccd4'); P.hl(x, y + 7, len, '#c8ccd4'); for (let tx = x; tx < x + len; tx += 4) P.vl(tx, y + 4, 4, '#8c9098');
}
function train(P, x, y) { P.r(x, y, 44, 6, '#f0f0f4'); P.box(x, y, 44, 6, O); P.hl(x + 1, y + 1, 42, '#d84040'); for (let wx = x + 3; wx < x + 42; wx += 5) P.r(wx, y + 2, 3, 2, '#3c88c0'); P.p(x + 1, y + 3, '#f8e060'); P.p(x + 42, y + 3, '#f8e060'); }
function mrt(P, x, y) {
  const W = 80;
  for (let i = 0; i < 10; i++) { const t = (9 - i) / 9, hw = Math.max(6, Math.round(Math.sqrt(1 - t * t) * (W / 2))); const x0 = x + W / 2 - hw; P.r(x0, y + i, hw * 2, 1, i < 3 ? '#78c8b8' : '#3c9c8c'); P.p(x0, y + i, O); P.p(x0 + hw * 2 - 1, y + i, O); }
  P.hl(x, y + 10, W, O); P.r(x + 1, y + 11, W - 2, 26, '#e8ecf0'); P.box(x + 1, y + 11, W - 2, 26, O);
  P.r(x + 26, y + 13, 28, 8, '#2c9c8c'); P.box(x + 26, y + 13, 28, 8, O); P.r(x + 29, y + 15, 8, 4, '#f0f8f4'); P.r(x + 39, y + 15, 12, 4, '#f0f8f4');
  for (let wx = x + 5; wx < x + W - 8; wx += 10) { if (wx > x + 26 && wx < x + 52) continue; P.r(wx, y + 24, 6, 8, '#4878b8'); P.p(wx, y + 24, '#a8d0f8'); }
  P.r(x + 32, y + 27, 16, 10, O); P.r(x + 33, y + 28, 14, 9, '#68b0e8'); P.vl(x + 40, y + 28, 9, '#f0f0f0'); P.hl(x + 1, y + 37, W - 2, O); P.r(x + 28, y + 38, 24, 3, '#c8c4b8'); P.box(x + 28, y + 38, 24, 3, O);
}
function sportsHall(P, x, y) {
  const W = 64;
  acUnit(P, x + 8, y - 5); acUnit(P, x + 48, y - 5);
  roofPitch(P, x, y, W, 14, 1.5, { hi: '#ef9a92', md: '#d05050', mm: '#b34442', dk: '#93332f', seam: '#b84a46' });
  P.hl(x, y + 14, W, O); P.r(x, y + 15, W, 1, '#f6efe8'); P.r(x, y + 16, W, 1, '#cfc2bb');
  signBoard(P, x + 7, y + 17, 50, 8, 'SPORTS HALL', '#c83838', '#fff0e8');
  P.r(x + 1, y + 25, W - 2, 23, '#f4e8e0'); P.box(x + 1, y + 25, W - 2, 23, O);
  glass(P, x + 4, y + 28, 16, 9, true); glass(P, x + 44, y + 28, 16, 9, true);
  for (let j = 0; j < 3; j++) { P.hl(x + 5, y + 41 + j * 2, 14, '#d6cac2'); P.hl(x + 45, y + 41 + j * 2, 14, '#d6cac2'); }
  P.r(x + 22, y + 30, 20, 3, '#4a8a80'); P.box(x + 22, y + 30, 20, 3, O); P.hl(x + 23, y + 30, 18, '#7fbdb4');
  P.r(x + 24, y + 33, 16, 15, '#f3d99c'); P.box(x + 24, y + 33, 16, 15, O); P.vl(x + 32, y + 33, 15, '#8f8b7e'); P.hl(x + 25, y + 34, 14, '#fff2d0');
  P.p(x + 30, y + 41, '#6d757f'); P.p(x + 34, y + 41, '#6d757f'); P.r(x + 27, y + 43, 3, 5, '#a98a5e');
  P.hl(x + 1, y + 47, W - 2, O);
}
function boutiqueShop(P, x, y) {
  const W = 72;
  acUnit(P, x + 54, y - 5);
  P.r(x + 2, y, W - 4, 9, '#c8c0b8'); P.box(x + 2, y, W - 4, 9, O); P.hl(x + 3, y + 1, W - 6, '#eee7df'); P.hl(x + 3, y + 7, W - 6, '#9d958d');
  signBoard(P, x + 12, y + 1, 48, 7, 'BOUTIQUE', '#c46a8a', '#fff4f8');
  awning(P, x + 2, y + 9, W - 4, '#e06890', 3);
  P.r(x + 2, y + 14, W - 4, 28, '#f8ecd8'); P.box(x + 2, y + 13, W - 4, 29, O);
  P.r(x + 4, y + 15, 18, 25, '#dceefc'); P.box(x + 4, y + 15, 18, 25, O); P.hl(x + 5, y + 16, 16, '#f4fbff');
  [[6, '#c46a8a'], [14, '#3c6ca8']].forEach(([dx, c]) => { P.r(x + dx + 2, y + 18, 2, 2, '#e8d8c8'); P.r(x + dx, y + 20, 6, 11, c); P.hl(x + dx, y + 20, 6, mix(c, 0.3, 'w')); P.r(x + dx + 2, y + 31, 2, 5, '#c8c4bc'); P.r(x + dx, y + 36, 6, 1, '#606870'); });
  P.r(x + 24, y + 16, 14, 26, '#6a3a20'); P.box(x + 24, y + 16, 14, 26, O); P.r(x + 25, y + 17, 12, 12, '#dceefc'); P.hl(x + 26, y + 18, 10, '#f4fbff'); P.p(x + 35, y + 32, '#e8c878');
  P.r(x + 40, y + 15, 28, 25, '#dceefc'); P.box(x + 40, y + 15, 28, 25, O); P.hl(x + 41, y + 16, 26, '#f4fbff'); P.hl(x + 42, y + 19, 24, '#8f8b7e');
  ['#d8a0b8', '#7fb0d8', '#e8c878', '#9fc8a0', '#c8a0d0'].forEach((c, k) => { const gx = x + 43 + k * 5; P.p(gx + 1, y + 20, '#8f8b7e'); P.r(gx, y + 21, 4, 10, c); P.hl(gx, y + 21, 4, mix(c, 0.3, 'w')); P.hl(gx, y + 30, 4, mix(c, 0.25, 'd')); });
  P.hl(x + 2, y + 42, W - 4, O);
  tiledStrip(P, x, y + 43, W, 9);
  P.r(x + 8, y + 45, 12, 7, '#f8d048'); P.box(x + 8, y + 45, 12, 7, O); P.r(x + 10, y + 47, 8, 1, '#c83838'); P.r(x + 10, y + 49, 5, 1, '#8a5a30');
  potPlant(P, x + 46, y + 47); litBin(P, x + 62, y + 46, '#3868b8');
}
function schoolBlock(P, x, y) {
  const W = 96;
  P.vl(x - 8, y - 12, 96, '#c8ccd4'); P.p(x - 8, y - 13, '#f0d060'); P.r(x - 7, y - 10, 11, 3, '#e04040'); P.r(x - 7, y - 7, 11, 3, '#f8f8f8'); P.box(x - 8, y - 11, 13, 8, O);
  acUnit(P, x + 10, y - 5); acUnit(P, x + 78, y - 5);
  P.r(x, y, W, 9, '#c8c0b0'); P.box(x, y, W, 9, O); P.hl(x + 1, y + 1, W - 2, '#e8e0d0'); P.hl(x + 1, y + 7, W - 2, '#a09888');
  signBoard(P, x + 17, y + 1, 62, 7, 'TENANG SCHOOL', '#2c5c9c', '#f4f8ff');
  P.r(x + 1, y + 9, W - 2, 30, '#f4e8c8'); P.box(x + 1, y + 9, W - 2, 30, O);
  for (let k = 0; k < 5; k++) glass(P, x + 6 + k * 18, y + 14, 14, 11, k % 2 === 0);
  P.r(x, y + 39, W, 4, '#3c88c0'); P.box(x, y + 39, W, 4, O); P.hl(x + 1, y + 40, W - 2, '#7ab4e0');
  P.r(x + 1, y + 43, W - 2, 34, '#f8f0d8'); P.box(x + 1, y + 43, W - 2, 34, O);
  glass(P, x + 6, y + 48, 14, 12, true); glass(P, x + 76, y + 48, 14, 12, true);
  P.r(x + 43, y + 45, 10, 10, '#f4f0e0'); P.box(x + 43, y + 45, 10, 10, O); P.hl(x + 44, y + 46, 8, '#ffffff');
  P.p(x + 47, y + 47, '#8f8b7e'); P.p(x + 51, y + 47, '#8f8b7e'); P.p(x + 47, y + 52, '#8f8b7e'); P.p(x + 51, y + 52, '#8f8b7e');
  P.vl(x + 47, y + 47, 4, '#3a3a40'); P.hl(x + 48, y + 50, 3, '#3a3a40');
  P.r(x + 26, y + 56, 26, 4, '#4a8a80'); P.box(x + 26, y + 56, 26, 4, O); P.hl(x + 27, y + 56, 24, '#7fbdb4');
  P.r(x + 30, y + 60, 18, 17, '#f3d99c'); P.box(x + 30, y + 60, 18, 17, O); P.vl(x + 39, y + 60, 17, '#8f8b7e'); P.hl(x + 31, y + 61, 16, '#fff2d0');
  P.p(x + 37, y + 68, '#6d757f'); P.p(x + 41, y + 68, '#6d757f'); P.r(x + 33, y + 71, 3, 6, '#a98a5e');
  P.r(x + 60, y + 62, 16, 12, '#2f3a2c'); P.box(x + 60, y + 62, 16, 12, O); P.hl(x + 61, y + 62, 14, '#4e5c46');
  [[62, 64, '#f4f0e0'], [69, 64, '#dfe8f0'], [62, 69, '#e8dcc0'], [69, 69, '#f4f0e0']].forEach(([dx, dy, c]) => P.r(x + dx, y + dy, 5, 4, c));
  P.hl(x + 1, y + 77, W - 2, O);
  tiledStrip(P, x, y + 77, W, 9);
  P.r(x + 30, y + 77, 18, 3, '#dcd6c4'); P.box(x + 30, y + 77, 18, 3, '#a9a290');
  potPlant(P, x + 21, y + 81); potPlant(P, x + 53, y + 81);
}
function mrtExit(P, x, y) {
  P.r(x, y, 24, 6, '#3c9c8c'); P.box(x, y, 24, 6, O); P.hl(x + 1, y + 1, 22, '#78c8b8');
  P.r(x + 1, y + 6, 22, 12, '#b8bcc4'); P.box(x + 1, y + 6, 22, 12, O);
  for (let j = y + 8; j < y + 17; j += 2) P.hl(x + 4, j, 16, '#8c9098');
  P.r(x + 3, y + 6, 18, 1, '#dfe3e8'); P.vl(x + 2, y + 6, 12, '#d8dce4'); P.vl(x + 21, y + 6, 12, '#9aa2aa');
  P.r(x + 5, y - 6, 14, 7, '#2c9c8c'); P.box(x + 5, y - 6, 14, 7, O); P.hl(x + 6, y - 5, 12, '#78c8b8'); tiny(P, x + 7, y - 5, 'MRT', '#eafaf6');
}
const HK = { hi: '#dbe0e8', md: '#b9c1cd', mm: '#a1a9b6', dk: '#7b838f', seam: '#9aa2ae', sky: '#e9eff6', skyD: '#bcd0e0', col: '#cdc8b8', colD: '#8f8b7e', deep: '#39404f', steel: '#d8dce4', steelM: '#b9bfc8', steelD: '#8b929c', glow: '#f7dfa4', floor: '#cfcbbb', floorD: '#b6b2a2', grout: '#a9a595' };
const MICRO = { A: [3, [2, 5, 7, 5, 5]], B: [3, [7, 5, 6, 5, 7]], C: [3, [7, 4, 4, 4, 7]], D: [3, [6, 5, 5, 5, 6]], E: [3, [7, 4, 6, 4, 7]], F: [3, [7, 4, 6, 4, 4]], G: [3, [7, 4, 5, 5, 7]], H: [3, [5, 5, 7, 5, 5]], I: [3, [7, 2, 2, 2, 7]], J: [3, [1, 1, 1, 5, 7]], K: [3, [5, 5, 6, 5, 5]], L: [3, [4, 4, 4, 4, 7]], M: [4, [9, 15, 15, 9, 9]], N: [4, [9, 13, 11, 9, 9]], O: [3, [7, 5, 5, 5, 7]], P: [3, [7, 5, 7, 4, 4]], Q: [3, [7, 5, 5, 7, 1]], R: [3, [7, 5, 7, 6, 5]], S: [3, [7, 4, 7, 1, 7]], T: [3, [7, 2, 2, 2, 2]], U: [3, [5, 5, 5, 5, 7]], V: [3, [5, 5, 5, 5, 2]], W: [4, [9, 9, 9, 15, 6]], X: [3, [5, 5, 2, 5, 5]], Y: [3, [5, 5, 2, 2, 2]], Z: [3, [7, 1, 2, 4, 7]], '&': [3, [6, 4, 7, 5, 7]], '.': [1, [0, 0, 0, 0, 1]], '0': [3, [7, 5, 5, 5, 7]], '1': [3, [2, 6, 2, 2, 7]], '2': [3, [7, 1, 7, 4, 7]], '3': [3, [7, 1, 3, 1, 7]], '4': [3, [5, 5, 7, 1, 1]], '5': [3, [7, 4, 7, 1, 7]], '6': [3, [7, 4, 7, 5, 7]], '7': [3, [7, 1, 1, 1, 1]], '8': [3, [7, 5, 7, 5, 7]], '9': [3, [7, 5, 7, 1, 1]], ' ': [2, [0, 0, 0, 0, 0]] };
function tinyW(txt) { let w = 0; for (const ch of String(txt).toUpperCase()) { const g = MICRO[ch]; if (g) w += g[0] + 1; } return Math.max(0, w - 1); }
function tiny(P, x, y, s, c) { let cx = x; for (const ch of String(s).toUpperCase()) { const g = MICRO[ch]; if (!g) continue; const [gw, rows] = g; for (let j = 0; j < 5; j++) for (let i = 0; i < gw; i++) { if (rows[j] & (1 << (gw - 1 - i))) P.p(cx + i, y + j, c); } cx += gw + 1; } }
function roofPitch(P, x, y, W, rows, slant, p) {
  for (let i = 0; i < rows; i++) {
    const ins = Math.round((rows - 1 - i) * slant), x0 = x + ins, x1 = x + W - ins, f = i / (rows - 1);
    P.r(x0 + 1, y + i, x1 - x0 - 2, 1, f < 0.16 ? p.hi : f < 0.62 ? p.md : f < 0.86 ? p.mm : p.dk);
    if (p.seam && i > 0 && i < rows - 2) for (let sx = x + 4; sx < x + W - 3; sx += 5) { if (sx > x0 + 1 && sx < x1 - 2) P.p(sx, y + i, p.seam); }
    P.p(x0, y + i, O); P.p(x1 - 1, y + i, O);
  }
  const t = Math.round((rows - 1) * slant);
  if (W - 2 * t > 2) { P.hl(x + t, y, W - 2 * t, O); P.hl(x + t + 1, y + 1, W - 2 * t - 2, p.hi); }
}
function glass(P, x, y, w, h, lit) {
  const g = lit ? '#f3d99c' : '#8cc0e4', gd = lit ? '#d8ac58' : '#5f97c4', gl = lit ? '#fff2d0' : '#cfe9fa';
  P.box(x, y, w, h, O); P.r(x + 1, y + 1, w - 2, h - 2, g); P.hl(x + 1, y + 1, w - 2, gl); P.hl(x + 1, y + h - 2, w - 2, gd);
  if (w > 8) P.vl(x + (w >> 1), y + 1, h - 2, gd);
  for (let k = 1; k < Math.min(4, h - 2); k++) P.p(x + w - 1 - k, y + k, gl);
  P.hl(x - 1, y + h, w + 2, '#cdc8b8'); P.hl(x - 1, y + h + 1, w + 2, '#8f8b7e');
}
function awning(P, x, y, w, c, n) {
  const rows = n || 3; P.hl(x, y, w, O);
  for (let i = 0; i < w; i++) { const st = ((i >> 1) % 2) === 0, cc = st ? c : '#f4ecd8'; P.vl(x + i, y + 1, rows, cc); P.p(x + i, y + 1, mix(cc, 0.2, 'd')); if (st) P.p(x + i, y + rows + 1, mix(c, 0.22, 'd')); }
}
function signBoard(P, x, y, w, h, txt, bg, ink) {
  P.r(x, y, w, h, bg); P.box(x, y, w, h, O); P.hl(x + 1, y + 1, w - 2, mix(bg, 0.22, 'w')); P.hl(x + 1, y + h - 2, w - 2, mix(bg, 0.26, 'd'));
  tiny(P, x + Math.max(1, Math.round((w - tinyW(txt)) / 2)), y + Math.round((h - 5) / 2), txt, ink);
}
function tableFront(P, x, y, sc) {
  [x + 2, x + 12].forEach(lx => { P.r(lx, y + 2, 2, 3, '#9a968a'); P.vl(lx + 1, y + 2, 3, '#7b776c'); });
  P.r(x, y, 16, 2, '#e8e4d8'); P.box(x, y, 16, 2, O); P.hl(x + 1, y, 14, '#f6f2e8');
  for (let k = 0; k < 3; k++) { const sx = x + 1 + k * 5; P.r(sx, y + 2, 4, 3, sc); P.box(sx, y + 2, 4, 3, O); P.hl(sx + 1, y + 2, 2, mix(sc, 0.34, 'w')); }
}
function potPlant(P, x, y) { ellipse(P, x + 3, y, 4, 2, '#4aa34e', '#2f7a38', '#7fd070'); P.r(x, y + 2, 6, 3, '#a8603c'); P.box(x, y + 2, 6, 3, O); P.hl(x + 1, y + 2, 4, '#c47a4e'); }
function acUnit(P, x, y) { P.r(x, y, 7, 5, '#b4bcc4'); P.box(x, y, 7, 5, O); P.hl(x + 1, y + 1, 5, '#d8dce4'); P.hl(x + 1, y + 2, 5, '#8f979f'); P.hl(x + 1, y + 3, 5, '#8f979f'); P.p(x + 3, y + 3, '#e8eef4'); }
function tiledStrip(P, x, y, w, h) { P.r(x, y, w, h, '#cfcbbb'); P.r(x, y, w, 2, '#b6b2a2'); for (let fx = x; fx < x + w; fx += 8) P.vl(fx, y, h, '#a9a595'); P.hl(x, y + Math.min(3, h - 1), w, '#a9a595'); }
function litBin(P, x, y, c) { P.r(x, y, 6, 6, c || '#3868b8'); P.box(x, y, 6, 6, O); P.hl(x + 1, y, 4, O); P.hl(x + 1, y + 2, 4, mix(c || '#3868b8', 0.3, 'w')); }
const HK_GOODS = {
  0: (P, y, b, gw) => { const n = Math.max(1, Math.floor((gw + 1) / 4)); for (let k = 0; k < n; k++) { const gx = b + k * 4; P.p(gx + 1, y + 24, '#c9a94e'); P.r(gx, y + 25, 3, 4, '#b0662e'); P.box(gx, y + 25, 3, 4, O); P.p(gx + 1, y + 26, '#d08a46'); } },
  1: (P, y, b, gw) => { P.r(b, y + 26, 5, 3, HK.steelM); P.box(b, y + 26, 5, 3, O); P.hl(b + 1, y + 26, 3, HK.steel); if (gw > 6) { P.r(b + 6, y + 27, 4, 2, HK.steelM); P.box(b + 6, y + 27, 4, 2, O); } [[1, 24], [2, 25], [3, 23], [7, 25]].forEach(([dx, sy]) => { if (dx < gw) P.p(b + dx, y + sy, '#c8d4dc'); }); },
  2: (P, y, b, gw) => { const w = Math.min(gw, 9); P.r(b, y + 23, w, 6, '#6fadd0'); P.box(b, y + 23, w, 6, O); P.hl(b + 1, y + 23, w - 2, '#bfe4f4'); ['#e05c4c', '#4aa34e', '#e8b040', '#e8e4d8'].forEach((c, k) => { const px = b + 2 + k * 2; if (px < b + w - 1) { P.vl(px, y + 25, 3, c); P.p(px, y + 24, mix(c, 0.32, 'w')); } }); },
  3: (P, y, b, gw) => { P.hl(b, y + 25, gw, HK.steelM); const n = Math.max(2, Math.floor(gw / 3)); for (let k = 0; k < n; k++) { const c = ['#c8563c', '#4a9a48', '#e0b040', '#a8632e'][k % 4], px = b + k * 3; P.r(px, y + 26, 2, 2, c); P.box(px, y + 26, 2, 2, mix(c, 0.4, 'd')); } }
};
function hawker(P, x, y) {
  const W = 96, K = HK;
  /* ridge monitor vent */
  P.r(x + 34, y - 3, 28, 4, K.mm); P.box(x + 34, y - 3, 28, 4, O); P.hl(x + 35, y - 3, 26, K.hi);
  for (let vx = x + 37; vx < x + 61; vx += 3) P.vl(vx, y - 2, 2, '#5e6672');
  /* hipped zinc roof */
  for (let i = 0; i < 14; i++) {
    const ins = Math.round((13 - i) * 1.2), x0 = x + ins, x1 = x + W - ins;
    P.r(x0 + 1, y + i, x1 - x0 - 2, 1, i < 2 ? K.hi : i < 9 ? K.md : i < 12 ? K.mm : K.dk);
    if (i > 1 && i < 12) for (let sx = x + 18; sx < x + 79; sx += 5) { if (sx > x0 + 1 && sx < x1 - 2) P.p(sx, y + i, K.seam); }
    P.p(x0, y + i, O); P.p(x1 - 1, y + i, O);
  }
  P.hl(x + 16, y, W - 32, O); P.hl(x + 17, y + 1, W - 34, K.hi);
  [x + 14, x + 72].forEach(sx => { P.r(sx, y + 3, 10, 3, K.sky); P.box(sx, y + 3, 10, 3, O); P.hl(sx + 1, y + 5, 8, K.skyD); for (let i = sx + 3; i < sx + 9; i += 3) P.vl(i, y + 4, 2, K.skyD); });
  [x + 13, x + 78].forEach(cx => { P.p(cx + 2, y + 6, O); P.r(cx, y + 7, 5, 4, '#8a929e'); P.box(cx, y + 7, 5, 4, O); P.hl(cx + 1, y + 7, 3, K.hi); P.r(cx - 1, y + 11, 7, 1, '#6b7380'); });
  /* name board */
  const nb = x + 25;
  P.r(nb + 1, y + 12, 46, 1, '#7b838f'); P.r(nb, y + 4, 46, 8, '#c03a3a'); P.box(nb, y + 4, 46, 8, O);
  P.hl(nb + 1, y + 5, 44, '#dd6060'); P.hl(nb + 1, y + 10, 44, '#8c2a2a');
  tiny(P, nb + Math.round((46 - tinyW('FOOD CENTRE')) / 2), y + 6, 'FOOD CENTRE', '#f8f0e0');
  /* eave fascia */
  P.hl(x, y + 14, W, O); P.r(x, y + 15, W, 1, '#9aa2ae'); P.r(x, y + 16, W, 1, '#6d757f'); P.hl(x, y + 17, W, O);
  for (let rx = x + 4; rx < x + W - 3; rx += 8) P.p(rx, y + 15, '#c6ccd4');
  /* open hall */
  P.r(x, y + 18, W, 17, K.deep); P.r(x, y + 18, W, 2, mix(K.deep, 0.3, 'd'));
  [[x + 3, 15, '#c83838', 0], [x + 21, 14, '#e8a030', 1], [x + 56, 15, '#3878c8', 2], [x + 74, 19, '#38a058', 3]].forEach(([b, w, c, kind]) => {
    P.hl(b, y + 18, w, O);
    for (let i = 0; i < w; i++) { const st = ((i >> 1) % 2) === 0, cc = st ? c : '#f4ecd8'; P.vl(b + i, y + 19, 3, cc); P.p(b + i, y + 19, mix(cc, 0.2, 'd')); if (st) P.p(b + i, y + 22, mix(c, 0.22, 'd')); }
    P.hl(b, y + 23, w, mix(K.glow, 0.42, 'd'));
    HK_GOODS[kind](P, y, b + 1, w - 8);
    const mb = b + w - 6;
    P.p(mb + 2, y + 23, O); P.r(mb, y + 24, 5, 5, '#2b3242'); P.box(mb, y + 24, 5, 5, O); P.hl(mb + 1, y + 24, 3, c); P.hl(mb + 1, y + 26, 3, '#e8e0cc'); P.hl(mb + 1, y + 27, 2, '#b9bfae');
    P.hl(b, y + 29, w, K.steel); P.r(b, y + 30, w, 3, K.steelM); P.hl(b, y + 31, w, mix(K.steelM, 0.14, 'd')); P.hl(b, y + 33, w, K.steelD); P.hl(b, y + 34, w, O);
    for (let sx = b + 3; sx < b + w - 2; sx += 6) P.vl(sx, y + 30, 3, mix(K.steelM, 0.2, 'd'));
    P.r(b + 1, y + 30, 4, 2, c); P.p(b + 1, y + 30, mix(c, 0.32, 'w'));
  });
  /* central entrance: lit passage */
  const ex = x + 38, ew = 15;
  P.r(ex, y + 18, ew, 5, mix(K.deep, 0.2, 'd')); P.hl(ex, y + 18, ew, O);
  [ex + 3, ex + 7, ex + 11].forEach(lx => { P.r(lx, y + 21, 2, 1, K.glow); P.p(lx, y + 22, mix(K.glow, 0.4, 'd')); P.p(lx + 1, y + 22, mix(K.glow, 0.4, 'd')); });
  for (let j = 0; j < 7; j++) { const inw = 5 + j, fx = ex + Math.round((ew - inw) / 2); P.r(fx, y + 28 + j, inw, 1, j < 3 ? '#8d8a7c' : j < 5 ? '#a8a496' : '#c2beae'); }
  P.vl(ex, y + 23, 12, K.colD); P.vl(ex + ew - 1, y + 23, 12, K.colD); P.vl(ex + 1, y + 23, 12, mix(K.deep, 0.15, 'w')); P.vl(ex + ew - 2, y + 23, 12, mix(K.deep, 0.15, 'w'));
  P.r(ex + 2, y + 24, 4, 4, '#3a628a'); P.box(ex + 2, y + 24, 4, 4, O); P.hl(ex + 3, y + 25, 2, '#dfe8ee'); P.hl(ex + 3, y + 26, 2, '#a8c0d0');
  P.hl(ex, y + 35, ew, mix(K.glow, 0.3, 'd'));
  /* columns */
  [x, x + 18, x + 35, x + 53, x + 71, x + 93].forEach(cx => { P.r(cx, y + 18, 3, 17, K.col); P.vl(cx, y + 18, 17, mix(K.col, 0.22, 'w')); P.vl(cx + 2, y + 18, 17, K.colD); P.hl(cx, y + 34, 3, O); });
  /* forecourt */
  P.r(x, y + 35, W, 7, K.floor); P.r(x, y + 35, W, 2, K.floorD);
  for (let fx = x; fx < x + W; fx += 8) P.vl(fx, y + 35, 7, K.grout);
  P.hl(x, y + 38, W, K.grout); for (let fx = x + 1; fx < x + W; fx += 2) P.p(fx, y + 41, K.grout);
  for (let tx = ex + 1; tx < ex + ew - 1; tx += 3) { P.p(tx, y + 39, '#d8b048'); P.p(tx + 1, y + 40, '#d8b048'); }
  tableFront(P, x + 6, y + 37, '#c84848'); tableFront(P, x + 74, y + 37, '#3878c8');
  [x + 29, x + 55].forEach(px => { P.r(px, y + 39, 6, 3, '#a8603c'); P.box(px, y + 39, 6, 3, O); P.hl(px + 1, y + 39, 4, '#c47a4e'); ellipse(P, px + 3, y + 37, 4, 2, '#4aa34e', '#2f7a38', '#7fd070'); });
  const bn = x + 91; P.r(bn, y + 36, 6, 6, '#4d7a5c'); P.box(bn, y + 36, 6, 6, O); P.hl(bn + 1, y + 36, 4, O); P.hl(bn + 1, y + 38, 4, '#6fa07c');
}
const CART = ['..oooooooo..', '.oLLLLLLLLo.', '.oWWLLLLWWo.', 'TTBBBBBBBBTT', 'TTBBBBBBBBTT', 'TTBBBBBBBBTT', 'TTDDDDDDDDTT', '.oGGGGGGGGo.', '.oGGGGGGGGo.', '.oDGGGGGGDo.', '.oBBBBBBBBo.', '.oBBLLLLBBo.', '.oBBLLLLBBo.', '.oBBBBBBBBo.', '.oDSSSSSSDo.', 'TTSSSSSSSSTT', 'TTSSSSSSSSTT', 'TTDDDDDDDDTT', 'TTBBBBBBBBTT', '.oBBBBBBBBo.', '.oRRLLLLRRo.', '..oooooooo..'];
function car(P, x, y, c) { P.stamp(CART, { B: c, L: mix(c, 0.24, 'w'), D: mix(c, 0.32, 'd'), G: '#9cc4ec', S: '#78a8d8', W: '#f8f0c0', R: '#e03a3a', T: '#1c1e26' }, x, y); }
const _carc = {};
function carSprite(c, dir) { const k = c + dir; if (_carc[k]) return _carc[k]; const s = new Px(12, 22); car(s, 0, 0, c); let d = s; if (dir !== 'n') { const v = dir === 's'; d = new Px(v ? 12 : 22, v ? 22 : 12); const g = d.g; g.imageSmoothingEnabled = false; if (v) { g.translate(12, 22); g.rotate(Math.PI); } else if (dir === 'e') { g.translate(22, 0); g.rotate(Math.PI / 2); } else { g.translate(0, 12); g.rotate(-Math.PI / 2); } g.drawImage(s.c, 0, 0); } return (_carc[k] = d.c); }
function carAt(P, x, y, c, dir) { P.g.drawImage(carSprite(c, dir), x, y); }
function carpark(P, x, y, w, h, entry) {
  P.r(x, y, w, h, ASPH); P.box(x, y, w, h, '#5c606c');
  const d = 22, n = Math.max(1, Math.floor((w - 8) / 16)), x0 = x + 4 + ((w - 8 - n * 16) >> 1), L = '#e8e8e0';
  const cols = ['#d84848', '#f0f0f0', '#3c88c0', '#606870', '#e8a030'];
  [[y + 2, 'n'], [y + h - 2 - d, 's']].forEach(([ry, dir], r) => {
    for (let i = 0; i <= n; i++) P.vl(x0 + i * 16, ry, d, L);
    P.hl(x0, dir === 'n' ? ry : ry + d - 1, n * 16, L);
    for (let i = 0; i < n; i++) if (((i * 5 + r * 3) % 7) > 1) carAt(P, x0 + i * 16 + 2, ry, cols[(i + r * 2) % 5], dir);
  });
  // entry 'e' | 'w': kerb cut from the aisle out to the road, so the lot is actually reachable
  if (entry && h - 8 - d * 2 >= 10) {
    const ay = y + 4 + d, ah = h - 8 - d * 2, ex = entry === 'e' ? x + w - 1 : x - 9;
    P.r(ex, ay, 10, ah, ASPH);
    P.hl(ex, ay - 1, 10, '#5c606c'); P.hl(ex, ay + ah, 10, '#5c606c');
    P.hl(ex, ay, 10, '#a8acb8'); P.hl(ex, ay + ah - 1, 10, '#a8acb8');
  }
}
function busStop(P, x, y) {
  P.r(x, y, 32, 6, '#2c9c8c'); P.box(x, y, 32, 6, O); P.hl(x + 1, y + 1, 30, '#78c8b8'); tiny(P, x + 10, y, 'BUS', '#eafaf6');
  P.r(x + 3, y + 6, 26, 7, '#c8e8f0'); P.hl(x + 3, y + 6, 26, '#ffffff'); for (let k = 1; k < 4; k++) P.p(x + 27 - k, y + 7 + k, '#f4fdff');
  P.r(x + 1, y + 6, 2, 12, O); P.r(x + 29, y + 6, 2, 12, O);
  P.r(x + 5, y + 7, 7, 5, '#f4f0e0'); P.box(x + 5, y + 7, 7, 5, '#8f8b7e'); for (let j = 0; j < 3; j++) P.hl(x + 6, y + 8 + j, 5, '#b9b3a0');
  P.r(x + 4, y + 13, 24, 3, '#b08050'); P.box(x + 4, y + 13, 24, 3, O); P.hl(x + 5, y + 14, 22, '#c89860');
  P.r(x + 6, y + 16, 2, 2, O); P.r(x + 24, y + 16, 2, 2, O);
  P.vl(x + 34, y - 4, 22, O); P.r(x + 32, y - 7, 7, 6, '#e8a030'); P.box(x + 32, y - 7, 7, 6, O); P.hl(x + 33, y - 6, 5, '#f8c860'); P.r(x + 34, y - 4, 3, 2, '#6a4a20');
}
function playground(P, x, y) {
  // Two pieces only — a slide tower and a swing set — on a poured rubber surface.
  const MB = '#b8683c', ML = '#cc8a60', MD = '#9c5634', KB = '#74401f';
  const BL = '#3c88c0', BH = '#7cc0e8', BD = '#2c6c9c', RD = '#e04848', RH = '#f08080';
  const YL = '#f8d040', YH = '#ffe888', YD = '#c89418', MG = '#8890a0', MH = '#d8dce4';
  const W = 56, H = 40;
  P.r(x, y, W, H, MB); P.box(x, y, W, H, O); P.box(x + 1, y + 1, W - 2, H - 2, KB);
  ellipse(P, x + 28, y + 20, 25, 16, ML, MD, '#dc9868');
  for (let i = 0; i < 70; i++) { const px = x + 2 + ((i * 23 + 5) % (W - 4)), py = y + 2 + ((i * 31 + 9) % (H - 4)); P.p(px, py, (i % 4) ? '#d09468' : MD); }
  const dl = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) P.p(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };
  const bar = (bx, by, bw, fill, hi) => { P.r(bx, by, bw, 2, fill); P.hl(bx + 1, by, bw - 2, hi); P.vl(bx, by, 2, O); P.vl(bx + bw - 1, by, 2, O); P.hl(bx, by - 1, bw, O); P.hl(bx, by + 2, bw, O); };
  const post = (px, py, ph, c, hi) => { P.vl(px, py, ph, O); P.vl(px + 1, py, ph, hi); P.vl(px + 2, py, ph, c); P.vl(px + 3, py, ph, O); };
  P.r(x + 36, y + 31, 18, 2, MD);
  // slide tower: ladder, decked platform under a red rail, narrow chute
  P.vl(x + 3, y + 11, 20, O); P.vl(x + 4, y + 11, 20, MG); P.vl(x + 7, y + 11, 20, MG); P.vl(x + 8, y + 11, 20, O);
  for (let j = 0; j < 6; j++) P.r(x + 4, y + 14 + j * 3, 4, 1, MH);
  post(x + 9, y + 11, 20, BD, BH); P.vl(x + 16, y + 11, 20, O); P.vl(x + 17, y + 11, 20, BH); P.vl(x + 18, y + 11, 20, BD); P.vl(x + 19, y + 11, 20, O);
  P.r(x + 7, y + 8, 14, 3, BL); P.box(x + 7, y + 8, 14, 3, O); P.hl(x + 8, y + 8, 12, BH); P.hl(x + 8, y + 10, 12, BD);
  P.vl(x + 7, y + 2, 6, O); P.vl(x + 8, y + 2, 6, RD); P.vl(x + 19, y + 2, 6, RD); P.vl(x + 20, y + 2, 6, O);
  bar(x + 7, y + 1, 14, RD, RH);
  for (let i = 0; i <= 20; i++) {
    const cx = x + 20 + Math.round(i * 0.42), cy = y + 10 + i;
    P.p(cx, cy, O); P.p(cx + 1, cy, YD); P.p(cx + 2, cy, YL); P.p(cx + 3, cy, YH); P.p(cx + 4, cy, O);
  }
  P.r(x + 28, y + 30, 5, 2, YD); P.box(x + 28, y + 30, 5, 2, O);
  // swing set: two A-frames, top rail, two seats on chains
  const leg = (bx, ax) => { dl(bx, y + 30, ax, y + 8, O); dl(bx + 1, y + 30, ax + 1, y + 8, MH); dl(bx + 2, y + 30, ax + 2, y + 8, MG); dl(bx + 3, y + 30, ax + 3, y + 8, O); };
  leg(x + 35, x + 38); leg(x + 41, x + 38); leg(x + 49, x + 52); leg(x + 54, x + 52);
  bar(x + 37, y + 6, 17, MG, MH);
  [[x + 41, RD, RH], [x + 47, BL, BH]].forEach(([cx, seat, hi]) => {
    P.vl(cx, y + 9, 13, O); P.vl(cx + 4, y + 9, 13, O); P.p(cx, y + 13, MH); P.p(cx + 4, y + 16, MH);
    bar(cx - 1, y + 22, 7, seat, hi);
  });
  // hopscotch painted on the rubber
  const CH = '#f4f4ec';
  P.box(x + 7, y + 34, 6, 5, CH); P.box(x + 14, y + 34, 6, 5, CH); P.box(x + 21, y + 34, 6, 5, CH);
}
// Draws a native-resolution sprite onto a target at scale k by scaling the
// DRAWING COMMANDS, not the finished bitmap. Nearest-neighbour blowup maps each
// source pixel independently, so at k=1.5 a 1px line lands as 1 or 2 device px
// depending where it falls — that irregular weight is what reads as mush. Here
// each shape keeps its exact edges (no seams between neighbours) while any thin
// feature is floored at round(k), so every hairline in the town is the same
// weight and diagonals step uniformly.
class ScaledPx {
  constructor(base, k, ox, oy) { this.b = base; this.k = k; this.ox = ox; this.oy = oy; this.t = Math.max(1, Math.round(k)); this.w = base.w; this.h = base.h; }
  X(v) { return this.ox + Math.round(v * this.k); }
  Y(v) { return this.oy + Math.round(v * this.k); }
  r(x, y, w, h, c) {
    const a = this.X(x), b = this.Y(y);
    this.b.r(a, b, Math.max(this.t, this.X(x + w) - a), Math.max(this.t, this.Y(y + h) - b), c);
  }
  p(x, y, c) { this.r(x, y, 1, 1, c); }
  hl(x, y, w, c) { this.r(x, y, w, 1, c); }
  vl(x, y, h, c) { this.r(x, y, 1, h, c); }
  box(x, y, w, h, c) { this.hl(x, y, w, c); this.hl(x, y + h - 1, w, c); this.vl(x, y, h, c); this.vl(x + w - 1, y, h, c); }
  stamp(rows, pal, x, y) { rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; const c = ch === 'o' ? O : pal[ch]; if (c) this.p(x + i, y + j, c); } }); }
  clip(x, y, w, h, fn) { const a = this.X(x), b = this.Y(y); this.b.clip(a, b, this.X(x + w) - a, this.Y(y + h) - b, fn); }
  get g() {
    const s = this;
    return {
      set imageSmoothingEnabled(v) { }, get imageSmoothingEnabled() { return false; },
      drawImage(img, dx, dy) {
        const ctx = s.b.g; ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, s.X(dx), s.Y(dy), Math.round(img.width * s.k), Math.round(img.height * s.k));
      }
    };
  }
}
function rrect(P, x, y, w, h, rad, col) {
  for (let j = 0; j < h; j++) {
    const dy = Math.min(j, h - 1 - j);
    const ins = dy >= rad ? 0 : Math.round(rad - Math.sqrt(Math.max(0, rad * rad - (rad - 1 - dy) * (rad - 1 - dy))));
    P.r(x + ins, y + j, w - ins * 2, 1, col);
  }
}
// The town playground is drawn at native size straight onto the map: at this
// footprint a blown-up 56x40 sprite turns to mush, so every pixel here is 1:1.
function playgroundLot(P, x, y) {
  const OUT = '#3f7fa0', OUTD = '#27556d', OUTL = '#5b9cba';
  const INN = '#c07548', INND = '#9c5a34', INNL = '#d68f60', LINE = '#f2eee2';
  const BL = '#3c88c0', BH = '#7cc0e8', BD = '#2c6c9c', RD = '#e04848', RH = '#f08080', RB = '#a82c2c';
  const YL = '#f8d040', YH = '#ffe888', YD = '#c89418', MG = '#8890a0', MH = '#d8dce4', MD = '#5c626e';
  const W = 144, H = 104;
  const rnd = i => { const v = Math.sin(i * 12.9898 + 7.3) * 43758.5453; return v - Math.floor(v); };
  rrect(P, x, y, W, H, 8, OUTD);
  rrect(P, x + 1, y + 1, W - 2, H - 2, 8, OUT);
  for (let i = 0; i < 90; i++) P.p(x + 3 + Math.floor(rnd(i) * (W - 6)), y + 3 + Math.floor(rnd(i + 500) * (H - 6)), (i % 3) ? OUTL : OUTD);
  rrect(P, x + 7, y + 7, W - 14, H - 14, 6, LINE);
  rrect(P, x + 8, y + 8, W - 16, H - 16, 6, INN);
  for (let i = 0; i < 200; i++) P.p(x + 11 + Math.floor(rnd(i + 90) * (W - 22)), y + 11 + Math.floor(rnd(i + 900) * (H - 22)), (i % 3) ? INNL : INND);
  const dl = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) P.p(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); };
  const shade = (sx, sy, sw) => { P.r(sx, sy, sw, 3, INND); P.hl(sx + 1, sy - 1, sw - 2, INND); };
  const postV = (px, py, ph) => { P.vl(px, py, ph, O); P.vl(px + 1, py, ph, BH); P.vl(px + 2, py, ph, BL); P.vl(px + 3, py, ph, BD); P.vl(px + 4, py, ph, O); };

  // play structure: pitched canopy over a decked platform, ladder left, chute right
  shade(x + 16, y + 71, 42); shade(x + 62, y + 72, 14);
  postV(x + 18, y + 30, 42); postV(x + 48, y + 30, 42);
  for (let i = 0; i <= 13; i++) {
    const hw = 6 + i * 3.6, lx = x + 34 - Math.round(hw / 2), rw = Math.round(hw);
    P.r(lx, y + 14 + i, rw, 1, i % 4 === 1 ? RH : RD);
    P.p(lx, y + 14 + i, O); P.p(lx + rw - 1, y + 14 + i, O);
  }
  P.r(x + 8, y + 28, 52, 3, RB); P.box(x + 8, y + 28, 52, 3, O); P.hl(x + 9, y + 28, 50, RD);
  P.vl(x + 19, y + 31, 15, O); P.vl(x + 20, y + 31, 15, MH); P.vl(x + 50, y + 31, 15, MH); P.vl(x + 51, y + 31, 15, O);
  P.r(x + 14, y + 46, 40, 6, BL); P.box(x + 14, y + 46, 40, 6, O);
  P.hl(x + 15, y + 46, 38, BH); P.hl(x + 15, y + 51, 38, BD); P.r(x + 14, y + 52, 40, 2, MD);
  P.vl(x + 9, y + 48, 25, O); P.vl(x + 10, y + 48, 25, MH); P.vl(x + 11, y + 48, 25, MG);
  P.vl(x + 15, y + 48, 25, MG); P.vl(x + 16, y + 48, 25, MH); P.vl(x + 17, y + 48, 25, O);
  for (let j = 0; j < 6; j++) { P.r(x + 11, y + 50 + j * 4, 5, 2, MH); P.hl(x + 11, y + 51 + j * 4, 5, MG); }
  for (let i = 0; i <= 26; i++) {
    const cx = x + 52 + Math.round(i * 0.6), cy = y + 48 + i;
    P.p(cx, cy, O); P.p(cx + 1, cy, MG); P.p(cx + 2, cy, YD); P.r(cx + 3, cy, 4, 1, YL); P.p(cx + 7, cy, YH); P.p(cx + 8, cy, MG); P.p(cx + 9, cy, O);
  }
  P.r(x + 64, y + 74, 12, 3, YD); P.box(x + 64, y + 74, 12, 3, O); P.hl(x + 65, y + 74, 10, YL);

  // swing set: two braced A-frames under a top rail, two seats on chains
  const aleg = (fx, ax) => { dl(fx, y + 74, ax, y + 30, O); dl(fx + 1, y + 74, ax + 1, y + 30, MH); dl(fx + 2, y + 74, ax + 2, y + 30, MG); dl(fx + 3, y + 74, ax + 3, y + 30, O); };
  shade(x + 78, y + 72, 20); shade(x + 112, y + 72, 20);
  aleg(x + 78, x + 86); aleg(x + 94, x + 86); aleg(x + 114, x + 122); aleg(x + 130, x + 122);
  dl(x + 82, y + 56, x + 92, y + 56, MG); dl(x + 118, y + 56, x + 128, y + 56, MG);
  dl(x + 82, y + 57, x + 92, y + 57, MD); dl(x + 118, y + 57, x + 128, y + 57, MD);
  P.r(x + 85, y + 27, 42, 4, MG); P.box(x + 85, y + 27, 42, 4, O); P.hl(x + 86, y + 27, 40, MH);
  [[x + 96, RD, RH, RB], [x + 110, BL, BH, BD]].forEach(([cx, seat, hi, lo]) => {
    P.vl(cx, y + 31, 33, O); P.vl(cx + 8, y + 31, 33, O);
    P.p(cx, y + 38, MH); P.p(cx + 8, y + 45, MH); P.p(cx, y + 54, MH);
    P.r(cx - 1, y + 64, 11, 3, seat); P.box(cx - 1, y + 64, 11, 3, O);
    P.hl(cx, y + 64, 9, hi); P.hl(cx, y + 66, 9, lo);
  });

  // hopscotch painted on the rubber: single, single, pair, single
  const cell = (cx, cy, cw, ch) => { P.box(cx, cy, cw, ch, LINE); P.box(cx + 1, cy + 1, cw - 2, ch - 2, '#cbe2ea'); };
  cell(x + 14, y + 80, 11, 14); cell(x + 25, y + 80, 11, 14);
  cell(x + 36, y + 80, 11, 7); cell(x + 36, y + 87, 11, 7); cell(x + 47, y + 80, 11, 14);
}
function railH(P, x, y, len) { P.hl(x, y + 1, len, '#d0d4dc'); P.hl(x, y + 2, len, '#8890a0'); for (let px = x; px < x + len; px += 8) P.r(px, y, 2, 5, '#606870'); }
function railV(P, x, y, len) { P.vl(x + 1, y, len, '#d0d4dc'); P.vl(x + 2, y, len, '#8890a0'); for (let py = y; py < y + len; py += 8) P.r(x, py, 5, 2, '#606870'); }
function pier(P, x, y, w, h) { P.r(x, y, w, h, '#c8a870'); for (let j = y + 2; j < y + h; j += 3) P.hl(x, j, w, '#a88850'); P.box(x, y, w, h, '#6c4828'); }
const BOAT = ['....oooooo....', '..ooWWWWWWoo..', '.oWWWBBWWWWWo.', 'oWWWWWWWWWWWWo', 'oBBBBBBBBBBBBo', '.oooooooooooo.'];
function boat(P, x, y) { P.r(x + 5, y - 3, 4, 4, '#d84040'); P.box(x + 5, y - 3, 4, 4, O); P.stamp(BOAT, { W: '#f4f4f0', B: '#3c88c0' }, x, y); }
function walkH(P, x, y, len) { for (let px = x + 2; px < x + len; px += 16) { P.vl(px, y + 8, 6, '#a8acb4'); P.vl(px + 1, y + 8, 6, O); } P.r(x, y, len, 8, '#e88848'); P.hl(x, y, len, O); P.hl(x, y + 7, len, O); P.hl(x, y + 2, len, '#f8b078'); P.hl(x, y + 5, len, '#c86830'); }
function walkV(P, x, y, len) { P.r(x, y, 8, len, '#e88848'); P.vl(x, y, len, O); P.vl(x + 7, y, len, O); P.vl(x + 2, y, len, '#f8b078'); P.vl(x + 5, y, len, '#c86830'); for (let py = y + 4; py < y + len; py += 16) { P.r(x - 2, py, 2, 2, '#a8acb4'); P.r(x + 8, py, 2, 2, '#a8acb4'); } }
function dome(P, cx, cy, rx, ry) { ellipse(P, cx, cy, rx, ry, '#b8b4b0', O, '#e0dcd8'); for (let y = -ry + 2; y < ry - 1; y += 3) for (let x = -rx + 2; x < rx - 1; x += 3) if ((x / rx) ** 2 + (y / ry) ** 2 < 0.7 && ((x + y) & 1)) P.p(cx + x, cy + y, '#706c68'); }
function townHeartland() {
  const W = 800, H = 384, P = new Px(W, H); grass(P, 0, 0, W, H);
  lawn(P, 220, 70, 30, 80); lawn(P, 300, 226, 70, 40); flowers(P, 302, 228, 66, 36, 6); lawn(P, 660, 320, 96, 28); flowers(P, 30, 100, 20, 50, 5); flowers(P, 520, 240, 50, 60, 6);
  const pav = new Mask(W, H); pav.rect(0, 0, W, 60); pav.rect(0, 150, W, 70); pav.rect(580, 0, 76, H); pav.rect(260, 60, 72, 100); pav.rect(380, 210, 160, 130); pav.rect(30, 300, 240, 40); pav.rect(196, 60, 24, 100); pav.draw(P, PAVE, '#a09c8c');
  roadH(P, 0, 168, W, 32); roadV(P, 600, 0, 36, H); roadV(P, 280, 42, 32, 128); cross(P, 600, 168, 36, 32); cross(P, 280, 166, 32, 4);
  zebraH(P, 600, 210, 36, 12); zebraH(P, 600, 130, 36, 12); zebraV(P, 240, 168, 12, 32); zebraV(P, 520, 168, 12, 32); zebraH(P, 280, 60, 32, 10);
  viaduct(P, 0, 8, W); train(P, 96, 10); train(P, 660, 10); mrt(P, 340, 10);
  plots(P, 662, 322, 92, 26); fenceH(P, 660, 314, 96);
  hdb(P, 60, 50, 48, 12, HB1); hdb(P, 140, 50, 48, 12, HB2); hdb(P, 660, 60, 48, 12, HB3); hdb(P, 40, 226, 96, 8, HB2); hdb(P, 160, 226, 96, 8, HB1);
  walkV(P, 204, 60, 90); walkH(P, 204, 52, 136);
  carpark(P, 440, 62, 120, 84); hawker(P, 400, 236); playground(P, 300, 236); kopitiam(P, 440, 300); cc(P, 648, 236);
  busStop(P, 340, 152); busStop(P, 470, 204); mrtExit(P, 430, 30);
  [[20, 128], [240, 122], [340, 122], [560, 122], [736, 122], [20, 210], [270, 206], [380, 206], [560, 206], [560, 300], [340, 300], [644, 130], [736, 190], [400, 320]].forEach(([x, y]) => tree(P, x, y));
  lamp(P, 232, 150); lamp(P, 232, 204); lamp(P, 420, 150); lamp(P, 588, 150); lamp(P, 648, 204); lamp(P, 588, 300); lamp(P, 588, 60); bench(P, 240, 300); bench(P, 30, 310); bin(P, 330, 204); bin(P, 456, 156); rock(P, 250, 90);
  bush(P, 270, 62); bush(P, 320, 62); bush(P, 540, 150); bush(P, 380, 316); bush(P, 640, 100);
  chr(P, 'lisa', 300, 190); chr(P, 'andy', 460, 150); chr(P, 'meiLing', 360, 64); chr(P, 'suzanne', 210, 160); chr(P, 'fauzi', 480, 274); chr(P, 'gekNeo', 700, 300); chr(P, 'sarojini', 60, 160); chr(P, 'weeKiat', 120, 302); chr(P, 'carol', 600, 240); chr(P, 'nadia', 520, 224); chr(P, 'danial', 640, 150);
  forestCol(P, -6, 40, 340); forestCol(P, 776, 40, 340); forestRow(P, 350, -8, W, [596, 640]); forestRow(P, 364, 0, W, [596, 640]);
  return P.url();
}
function townWaterfront() {
  const W = 800, H = 384, P = new Px(W, H); grass(P, 0, 0, W, H);
  lawn(P, 220, 60, 70, 70); flowers(P, 222, 62, 66, 66, 8); flowers(P, 40, 190, 30, 40, 4);
  const pav = new Mask(W, H); pav.rect(456, 0, 64, 300); pav.rect(0, 240, 520, 60); pav.rect(0, 0, W, 30); pav.rect(290, 0, 50, 240); pav.rect(330, 180, 126, 60); pav.rect(0, 140, 456, 48); pav.draw(P, PAVE, '#a09c8c');
  const sea = new Mask(W, H); sea.rect(520, 0, 280, H); sea.rect(0, 300, W, 84); sea.draw(P, WATER, '#2c68b8'); sea.rim(P, '#d8d0a8');
  roadH(P, 0, 150, 456, 28); roadV(P, 300, 0, 30, 240); cross(P, 300, 150, 30, 28); zebraV(P, 270, 150, 12, 28); zebraH(P, 300, 110, 30, 12); zebraV(P, 420, 150, 12, 28);
  railV(P, 514, 0, 300); railH(P, 0, 296, 516);
  pier(P, 520, 130, 120, 26); railH(P, 520, 126, 120); railH(P, 520, 156, 120); railV(P, 638, 126, 33); lamp(P, 560, 134); lamp(P, 620, 134);
  pier(P, 196, 300, 28, 72); railV(P, 193, 300, 72); railV(P, 224, 300, 72); railH(P, 193, 370, 34); lamp(P, 207, 330);
  boat(P, 660, 60); boat(P, 700, 220); boat(P, 100, 340); boat(P, 400, 350); rock(P, 740, 110); rock(P, 600, 260); rock(P, 40, 360); rock(P, 560, 330);
  tower(P, 30, 30, 44, 108, '#4c78b8'); tower(P, 90, 20, 52, 118, '#5c8cc8'); hdb(P, 160, 44, 48, 12, HB2);
  hawker(P, 340, 40); mart(P, 350, 96); fountain(P, 238, 78);
  dome(P, 372, 210, 34, 20); dome(P, 428, 212, 26, 16); P.r(336, 232, 116, 3, '#a09c8c');
  [0, 1, 2, 3, 4, 5, 6].forEach(i => shophouse(P, 30 + i * 24, 190, SH[i % 5])); kopitiam(P, 210, 190);
  busStop(P, 60, 136); busStop(P, 380, 180); mrtExit(P, 460, 40);
  [[10, 140], [250, 30], [270, 100], [200, 130], [464, 100], [340, 250], [420, 250], [120, 260], [700, 4], [740, 4]].forEach(([x, y]) => tree(P, x, y));
  tree(P, 464, 200, 1); tree(P, 464, 260, 4); tree(P, 10, 260, 2);
  lamp(P, 500, 20); lamp(P, 500, 80); lamp(P, 500, 150); lamp(P, 500, 220); lamp(P, 80, 276); lamp(P, 280, 276); lamp(P, 440, 276); bench(P, 490, 60); bench(P, 490, 190); bench(P, 150, 280); bench(P, 360, 280); bin(P, 476, 30); bin(P, 300, 282);
  bush(P, 470, 12); bush(P, 340, 176); bush(P, 440, 176);
  chr(P, 'lisa', 480, 240); chr(P, 'andy', 560, 136); chr(P, 'meiLing', 310, 250); chr(P, 'suzanne', 200, 316); chr(P, 'fauzi', 610, 132); chr(P, 'gekNeo', 250, 100); chr(P, 'sarojini', 400, 240); chr(P, 'weeKiat', 100, 250); chr(P, 'carol', 60, 230); chr(P, 'nadia', 130, 100); chr(P, 'danial', 420, 130);
  return P.url();
}
function townDowntown() {
  const W = 800, H = 384, P = new Px(W, H);
  const pav = new Mask(W, H); pav.rect(0, 0, W, H); pav.draw(P, PAVE, '#a09c8c');
  lawn(P, 570, 300, 190, 60); flowers(P, 572, 302, 186, 56, 8); lawn(P, 300, 20, 60, 30); lawn(P, 470, 30, 40, 60);
  roadH(P, 0, 120, W, 32); roadH(P, 0, 260, W, 32); roadV(P, 240, 0, 32, H); roadV(P, 520, 0, 32, H);
  [[240, 120], [520, 120], [240, 260], [520, 260]].forEach(([x, y]) => cross(P, x, y, 32, 32));
  zebraH(P, 240, 100, 32, 12); zebraH(P, 520, 100, 32, 12); zebraH(P, 240, 300, 32, 12); zebraH(P, 520, 300, 32, 12); zebraV(P, 210, 120, 12, 32); zebraV(P, 570, 260, 12, 32); zebraV(P, 350, 260, 12, 32); zebraV(P, 700, 120, 12, 32);
  tower(P, 30, 16, 60, 96, '#4c78b8'); tower(P, 110, 26, 48, 86, '#6c7c90'); tower(P, 300, 12, 64, 100, '#3c6ca8'); tower(P, 390, 26, 56, 86, '#78a0c8'); tower(P, 580, 20, 48, 92, '#5c8cc8'); hdb(P, 660, 10, 48, 12, HB1);
  mrtExit(P, 470, 90); busStop(P, 100, 106); busStop(P, 300, 248); busStop(P, 600, 248); busStop(P, 460, 154);
  for (let i = 0; i < 8; i++) shophouse(P, 30 + i * 24, 160, SH[i % 5]); for (let i = 0; i < 9; i++) shophouse(P, 290 + i * 24, 160, SH[(i + 2) % 5]);
  kopitiam(P, 570, 160); mart(P, 670, 160); hawker(P, 300, 306); carpark(P, 30, 304, 180, 60); playground(P, 440, 312); fountain(P, 650, 312);
  [[180, 12], [200, 60], [200, 210], [30, 210], [460, 16], [480, 210], [560, 60], [740, 60], [720, 210], [580, 320], [740, 320], [500, 210], [470, 360]].forEach(([x, y]) => tree(P, x, y));
  lamp(P, 226, 100); lamp(P, 280, 100); lamp(P, 506, 100); lamp(P, 560, 100); lamp(P, 226, 240); lamp(P, 280, 240); lamp(P, 506, 240); lamp(P, 560, 240); lamp(P, 226, 300); lamp(P, 560, 300); lamp(P, 20, 130); lamp(P, 760, 130);
  bench(P, 40, 216); bench(P, 300, 216); bench(P, 610, 340); bench(P, 700, 340); bin(P, 150, 156); bin(P, 620, 216); bin(P, 400, 154);
  bush(P, 100, 214); bush(P, 140, 214); bush(P, 380, 214); bush(P, 420, 214); bush(P, 600, 214); bush(P, 640, 214); bush(P, 600, 30); bush(P, 640, 30);
  chr(P, 'lisa', 250, 200); chr(P, 'andy', 340, 210); chr(P, 'meiLing', 170, 210); chr(P, 'suzanne', 480, 60); chr(P, 'fauzi', 600, 300); chr(P, 'gekNeo', 700, 300); chr(P, 'sarojini', 100, 210); chr(P, 'weeKiat', 380, 350); chr(P, 'carol', 460, 200); chr(P, 'nadia', 600, 200); chr(P, 'danial', 720, 130);
  return P.url();
}



export { tiny, tinyW, HK, roofPitch, glass, awning, signBoard, tableFront, potPlant, acUnit, tiledStrip, litBin, sportsHall, boutiqueShop, schoolBlock, chicken, well, clothesline, coop, TABLE_PAL, WATER, pier, railH, railV, boat, Px, Mask, O, mix, PAVE, SAND, grass, lawn, flowers, plots, flowerbed, fenceH, fenceV, pond, forestRow, forestCol, house, HP1, HP2, HP3, HP4, cc, depot, kopitiam, mart, fountain, lamp, bench, bigTree, car, sign, bin, cooler, rock, koi, stool, chess, board, bush, tree, TREE, TREE_PAL, hdb, HB1, HB2, HB3, hawker, mrtExit, busStop, shophouse, SH, roadV, roadH, zebraH, zebraV, cross, playground, playgroundLot, rrect, ScaledPx, carpark, carSprite, carAt, CHARS, charRows, charPal, charFace, chr, win, door, ellipse, octa, table, STOOL };
