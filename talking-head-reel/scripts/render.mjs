// render.mjs <work> [--storyboard] [--preview 2.0,8.4,...] [--cover] [--force] [--jobs 4]
// Draws every frame with assets/page.html in headless Chromium → <work>/out/%05d.jpg
//   --preview t,t,…  renders only those times → <work>/prev/ + one contact sheet <work>/sheet.jpg (3×2)
//   --cover          renders <work>/cover.jpg from cover.json
//   --storyboard     one real frame per scene + what is said, layout, graphic, transition → <work>/storyboard.png (for user approval)
// Frames inside a protected range are copied untouched from vfr/ (encode.py splices the source there anyway).
import fs from 'fs'; import path from 'path'; import os from 'os'; import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
let puppeteer; try { puppeteer = require(path.join(os.homedir(), '.cache/talking-head-reel/node/node_modules/puppeteer-core')); }
catch { console.error('❌ puppeteer-core missing — run setup.sh first'); process.exit(2); }
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
// scene times may be word refs ("6:3" / "6:3e") — resolve them here too, to pick b-roll frames
const refs = data.caps.refs || {};
const RT = v => { if (typeof v === 'number') return v; const m = /^(\d+):(\d+)(e?)$/i.exec(String(v)); if (!m) return +v || 0; const r = refs[m[1] + ':' + m[2]]; return r ? (m[3] ? r[1] : r[0]) : 0; };
const SC = (data.scenes.scenes || []).map(x => ({ ...x, s: RT(x.s), e: RT(x.e) })).sort((a, b) => a.s - b.s);
const bcount = {};
const bframe = (sc, t) => { const n = sc.broll && sc.broll.name; if (!n) return null; const d = path.join(W, 'broll', n);
  if (bcount[n] == null) bcount[n] = fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.jpg')).length : 0;
  if (!bcount[n]) { console.log(`⚠️ b-roll "${n}" has no frames — run broll.sh`); return null; }
  const k = Math.max(0, Math.min(bcount[n] - 1, Math.floor((t - sc.s + (sc.broll.from || 0)) * FPS)));
  return 'file://' + path.join(d, String(k + 1).padStart(5, '0') + '.jpg'); };
const brollAt = t => { const i = SC.findIndex(x => t >= x.s && t < x.e); if (i < 0) return {};
  return { cur: SC[i].mode === 'broll' ? bframe(SC[i], t) : null, prev: i > 0 && SC[i - 1].mode === 'broll' && t < SC[i].s + 0.6 ? bframe(SC[i - 1], t) : null }; };

const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-web-security', '--hide-scrollbars'] });
async function newPage() {
  const p = await browser.newPage(); await p.setViewport({ width: 1080, height: 1920 });
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) console.log('[page]', m.text()); });
  p.on('pageerror', e => console.log('[page error]', e.message));
  await p.goto('file://' + path.join(W, 'page.html')); await p.evaluate(d => window.init(d), data); return p;
}
async function frame(p, t, i, out) {
  await p.evaluate(async (src, b, t) => { await window.setFrame(src, b); window.draw(t); }, 'file://' + fr(i), brollAt(t), t);
  const b64 = (await p.evaluate(() => window.shot(0.93))).split(',')[1]; fs.writeFileSync(out, Buffer.from(b64, 'base64'));
}

if (opt('--storyboard')) {
  const MODE = { full: 'وجهه ملء الشاشة', down: 'رسمة فوق + وجهه تحت', lower: 'رسمة كبيرة + وجهه صغير', off: 'بدون وجه (صوته يكمّل)', broll: 'بي-رول ملء الشاشة' };
  const TIN = { whip: 'سحب سريع (whip)', dissolve: 'ذوبان (dissolve)', zoom: 'زوم', flash: 'فلاش', cut: 'قطع مباشر', morph: 'تحوّل ناعم' };
  const fmt = x => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
  const words = (a, b) => data.caps.cards.flatMap(c => c.w).filter(w => w.s >= a && w.s < b).map(w => w.t).join(' ');
  const PN = { title: 'عنوان', stamp: 'ختم', counter: 'عدّاد', chips: 'قائمة', steps: 'خطوات بأسهم', people: 'شبكة أشخاص', image: 'صورة', pills: 'تاقات', bignum: 'رقم ضخم' };
  // split scenes around protected ranges so a verse / hadith gets its own card
  const dur = nFrames / FPS, SB = [];
  for (const sc of SC) { let a = sc.s; const e = Math.min(sc.e, dur);
    for (const [pa, pb] of [...prot].sort((x, y) => x[0] - y[0])) { if (pb <= a || pa >= e) continue;
      if (pa > a) SB.push({ ...sc, s: a, e: pa }); SB.push({ s: Math.max(a, pa), e: Math.min(e, pb), prot: true }); a = Math.min(e, pb); }
    if (e - a > 0.05) SB.push({ ...sc, s: a, e }); }
  const dir = path.join(W, 'sb'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); const p = await newPage(); const cards = [];
  for (const [k, sc] of SB.entries()) {
    const isP = !!sc.prot, end = sc.e;
    const pan = sc.panel || (sc.panels || [])[0], at = pan && (pan.at ?? (pan.items && pan.items[pan.items.length - 1].at));
    let t = at != null ? RT(at) + 0.7 : (sc.s + end) / 2; t = Math.max(sc.s + 0.5, Math.min(end - 0.1, t));
    const img = path.join(dir, `${String(k + 1).padStart(2, '0')}.jpg`); await frame(p, t, Math.min(nFrames - 1, Math.round(t * FPS)), img);
    const prev = k > 0 ? SB[k - 1] : null, tin = sc.tin || (prev && (sc.mode === 'broll' || prev.mode === 'broll') ? 'cut' : 'morph');
    cards.push({ n: k + 1, img, time: `${fmt(sc.s)} – ${fmt(end)}`, mode: isP ? '🔒 آية / حديث — من الأصل بدون أي إضافة' : (MODE[sc.mode || 'full'] || sc.mode),
      tin: k ? TIN[tin] || tin : 'البداية', say: isP ? '' : words(sc.s, sc.e), note: isP ? '' : sc.note || (pan ? PN[pan.type] || pan.type : ''), prot: isP });
  }
  const esc = x => String(x).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const ff = fonts.map(f => `@font-face{font-family:"${theme.font || 'Tajawal'}";src:url("${f.url}");font-weight:${f.w};}`).join('');
  const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>${ff}
body{margin:0;background:#111;color:#eee;font-family:"${theme.font || 'Tajawal'}",sans-serif;padding:28px;width:1144px}
h1{margin:0 0 6px;font-size:40px} .sub{color:#aaa;font-size:22px;margin-bottom:22px}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:22px} .c{background:#1c1c1c;border-radius:18px;overflow:hidden;border:2px solid #2a2a2a}
.c.p{border-color:${theme.acc || '#C8372D'}} img{width:100%;display:block} .b{padding:14px 16px 18px}
.n{font-size:26px;font-weight:900} .t{color:#999;font-size:18px;direction:ltr;text-align:right} .m{color:${theme.acc || '#C8372D'};font-weight:800;font-size:20px;margin-top:6px}
.k{font-size:19px;color:#ccc;margin-top:4px} .s{font-size:21px;margin-top:10px;line-height:1.5} .o{font-size:19px;color:#bbb;margin-top:8px}
</style></head><body><h1>ستوري بورد — ${SB.length} مشهد</h1><div class="sub">راجع كل مشهد. وافق، أو قل رقم المشهد وشنو تبي يتغيّر.</div><div class="g">${cards.map(c => `
<div class="c${c.prot ? ' p' : ''}"><img src="file://${c.img}"><div class="b"><div class="n">#${c.n}</div><div class="t">${c.time}</div>
<div class="m">${esc(c.mode)}</div><div class="k">الانتقال: ${esc(c.tin)}</div>${c.say ? `<div class="s">«${esc(c.say)}»</div>` : ''}${c.note ? `<div class="o">🎬 ${esc(c.note)}</div>` : ''}</div></div>`).join('')}
</div></body></html>`;
  fs.writeFileSync(path.join(W, 'storyboard.html'), html);
  const sp = await browser.newPage(); await sp.setViewport({ width: 1200, height: 1000 }); await sp.goto('file://' + path.join(W, 'storyboard.html'));
  await sp.evaluate(() => document.fonts.ready); await sp.screenshot({ path: path.join(W, 'storyboard.png'), fullPage: true });
  fs.writeFileSync(path.join(W, 'storyboard.md'), cards.map(c => `${c.n}. ${c.time} — ${c.mode} — ${c.tin}${c.say ? `\n   «${c.say}»` : ''}${c.note ? `\n   🎬 ${c.note}` : ''}`).join('\n'));
  console.log(`✅ storyboard.png + storyboard.md (${SB.length} scenes)`);
} else if (opt('--cover')) {
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
