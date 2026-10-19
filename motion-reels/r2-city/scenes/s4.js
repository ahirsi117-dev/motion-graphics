/* warning: But pops with a hard shake */
MOTION.scene({
  id: 's4',
  draw(t, lt, ctx) {
    const { X, P, FX } = ctx;
  const rise = (ctx, t, str, x, y, o) => {
    const k = ctx.at(t, o.s, o.s + 0.45, 'expoOut');
    ctx.text(ctx.X, str, x, y + (1 - k) * 60, { family: 'display', weight: 800, size: o.size, color: o.color || ctx.P.ink, align: 'center', dir: 'ltr', maxWidth: 960, alpha: k });
  };
  const slam = (ctx, t, str, x, y, o) => {
    const k = ctx.at(t, o.s, o.s + 0.22, 'expoOut'), X = ctx.X;
    X.save(); X.globalAlpha = Math.min(1, k * 1.6); X.translate(x, y); X.scale(1.5 - 0.5 * k, 1.5 - 0.5 * k);
    ctx.text(X, str, 0, 0, { family: 'display', weight: 900, size: o.size, color: o.color || ctx.P.ink, align: 'center', dir: 'ltr', maxWidth: 980 });
    X.restore();
  };
  const cap = (ctx, t, line, y) => {
    const sp = ctx.lineSpan(line), k = ctx.at(t, sp.s - 0.05, sp.s + 0.25, 'expoOut');
    ctx.text(ctx.X, sp.text, 500, y, { family: 'body', weight: 600, size: 52, color: ctx.P.ink, align: 'center', dir: 'ltr', maxWidth: 880, alpha: k });
  };
  const stadium = (ctx, t) => {
    const { X, P } = ctx, pulse = ctx.beatPulse(t, 6);
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const sway = 0.15 * Math.sin(t * 0.8);
    X.save(); X.globalAlpha = 0.05 + 0.03 * pulse; X.fillStyle = P.acc;
    X.beginPath(); X.moveTo(0, 0); X.lineTo(330 + 300 * sway, 1920); X.lineTo(760 + 300 * sway, 1920); X.fill();
    X.beginPath(); X.moveTo(1080, 0); X.lineTo(750 - 300 * sway, 1920); X.lineTo(320 - 300 * sway, 1920); X.fill();
    X.restore();
    X.save(); X.globalAlpha = 0.16; X.strokeStyle = P.mut; X.lineWidth = 4;
    X.beginPath(); X.arc(540, 1000, 300, 0, 6.2832); X.stroke();
    X.fillStyle = P.mut; X.fillRect(0, 998, 1080, 4); X.restore();
    X.save(); X.globalAlpha = 0.06 + 0.08 * pulse; X.fillStyle = P.acc;
    X.beginPath(); X.arc(540, 1000, 320, 0, 6.2832); X.fill(); X.restore();
  };
  const flash = (ctx, t, s) => {
    if (t < s || t > s + 0.3) return;
    const X = ctx.X; X.save(); X.globalAlpha = 0.55 * (1 - (t - s) / 0.3); X.fillStyle = '#FFFFFF'; X.fillRect(0, 0, ctx.W, ctx.H); X.restore();
  };
    const L = ctx.lineSpan('l4');
    const warn = () => {
      stadium(ctx, t);
      FX.rubberPop(ctx, t, { text: 'But…', s: L.s, y: 760, size: 240, color: P.clay });
      rise(ctx, t, 'Haaland knock · Semenyo limp', 540, 1080, { s: L.s + 0.9, size: 52, color: P.ink });
      cap(ctx, t, 'l4', 1410);
    };
    FX.shake(ctx, t, { s: L.s, mag: 30, fadeOut: 0.8, draw: warn });
    flash(ctx, t, L.s);
  }
});
