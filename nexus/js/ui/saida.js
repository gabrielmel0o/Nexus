/* saida.js — tela 9: confirma somente o retorno à tela inicial.
   Não fecha a aba nem encerra o backend. O universo permanece montado até o reload. */
(function () {
  const N = NEXUS;
  const tela = document.getElementById('tela-sair');
  const menu = document.getElementById('tela-menu');
  const modal = document.getElementById('modal-sair');
  const cancelar = document.getElementById('botao-cancelar-sair');
  const confirmar = document.getElementById('botao-confirmar-sair');
  const fundo = document.getElementById('fundo-desfocado');
  let aberto = false;

  // A raiz precisa ficar acima do menu (10). Dentro dela, o CSS aprovado
  // posiciona o fundo em 15 e o modal em 20, desfocando também o menu atrás.
  tela.style.zIndex = '20';
  modal.setAttribute('aria-describedby', 'subtitulo-modal-sair');
  N.saida = {
    isOpen() { return aberto; },
    abrir() {
      if (aberto) return;
      aberto = true;
      N.ui.usarDesfoque(tela);
      fundo.classList.add('desfoque-sobre-interfaces');
      menu.inert = true; // Impede foco e cliques nos controles atrás da confirmação.
      tela.classList.remove('oculto');
      tela.setAttribute('aria-hidden', 'false');
      cancelar.focus();
    },
    fechar() {
      if (!aberto) return;
      aberto = false;
      tela.classList.add('oculto');
      tela.setAttribute('aria-hidden', 'true');
      fundo.classList.remove('desfoque-sobre-interfaces');
      N.ui.usarDesfoque(menu);
      menu.inert = false;
      document.getElementById('botao-voltar-inicio').focus();
    }
  };

  cancelar.addEventListener('click', () => N.saida.fechar());
  confirmar.addEventListener('click', () => {
    // Uma falha de gravação mantém inclusive atualizações somente na memória.
    // Cancelar o aviso nativo preserva o resultado e esta confirmação aberta.
    const resultado = N.universeStore.load();
    if (resultado.historico && !resultado.persistido && !window.confirm(
      'Seu histórico está somente na memória. As fases que não foram salvas ' +
      'neste navegador serão perdidas ao recarregar. Deseja voltar mesmo assim?'
    )) return;
    window.location.reload();
  });

  document.addEventListener('click', evento => {
    if (!aberto || modal.contains(evento.target)) return;
    // Clicar fora não confirma nem aciona o menu que está atrás.
    evento.preventDefault();
    evento.stopImmediatePropagation();
  }, true);

  window.addEventListener('keydown', evento => {
    if (!aberto) return;
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      N.saida.fechar();
    } else if (evento.key === 'Tab') {
      // O foco circula apenas entre as duas respostas enquanto o modal está aberto.
      evento.preventDefault();
      (document.activeElement === cancelar ? confirmar : cancelar).focus();
    }
  }, true);
})();
