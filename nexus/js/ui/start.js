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
    // A nova tela inicial sai junto com a Start, sem mudar o voo ou o motor.
    if (N.ui) N.ui.ocultarMenus();
    const hint = document.querySelector('.hint');
    if (hint) hint.classList.remove('oculto');

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
      // O universo ativo define a distância; a Helena mantém sua pose original.
      const HOME_R = N.controls.getOverviewRadius ? N.controls.getOverviewRadius() : 52;
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
          // A janela pode ter mudado de formato durante a transição.
          T.r = N.controls.getOverviewRadius ? N.controls.getOverviewRadius() : HOME_R;
          S.r = T.r;
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
      limparPerguntas();
      if (typeof N.boot === 'function') {
        N.boot(N.getUniverse());
      }
      exitStartMode();
    });

    startBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        limparPerguntas();
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
      <div class="nexus-start-history">
        <p class="nexus-start-privacy nexus-start-history-info"></p>
        <button class="nexus-start-gen-btn nexus-start-resume">Continuar meu universo</button>
        <button class="nexus-start-gen-btn nexus-start-update">Atualizar meu universo</button>
        <button class="nexus-start-gen-btn nexus-start-download">Baixar histórico JSON</button>
        <button class="nexus-start-gen-btn nexus-start-import">Importar JSON</button>
        <input class="nexus-start-file" type="file" accept=".json,application/json" hidden>
        <button class="nexus-start-gen-btn nexus-start-delete">Apagar histórico salvo</button>
      </div>
      <div class="nexus-start-divisor"><span>ou escreva sobre a sua mente</span></div>
      <div class="nexus-start-field">
        <textarea class="nexus-start-textarea" aria-label="Texto sobre a sua mente" aria-describedby="nexus-start-privacy" placeholder="Descreva como está a sua vida e a sua mente hoje (entre 500 e 3.000 caracteres)..." rows="4"></textarea>
        <div class="nexus-start-meta">
          <span class="nexus-start-counter">0 / 500 caracteres</span>
        </div>
        <p class="nexus-start-privacy" id="nexus-start-privacy">Seu texto é enviado ao Google (Gemini) para ser interpretado. O NEXUS não guarda seu texto. Na camada gratuita, o Google pode usá-lo para melhorar produtos, e revisores humanos podem lê-lo. Evite nomes reais e dados que identifiquem pessoas; use apelidos.</p>
      </div>
      <p class="nexus-start-privacy nexus-start-operation">Uma nova geração cria outro universo e substitui o histórico salvo. Para acrescentar uma fase, use Atualizar meu universo.</p>
      <button class="nexus-start-gen-btn nexus-start-generate" disabled>Gerar meu universo</button>
      <button class="nexus-start-gen-btn nexus-start-cancel-update" hidden>Voltar à nova geração</button>
      <div class="nexus-start-questions" hidden>
        <p class="nexus-start-privacy">Se quiser, esclareça estes pontos. As respostas também são enviadas ao Google; evite dados que identifiquem pessoas. Você pode deixar campos vazios ou pular.</p>
        <div class="nexus-start-question-fields"></div>
        <button class="nexus-start-gen-btn nexus-start-continue">Continuar</button>
        <button class="nexus-start-gen-btn nexus-start-skip">Pular perguntas</button>
      </div>
      <div class="nexus-start-status" role="status" aria-live="polite" aria-atomic="true" style="display:none;"></div>
    `;

    container.appendChild(formEl);

    const textarea = formEl.querySelector('.nexus-start-textarea');
    const counter = formEl.querySelector('.nexus-start-counter');
    const genBtn = formEl.querySelector('.nexus-start-generate');
    const statusEl = formEl.querySelector('.nexus-start-status');
    const questionsEl = formEl.querySelector('.nexus-start-questions');
    const fieldsEl = formEl.querySelector('.nexus-start-question-fields');
    const continueBtn = formEl.querySelector('.nexus-start-continue');
    const skipBtn = formEl.querySelector('.nexus-start-skip');
    const historyInfo = formEl.querySelector('.nexus-start-history-info');
    const resumeBtn = formEl.querySelector('.nexus-start-resume');
    const updateBtn = formEl.querySelector('.nexus-start-update');
    const downloadBtn = formEl.querySelector('.nexus-start-download');
    const importBtn = formEl.querySelector('.nexus-start-import');
    const fileInput = formEl.querySelector('.nexus-start-file');
    const deleteBtn = formEl.querySelector('.nexus-start-delete');
    const cancelUpdateBtn = formEl.querySelector('.nexus-start-cancel-update');
    const operationInfo = formEl.querySelector('.nexus-start-operation');
    let camposRespostas = [];
    let textoDaRodada = null;
    let ocupado = false;
    let atualizando = false;

    function aviso(texto, erro) {
      statusEl.style.display = 'block';
      statusEl.className = 'nexus-start-status' + (erro ? ' is-error' : '');
      statusEl.textContent = texto;
    }

    function refreshHistory() {
      const loaded = N.universeStore.load();
      const historico = loaded.historico;
      const limites = N.history.limits;
      historyInfo.textContent = (historico ? `${historico.capitulos.length} fase(s). ` : '')
        + loaded.mensagem + ` Limites: ${limites.chapters} fases, 1 MiB por histórico, ${limites.bodies} corpos, ${limites.systems} sistemas, ${limites.forces} forças e ${limites.routines} rotinas na união.`;
      resumeBtn.disabled = downloadBtn.disabled = ocupado || !historico;
      updateBtn.disabled = ocupado || !historico || historico.capitulos.length >= limites.chapters;
      importBtn.disabled = fileInput.disabled = cancelUpdateBtn.disabled = ocupado;
      deleteBtn.disabled = ocupado || (!historico && loaded.ok);
      return loaded;
    }

    function modoAtualizacao(valor) {
      atualizando = valor;
      limparPerguntas();
      textarea.value = '';
      textarea.placeholder = valor ? 'Conte apenas as novidades desta fase (entre 100 e 3.000 caracteres)...'
        : 'Descreva como está a sua vida e a sua mente hoje (entre 500 e 3.000 caracteres)...';
      textarea.setAttribute('aria-label', valor ? 'Novidades da sua mente' : 'Texto sobre a sua mente');
      genBtn.textContent = valor ? 'Acrescentar fase ao meu universo' : 'Gerar meu universo';
      cancelUpdateBtn.hidden = !valor;
      operationInfo.textContent = valor
        ? 'Acrescenta uma fase. Envia somente estas novidades e a especificação mais recente ao Google. As fases antigas permanecem intactas.'
        : 'Uma nova geração cria outro universo e substitui o histórico salvo. Para acrescentar uma fase, use Atualizar meu universo.';
      conferirTexto();
    }

    function abrirResultado(result) {
      if (!result.ok) throw { tipo: result.codigo, mensagem: result.mensagem };
      refreshHistory();
      limparPerguntas();
      if (!result.persistido) {
        aviso(result.mensagem + ' Use Baixar histórico JSON ou Continuar meu universo.');
        return;
      }
      N.boot(result.universo);
      exitStartMode();
    }

    resumeBtn.addEventListener('click', () => {
      if (ocupado) return;
      try {
        const loaded = refreshHistory();
        if (!loaded.ok || !loaded.historico) throw { mensagem: loaded.mensagem };
        N.boot(N.universeSource.fromHistory(loaded.historico));
        limparPerguntas();
        exitStartMode();
      } catch (e) { aviso(e.mensagem || e.message || MENSAGENS.validacao, true); }
    });
    updateBtn.addEventListener('click', () => {
      if (ocupado || updateBtn.disabled) return;
      modoAtualizacao(true);
      textarea.focus();
    });
    cancelUpdateBtn.addEventListener('click', () => { if (!ocupado) modoAtualizacao(false); });
    downloadBtn.addEventListener('click', () => {
      if (ocupado) return;
      const result = N.universeStore.exportJSON();
      if (!result.ok) { aviso(result.mensagem, true); return; }
      const url = URL.createObjectURL(new Blob([result.json], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = result.nomeArquivo;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      aviso('Download do histórico completo solicitado. Confira o arquivo na pasta de downloads.');
    });
    deleteBtn.addEventListener('click', () => {
      if (ocupado) return;
      const result = N.universeStore.remove();
      if (result.ok) modoAtualizacao(false);
      refreshHistory(); aviso(result.mensagem, !result.ok);
    });
    importBtn.addEventListener('click', () => { if (!ocupado) fileInput.click(); });
    fileInput.addEventListener('change', async () => {
      if (ocupado) return;
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      ocupado = true; startBtn.disabled = textarea.disabled = genBtn.disabled = true;
      formEl.setAttribute('aria-busy', 'true'); refreshHistory();
      try {
        if (file.size > N.history.limits.historyBytes) throw { mensagem: 'Arquivo excede 1 MiB. O histórico anterior foi preservado.' };
        const history = N.history.parse(await file.text());
        abrirResultado(N.universeSource.saveHistory(history));
      } catch (e) { aviso(e.mensagem || e.message || 'Não consegui importar esse histórico. O anterior foi preservado.', true); }
      finally {
        ocupado = false; fileInput.value = ''; startBtn.disabled = textarea.disabled = false;
        formEl.setAttribute('aria-busy', 'false'); conferirTexto(); refreshHistory();
      }
    });
    refreshHistory();

    // Ponte provisória: reutiliza as ações antigas, sem montar as telas 2, 3 e 4.
    // Ela será substituída aos poucos, após a aprovação de cada tela.
    N.start = {
      // A tela nova usa a mesma entrada, pose e transição da Start existente.
      mensagens: MENSAGENS,
      entrar(universo) {
        N.boot(universo);
        exitStartMode();
      },
      abrirHelena() { startBtn.click(); },
      continuar() {
        // Se a compilação falhar, o aviso existente precisa continuar visível.
        if (N.ui) N.ui.abrirFormularioAntigo('gerenciamento');
        resumeBtn.click();
      },
      abrirFormulario(modo) {
        refreshHistory();
        // Reabrir o mesmo formulário preserva o que já foi digitado.
        if (modo !== 'gerenciamento' && atualizando !== (modo === 'atualizar')) {
          modoAtualizacao(modo === 'atualizar');
        }
        if (modo === 'gerenciamento') downloadBtn.focus();
        else textarea.focus();
      }
    };
    if (N.ui) {
      const voltar = document.createElement('button');
      voltar.type = 'button';
      voltar.className = 'nexus-start-gen-btn';
      voltar.textContent = 'Voltar à tela inicial';
      voltar.addEventListener('click', () => { if (!ocupado) N.ui.mostrarInicial(); });
      formEl.insertBefore(voltar, formEl.firstChild);
    }

    // Nada vai para armazenamento: perguntas e respostas existem somente nesta tela.
    function limparPerguntas() {
      questionsEl.hidden = true;
      fieldsEl.replaceChildren();
      camposRespostas = [];
      textoDaRodada = null;
      genBtn.hidden = false;
    }

    function mostrarPerguntas(perguntas, texto) {
      limparPerguntas();
      textoDaRodada = texto;
      camposRespostas = perguntas.map((pergunta) => {
        const label = document.createElement('label');
        label.className = 'nexus-start-question';
        const caption = document.createElement('span');
        caption.textContent = pergunta; // Texto da IA nunca é inserido como HTML.
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 280;
        input.autocomplete = 'off';
        input.className = 'nexus-start-textarea';
        input.setAttribute('aria-label', pergunta);
        label.append(caption, input);
        fieldsEl.appendChild(label);
        return { pergunta, input };
      });
      questionsEl.hidden = false;
      genBtn.hidden = true;
      camposRespostas[0].input.focus();
    }

    function conferirTexto() {
      const len = textarea.value.trim().length;
      const minimo = atualizando ? 100 : 500;
      if (len < minimo) {
        counter.textContent = `${len} / ${minimo} caracteres (mínimo ${minimo})`;
        counter.classList.remove('is-valid');
        genBtn.disabled = true;
      } else if (len > 3000) {
        counter.textContent = `${len} / 3.000 caracteres (máximo 3.000)`;
        counter.classList.remove('is-valid');
        genBtn.disabled = true;
      } else {
        counter.textContent = `${len} caracteres`;
        counter.classList.add('is-valid');
        genBtn.disabled = ocupado;
      }
    }
    textarea.addEventListener('input', () => {
      // Somente editar o relato invalida as perguntas, não uma importação falha.
      if (textoDaRodada !== null) limparPerguntas();
      conferirTexto();
    });

    async function gerar(respostas) {
      if (ocupado) return;
      const texto = respostas !== undefined ? textoDaRodada : textarea.value.trim();
      if (typeof texto !== 'string') return;
      if (texto.length < (atualizando ? 100 : 500) || texto.length > 3000) return;
      const anterior = atualizando ? N.universeStore.load().historico : null;
      if (atualizando && !anterior) return;
      if (anterior && anterior.capitulos.length >= N.history.limits.chapters) {
        aviso('Limite de 10 fases atingido. O histórico permanece completo e pode ser baixado.', true);
        return;
      }
      ocupado = true;
      refreshHistory();

      // Estado de carregamento
      formEl.setAttribute('aria-busy', 'true');
      textarea.disabled = true;
      genBtn.disabled = true;
      startBtn.disabled = true;
      continueBtn.disabled = true;
      skipBtn.disabled = true;
      camposRespostas.forEach(c => { c.input.disabled = true; });
      statusEl.style.display = 'block';
      statusEl.className = 'nexus-start-status is-loading';
      statusEl.textContent = 'Interpretando o seu texto segundo as Leis do NEXUS...';

      try {
        if (!N.universeSource || typeof N.universeSource.fromBackend !== 'function') {
          throw { tipo: 'servidor' };
        }

        const universoGerado = await N.universeSource.fromBackend(texto, respostas,
          anterior ? N.history.latest(anterior) : undefined);
        if (universoGerado.duvidas) {
          mostrarPerguntas(universoGerado.duvidas, texto);
          statusEl.style.display = 'none';
          return;
        }

        const historico = anterior ? N.history.append(anterior, universoGerado.especificacao)
          : N.history.create(universoGerado.especificacao);
        abrirResultado(N.universeSource.saveHistory(historico));
      } catch (err) {
        // Cuidado é um estado próprio. O texto permanece no campo em qualquer falha.
        textarea.disabled = false;
        genBtn.disabled = false;
        startBtn.disabled = false;
        const tipo = err && err.tipo;
        if (tipo === 'cuidado') limparPerguntas();
        statusEl.className = 'nexus-start-status ' + (tipo === 'cuidado' ? 'is-care' : 'is-error');
        statusEl.textContent = tipo === 'validacao' && atualizando
          ? 'Não consegui validar essa atualização. O histórico anterior foi preservado. Revise as novidades (entre 100 e 3.000 caracteres).'
          : MENSAGENS[tipo] || err.mensagem || err.message || MENSAGENS.servidor;
      } finally {
        ocupado = false;
        textarea.disabled = false;
        startBtn.disabled = false;
        // Não apaga as respostas após uma falha; apenas atualiza o botão principal.
        const len = textarea.value.trim().length;
        genBtn.disabled = len < (atualizando ? 100 : 500) || len > 3000;
        continueBtn.disabled = false;
        skipBtn.disabled = false;
        camposRespostas.forEach(c => { c.input.disabled = false; });
        formEl.setAttribute('aria-busy', 'false');
        refreshHistory();
      }
    }

    genBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      return gerar();
    });
    continueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Reenvia o contexto de cada resposta, pois o servidor não guarda as perguntas.
      return gerar(camposRespostas.map(c => c.pergunta + '\nResposta: ' + (c.input.value.trim() || '(não informada)')));
    });
    skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      return gerar([]);
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
