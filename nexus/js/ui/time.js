/* time.js — controle de tempo e linha de capítulos do universo de Helena.
   Posicionado discretamente no centro-inferior, em linha horizontal:
     "Avançar no tempo. | [ícone de ampulheta] | Voltar ao início"
   A legenda do capítulo fica oculta e aparece:
     (a) enquanto o mouse estiver sobre o controle, ou
     (b) por 5 segundos após um clique em avançar ou voltar.

   Disponibiliza:
     NEXUS.nextChapter()
     NEXUS.resetChapters()
   Tudo muda puramente por parâmetros do state, sem criar ou destruir objetos. */
(function () {
  const N = NEXUS;

  N.events = N.events || {};

  let containerEl = null;
  let captionEl   = null;
  let btnNextEl   = null;
  let btnResetEl  = null;

  // Timer para esconder a legenda 5 s após um clique
  let captionTimer = null;

  function getChapters() {
    const universe = N.getUniverse();
    return (universe && universe.chapters) || [];
  }

  function getCurrentChapter() {
    return (N.state && N.state.chapter !== undefined) ? N.state.chapter : 0;
  }

  // ── Legenda sob demanda ────────────────────────────────────────────────────
  // Mostra a legenda e agenda o fechamento automático após 5 s
  function showCaption() {
    if (!captionEl) return;
    captionEl.classList.add('is-visible');

    // Limpa o timer anterior para não acumular
    clearTimeout(captionTimer);
    captionTimer = setTimeout(function () {
      // Só esconde se o mouse NÃO estiver sobre o controle
      if (!containerEl.matches(':hover')) {
        captionEl.classList.remove('is-visible');
      }
    }, 5000);
  }

  // Esconde a legenda imediatamente (usada no mouseleave, se não há timer ativo)
  function hideCaptionIfNoTimer() {
    clearTimeout(captionTimer);
    captionTimer = null;
    if (captionEl) captionEl.classList.remove('is-visible');
  }

  // Atualiza os textos e o estado dos botões conforme o capítulo atual
  function updateUI() {
    if (!containerEl) return;
    const chapters  = getChapters();
    const curIndex  = getCurrentChapter();
    const currentCap = chapters.find(c => c.id === curIndex) || chapters[0] || {};

    // Legenda do capítulo (texto atualizado; visibilidade controlada pelos eventos de hover/clique)
    if (captionEl) {
      captionEl.textContent = currentCap.caption || '';
    }

    // Botão Avançar o tempo (desliga após o capítulo 3)
    if (btnNextEl) {
      const isLast = curIndex >= 3 || curIndex >= (chapters.length - 1);
      btnNextEl.disabled = isLast;
      if (isLast) {
        btnNextEl.classList.add('is-disabled');
      } else {
        btnNextEl.classList.remove('is-disabled');
      }
    }

    // Botão Voltar ao início (desabilitado se já estiver no capítulo 0)
    if (btnResetEl) {
      const isFirst = curIndex === 0;
      btnResetEl.disabled = isFirst;
      if (isFirst) {
        btnResetEl.classList.add('is-disabled');
      } else {
        btnResetEl.classList.remove('is-disabled');
      }
    }
  }

  // Ícone de ampulheta em SVG inline (sem hex de cor: usa currentColor herdado)
  function iconAmpulheta() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="22" viewBox="0 0 18 22"
      fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true" focusable="false">
      <!-- Moldura superior e inferior da ampulheta -->
      <line x1="2" y1="1" x2="16" y2="1"/>
      <line x1="2" y1="21" x2="16" y2="21"/>
      <!-- Corpo da ampulheta (dois triângulos que se tocam no centro) -->
      <path d="M3 1 L9 11 L15 1"/>
      <path d="M3 21 L9 11 L15 21"/>
      <!-- Areia caindo (linha fina no centro) -->
      <line x1="9" y1="11" x2="9" y2="15" stroke-width="1"/>
    </svg>`;
  }

  // Cria a interface HTML do controle de tempo
  function buildUI() {
    if (containerEl) return containerEl;

    containerEl = document.createElement('div');
    containerEl.className = 'nexus-time-control';

    // Evita que toques ou cliques no controle sejam interpretados como arrasto de câmera
    const stopPropagation = (e) => { e.stopPropagation(); };
    containerEl.addEventListener('pointerdown', stopPropagation);
    containerEl.addEventListener('pointermove', stopPropagation);
    containerEl.addEventListener('pointerup',   stopPropagation);
    containerEl.addEventListener('click',       stopPropagation);

    // Hover no controle inteiro: mostra legenda enquanto o mouse está por cima
    containerEl.addEventListener('mouseenter', () => {
      if (captionEl) captionEl.classList.add('is-visible');
    });
    containerEl.addEventListener('mouseleave', () => {
      // Ao sair do hover, só esconde se não houver timer de 5 s ativo
      if (!captionTimer) {
        if (captionEl) captionEl.classList.remove('is-visible');
      }
    });

    // Legenda do capítulo (fica acima da linha de botões, oculta por padrão)
    captionEl = document.createElement('div');
    captionEl.className = 'nexus-time-caption';

    // Linha de ações horizontal: "Avançar no tempo. | ícone | Voltar ao início"
    const actionsEl = document.createElement('div');
    actionsEl.className = 'nexus-time-actions';

    // Botão "Avançar no tempo" (texto à esquerda)
    btnNextEl = document.createElement('button');
    btnNextEl.className = 'nexus-time-btn nexus-time-btn-primary';
    btnNextEl.setAttribute('aria-label', 'Avançar o tempo');
    btnNextEl.setAttribute('title', 'Avançar o tempo');
    btnNextEl.textContent = 'Avançar no tempo.';
    btnNextEl.addEventListener('click', (e) => {
      e.stopPropagation();
      N.nextChapter();
      // Mostra a legenda do novo capítulo por 5 s
      showCaption();
    });

    // Separador + ícone de ampulheta (não é botão, apenas visual)
    const iconEl = document.createElement('span');
    iconEl.className = 'nexus-time-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.innerHTML = ' | ' + iconAmpulheta() + ' | ';

    // Botão "Voltar ao início" (texto à direita)
    btnResetEl = document.createElement('button');
    btnResetEl.className = 'nexus-time-btn nexus-time-btn-secondary';
    btnResetEl.setAttribute('aria-label', 'Voltar ao início');
    btnResetEl.setAttribute('title', 'Voltar ao início');
    btnResetEl.textContent = 'Voltar ao início';
    btnResetEl.addEventListener('click', (e) => {
      e.stopPropagation();
      N.resetChapters();
      // Mostra a legenda do capítulo 0 por 5 s
      showCaption();
    });

    actionsEl.appendChild(btnNextEl);
    actionsEl.appendChild(iconEl);
    actionsEl.appendChild(btnResetEl);

    // Legenda vem antes dos botões (acima), mas oculta
    containerEl.appendChild(captionEl);
    containerEl.appendChild(actionsEl);

    document.body.appendChild(containerEl);

    updateUI();
    return containerEl;
  }

  // ── Métodos Públicos ────────────────────────────────────────────────────────
  N.nextChapter = function () {
    const curIndex  = getCurrentChapter();
    const chapters  = getChapters();
    if (curIndex >= 3 || curIndex >= (chapters.length - 1)) {
      return; // Já está no último capítulo
    }

    const nextIndex = curIndex + 1;
    if (N.state && typeof N.state.applyChapter === 'function') {
      N.state.applyChapter(nextIndex);
    }

    // Se houver evento associado ao capítulo (ex: 'supernova'), dispara se existir
    const nextCap = chapters.find(c => c.id === nextIndex);
    if (nextCap && nextCap.event) {
      if (typeof N.events[nextCap.event] === 'function') {
        N.events[nextCap.event]();
      }
    }

    updateUI();
  };

  N.resetChapters = function () {
    if (N.state && typeof N.state.applyChapter === 'function') {
      N.state.applyChapter(0);
    }
    if (N.events && typeof N.events.cleanup === 'function') {
      N.events.cleanup();
    }
    updateUI();
  };

  // Inicializa o controle de tempo após carregar a página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }

  // Sincroniza caso o capítulo seja alterado externamente
  if (N.state) {
    const origApply = N.state.applyChapter;
    N.state.applyChapter = function (n) {
      origApply.call(N.state, n);
      updateUI();
    };
  }
})();
