/* s3 — بايرن × آرسنال */
MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.riseUp(ctx, t, { text: 'بايرن × آرسنال', s: ctx.lineSpan('l3').s, y: 860, size: 130, accent: [2] });
    FX.caption(ctx, t, { line: 'l3', y: 1400, size: 62 });
  }
});
