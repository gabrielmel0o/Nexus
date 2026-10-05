/* legend.js — legenda explicativa do universo de Helena.
   Mesmo estilo do painel: translúcido escuro, integrado ao universo.
   Explica as três camadas e os astros principais conforme as Leis do NEXUS.
   Visível só quando painel-aberto está no body (reutilizável com logo e start). */
(function () {
  const N = NEXUS;

  let legendEl = null;
  N.legendaAberta = false; // Flag para o Esc saber o que fechar

  // Cria a estrutura HTML da legenda se ainda não existir
  function ensureElement() {
    if (legendEl) return legendEl;
    legendEl = document.createElement('div');
    legendEl.className = 'nexus-legend';
    legendEl.setAttribute('role', 'dialog');
    legendEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(legendEl);

    // Renderiza o conteúdo inicial
    render();

    // Fecha ao clicar fora da legenda (desde que não seja em um astro clicável)
    document.addEventListener('click', (e) => {
      if (N.legendaAberta && !legendEl.contains(e.target) && !e.target.closest('.nexus-legend-btn')) {
        // Se o clique caiu em um astro clicável, a seleção normal acontece
        // Se caiu no espaço vazio, fecha a legenda
        const pickTarget = e.target.closest('[data-pick-id]');
        if (!pickTarget) {
          N.legend.close();
        }
      }
    });

    // Tecla Esc: se a legenda estiver aberta, fecha só ela (painel continua)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && N.legendaAberta) {
        N.legend.close();
        e.stopImmediatePropagation();
      }
    }, true);

    return legendEl;
  }

  // Renderiza o conteúdo da legenda
  function render() {
    const el = ensureElement();
    el.innerHTML = `
      <h3 class="nexus-legend-title">Como ler este universo</h3>

      <div class="nexus-legend-section">
        <div class="nexus-legend-section-title">Camadas</div>
        <p class="nexus-legend-content">Corpos = o que existe · Forças = o que move tudo, sem forma · Eventos = o que acontece no tempo</p>
      </div>

      <div class="nexus-legend-section">
        <div class="nexus-legend-item">
          <div class="nexus-legend-item-name">Estrela</div>
          <p class="nexus-legend-item-desc">O que emite luz (valores, paixões)</p>
        </div>
        <div class="nexus-legend-item">
          <div class="nexus-legend-item-name">Planeta</div>
          <p class="nexus-legend-item-desc">Área da vida (reflete luz)</p>
        </div>
        <div class="nexus-legend-item">
          <div class="nexus-legend-item-name">Lua</div>
          <p class="nexus-legend-item-desc">Faceta</p>
        </div>
        <div class="nexus-legend-item">
          <div class="nexus-legend-item-name">Nebulosa escura</div>
          <p class="nexus-legend-item-desc">Desejo reprimido</p>
        </div>
        <div class="nexus-legend-item">
          <div class="nexus-legend-item-name">Buraco negro</div>
          <p class="nexus-legend-item-desc">Trauma</p>
        </div>
        <div class="nexus-legend-item">
          <div class="nexus-legend-item-name">Buraco negro central</div>
          <p class="nexus-legend-item-desc">O Eu</p>
        </div>
        <div class="nexus-legend-item">
          <div class="nexus-legend-item-name">Forças (gravidade, maré, eclipse)</div>
          <p class="nexus-legend-item-desc">Sentimentos</p>
        </div>
      </div>
    `;
  }

  // ── API pública ───────────────────────────────────────────────────────────
  N.legend = {
    open() {
      render();
      const el = ensureElement();
      el.classList.add('is-visible');
      el.setAttribute('aria-hidden', 'false');
      N.legendaAberta = true;
    },

    close() {
      if (legendEl) {
        legendEl.classList.remove('is-visible');
        legendEl.setAttribute('aria-hidden', 'true');
      }
      N.legendaAberta = false;
    },

    toggle() {
      if (N.legendaAberta) {
        this.close();
      } else {
        this.open();
      }
    },

    isOpen() {
      return N.legendaAberta;
    }
  };

  // Botão ? abre/fecha a legenda
  const legendBtn = document.querySelector('.nexus-legend-btn');
  if (legendBtn) {
    legendBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      N.legend.toggle();
    });
  }

  // Se o painel fechar (classe painel-aberto removida do body), fecha a legenda junto
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (!document.body.classList.contains('painel-aberto') && N.legendaAberta) {
          N.legend.close();
        }
      }
    });
  });
  observer.observe(document.body, { attributes: true });

})();
