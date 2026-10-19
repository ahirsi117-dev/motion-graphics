/* s4 — الجولة الأولى: ليفربول وريال */
MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.riseUp(ctx, t, { text: 'ليفربول × فياريال', s: ctx.lineSpan('l4').s, y: 760, size: 110 });
    FX.riseUp(ctx, t, { text: 'ريال مدريد × لايبزيغ', s: ctx.lineSpan('l4').s + 0.8, y: 960, size: 110, accent: [0] });
    FX.caption(ctx, t, { line: 'l4', y: 1400, size: 62 });
  }
});
