/* start.js — tela de start integrada ao universo.
   Ao abrir index.html, câmera em "ombro" perto do Eu, com logo e botão START.
   Ao clicar START, câmera voa até visão geral e tudo volta ao normal.
   Enquanto modo-start, controles, picking e Esc ficam desligados. */
(function () {
  const N = NEXUS;

  // ── Configuração inicial da câmera (posição de ombro) ───────────────────────
  // Lê as constantes de controls.js (única fonte da verdade)
  const START_DIST = N.controls && N.controls.START_DIST ? N.controls.START_DIST : 17.7;
  const START_ELEV_DEG = N.controls && N.controls.START_ELEV ? N.controls.START_ELEV : 8.9;
  const START_AZIM_DEG = N.controls && N.controls.START_AZIM ? N.controls.START_AZIM : -143.4;
  const START_OFFSET_X = N.controls && N.controls.START_OFFSET_X ? N.controls.START_OFFSET_X : 8;

  // Converte graus para radianos (câmera usa radianos internamente)
  const START_ELEV_RAD = START_ELEV_DEG * (Math.PI / 180);
  const START_AZIM_RAD = START_AZIM_DEG * (Math.PI / 180);

  // Estado interno do start
  let isStartMode = true;
  let startTransitionInProgress = false;

  // ── Posiciona a câmera na posição de ombro ao carregar ────────────────────
  function setStartCamera() {
    console.log('[START-DEBUG] setStartCamera chamada');
    console.log('[START-DEBUG] Valores lidos:', { START_DIST, START_ELEV_DEG, START_AZIM_DEG, START_OFFSET_X });
    console.log('[START-DEBUG] Valores convertidos para radianos:', { START_ELEV_RAD, START_AZIM_RAD });

    if (!N.controls || !N.controls.state) {
      console.error('[START-DEBUG] N.controls ou N.controls.state não existe!');
      return;
    }

    const S = N.controls.state;
    const T = N.controls.state; // controls.js usa S e T separados, mas aqui igualamos

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

    console.log('[START-DEBUG] Pose aplicada IMEDIATAMENTE:');
    console.log('[START-DEBUG] S:', { r: S.r, ph: S.ph, th: S.th });
    console.log('[START-DEBUG] T:', { r: T.r, ph: T.ph, th: T.th });
    console.log('[START-DEBUG] lookT:', { x: N.controls.lookT.x, y: N.controls.lookT.y, z: N.controls.lookT.z });
    console.log('[START-DEBUG] look:', { x: N.controls.look.x, y: N.controls.look.y, z: N.controls.look.z });

    // Log 1 segundo depois
    setTimeout(() => {
      console.log('[START-DEBUG] Pose após 1 segundo:');
      console.log('[START-DEBUG] S:', { r: S.r, ph: S.ph, th: S.th });
      console.log('[START-DEBUG] T:', { r: T.r, ph: T.ph, th: T.th });
      console.log('[START-DEBUG] lookT:', { x: N.controls.lookT.x, y: N.controls.lookT.y, z: N.controls.lookT.z });
      console.log('[START-DEBUG] look:', { x: N.controls.look.x, y: N.controls.look.y, z: N.controls.look.z });
    }, 1000);

    // Log 3 segundos depois
    setTimeout(() => {
      console.log('[START-DEBUG] Pose após 3 segundos:');
      console.log('[START-DEBUG] S:', { r: S.r, ph: S.ph, th: S.th });
      console.log('[START-DEBUG] T:', { r: T.r, ph: T.ph, th: T.th });
      console.log('[START-DEBUG] lookT:', { x: N.controls.lookT.x, y: N.controls.lookT.y, z: N.controls.lookT.z });
      console.log('[START-DEBUG] look:', { x: N.controls.look.x, y: N.controls.look.y, z: N.controls.look.z });
    }, 3000);
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
      // Guarda valores originais da visão geral (em radianos)
      const HOME_R = 52;
      const HOME_TH_RAD = 0.5;
      const HOME_PH_RAD = 1.12;

      // Alvo volta para origem
      N.controls.lookT.set(0, 0, 0);

      // Ângulos e raio para visão geral (usa radianos como a câmera espera)
      const S = N.controls.state;
      const T = N.controls.state;
      T.th = HOME_TH_RAD;
      T.ph = HOME_PH_RAD;
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

  // ── RASTREAMENTO TEMPORÁRIO PARA DIAGNÓSTICO ───────────────────────────
  // Detecta quem está escrevendo em S.r, S.ph, S.th, T.r, T.ph, T.th e lookT
  if (N.controls && N.controls.state) {
    const S = N.controls.state;
    const T = N.controls.state;
    const lookT = N.controls.lookT;

    // Rastreamento do S
    const originalS_r = S.r;
    const originalS_ph = S.ph;
    const originalS_th = S.th;

    Object.defineProperty(S, 'r', {
      get() { return originalS_r; },
      set(val) {
        if (document.body.classList.contains('modo-start')) {
          console.trace('[START-DEBUG] S.r foi sobrescrito para:', val);
        }
        originalS_r.value = val;
      }
    });
    Object.defineProperty(S, 'ph', {
      get() { return originalS_ph; },
      set(val) {
        if (document.body.classList.contains('modo-start')) {
          console.trace('[START-DEBUG] S.ph foi sobrescrito para:', val);
        }
        originalS_ph.value = val;
      }
    });
    Object.defineProperty(S, 'th', {
      get() { return originalS_th; },
      set(val) {
        if (document.body.classList.contains('modo-start')) {
          console.trace('[START-DEBUG] S.th foi sobrescrito para:', val);
        }
        originalS_th.value = val;
      }
    });

    // Rastreamento do T
    const originalT_r = T.r;
    const originalT_ph = T.ph;
    const originalT_th = T.th;

    Object.defineProperty(T, 'r', {
      get() { return originalT_r; },
      set(val) {
        if (document.body.classList.contains('modo-start')) {
          console.trace('[START-DEBUG] T.r foi sobrescrito para:', val);
        }
        originalT_r.value = val;
      }
    });
    Object.defineProperty(T, 'ph', {
      get() { return originalT_ph; },
      set(val) {
        if (document.body.classList.contains('modo-start')) {
          console.trace('[START-DEBUG] T.ph foi sobrescrito para:', val);
        }
        originalT_ph.value = val;
      }
    });
    Object.defineProperty(T, 'th', {
      get() { return originalT_th; },
      set(val) {
        if (document.body.classList.contains('modo-start')) {
          console.trace('[START-DEBUG] T.th foi sobrescrito para:', val);
        }
        originalT_th.value = val;
      }
    });

    // Rastreamento do lookT
    const originalLookTSet = lookT.set.bind(lookT);
    lookT.set = function(x, y, z) {
      if (document.body.classList.contains('modo-start')) {
        console.trace('[START-DEBUG] lookT.set foi chamado com:', x, y, z);
      }
      return originalLookTSet(x, y, z);
    };
  }

  // Exposta para outros módulos saberem se está em modo start
  N.startMode = function () {
    return isStartMode;
  };

})();
