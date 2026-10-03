/* controls.js — câmera orbital com ALVO animado.
   Arrastar gira, rolar/pinçar aproxima.
   Quando há um corpo selecionado, a câmera orbita em torno
   da posição ATUAL do corpo (que pode estar se movendo).
   Esc ou clique no vazio volta à visão geral (alvo = origem).

   Expostos em NEXUS.controls:
     state        — ângulos e raio ATUAIS (onde a câmera está)
     flyTo(pos, radius)  — voa suavemente até um alvo e distância
     flyHome()    — volta à visão geral
     update(dt)   — chamado a cada quadro */
(function () {
  const CAMERA_GIRO_AUTOMATICO = false;

  const N = NEXUS;
  const canvas = N.renderer.domElement;

  // ── Estado esférico da câmera ─────────────────────────────────────────────
  // S = onde a câmera ESTÁ (suavizado)
  // T = para onde ela QUER ir
  const HOME_R = 52;
  const S = { th: .5, ph: 1.12, r: HOME_R };
  const T = { ...S };

  // Limites de zoom: ajustados dinamicamente ao selecionar um corpo
  let rMin = 14;
  let rMax = 260;
  const clampR = r => Math.min(rMax, Math.max(rMin, r));

  // ── Alvo do lookAt (onde a câmera aponta) ────────────────────────────────
  // "look" é o Vector3 suavizado; "lookT" é o alvo instantâneo
  const look  = new THREE.Vector3(0, 0, 0);
  const lookT = new THREE.Vector3(0, 0, 0);

  // Função usada no update para seguir o objeto selecionado quadro a quadro
  let followFn = null;   // () => THREE.Vector3 da posição atual do corpo
  let flyProgress = 0;   // 0 = sem animação de voo em curso, 1 = concluído
  let flyDuration = 0;

  // ── Entrada (mouse / toque) ───────────────────────────────────────────────
  const pointers = new Map();
  let dragging = false, pinch = 0;

  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    pointers.set(e.pointerId, e);
    dragging = true;
    pinch = 0;
  });

  canvas.addEventListener('pointermove', e => {
    const old = pointers.get(e.pointerId);
    if (!old) return;
    if (pointers.size === 1) {                // um dedo/mouse: girar
      T.th -= (e.clientX - old.clientX) * .005;
      T.ph = Math.min(2.5, Math.max(.4, T.ph - (e.clientY - old.clientY) * .005));
    }
    pointers.set(e.pointerId, e);
    if (pointers.size === 2) {                // dois dedos: pinça = zoom
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinch) T.r = clampR(T.r * pinch / d);
      pinch = d;
    }
  });

  const release = e => {
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    pointers.delete(e.pointerId);
    dragging = pointers.size > 0;
    pinch = 0;
  };

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', e => {
    T.r = clampR(T.r * Math.exp(e.deltaY * .0012));
  }, { passive: true });

  // ── API pública ───────────────────────────────────────────────────────────
  N.controls = {
    state: S,

    // Voa até uma posição no mundo, ajustando o raio mínimo e de chegada.
    // getPosFn = função que devolve o Vector3 ATUAL do objeto (para seguir)
    // arrivalR = distância de chegada (proporcional ao tamanho do corpo)
    // bodyRadius = raio do corpo (define o zoom mínimo para não entrar)
    flyTo(getPosFn, arrivalR, bodyRadius) {
      followFn = getPosFn;
      const pos = getPosFn();
      lookT.copy(pos);

      // Define zoom mínimo como 1.4× o raio do corpo e máximo normal
      rMin = Math.max(bodyRadius * 1.4, 3);
      rMax = 260;

      // Distância de chegada confortável
      T.r = Math.max(rMin, arrivalR);

      flyProgress = 0;
      flyDuration = 1.0; // ~1s de easing
    },

    // Volta à visão geral suavemente
    flyHome() {
      followFn = null;
      lookT.set(0, 0, 0);
      rMin = 14;
      rMax = 260;
      T.r = clampR(Math.max(S.r, HOME_R)); // não sai muito perto
      flyProgress = 0;
      flyDuration = 1.0;
    },

    // Chamado a cada quadro pelo main.js
    update(dt) {
      // Deriva lenta quando ninguém mexe
      if (!dragging && CAMERA_GIRO_AUTOMATICO) T.th += dt * .025;

      // Se há um corpo selecionado, atualiza o alvo seguindo sua posição atual
      if (followFn) {
        const pos = followFn();
        lookT.copy(pos);
      }

      // Easing suave para o lookAt chegar ao alvo (~1s)
      const kLook = Math.min(1, dt * 5.5);
      look.lerp(lookT, kLook);

      // Suaviza ângulos e raio da câmera
      const k = Math.min(1, dt * 6);
      S.th += (T.th - S.th) * k;
      S.ph += (T.ph - S.ph) * k;
      S.r  += (T.r  - S.r)  * k;

      // Posiciona a câmera em órbita em torno do alvo atual
      const camOffset = new THREE.Vector3(
        S.r * Math.sin(S.ph) * Math.cos(S.th),
        S.r * Math.cos(S.ph),
        S.r * Math.sin(S.ph) * Math.sin(S.th)
      );
      N.cam.position.copy(look).add(camOffset);
      N.cam.lookAt(look);
    }
  };
})();
