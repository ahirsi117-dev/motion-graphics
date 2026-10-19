/* Paris vs Barcelona: split screen */
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
  const rise = (ctx, t, str, x, y, o) => {
    const k = ctx.at(t, o.s, o.s + 0.45, 'expoOut');
    ctx.text(ctx.X, str, x, y + (1 - k) * 60, { family: 'display', weight: 800, size: o.size, color: o.color || ctx.P.ink, align: 'center', dir: 'ltr', maxWidth: 960, alpha: k });
  };
  const cap = (ctx, t, line, y) => {
    const sp = ctx.lineSpan(line), k = ctx.at(t, sp.s - 0.05, sp.s + 0.25, 'expoOut');
    ctx.text(ctx.X, sp.text, 500, y, { family: 'body', weight: 600, size: 52, color: ctx.P.ink, align: 'center', dir: 'ltr', maxWidth: 880, alpha: k });
  };
    FX.compare(ctx, t, {
      s: ctx.lineSpan('l2').s, labels: ['Paris', 'Barcelona'],
      A: Y => { Y.fillStyle = P.bg; Y.fillRect(0, 0, ctx.W, ctx.H); ctx.text(Y, 'Paris', 270, 900, { family: 'display', weight: 800, size: 120, color: P.ink, align: 'center', dir: 'ltr' }); },
      B: Y => { Y.fillStyle = P.acc; Y.fillRect(0, 0, ctx.W, ctx.H); ctx.text(Y, 'Barca', 810, 900, { family: 'display', weight: 800, size: 120, color: P.bg, align: 'center', dir: 'ltr' }); }
    });
    cap(ctx, t, 'l2', 1400);
  }
});
