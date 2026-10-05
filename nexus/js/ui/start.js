/* start.js — tela de start integrada ao universo.
   Ao abrir index.html, câmera em "ombro" perto do Eu, com logo e botão START.
   Ao clicar START, câmera voa até visão geral e tudo volta ao normal.
   Enquanto modo-start, controles, picking e Esc ficam desligados. */
(function () {
  const N = NEXUS;

  // ── Configuração inicial da câmera (posição de ombro) ───────────────────────
  // Lê as constantes de controls.js (única fonte da verdade)
  // Se N.controls ainda não existe, aguarda um loop de requestAnimationFrame
  let startCameraReady = false;
  let startConfigReady = false;

  function readStartConfig() {
    if (N.controls && N.controls.START_DIST !== undefined) {
      return {
        START_DIST: N.controls.START_DIST,
        START_ELEV_DEG: N.controls.START_ELEV,
        START_AZIM_DEG: N.controls.START_AZIM,
        START_OFFSET_X: N.controls.START_OFFSET_X
      };
    }
    return null;
  }

  let startConfig = readStartConfig();

  // Estado interno do start
  let isStartMode = true;
  let startTransitionInProgress = false;
  let orbitFadeFrame = null;

  function setOrbitFade(value) {
    N.orbitStartFade = Math.max(0, Math.min(1, value));
  }

  function animateOrbitFade(targetValue, durationMs) {
    if (orbitFadeFrame !== null) {
      cancelAnimationFrame(orbitFadeFrame);
      orbitFadeFrame = null;
    }

    const startValue = (typeof N.orbitStartFade === 'number') ? N.orbitStartFade : 1;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / durationMs);
      // Curva suave para não parecer um degrau na tela
      const eased = t * t * (3 - 2 * t);
      setOrbitFade(startValue + (targetValue - startValue) * eased);

      if (t < 1) {
        orbitFadeFrame = requestAnimationFrame(step);
      } else {
        orbitFadeFrame = null;
      }
    }

    orbitFadeFrame = requestAnimationFrame(step);
  }

  // ── Posiciona a câmera na posição de ombro ao carregar ────────────────────
  function setStartCamera() {
    // Tenta ler a configuração de controls.js
    startConfig = readStartConfig();
    if (!startConfig) {
      // Se ainda não está pronto, tenta novamente no próximo frame
      requestAnimationFrame(setStartCamera);
      return;
    }

    if (!N.controls || !N.controls.state) {
      return;
    }

    const { START_DIST, START_ELEV_DEG, START_AZIM_DEG, START_OFFSET_X } = startConfig;
    const START_ELEV_RAD = START_ELEV_DEG * (Math.PI / 180);
    const START_AZIM_RAD = START_AZIM_DEG * (Math.PI / 180);

    // S = estado atual (onde a câmera está)
    const S = N.controls.state;
    // T = alvo da câmera (para onde ela vai). PRECISA ser o T real do controls.js,
    // exposto via N.controls.target. Sem isso, o update() puxaria S de volta para HOME.
    const T = N.controls.target;

    // Posição de ombro: perto, baixa, descentrada (usa valores convertidos para radianos)
    S.th = START_AZIM_RAD;
    S.ph = START_ELEV_RAD;
    S.r = START_DIST;
    T.th = START_AZIM_RAD;
    T.ph = START_ELEV_RAD;
    T.r = START_DIST;

    // Alvo do lookAt deslocado para o Eu ficar à direita
    N.controls.lookT.set(START_OFFSET_X, 0, 0);
    N.controls.look.set(START_OFFSET_X, 0, 0);

    startCameraReady = true;
  }

  // ── Inicia o modo start ─────────────────────────────────────────────────────
  function initStartMode() {
    if (!document.body.classList.contains('modo-start')) {
      isStartMode = false;
      return;
    }

    isStartMode = true;
    // No Start, as órbitas ficam escondidas até o clique em COMEÇAR.
    setOrbitFade(0);
    setStartCamera();

    // Se START_AJUSTE for true, não trava (permite girar e dar zoom livremente)
    if (!N.controls || !N.controls.START_AJUSTE) {
      N.travado = true;
    }
  }

  // ── Sai do modo start ao clicar em START ───────────────────────────────────
  function exitStartMode() {
    if (!isStartMode || startTransitionInProgress) return;
    startTransitionInProgress = true;

    // Remove classe modo-start do body (logo volta à regra normal)
    document.body.classList.remove('modo-start');

    // Botão START some com fade
    const startBtn = document.querySelector('.nexus-start-btn');
    if (startBtn) {
      startBtn.style.opacity = '0';
    }

    // As órbitas voltam enquanto a câmera voa, com um fade curto e suave.
    animateOrbitFade(1, 1200);

    // Câmera voa até visão geral
    if (N.controls) {
      // Valores da visão geral (em radianos)
      const HOME_R = 52;
      const HOME_TH_RAD = 0.5;
      const HOME_PH_RAD = 1.12;

      // Alvo volta para origem
      N.controls.lookT.set(0, 0, 0);

      // S = estado atual; T = alvo real da câmera (deve ser N.controls.target, não .state)
      const S = N.controls.state;
      const T = N.controls.target;
      T.th = HOME_TH_RAD;
      T.ph = HOME_PH_RAD;
      T.r = HOME_R;

      // Duração do voo: ~2.5s
      N.controls.flyDuration = 2.5;
      N.controls.flyProgress = 0;

      // Monitora o progresso do voo para liberar controles quando chegar
      function monitorFlightProgress() {
        if (!isStartMode || !startTransitionInProgress) return;

        // Calcula a diferença entre onde a câmera está e onde quer chegar
        const thDiff = Math.abs(T.th - S.th);
        const phDiff = Math.abs(T.ph - S.ph);
        const rDiff = Math.abs(T.r - S.r);
        const maxDiff = 0.1; // diferença pequena o suficiente para considerar "chegou"
        const targetReached = thDiff < maxDiff && phDiff < maxDiff && rDiff < maxDiff;

        // Também libera se já passou de 85% do voo (pelo flyProgress do controls.js)
        const progress85 = N.controls.flyProgress > 0.85;

        if (targetReached || progress85) {
          // Libera controles
          isStartMode = false;
          startTransitionInProgress = false;
          N.travado = false;

          // Encaixa S na posição HOME para evitar briga com o arrasto logo depois
          S.th = HOME_TH_RAD;
          S.ph = HOME_PH_RAD;
          S.r = HOME_R;
          N.controls.look.set(0, 0, 0);

          return;
        }

        // Continua monitorando no próximo frame
        requestAnimationFrame(monitorFlightProgress);
      }

      // Inicia o monitoramento
      requestAnimationFrame(monitorFlightProgress);
    }
  }

  // ── Eventos ───────────────────────────────────────────────────────────────
  // Botão START
  const startBtn = document.querySelector('.nexus-start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exitStartMode();
    });

    // Enter também funciona no botão
    startBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        exitStartMode();
      }
    });
  }

  // Inicia modo start quando o NEXUS estiver pronto
  if (N.controls && N.controls.state) {
    initStartMode();
  } else {
    // Se controls ainda não carregou, aguarda um pouco
    setTimeout(initStartMode, 100);
  }

  // Exposta para outros módulos saberem se está em modo start
  N.startMode = function () {
    return isStartMode;
  };

})();
