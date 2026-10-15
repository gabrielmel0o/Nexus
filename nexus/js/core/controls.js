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

  // ── Constantes da tela de START (ajuste olhando o resultado) ─────────────
  // Distância do "ombro" da câmera ao Eu (unidades do mundo)
  const START_DIST = 20.1;
  // Altura em GRAUS acima do plano horizontal (0 = olhando de lado, 90 = olhando de cima)
  const START_ELEV = 80.4;
  // Ângulo horizontal em GRAUS ao redor do eixo Y
  const START_AZIM = -130.6; // -2.50 radianos em graus
  // Deslocamento lateral do alvo em unidades do mundo (positivo = direita da tela)
  const START_OFFSET_X = 8.0;
  // Modo ajuste: se true, trava desligada no start, tecla C imprime valores atuais
  const START_AJUSTE = false;

  // ── Estado esférico da câmera ─────────────────────────────────────────────
  // S = onde a câmera ESTÁ (suavizado)
  // T = para onde ela QUER ir
  const HOME_R = 52;
  const ZOOM_MAX_PADRAO = 150;
  const FOLGA_ENQUADRAMENTO = 1.08; // Deixa espaço nas bordas da visão geral.
  const FOLGA_ZOOM = 1.5; // Permite afastar um pouco além do enquadramento.
  const FAR_PADRAO = N.cam.far;
  const S = { th: .5, ph: 1.12, r: HOME_R };
  const T = { ...S };

  // Limites de zoom: ajustados dinamicamente ao selecionar um corpo
  let rMin = 14;
  let rMax = ZOOM_MAX_PADRAO;
  let zoomMaxSelecionado = null;
  let larguraPainel = 0;
  let deslocamentoAtual = 0;
  let ultimoDeslocamento = 0;
  const clampR = r => Math.min(rMax, Math.max(rMin, r));

  // A preparação do universo mantém a referência aos capítulos da Helena.
  // Só esse universo conserva a câmera escolhida à mão para a demo original.
  function isOriginalHelena(universe) {
    return universe && N.data && universe.chapters === N.data.chapters;
  }

  function getOverviewRadius() {
    const universe = N.currentUniverse;
    const geometry = N.compileSpec && N.compileSpec.geometry;
    if (!universe || isOriginalHelena(universe) || !geometry) {
      rMax = zoomMaxSelecionado || ZOOM_MAX_PADRAO;
      return HOME_R;
    }

    // Reutiliza o limite do compilador: inclui corpos, halos e órbitas externas.
    // Uma esfera centrada no Eu também cobre a rotação dos sistemas.
    let extent = 0;
    if (universe.historyFrames) extent = universe.historyExtent;
    for (const system of universe.systems) {
      if (universe.historyFrames) break;
      extent = Math.max(extent, Math.hypot(...system.position) + geometry.systemRadius(system));
    }
    const fov = N.cam.getEffectiveFOV ? N.cam.getEffectiveFOV() : N.cam.fov;
    const verticalHalfAngle = fov * Math.PI / 360;
    const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * N.cam.aspect);
    const halfAngle = Math.min(verticalHalfAngle, horizontalHalfAngle);
    // Usa seno para caber a esfera inteira, inclusive a parte mais perto da câmera.
    const radius = Math.max(HOME_R, extent * FOLGA_ENQUADRAMENTO / Math.sin(halfAngle));
    const zoomGeral = Math.max(ZOOM_MAX_PADRAO, radius * FOLGA_ZOOM);
    rMax = zoomMaxSelecionado || zoomGeral;
    // Universos grandes também precisam caber no limite distante da câmera.
    const far = Math.max(FAR_PADRAO, zoomGeral + extent * 2);
    if (N.cam.far !== far) {
      N.cam.far = far;
      N.cam.updateProjectionMatrix();
    }
    return radius;
  }

  // Reenquadra a visão geral ao mudar o formato da janela, sem interromper
  // a Start nem o acompanhamento de um astro selecionado.
  window.addEventListener('resize', () => {
    const radius = getOverviewRadius();
    if (N.currentUniverse && !isOriginalHelena(N.currentUniverse)
      && !(N.startMode && N.startMode()) && !N.selected) T.r = radius;
  });

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
    if (N.travado) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    pointers.set(e.pointerId, e);
    dragging = true;
    pinch = 0;
  });

  canvas.addEventListener('pointermove', e => {
    if (N.travado) return;
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
    if (N.travado) return;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    pointers.delete(e.pointerId);
    dragging = pointers.size > 0;
    pinch = 0;
  };

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', e => {
    if (N.travado) return;
    T.r = clampR(T.r * Math.exp(e.deltaY * .0012));
  }, { passive: true });

  // Modo ajuste: tecla C imprime valores atuais da câmera para copiar
  if (START_AJUSTE) {
    window.addEventListener('keydown', e => {
      if (e.key === 'c' || e.key === 'C') {
        const elevDeg = (S.ph * 180 / Math.PI).toFixed(1);
        const azimDeg = (S.th * 180 / Math.PI).toFixed(1);
        console.log(`START_DIST = ${S.r.toFixed(1)}; // unidades do mundo`);
        console.log(`START_ELEV = ${elevDeg}; // graus acima do plano horizontal`);
        console.log(`START_AZIM = ${azimDeg}; // graus ao redor do eixo Y`);
        console.log(`START_OFFSET_X = ${lookT.x.toFixed(1)}; // unidades do mundo (positivo = direita)`);
      }
    });
  }

  // ── API pública ───────────────────────────────────────────────────────────
  N.controls = {
    state: S,
    getOverviewRadius: getOverviewRadius,
    // T é o ALVO da câmera (para onde ela vai). start.js precisa disso para definir a pose inicial.
    target: T,
    // O painel informa sua borda direita em pixels. O alvo continua seguindo
    // o corpo real; somente a projeção muda para aproveitar a área livre.
    setPanelWidth(pixels) { larguraPainel = Math.max(0, pixels); },
    START_AJUSTE: START_AJUSTE, // Exposto para start.js decidir se trava
    START_DIST: START_DIST, // Exposto para start.js usar
    START_ELEV: START_ELEV, // Exposto para start.js usar (em graus)
    START_AZIM: START_AZIM, // Exposto para start.js usar (em graus)
    START_OFFSET_X: START_OFFSET_X, // Exposto para start.js usar
    look: look,    // Exposto para start.js manipular
    lookT: lookT,   // Exposto para start.js manipular
    flyProgress: flyProgress, // Exposto para start.js manipular
    flyDuration: flyDuration, // Exposto para start.js manipular

    // Voa até uma posição no mundo, ajustando o raio mínimo e de chegada.
    // getPosFn = função que devolve o Vector3 ATUAL do objeto (para seguir)
    // arrivalR = distância de chegada (proporcional ao tamanho do corpo)
    // bodyRadius = raio do corpo (define o zoom mínimo para não entrar)
    flyTo(getPosFn, arrivalR, bodyRadius) {
      getOverviewRadius();
      followFn = getPosFn;
      const pos = getPosFn();
      lookT.copy(pos);

      // Define zoom mínimo como 1.4× o raio do corpo e máximo normal
      rMin = Math.max(bodyRadius * 1.4, 3);
      // Ao selecionar, não permite afastar até o limite do universo inteiro.
      zoomMaxSelecionado = Math.max(rMin, arrivalR) * 10;
      rMax = zoomMaxSelecionado;

      // Distância de chegada confortável
      T.r = Math.max(rMin, arrivalR);

      flyProgress = 0;
      flyDuration = 1.0; // ~1s de easing
    },

    // Volta à visão geral suavemente
    flyHome() {
      zoomMaxSelecionado = null;
      larguraPainel = 0;
      const overviewRadius = getOverviewRadius();
      followFn = null;
      lookT.set(0, 0, 0);
      rMin = 14;
      T.r = clampR(Math.max(S.r, overviewRadius)); // não sai muito perto
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

      // Deslocamento suave, sem mexer na pose START_* ou na posição do corpo.
      // Painel aberto: centro da área restante à direita. Fechado: centro da tela.
      const largura = canvas.clientWidth || 0;
      const altura = canvas.clientHeight || 0;
      const destino = followFn ? Math.min(larguraPainel, largura * .7) / 2 : 0;
      deslocamentoAtual += (destino - deslocamentoAtual) * k;
      if (Math.abs(deslocamentoAtual - destino) < .1) deslocamentoAtual = destino;
      if (largura && altura && typeof N.cam.setViewOffset === 'function' && (deslocamentoAtual !== ultimoDeslocamento
        || (N.cam.view && N.cam.view.enabled && (N.cam.view.fullWidth !== largura || N.cam.view.fullHeight !== altura)))) {
        if (deslocamentoAtual === 0) N.cam.clearViewOffset();
        else N.cam.setViewOffset(largura, altura, -deslocamentoAtual, 0, largura, altura);
        ultimoDeslocamento = deslocamentoAtual;
      }
    }
  };
})();
