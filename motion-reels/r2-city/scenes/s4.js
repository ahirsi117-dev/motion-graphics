/* warning: But pops in red, injury line below */
MOTION.scene({
  id: 's4',
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
    FX.rubberPop(ctx, t, { text: 'But…', s: ctx.lineSpan('l4').s, y: 760, size: 240, color: P.clay });
    rise(ctx, t, 'Haaland knock · Semenyo limp', 540, 1080, { s: ctx.lineSpan('l4').s + 0.9, size: 52, color: P.ink });
    cap(ctx, t, 'l4', 1400);
  }
});
