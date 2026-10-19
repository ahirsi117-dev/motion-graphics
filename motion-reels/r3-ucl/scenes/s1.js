/* s1 — الهوك: «أقوى ليلتين» تطيح كلمة كلمة */
MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.wordDrop(ctx, t, { text: 'أقوى ليلتين بالأسبوع', s: ctx.wordTime('l1', 0).s, y: 760, size: 150, accent: [0] });
    FX.caption(ctx, t, { line: 'l1', y: 1400, size: 70 });
  }
});
