# Scenes and panels

A scene is `{s, e, mode, panel | panels, nocap?}`. `s`, `e` and every `at` accept seconds or word refs (`"6:3"` start, `"6:3e"` end — printed by `captions.py`).

Modes and the graphic box the panel is drawn in:

| mode | speaker | graphic box | caption |
|---|---|---|---|
| `full` | fills the screen | (only small overlays) | `theme.capY` (1460) |
| `down` | wide card from y 760 | x 90–990 · y 170–560 | ~665, above the card |
| `lower` | small card at the bottom | x 70–1010 · y 150–1170 | ~1255, above the card |
| `off` | hidden (voice continues) | x 70–1010 · y 150–1550 | ~1460 |

Layout changes animate over 0.4 s. A panel fades in after the card has moved and fades out 0.2 s before the scene ends. Override the box per panel with `"box":{x,y,w,h}`.

## Built-in panels

| type | fields | use it when the speaker… |
|---|---|---|
| `title` | `text, at, sub?, subAt?, size?` | names the topic / a strong phrase (headline with underline drawing in) |
| `stamp` | `text, at, before?, size?` | announces a decision, a ban, a verdict («قرار», «ممنوع», «رسمي») — `before` shows a word until the stamp lands |
| `counter` | `to, at, dur?, prefix?, suffix?, label?, labelAt?, size?` | says a number — `at` = the moment the number is SAID; it counts up and slams there |
| `chips` | `title?, titleAt?, items:[{t, at, strike?, hot?}], size?` | lists things (right→left); `strike` crosses one out ("free of religion, sect, politics") |
| `steps` | `title?, titleAt?, items:[{t, at, hot?}], loop?, loopAt?` | describes a process or a repeating pattern (A ← B ← C, dashed loop back) |
| `people` | `total?, hot, at, number?, label?, labelAt?` | says a share of people («90% مسلمين», «4 من كل 10») — use mode `lower` |
| `image` | `src, at?, caption?` | shows a screenshot, logo, b-roll still (file in `<work>`, kept at its own aspect ratio) |

Several panels in one scene: `"panels":[{…},{…}]` (keep one hero, at most one support).

## Custom panels

For anything the built-ins can't say, write `<work>/custom.js` — it is loaded automatically. A panel is a function `(t, p, box, scene)` drawing on the canvas `X` (1080×1920); use it as `{"type":"myPanel", ...}`.

Helpers available: `T(ref)` time of a word, `pr(t,a,b)` 0→1 progress, `ease`, `eio`, `lerp`, `cl`, `text(str,x,y,size,color,weight,align)`, `tw(str,size,weight)` width, `rr(x,y,w,h,r)` rounded-rect path, `chip(str,cx,cy,k,fill,ink,size)`, `strike(cx,cy,w,k)`, `hex(color,alpha)`, theme in `TH` (`TH.acc`, `TH.ink`, `TH.bg`, `TH.mut`, `TH.onAcc`, `TH.font`).

```js
// custom.js — a balance tipping toward the side the speaker names
window.balance = function (t, p, b) {
  const k = ease(pr(t, T(p.at), T(p.at) + 0.6)), ang = -0.18 * k, cx = 540, cy = b.y + b.h * 0.45;
  X.save(); X.translate(cx, cy); X.rotate(ang); X.fillStyle = TH.ink; X.fillRect(-300, -6, 600, 12);
  text(p.left, -230, -50, 46, TH.ink, 800); text(p.right, 230, -50, 46, TH.acc, 900); X.restore();
};
```

## Picking the right picture for a sentence

Brainstorm 3 ideas per graphic sentence and keep the one that shows the *meaning*:

| the speaker says | shape |
|---|---|
| a part of a whole («90% of people») | people grid, a ring filling, a bar splitting |
| a number / price / date | counter that lands on the spoken word |
| a law, a decision, a ban | stamp, a document card, a crossed-out item |
| a list | chips appearing one per word, crossing out what's excluded |
| a cause → effect, a cycle, a pattern | steps with arrows, a loop back |
| a comparison | two columns, a balance, before/after |
| a place | a simple map pin, a flag chip |
| a quote or the key line | `title` with the accent word |

Rules: one idea per scene; nothing smaller than 38 px; no glow, bounce, gradient text, or letter-by-letter typing (it breaks Arabic joining — animate whole words); every element holds ≥ 1.2 s after it completes; no text inside Instagram's button zones (y > 1500, right edge x > 950 between y 1100–1750).
