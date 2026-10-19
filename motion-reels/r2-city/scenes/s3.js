/* s3 — هالاند: 8 أهداف */
MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.counter(ctx, t, { value: '8', s: ctx.lineSpan('l3').s, y: 880, size: 260, label: 'هالاند — أهداف هذا الموسم' });
    FX.caption(ctx, t, { line: 'l3', y: 1400, size: 62 });
  }
});
