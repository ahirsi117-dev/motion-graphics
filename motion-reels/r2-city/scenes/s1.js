/* s1 — الهوك: العدّاد يوصل 7 انتصارات */
MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.counter(ctx, t, { value: '7', s: ctx.lineSpan('l1').s, y: 880, size: 280, plus: false, label: 'انتصارات من 7 مباريات' });
    FX.caption(ctx, t, { line: 'l1', y: 1400, size: 76 });
  }
});
