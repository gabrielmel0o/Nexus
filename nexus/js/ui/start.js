/* start.js — tela de start integrada ao universo.
   Ao abrir index.html, câmera em "ombro" perto do Eu, com logo e botão START.
   Ao clicar START, câmera voa até visão geral e tudo volta ao normal.
   Enquanto modo-start, controles, picking e Esc ficam desligados. */
(function () {
  const N = NEXUS;

  // ── Configuração inicial da câmera (posição de ombro) ───────────────────────
  // Usa as constantes definidas em controls.js
  const START_DIST = 26;
  const START_ELEV = 12 * (Math.PI / 180); // converte graus para radianos
  const START_AZIM = 0.5;
  const START_OFFSET_X = 8;

  // Estado interno do start
  let isStartMode = true;
  let startTransitionInProgress = false;

  // ── Posiciona a câmera na posição de ombro ao carregar ────────────────────
  function setStartCamera() {
    if (!N.controls || !N.controls.state) return;

    const S = N.controls.state;
    const T = N.controls.state; // controls.js usa S e T separados, mas aqui igualamos

    // Posição de ombro: perto, baixa, descentrada
    S.th = START_AZIM;
    S.ph = START_ELEV;
    S.r = START_DIST;
    T.th = START_AZIM;
    T.ph = START_ELEV;
    T.r = START_DIST;

    // Alvo do lookAt deslocado para o Eu ficar à direita
    N.controls.lookT.set(START_OFFSET_X, 0, 0);
    N.controls.look.set(START_OFFSET_X, 0, 0);
  }

  // ── Inicia o modo start ─────────────────────────────────────────────────────
  function initStartMode() {
    if (!document.body.classList.contains('modo-start')) {
      isStartMode = false;
      return;
    }

    isStartMode = true;
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

    // Câmera voa até visão geral (reaproveitando flyHome com duração maior)
    if (N.controls) {
      // Guarda valores originais da visão geral
      const HOME_R = 52;
      const HOME_TH = 0.5;
      const HOME_PH = 1.12;

      // Alvo volta para origem
      N.controls.lookT.set(0, 0, 0);

      // Ângulos e raio para visão geral
      const S = N.controls.state;
      const T = N.controls.state;
      T.th = HOME_TH;
      T.ph = HOME_PH;
      T.r = HOME_R;

      // Duração do voo: ~2.5s
      N.controls.flyDuration = 2.5;
      N.controls.flyProgress = 0;
    }

    // Libera controles após o voo (~2.5s)
    setTimeout(() => {
      isStartMode = false;
      startTransitionInProgress = false;
      N.travado = false;
    }, 2500);
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
