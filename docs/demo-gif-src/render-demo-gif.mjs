// Renders docs/demo.gif from captured terminal text. Deterministic: same captures + same font => same GIF.
// Usage: node render-demo-gif.mjs [--captures <dir>] [--out <file>]   (see README.md)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const capDir = path.resolve(arg('--captures', path.join(here, 'capture')));
const outFile = path.resolve(arg('--out', path.join(here, '..', 'demo.gif')));
const fontPath = process.env.A11Y_GIF_FONT || 'C:/Windows/Fonts/CascadiaMono.ttf';
if (!existsSync(fontPath)) throw new Error(`monospace font not found: ${fontPath} (set A11Y_GIF_FONT)`);
GlobalFonts.registerFromPath(fontPath, 'DemoMono');

const W = 1200, H = 680, TITLE = 34, PADX = 18, FS = 15, LH = 20, FPS = 10;
const BG = '#0d1117', BAR = '#161b22', FG = '#c9d1d9', DIM = '#8b949e', GREEN = '#3fb950', WHITE = '#f0f6fc';
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.font = `${FS}px DemoMono`;
const CW = ctx.measureText('M').width;
const COLS = Math.floor((W - 2 * PADX) / CW);
const ROWS = Math.floor((H - TITLE - 16) / LH);

const read = (f) => readFileSync(path.join(capDir, f), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
const wrap = (text, kind) => text.split('\n').flatMap((line) => {
  const cps = [...line];
  if (cps.length <= COLS) return [{ t: line, kind }];
  const rows = [];
  for (let i = 0; i < cps.length; i += COLS) rows.push({ t: cps.slice(i, i + COLS).join(''), kind });
  return rows;
});
const PROMPT = '$ ';
const cmds = {
  audit: 'a11y-loop audit --file demo/before/index.html',
  q1: 'a11y-loop audit --file demo/before/index.html --out before.json --quiet',
  q2: 'a11y-loop audit --file demo/after/index.html --out after.json --quiet',
  diff: 'a11y-loop diff --before before.json --after after.json',
};

// A frame is { rows: [...visible rows, newest last], typing: string|null }
const frames = [];
const hold = (state, n) => { for (let i = 0; i < n; i++) frames.push(state); };
function type(rows, cmd, perFrame = 4) {
  for (let n = 0; n <= cmd.length; n += perFrame) frames.push({ rows: rows.slice(), typing: cmd.slice(0, Math.min(n, cmd.length)) });
  hold({ rows: rows.slice(), typing: cmd }, 4);
  return [...rows, ...wrap(PROMPT + cmd, 'cmd')];
}
function reveal(rows, out, { slow, hold: tail }) {
  const all = [...rows, ...out];
  let n = rows.length, speed = 2;
  const first = rows.length + Math.min(out.length, ROWS - rows.length - 1);
  while (n < all.length) {
    n = Math.min(all.length, n + Math.round(speed));
    frames.push({ rows: all.slice(0, n), typing: null });
    if (n >= first) { if (n === first || !slow.done) { hold({ rows: all.slice(0, n), typing: null }, slow.frames); slow.done = true; } speed = Math.min(speed * 1.5, 60); }
  }
  hold({ rows: all, typing: null }, tail);
  return all;
}

// Scene 1: the human-readable audit.
let rows = [];
rows = type(rows, cmds.audit);
reveal(rows, wrap(read('audit.txt'), 'out'), { slow: { frames: 14, done: false }, hold: 25 });

// Scene 2: quiet runs, then the diff.
rows = [];
rows = type(rows, cmds.q1);
rows = [...rows, ...wrap(read('q1.txt'), 'out')]; hold({ rows, typing: null }, 8);
rows = type(rows, cmds.q2);
rows = [...rows, ...wrap(read('q2.txt'), 'out')]; hold({ rows, typing: null }, 8);
rows = type(rows, cmds.diff);
reveal(rows, wrap(read('diff.txt'), 'out'), { slow: { frames: 10, done: false }, hold: 40 });

// ---- drawing
function draw(f, blink) {
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = BAR; ctx.fillRect(0, 0, W, TITLE);
  [['#ff5f56', 20], ['#ffbd2e', 40], ['#27c93f', 60]].forEach(([c, x]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, TITLE / 2, 6, 0, 7); ctx.fill(); });
  ctx.fillStyle = DIM; ctx.font = `13px DemoMono`; ctx.textBaseline = 'middle';
  ctx.fillText('a11y-loop 0.3.2 \u00b7 demo/before \u2192 demo/after', W / 2 - 180, TITLE / 2);
  ctx.font = `${FS}px DemoMono`; ctx.textBaseline = 'alphabetic';
  const vis = f.rows.slice(-(ROWS - (f.typing !== null ? 1 : 0)));
  const all = f.typing !== null ? [...vis, { t: PROMPT + f.typing + (blink ? '\u2588' : ' '), kind: 'typing' }] : vis;
  all.forEach((r, i) => {
    const y = TITLE + 12 + (i + 1) * LH - 5;
    if (r.kind === 'cmd' || r.kind === 'typing') {
      ctx.fillStyle = GREEN; ctx.fillText(PROMPT, PADX, y);
      ctx.fillStyle = WHITE; ctx.fillText(r.t.slice(2), PADX + 2 * CW, y);
    } else if (r.t.startsWith('Converged:')) {
      ctx.fillStyle = GREEN; ctx.font = `bold ${FS}px DemoMono`; ctx.fillText(r.t, PADX, y); ctx.font = `${FS}px DemoMono`;
    } else if (r.t.startsWith('FIXED ')) {
      ctx.fillStyle = GREEN; ctx.fillText('FIXED', PADX, y);
      ctx.fillStyle = FG; ctx.fillText(r.t.slice(5), PADX + 5 * CW, y);
    } else {
      ctx.fillStyle = FG; ctx.fillText(r.t, PADX, y);
    }
  });
  return ctx.getImageData(0, 0, W, H).data;
}

// ---- encode: one global palette, unchanged pixels become transparent
const sample = [frames[Math.floor(frames.length * 0.12)], frames[frames.length - 1], frames[Math.floor(frames.length * 0.5)]];
const palettePix = Buffer.concat(sample.map((f) => Buffer.from(draw(f, true))));
const palette = quantize(palettePix, 63, { format: 'rgb565' });
const TI = palette.length; palette.push([0, 0, 0]);
const gif = GIFEncoder();
let prev = null, pendingDelay = 0, pending = null;
const flush = () => { if (pending) gif.writeFrame(pending.idx, W, H, { palette, delay: pendingDelay, transparent: pending.t, transparentIndex: TI, dispose: 1 }); };
let nFrames = 0;
frames.forEach((f, i) => {
  const rgba = draw(f, f.typing !== null && Math.floor(i / 3) % 2 === 0);
  const idx = applyPalette(rgba, palette.slice(0, TI), 'rgb565');
  if (prev && Buffer.compare(idx, prev) === 0) { pendingDelay += 1000 / FPS; return; }
  flush();
  let out = idx, t = false;
  if (prev) { out = Uint8Array.from(idx); for (let p = 0; p < out.length; p++) if (out[p] === prev[p]) out[p] = TI; t = true; }
  pending = { idx: out, t }; pendingDelay = 1000 / FPS; prev = idx; nFrames++;
});
flush();
gif.finish();
writeFileSync(outFile, gif.bytes());
console.log(`wrote ${outFile}: ${W}x${H}, ${nFrames} frames (${frames.length} ticks, ${(frames.length / FPS).toFixed(1)} s), ${COLS}x${ROWS} cells`);
if (process.env.A11Y_GIF_PNG) {
  for (const t of process.env.A11Y_GIF_PNG.split(',').map(Number)) { draw(frames[Math.min(t, frames.length - 1)], true); writeFileSync(`${outFile}.${t}.png`, canvas.toBuffer('image/png')); }
}
