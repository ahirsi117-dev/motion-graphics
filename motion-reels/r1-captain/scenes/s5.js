/* closing: who is your captain, plus deadline button */
MOTION.scene({
  id: 's5',
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
    rise(ctx, t, "Who's your captain?", 540, 700, { s: ctx.wordTime('l5', 0).s, size: 120, color: P.acc });
    FX.ctaPulse(ctx, t, { text: 'Deadline: Fri 8:30 PM KWT', s: ctx.lineSpan('l5').s + 0.6, y: 1180 });
    cap(ctx, t, 'l5', 1400);
  }
});
