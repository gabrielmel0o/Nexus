/* start.js — tela de start integrada ao universo.
   Ao abrir index.html, câmera em "ombro" perto do Eu, com logo e botão START.
   Ao clicar START, câmera voa até visão geral e tudo volta ao normal.
   Enquanto modo-start, controles, picking e Esc ficam desligados. */
(function () {
  const N = NEXUS;

  // Textos fixos da interface: nunca exibimos detalhes técnicos vindos da resposta.
  const MENSAGENS = {
    rede: 'Não consegui falar com o servidor. Você pode explorar a galáxia de Helena enquanto isso.',
    limite: 'Muitos pedidos agora. Espere um minuto e tente novamente.',
    validacao: 'Não consegui montar o universo desse texto. Tente descrever com mais detalhes, entre 500 e 3.000 caracteres.',
    servidor: 'Não consegui gerar seu universo agora. Tente novamente em instantes ou explore a galáxia de Helena.',
    cuidado: 'O NEXUS não substitui o apoio de uma pessoa de confiança ou de um profissional. Se você estiver pensando em se machucar, procure alguém agora. No Brasil, o CVV atende 24 horas pelo telefone 188 (gratuito).'
  };

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

  // ── Sai do modo start ao clicar em START ou após geração com sucesso ───────
  function exitStartMode() {
    if (!isStartMode || startTransitionInProgress) return;
    startTransitionInProgress = true;

    // Remove classe modo-start do body (logo volta à regra normal)
    document.body.classList.remove('modo-start');

    // Container de start some com fade
    const startContainer = document.querySelector('.nexus-start-container');
    if (startContainer) {
      startContainer.style.opacity = '0';
      startContainer.style.pointerEvents = 'none';
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

  // ── Montagem e eventos do UI de Start ──────────────────────────────────────
  function setupStartUI() {
    const container = document.querySelector('.nexus-start-container');
    const startBtn = document.querySelector('.nexus-start-btn');
    if (!container || !startBtn) return;

    // Caminho padrão da Helena: clica em COMEÇAR
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof N.boot === 'function') {
        N.boot(N.getUniverse());
      }
      exitStartMode();
    });

    startBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (typeof N.boot === 'function') {
          N.boot(N.getUniverse());
        }
        exitStartMode();
      }
    });

    // Cria a seção do formulário de texto para gerar novo universo
    const formEl = document.createElement('div');
    formEl.className = 'nexus-start-form';
    formEl.innerHTML = `
      <div class="nexus-start-divisor"><span>ou escreva sobre a sua mente</span></div>
      <div class="nexus-start-field">
        <textarea class="nexus-start-textarea" aria-label="Texto sobre a sua mente" aria-describedby="nexus-start-privacy" placeholder="Descreva como está a sua vida e a sua mente hoje (entre 500 e 3.000 caracteres)..." rows="4"></textarea>
        <div class="nexus-start-meta">
          <span class="nexus-start-counter">0 / 500 caracteres</span>
        </div>
        <p class="nexus-start-privacy" id="nexus-start-privacy">Seu texto é enviado ao Google (Gemini) para ser interpretado. O NEXUS não guarda seu texto. Na camada gratuita, o Google pode usá-lo para melhorar produtos, e revisores humanos podem lê-lo. Evite nomes reais e dados que identifiquem pessoas; use apelidos.</p>
      </div>
      <button class="nexus-start-gen-btn" disabled>Gerar meu universo</button>
      <div class="nexus-start-status" role="status" aria-live="polite" aria-atomic="true" style="display:none;"></div>
    `;

    container.appendChild(formEl);

    const textarea = formEl.querySelector('.nexus-start-textarea');
    const counter = formEl.querySelector('.nexus-start-counter');
    const genBtn = formEl.querySelector('.nexus-start-gen-btn');
    const statusEl = formEl.querySelector('.nexus-start-status');

    textarea.addEventListener('input', () => {
      const len = textarea.value.trim().length;
      if (len < 500) {
        counter.textContent = `${len} / 500 caracteres (mínimo 500)`;
        counter.classList.remove('is-valid');
        genBtn.disabled = true;
      } else if (len > 3000) {
        counter.textContent = `${len} / 3.000 caracteres (máximo 3.000)`;
        counter.classList.remove('is-valid');
        genBtn.disabled = true;
      } else {
        counter.textContent = `${len} caracteres`;
        counter.classList.add('is-valid');
        genBtn.disabled = false;
      }
    });

    genBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const texto = textarea.value.trim();
      if (texto.length < 500 || texto.length > 3000) return;

      // Estado de carregamento
      formEl.setAttribute('aria-busy', 'true');
      textarea.disabled = true;
      genBtn.disabled = true;
      startBtn.disabled = true;
      statusEl.style.display = 'block';
      statusEl.className = 'nexus-start-status is-loading';
      statusEl.textContent = 'Interpretando o seu texto segundo as Leis do NEXUS...';

      try {
        if (!N.universeSource || typeof N.universeSource.fromBackend !== 'function') {
          throw { tipo: 'servidor' };
        }

        const universoGerado = await N.universeSource.fromBackend(texto);

        // Inicializa o motor com o universo recebido
        if (typeof N.boot === 'function') {
          N.boot(universoGerado);
        }

        // Sucesso: inicia o mesmo voo suave do COMEÇAR
        exitStartMode();
      } catch (err) {
        // Cuidado é um estado próprio. O texto permanece no campo em qualquer falha.
        textarea.disabled = false;
        genBtn.disabled = false;
        startBtn.disabled = false;
        const tipo = err && err.tipo;
        statusEl.className = 'nexus-start-status ' + (tipo === 'cuidado' ? 'is-care' : 'is-error');
        statusEl.textContent = MENSAGENS[tipo] || MENSAGENS.servidor;
      } finally {
        formEl.setAttribute('aria-busy', 'false');
      }
    });
  }

  // Inicializa eventos da UI
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStartUI);
  } else {
    setupStartUI();
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
