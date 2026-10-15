/* menu.js — abre a tela 8 sem reconstruir o universo.
   Esc ou clique fora devolvem a exploração. A tela 9 confirma o retorno ao início. */
(function () {
  const N = NEXUS;
  const tela = document.getElementById('tela-menu');
  const painel = document.getElementById('painel-menu');
  const botao = document.getElementById('botao-menu');
  const voltar = document.getElementById('botao-voltar-inicio');
  let aberto = false;
  let bloqueioAnterior = false;

  botao.setAttribute('aria-controls', 'tela-menu');
  botao.setAttribute('aria-expanded', 'false');

  N.menu = {
    abrir() {
      if (aberto || N.travado) return;
      // Reutiliza o bloqueio de mouse do motor. Não muda capítulo nem seleção.
      bloqueioAnterior = N.travado;
      N.travado = true;
      N.legend.close();
      N.panel.close();
      const visualizacao = document.getElementById('tela-visualizacao');
      visualizacao.classList.add('oculto');
      visualizacao.setAttribute('aria-hidden', 'true');
      N.ui.usarDesfoque(tela);
      tela.classList.remove('oculto');
      tela.setAttribute('aria-hidden', 'false');
      botao.setAttribute('aria-expanded', 'true');
      aberto = true;
      voltar.focus();
    },
    fechar() {
      if (!aberto) return;
      aberto = false;
      tela.classList.add('oculto');
      tela.setAttribute('aria-hidden', 'true');
      botao.setAttribute('aria-expanded', 'false');
      N.travado = bloqueioAnterior;
      N.ui.mostrarVisualizacao();
      botao.focus();
    }
  };

  voltar.addEventListener('click', () => N.saida.abrir());

  // O clique fecha somente depois do pointerup: o motor ainda está bloqueado
  // durante todo o gesto, evitando selecionar ou desmarcar um astro por baixo.
  document.addEventListener('click', evento => {
    if (!aberto || N.saida.isOpen() || painel.contains(evento.target)) return;
    evento.preventDefault();
    evento.stopImmediatePropagation();
    N.menu.fechar();
  }, true);

  window.addEventListener('keydown', evento => {
    if (!aberto || N.saida.isOpen() || evento.key !== 'Escape') return;
    evento.preventDefault();
    evento.stopImmediatePropagation();
    N.menu.fechar();
  }, true);
})();
