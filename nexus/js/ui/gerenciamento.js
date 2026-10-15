/* gerenciamento.js — tela 4: transporta e apaga somente o histórico do NEXUS.
   Nenhuma ação chama IA ou monta a cena. Importar valida e compila antes de salvar,
   preservando o histórico anterior em caso de arquivo inválido. */
(function () {
  const N = NEXUS;

  function preparar() {
    const tela = document.getElementById('tela-gerenciamento');
    const painel = document.getElementById('painel-gerenciamento');
    const contagem = document.getElementById('contagem-fases');
    const baixarBtn = document.getElementById('botao-baixar-historico');
    const importarBtn = document.getElementById('botao-importar-historico');
    const apagarBtn = document.getElementById('botao-apagar-historico');
    const voltarBtn = document.getElementById('botao-voltar-gerenciamento');
    let ocupado = false;

    // O seletor não altera o desenho aprovado: o botão Importar abre esta entrada oculta.
    const arquivo = document.createElement('input');
    arquivo.type = 'file';
    arquivo.accept = '.json,application/json';
    arquivo.hidden = true;
    const status = document.createElement('p');
    status.className = 'texto-privacidade oculto';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    document.getElementById('texto-limite-dados').parentElement.append(arquivo, status);

    function aviso(texto) {
      status.textContent = texto;
      status.classList.remove('oculto');
    }

    function atualizarContagem() {
      const salvo = N.universeStore.load();
      const historico = salvo.ok && salvo.historico;
      contagem.textContent = (historico ? historico.capitulos.length : 0) + ' fase(s)';
      baixarBtn.disabled = ocupado || !historico;
      // Dados inválidos também podem ser apagados, após confirmação explícita.
      apagarBtn.disabled = ocupado || (!historico && salvo.ok);
      importarBtn.disabled = arquivo.disabled = voltarBtn.disabled = ocupado;
      painel.setAttribute('aria-busy', String(ocupado));
      return salvo;
    }

    function baixar() {
      if (ocupado) return;
      const resultado = N.universeStore.exportJSON();
      if (!resultado.ok) { aviso(resultado.mensagem); return; }
      const url = URL.createObjectURL(new Blob([resultado.json], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = resultado.nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      aviso('Download do histórico completo solicitado. Confira o arquivo na pasta de downloads.');
    }

    async function importar() {
      if (ocupado) return;
      const selecionado = arquivo.files && arquivo.files[0];
      if (!selecionado) return;
      ocupado = true;
      atualizarContagem();
      aviso('Validando o histórico selecionado...');
      try {
        if (selecionado.size > N.history.limits.historyBytes) {
          throw { mensagem: 'Arquivo excede 1 MiB. O histórico anterior foi preservado.' };
        }
        const historico = N.history.parse(await selecionado.text());
        // Além do formato e da identidade, confere se todas as fases podem ser compiladas.
        const resultado = N.universeSource.saveHistory(historico);
        if (!resultado.ok) throw { mensagem: resultado.mensagem };
        aviso(resultado.persistido
          ? 'Histórico importado e salvo neste navegador. Use COMEÇAR na tela inicial para explorar.'
          : resultado.mensagem + ' Use Baixar histórico antes de recarregar.');
        // A importação termina aqui: não chama boot nem entra na exploração.
      } catch (erro) {
        aviso(erro.mensagem || erro.message || 'Não consegui importar esse histórico. O anterior foi preservado.');
      } finally {
        ocupado = false;
        arquivo.value = ''; // Permite selecionar o mesmo arquivo novamente.
        atualizarContagem();
      }
    }

    baixarBtn.addEventListener('click', baixar);
    importarBtn.addEventListener('click', () => { if (!ocupado) arquivo.click(); });
    arquivo.addEventListener('change', importar);
    apagarBtn.addEventListener('click', () => {
      if (ocupado) return;
      if (!window.confirm('Apagar o histórico do NEXUS neste navegador? As fases serão removidas. Arquivos JSON já baixados não serão apagados.')) return;
      const resultado = N.universeStore.remove();
      atualizarContagem();
      aviso(resultado.mensagem);
    });
    voltarBtn.addEventListener('click', () => { if (!ocupado) N.ui.mostrarInicial(); });
    N.gerenciamento = {
      abrir() {
        N.ui.usarDesfoque(tela);
        tela.classList.remove('oculto');
        tela.setAttribute('aria-hidden', 'false');
        const salvo = atualizarContagem();
        // Um resultado só em memória precisa de aviso, mesmo depois de sair e voltar.
        if (!salvo.ok || !salvo.persistido) aviso(salvo.mensagem);
        voltarBtn.focus();
      },
      ocultar() {
        tela.classList.add('oculto');
        tela.setAttribute('aria-hidden', 'true');
      }
    };
    atualizarContagem();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preparar);
  else preparar();
})();
