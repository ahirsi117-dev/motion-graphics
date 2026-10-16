// render.mjs <work> [--preview 2.0,8.4,...] [--cover] [--force] [--jobs 4]
// Draws every frame with assets/page.html in headless Chromium → <work>/out/%05d.jpg
//   --preview t,t,…  renders only those times → <work>/prev/ + one contact sheet <work>/sheet.jpg (3×2)
//   --cover          renders <work>/cover.jpg from cover.json
// Frames inside a protected range are copied untouched from vfr/ (encode.py splices the source there anyway).
import fs from 'fs'; import path from 'path'; import os from 'os'; import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const puppeteer = require(path.join(HERE, 'node_modules', 'puppeteer-core'));
const W = path.resolve(process.argv[2]); const A = process.argv.slice(3);
const opt = k => { const i = A.indexOf(k); return i < 0 ? null : (A[i + 1] && !A[i + 1].startsWith('--') ? A[i + 1] : true); };
const J = f => JSON.parse(fs.readFileSync(path.join(W, f), 'utf8'));
const has = f => fs.existsSync(path.join(W, f));
const FPS = 30;

const chrome = process.env.CHROME_PATH || (fs.existsSync(path.join(os.homedir(), '.cache/talking-head-reel/chrome_path'))
  ? fs.readFileSync(path.join(os.homedir(), '.cache/talking-head-reel/chrome_path'), 'utf8').trim() : null);
if (!chrome) { console.error('❌ no browser — run setup.sh'); process.exit(2); }

fs.copyFileSync(path.join(HERE, '..', 'assets', 'page.html'), path.join(W, 'page.html'));
const theme = has('theme.json') ? J('theme.json') : {};
const fdir = path.join(os.homedir(), '.cache/talking-head-reel/fonts', theme.font || 'Tajawal');
const fonts = fs.existsSync(fdir) ? fs.readdirSync(fdir).filter(f => /^w\d+\.ttf$/.test(f)).map(f => ({ url: 'file://' + path.join(fdir, f), w: f.slice(1, -4) })) : [];
const data = { caps: J('caps.json'), scenes: has('scenes.json') ? J('scenes.json') : {}, theme, fonts,
  cover: opt('--cover') ? J('cover.json') : null, extra: has('custom.js') ? ['custom.js'] : [] };
const prot = data.scenes.protect || [];
const nFrames = fs.readdirSync(path.join(W, 'vfr')).filter(f => f.endsWith('.jpg')).length;
const fr = i => path.join(W, 'vfr', String(i + 1).padStart(5, '0') + '.jpg');

const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-web-security', '--hide-scrollbars'] });
async function newPage() {
  const p = await browser.newPage(); await p.setViewport({ width: 1080, height: 1920 });
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) console.log('[page]', m.text()); });
  p.on('pageerror', e => console.log('[page error]', e.message));
  await p.goto('file://' + path.join(W, 'page.html')); await p.evaluate(d => window.init(d), data); return p;
}
async function frame(p, t, i, out) {
  await p.evaluate(async (src, t) => { await window.setFrame(src); window.draw(t); }, 'file://' + fr(i), t);
  const b64 = (await p.evaluate(() => window.shot(0.93))).split(',')[1]; fs.writeFileSync(out, Buffer.from(b64, 'base64'));
}

if (opt('--cover')) {
  const p = await newPage(); const t = data.cover.t ?? 0; await frame(p, t, Math.min(nFrames - 1, Math.round(t * FPS)), path.join(W, 'cover.jpg'));
  console.log('✅ cover.jpg');
} else if (opt('--preview')) {
  const ts = String(opt('--preview')).split(',').map(Number); fs.mkdirSync(path.join(W, 'prev'), { recursive: true });
  const p = await newPage(); const outs = [];
  for (const t of ts) { const o = path.join(W, 'prev', `t${t.toFixed(2)}.jpg`); await frame(p, t, Math.min(nFrames - 1, Math.round(t * FPS)), o); outs.push(o); }
  const args = []; outs.forEach(o => args.push('-i', o));
  const n = outs.length, cols = Math.min(3, n), rows = Math.ceil(n / cols);
  const lab = outs.map((_, k) => `[${k}:v]scale=360:640,drawbox=x=0:y=0:w=118:h=40:color=black@0.7:t=fill,drawtext=text='${ts[k].toFixed(1)}s':x=10:y=6:fontsize=28:fontcolor=white[v${k}]`).join(';');
  const layout = outs.map((_, k) => `${(k % cols) * 360}_${Math.floor(k / cols) * 640}`).join('|');
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args, '-filter_complex', `${lab};${n > 1 ? outs.map((_, k) => `[v${k}]`).join('') + `xstack=inputs=${n}:layout=${layout}:fill=black` : '[v0]null'}`, path.join(W, 'sheet.jpg')]);
  console.log(`✅ sheet.jpg (${n} frames)`);
} else {
  const OUT = path.join(W, 'out'); fs.mkdirSync(OUT, { recursive: true });
  const jobs = +(opt('--jobs') || Math.max(2, Math.min(8, os.cpus().length - 1))); const force = !!opt('--force');
  const todo = []; for (let i = 0; i < nFrames; i++) { const o = path.join(OUT, String(i + 1).padStart(5, '0') + '.jpg'); if (force || !fs.existsSync(o)) todo.push([i, o]); }
  let done = 0, next = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: jobs }, async () => { const p = await newPage();
    while (next < todo.length) { const [i, o] = todo[next++]; const t = i / FPS;
      if (prot.some(([a, b]) => t >= a && t < b)) fs.copyFileSync(fr(i), o);
      else { for (let k = 0; ; k++) { try { await frame(p, t, i, o); break; } catch (e) { if (k >= 2) { console.log(`⚠️ frame ${i + 1} failed: ${e.message}`); break; } } } }
      if (++done % 150 === 0) console.log(`frame ${done}/${todo.length}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`); } }));
  const left = Array.from({ length: nFrames }, (_, i) => i).filter(i => !fs.existsSync(path.join(OUT, String(i + 1).padStart(5, '0') + '.jpg')));
  console.log(left.length ? `⚠️ ${left.length} frames still missing — run again` : `✅ ${nFrames} frames in out/ (${todo.length} drawn now)`);
}
await browser.close();
