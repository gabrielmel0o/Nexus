/* time.js — controle de tempo e linha de capítulos do universo de Helena.
   Posicionado discretamente no centro, embaixo:
   - Legenda do capítulo atual (chapters[n].caption);
   - Botão principal "Avançar o tempo" (avança até o cap. 3, depois fica desligado);
   - Botão pequeno "Voltar ao início" (restaura o cap. 0).

   Disponibiliza:
     NEXUS.nextChapter()
     NEXUS.resetChapters()
   Tudo muda puramente por parâmetros do state, sem criar ou destruir objetos. */
(function () {
  const N = NEXUS;

  N.events = N.events || {};

  let containerEl = null;
  let captionEl = null;
  let btnNextEl = null;
  let btnResetEl = null;

  function getChapters() {
    const universe = N.getUniverse();
    return (universe && universe.chapters) || [];
  }

  function getCurrentChapter() {
    return (N.state && N.state.chapter !== undefined) ? N.state.chapter : 0;
  }

  // Atualiza os textos e o estado dos botões conforme o capítulo atual
  function updateUI() {
    if (!containerEl) return;
    const chapters = getChapters();
    const curIndex = getCurrentChapter();
    const currentCap = chapters.find(c => c.id === curIndex) || chapters[0] || {};

    // 1) Legenda do capítulo atual
    if (captionEl) {
      captionEl.textContent = currentCap.caption || '';
    }

    // 2) Botão Avançar o tempo (desliga após o capítulo 3)
    if (btnNextEl) {
      const isLast = curIndex >= 3 || curIndex >= (chapters.length - 1);
      btnNextEl.disabled = isLast;
      if (isLast) {
        btnNextEl.classList.add('is-disabled');
      } else {
        btnNextEl.classList.remove('is-disabled');
      }
    }

    // 3) Botão Voltar ao início (desabilitado se já estiver no capítulo 0)
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

  // Cria a interface HTML do controle de tempo
  function buildUI() {
    if (containerEl) return containerEl;

    containerEl = document.createElement('div');
    containerEl.className = 'nexus-time-control';

    // Evita que toques ou cliques no controle sejam interpretados como arrasto de câmera
    const stopPropagation = (e) => {
      e.stopPropagation();
    };
    containerEl.addEventListener('pointerdown', stopPropagation);
    containerEl.addEventListener('pointermove', stopPropagation);
    containerEl.addEventListener('pointerup', stopPropagation);
    containerEl.addEventListener('click', stopPropagation);

    captionEl = document.createElement('div');
    captionEl.className = 'nexus-time-caption';

    const actionsEl = document.createElement('div');
    actionsEl.className = 'nexus-time-actions';

    btnNextEl = document.createElement('button');
    btnNextEl.className = 'nexus-time-btn nexus-time-btn-primary';
    btnNextEl.textContent = 'Avançar o tempo';
    btnNextEl.addEventListener('click', (e) => {
      e.stopPropagation();
      N.nextChapter();
    });

    btnResetEl = document.createElement('button');
    btnResetEl.className = 'nexus-time-btn nexus-time-btn-secondary';
    btnResetEl.textContent = 'Voltar ao início';
    btnResetEl.addEventListener('click', (e) => {
      e.stopPropagation();
      N.resetChapters();
    });

    actionsEl.appendChild(btnNextEl);
    actionsEl.appendChild(btnResetEl);

    containerEl.appendChild(captionEl);
    containerEl.appendChild(actionsEl);

    document.body.appendChild(containerEl);

    updateUI();
    return containerEl;
  }

  // ── Métodos Públicos ────────────────────────────────────────────────────────
  N.nextChapter = function () {
    const curIndex = getCurrentChapter();
    const chapters = getChapters();
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
