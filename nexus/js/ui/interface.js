/* interface.js — liga as telas inicial, Começar, Atualizar, Gerenciamento e exploração.
   O botão do isotipo abre o menu da tela 8 sobre o universo existente. */
(function () {
  const N = NEXUS;

  function inicial() { return document.getElementById('tela-inicial'); }
  function formularioAntigo() { return document.querySelector('.nexus-start-container'); }

  function atualizarHistorico() {
    const resultado = N.universeStore.load();
    const historico = resultado.ok && resultado.historico;
    const atualizar = document.getElementById('botao-atualizar');
    atualizar.disabled = !historico || historico.capitulos.length >= N.history.limits.chapters;
    return resultado;
  }

  N.ui = {
    mostrarVisualizacao() {
      this.ocultarMenus();
      const tela = document.getElementById('tela-visualizacao');
      tela.classList.remove('oculto');
      tela.setAttribute('aria-hidden', 'false');
    },
    mostrarInicial() {
      // Voltar do formulário não recarrega a página nem descarta texto ou resultado em memória.
      if (N.comecar) N.comecar.ocultar();
      if (N.atualizar) N.atualizar.ocultar();
      if (N.gerenciamento) N.gerenciamento.ocultar();
      formularioAntigo().classList.add('oculto');
      inicial().classList.remove('oculto');
      inicial().setAttribute('aria-hidden', 'false');
      atualizarHistorico();
      document.getElementById('botao-comecar').focus();
    },
    ocultarInicial() {
      inicial().classList.add('oculto');
      inicial().setAttribute('aria-hidden', 'true');
    },
    ocultarMenus() {
      this.ocultarInicial();
      if (N.comecar) N.comecar.ocultar();
      if (N.atualizar) N.atualizar.ocultar();
      if (N.gerenciamento) N.gerenciamento.ocultar();
      formularioAntigo().classList.add('oculto');
    },
    usarDesfoque(tela) {
      // O mesmo elemento acompanha o formulário aberto, sempre atrás do painel.
      const fundo = document.getElementById('fundo-desfocado');
      tela.insertBefore(fundo, tela.firstChild);
    },
    abrirFormularioAntigo(modo) {
      this.ocultarInicial();
      if (N.comecar) N.comecar.ocultar();
      if (N.atualizar) N.atualizar.ocultar();
      if (N.gerenciamento) N.gerenciamento.ocultar();
      formularioAntigo().classList.remove('oculto');
      N.start.abrirFormulario(modo);
    }
  };

  function preparar() {
    atualizarHistorico();
    // O menu apenas cobre a exploração; os objetos do universo continuam montados.
    const menu = document.getElementById('botao-menu');
    menu.addEventListener('click', () => N.menu.abrir());
    document.getElementById('botao-comecar').addEventListener('click', () => {
      const resultado = atualizarHistorico();
      if (resultado.ok && resultado.historico) {
        // A continuação existente valida, compila e abre a fase mais recente sem backend.
        N.start.continuar();
      } else {
        N.ui.ocultarMenus();
        N.comecar.abrir();
      }
    });
    document.getElementById('botao-helena').addEventListener('click', () => {
      N.start.abrirHelena();
    });
    document.getElementById('botao-atualizar').addEventListener('click', () => {
      atualizarHistorico();
      if (!document.getElementById('botao-atualizar').disabled) {
        N.ui.ocultarMenus();
        N.atualizar.abrir();
      }
    });
    document.getElementById('botao-gerenciamento').addEventListener('click', () => {
      N.ui.ocultarMenus();
      N.gerenciamento.abrir();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preparar);
  else preparar();
})();
