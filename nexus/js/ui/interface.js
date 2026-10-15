/* interface.js — liga a tela inicial aprovada aos caminhos que já funcionam.
   As outras telas ainda usam a interface antiga até sua integração ser aprovada. */
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
    mostrarInicial() {
      // Voltar do formulário não recarrega a página nem descarta texto ou resultado em memória.
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
    abrirFormularioAntigo(modo) {
      this.ocultarInicial();
      formularioAntigo().classList.remove('oculto');
      N.start.abrirFormulario(modo);
    }
  };

  function preparar() {
    atualizarHistorico();
    document.getElementById('botao-comecar').addEventListener('click', () => {
      const resultado = atualizarHistorico();
      if (resultado.ok && resultado.historico) {
        // A continuação existente valida, compila e abre a fase mais recente sem backend.
        N.start.continuar();
      } else {
        N.ui.abrirFormularioAntigo('gerar');
      }
    });
    document.getElementById('botao-helena').addEventListener('click', () => {
      N.start.abrirHelena();
    });
    document.getElementById('botao-atualizar').addEventListener('click', () => {
      if (!document.getElementById('botao-atualizar').disabled) N.ui.abrirFormularioAntigo('atualizar');
    });
    document.getElementById('botao-gerenciamento').addEventListener('click', () => {
      N.ui.abrirFormularioAntigo('gerenciamento');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preparar);
  else preparar();
})();
