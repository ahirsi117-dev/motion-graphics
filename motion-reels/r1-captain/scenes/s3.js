/* s3 — هالاند: العدّاد يركض لـ8 */
MOTION.scene({
  id: 's3',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.counter(ctx, t, { value: '8', s: ctx.lineSpan('l3').s, y: 880, size: 260, label: 'هالاند — أهداف آخر 6 مباريات' });
    ctx.text(X, 'خارج أرضه أمام فيلا', 540, 1260, { family: 'body', weight: 700, size: 60, color: P.mut, align: 'center', maxWidth: 900, alpha: ctx.at(t, ctx.lineSpan('l3').s + 1.2, ctx.lineSpan('l3').s + 1.6, 'expoOut') });
    FX.caption(ctx, t, { line: 'l3', y: 1400, size: 62 });
  }
});
