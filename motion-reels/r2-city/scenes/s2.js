/* s2 — الترتيب: سيتي فوق، والأعمدة تكبر */
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.barChart(ctx, t, { data: [['مان سيتي', 21], ['آرسنال', 18], ['برايتون', 16]], hi: 0, s: ctx.lineSpan('l2').s, y0: 1300, h: 760 });
    FX.caption(ctx, t, { line: 'l2', y: 1400, size: 62 });
  }
});
