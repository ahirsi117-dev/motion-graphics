/* s1 — الهوك: «كابتنك هذه الجولة؟» تطيح كلمة كلمة، وعلامة الاستفهام الكبيرة بالنص */
MOTION.scene({
  id: 's1',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    FX.wordDrop(ctx, t, { text: 'كابتنك هذه الجولة؟', s: ctx.wordTime('l1', 0).s, y: 700, size: 150, accent: [2] });
    FX.caption(ctx, t, { line: 'l1', y: 1330, size: 76 });
  }
});
