/* s5 — السؤال: «منو يوقفهم؟» + زر التصويت بالكومنت */
MOTION.scene({
  id: 's5',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.wordDrop(ctx, t, { text: 'منو يوقفهم؟', s: ctx.wordTime('l5', 2).s, y: 760, size: 170, accent: [2] });
    FX.ctaPulse(ctx, t, { text: 'اكتب توقعك بالكومنت', s: ctx.lineSpan('l5').s + 0.6, y: 1180 });
    FX.caption(ctx, t, { line: 'l5', x: 500, y: 1400, size: 76 });
  }
});
