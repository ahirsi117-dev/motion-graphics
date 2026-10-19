/* s2 — باريس × برشلونة: الشاشة تنقسم بين الفريقين */
MOTION.scene({
  id: 's2',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
    const s = ctx.lineSpan('l2').s;
    FX.compare(ctx, t, {
      s, labels: ['باريس', 'برشلونة'],
      A: Y => { Y.fillStyle = P.bg; Y.fillRect(0, 0, ctx.W, ctx.H); ctx.text(Y, 'باريس', 270, 900, { family: 'display', size: 150, color: P.ink, align: 'center' }); },
      B: Y => { Y.fillStyle = P.acc; Y.fillRect(0, 0, ctx.W, ctx.H); ctx.text(Y, 'برشلونة', 810, 900, { family: 'display', size: 150, color: P.bg, align: 'center' }); }
    });
    FX.caption(ctx, t, { line: 'l2', x: 500, y: 1400, size: 60 });
  }
});
