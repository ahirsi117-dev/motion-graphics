/* s2 — نيتو: حلقة الملكية تتعبّى لـ2% */
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.ringStat(ctx, t, { value: 2, s: ctx.lineSpan('l2').s, y: 760, r: 230, label: 'نيتو — نسبة الملكية' });
    ctx.text(X, '15 نقطة الجولة الماضية', 540, 1290, { family: 'body', weight: 700, size: 60, color: P.acc, align: 'center', maxWidth: 900, alpha: ctx.at(t, ctx.lineSpan('l2').s + 1, ctx.lineSpan('l2').s + 1.4, 'expoOut') });
    FX.caption(ctx, t, { line: 'l2', y: 1400, size: 62 });
  }
});
