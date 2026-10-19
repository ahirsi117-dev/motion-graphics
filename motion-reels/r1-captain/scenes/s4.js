/* s4 — جواو بيدرو: الملكية 72% والجولة الماضية بلا هدف */
MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.ringStat(ctx, t, { value: 72, s: ctx.lineSpan('l4').s, y: 760, r: 230, color: P.clay, label: 'جواو بيدرو — نسبة الملكية' });
    ctx.text(X, 'ما سجّل في الجولة الماضية', 540, 1290, { family: 'body', weight: 700, size: 60, color: P.clay, align: 'center', maxWidth: 900, alpha: ctx.at(t, ctx.lineSpan('l4').s + 1.2, ctx.lineSpan('l4').s + 1.6, 'expoOut') });
    FX.caption(ctx, t, { line: 'l4', x: 500, y: 1400, size: 62 });
  }
});
