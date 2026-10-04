/* panel.js — painel de informações dos corpos celestes do universo de Helena.
   Integrado visualmente ao universo: translúcido escuro, tipografia do projeto branca,
   sem estilo de dashboard corporativo.
   Aberto ao selecionar um corpo (NEXUS.selectBody), fechado ao desmarcar ou apertar Esc/×.
   Atualiza-se automaticamente se o capítulo mudar enquanto aberto. */
(function () {
  const N = NEXUS;

  // Dicionário de profundidade psíquica conforme a Lei da Distância
  const DEPTH_WORDS = {
    0: 'agora',
    1: 'recente',
    2: 'memória antiga',
    3: 'inconsciente',
    4: 'inobservável'
  };

  let panelEl = null;
  let currentBodyId = null;
  let lastKnownChapter = null;

  // Busca recursiva dos dados do corpo no mockUniverse
  function findBodyData(id) {
    const u = N.getUniverse();
    if (!u || !id) return null;

    // 1. Centros dos sistemas
    for (const sys of u.systems) {
      if (sys.id === id) {
        return {
          id: sys.id,
          name: sys.name,
          depth: sys.depth !== undefined ? sys.depth : 0,
          params: sys.center && sys.center.params,
          info: sys.center && sys.center.info
        };
      }

      // 2. Planetas do sistema
      if (sys.planets) {
        for (const p of sys.planets) {
          if (p.id === id) {
            return {
              id: p.id,
              name: p.name,
              depth: p.depth !== undefined ? p.depth : sys.depth,
              params: p.params,
              info: p.info
            };
          }

          // 3. Luas do planeta
          if (p.moons) {
            for (const m of p.moons) {
              if (m.id === id) {
                return {
                  id: m.id,
                  name: m.name,
                  depth: m.depth !== undefined ? m.depth : (p.depth !== undefined ? p.depth : sys.depth),
                  params: m.params,
                  info: m.info
                };
              }
            }
          }

          // 4. Elementos do planeta (ex: cometa da proposta)
          if (p.elements) {
            for (const el of p.elements) {
              if (el.id === id) {
                return {
                  id: el.id,
                  name: el.title || el.name || 'Elemento',
                  depth: el.depth !== undefined ? el.depth : (p.depth !== undefined ? p.depth : sys.depth),
                  params: el.params,
                  info: el.info
                };
              }
            }
          }
        }
      }

      // 5. Orbitantes do sistema
      if (sys.orbiters) {
        for (const o of sys.orbiters) {
          if (o.id === id) {
            return {
              id: o.id,
              name: o.name,
              depth: o.depth !== undefined ? o.depth : sys.depth,
              params: o.params,
              info: o.info
            };
          }
        }
      }
    }

    return null;
  }

  // Cria a estrutura HTML do painel se ainda não existir
  function ensureElement() {
    if (panelEl) return panelEl;
    panelEl = document.createElement('div');
    panelEl.className = 'nexus-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(panelEl);

    // Fecha a UI ao clicar no botão de fechar (×), sem interferir no estado da câmera
    panelEl.addEventListener('click', (e) => {
      if (e.target.closest('.nexus-panel-close')) {
        N.panel.close();
      }
    });

    // Tecla Esc: se o painel estiver aberto, fecha apenas a UI sem resetar a câmera
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && N.panel && N.panel.isOpen()) {
        N.panel.close();
        e.stopImmediatePropagation();
      }
    }, true);

    return panelEl;
  }

  // Renderiza o conteúdo do corpo selecionado
  function render(body) {
    const el = ensureElement();
    const u = N.getUniverse() || {};
    const info = body.info || {};

    const label = info.label || '';
    const name = body.name || body.id;
    const summary = info.summary || '';
    const lawKey = info.law || '';
    const lawText = (u.laws && u.laws[lawKey]) || '';
    const why = info.why || '';
    const phase = info.phase || '';

    // Capítulo atual e notas
    const currentChapter = (N.state && N.state.chapter !== undefined)
      ? N.state.chapter
      : (u.chapter || 0);
    lastKnownChapter = currentChapter;

    const notes = info.notes || {};
    const chapterNote = notes[currentChapter] || '';

    // Peso emocional (0 a 10) mapeado para 5 bolinhas
    let mass = 0;
    if (N.state && typeof N.state.get === 'function') {
      mass = N.state.get(body.id, 'mass');
    }
    if ((mass === undefined || mass === 0) && body.params && body.params.mass !== undefined) {
      mass = body.params.mass;
    }
    const filledDots = Math.min(5, Math.max(0, Math.round(mass / 2)));
    let dotsHtml = '';
    for (let i = 0; i < 5; i++) {
      dotsHtml += `<span class="nexus-panel-dot ${i < filledDots ? 'is-filled' : ''}"></span>`;
    }

    // Profundidade (uma palavra descritiva)
    const depthVal = body.depth !== undefined ? body.depth : 0;
    const depthWord = DEPTH_WORDS[depthVal] || 'agora';

    el.innerHTML = `
      <button class="nexus-panel-close" aria-label="Fechar painel" title="Fechar (Esc)">×</button>

      ${label ? `<div class="nexus-panel-label">${label}</div>` : ''}
      <h2 class="nexus-panel-title">${name}</h2>
      ${summary ? `<p class="nexus-panel-summary">${summary}</p>` : ''}

      ${(lawText || why) ? `
        <div class="nexus-panel-section">
          <div class="nexus-panel-section-title">Por quê?</div>
          ${lawText ? `<div class="nexus-panel-law">${lawText}</div>` : ''}
          ${why ? `<div class="nexus-panel-why">${why}</div>` : ''}
        </div>
      ` : ''}

      ${(phase || chapterNote) ? `
        <div class="nexus-panel-section">
          ${phase ? `
            <div class="nexus-panel-phase-row">
              <span class="nexus-panel-phase-badge">Fase</span>
              <span class="nexus-panel-phase-text">${phase}</span>
            </div>
          ` : ''}
          ${chapterNote ? `<div class="nexus-panel-note">${chapterNote}</div>` : ''}
        </div>
      ` : ''}

      <div class="nexus-panel-meta">
        <div class="nexus-panel-meta-item">
          <span class="nexus-panel-meta-title">Peso emocional</span>
          <div class="nexus-panel-dots" title="Massa: ${mass}/10">
            ${dotsHtml}
          </div>
        </div>
        <div class="nexus-panel-meta-item">
          <span class="nexus-panel-meta-title">Profundidade</span>
          <span class="nexus-panel-depth">${depthWord}</span>
        </div>
      </div>
    `;
  }

  // ── API pública ───────────────────────────────────────────────────────────
  N.panel = {
    open(id) {
      const body = findBodyData(id);
      if (!body) return;
      currentBodyId = id;
      render(body);
      const el = ensureElement();
      el.classList.add('is-visible');
      el.setAttribute('aria-hidden', 'false');
    },

    close() {
      currentBodyId = null;
      if (panelEl) {
        panelEl.classList.remove('is-visible');
        panelEl.setAttribute('aria-hidden', 'true');
      }
    },

    refresh() {
      if (currentBodyId) {
        const body = findBodyData(currentBodyId);
        if (body) render(body);
      }
    },

    isOpen() {
      return panelEl ? panelEl.classList.contains('is-visible') : false;
    },

    update() {
      // Verifica se o capítulo mudou enquanto o painel está aberto
      if (currentBodyId && N.state && N.state.chapter !== undefined) {
        if (N.state.chapter !== lastKnownChapter) {
          this.refresh();
        }
      }
    }
  };

  // Integração com selectBody / deselectBody
  const origSelectBody = N.selectBody;
  N.selectBody = function (id) {
    if (typeof origSelectBody === 'function') origSelectBody(id);
    if (id) {
      N.panel.open(id);
    } else {
      N.panel.close();
    }
  };

  const origDeselectBody = N.deselectBody;
  N.deselectBody = function () {
    if (typeof origDeselectBody === 'function') origDeselectBody();
    N.panel.close();
  };

  // Atualiza painel se applyChapter for chamado no state
  if (N.state) {
    const origApplyChapter = N.state.applyChapter;
    if (typeof origApplyChapter === 'function') {
      N.state.applyChapter = function (n) {
        origApplyChapter.call(N.state, n);
        if (N.panel && N.panel.isOpen()) {
          N.panel.refresh();
        }
      };
    }
  }
})();
