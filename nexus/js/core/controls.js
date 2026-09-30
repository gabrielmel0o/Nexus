/* controls.js — como o mouse/dedo move a câmera. Arrastar gira, rolar/pinçar aproxima. */
(function () {
  const N = NEXUS;
  // S = onde a câmera ESTÁ · T = para onde ela QUER ir (S corre atrás de T, o que deixa o movimento suave)
  const S = { th: .5, ph: 1.12, r: 52 };
  const T = { ...S };
  const clampR = r => Math.min(260, Math.max(14, r));            // limites do zoom (260 = dá para ver os 3 sistemas)
  const pointers = new Map();
  let dragging = false, pinch = 0;

  addEventListener('pointerdown', e => { pointers.set(e.pointerId, e); dragging = true; pinch = 0; });
  addEventListener('pointermove', e => {
    const old = pointers.get(e.pointerId);
    if (!old) return;
    if (pointers.size === 1) {                                   // um dedo/mouse: girar
      T.th -= (e.clientX - old.clientX) * .005;
      T.ph = Math.min(2.5, Math.max(.4, T.ph - (e.clientY - old.clientY) * .005));
    }
    pointers.set(e.pointerId, e);
    if (pointers.size === 2) {                                   // dois dedos: pinça = zoom
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinch) T.r = clampR(T.r * pinch / d);
      pinch = d;
    }
  });
  const release = e => { pointers.delete(e.pointerId); dragging = pointers.size > 0; pinch = 0; };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  addEventListener('wheel', e => { T.r = clampR(T.r * Math.exp(e.deltaY * .0012)); }, { passive: true });

  N.controls = {
    state: S,
    // Chamado a cada quadro: suaviza o movimento e posiciona a câmera.
    update(dt) {
      if (!dragging) T.th += dt * .025;                          // deriva lenta quando ninguém mexe
      const k = Math.min(1, dt * 6);
      S.th += (T.th - S.th) * k; S.ph += (T.ph - S.ph) * k; S.r += (T.r - S.r) * k;
      N.cam.position.set(
        S.r * Math.sin(S.ph) * Math.cos(S.th),
        S.r * Math.cos(S.ph),
        S.r * Math.sin(S.ph) * Math.sin(S.th));
      N.cam.lookAt(0, 0, 0);
    }
  };
})();
