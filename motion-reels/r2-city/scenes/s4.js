/* s4 — التحذير: «بس…» تفرقع باللون الأحمر، والإصابات بالسطر */
MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.rubberPop(ctx, t, { text: 'بس…', s: ctx.lineSpan('l4').s, y: 760, size: 260, color: P.clay });
    ctx.text(X, 'هالاند متأثر بضربة · سيمينيو يعرج', 540, 1080, { family: 'body', weight: 700, size: 58, color: P.ink, align: 'center', maxWidth: 900, alpha: ctx.at(t, ctx.lineSpan('l4').s + 0.9, ctx.lineSpan('l4').s + 1.3, 'expoOut') });
    FX.caption(ctx, t, { line: 'l4', x: 500, y: 1400, size: 62 });
  }
});
