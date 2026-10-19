/* s5 — الختام: «فمن كابتنك؟» + زر الديدلاين */
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.wordDrop(ctx, t, { text: 'فمن كابتنك؟', s: ctx.wordTime('l5', 0).s, y: 760, size: 170, accent: [1] });
    FX.ctaPulse(ctx, t, { text: 'الديدلاين: الجمعة 8:30 مساءً', s: ctx.lineSpan('l5').s + 0.6, y: 1180 });
    FX.caption(ctx, t, { line: 'l5', y: 1400, size: 76 });
  }
});
