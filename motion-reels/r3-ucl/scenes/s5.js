/* s5 — الختام: «توقعك؟» + زر التعليق */
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.wordDrop(ctx, t, { text: 'توقعك؟', s: ctx.wordTime('l5', 0).s, y: 760, size: 170, accent: [0] });
    FX.ctaPulse(ctx, t, { text: 'اكتب توقعك بالتعليقات', s: ctx.lineSpan('l5').s + 0.6, y: 1180 });
    FX.caption(ctx, t, { line: 'l5', y: 1400, size: 62 });
  }
});
