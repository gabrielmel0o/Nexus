/* atualizar.js — tela 3: acrescenta uma fase ao histórico pessoal.
   Envia somente as novidades e a especificação mais recente. Nunca envia
   o histórico inteiro nem guarda o texto digitado no navegador/JSON. */
(function () {
  const N = NEXUS;

  function preparar() {
    const tela = document.getElementById('tela-atualizar');
    const formulario = tela.querySelector('.bloco-formulario');
    const campo = document.getElementById('campo-texto-mudancas');
    const contador = document.getElementById('caracteres-digitados-atualizar');
    const atualizarBtn = document.getElementById('botao-atualizar-universo');
    const voltarBtn = document.getElementById('botao-voltar-atualizar');
    let ocupado = false;
    let disponivel = false;

    // Reaproveita apenas os estilos dos estados adicionais da tela 2.
    // O CSS e as classes do formulário aprovado permanecem intactos.
    const status = document.createElement('p');
    status.className = 'texto-privacidade estado-comecar oculto';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const acoesMemoria = document.createElement('div');
    acoesMemoria.className = 'acoes-comecar oculto';

    function botao(texto, acao) {
      const elemento = document.createElement('button');
      elemento.type = 'button';
      elemento.className = 'btn btn-padrao';
      const feixe = document.createElement('span');
      feixe.className = 'btn__feixe';
      feixe.setAttribute('aria-hidden', 'true');
      elemento.append(feixe, document.createTextNode(texto));
      elemento.addEventListener('click', acao);
      acoesMemoria.appendChild(elemento);
      return elemento;
    }
    const baixarBtn = botao('Baixar histórico JSON', baixar);
    const continuarBtn = botao('Continuar meu universo', abrirSalvo);
    formulario.append(status, acoesMemoria);
    campo.setAttribute('aria-label', 'Novidades da sua mente');
    campo.setAttribute('aria-describedby', 'contador-caracteres-atualizar aviso-privacidade-atualizar');

    function aviso(texto) {
      status.textContent = texto;
      status.classList.remove('oculto');
    }

    function carregarHistorico() {
      const salvo = N.universeStore.load();
      disponivel = !!(salvo.ok && salvo.historico
        && salvo.historico.capitulos.length < N.history.limits.chapters);
      return salvo;
    }

    function conferir() {
      contador.textContent = campo.value.length;
      const tamanho = campo.value.trim().length;
      atualizarBtn.disabled = ocupado || !disponivel || tamanho < 100 || campo.value.length > 3000;
      voltarBtn.disabled = campo.disabled = baixarBtn.disabled = continuarBtn.disabled = ocupado;
      formulario.setAttribute('aria-busy', String(ocupado));
    }

    async function atualizar() {
      if (ocupado) return;
      const texto = campo.value.trim();
      if (texto.length < 100 || campo.value.length > 3000) return;
      // Consulta novamente ao enviar: a fase exibida anteriormente na exploração
      // nunca escolhe o contexto da atualização.
      const salvo = carregarHistorico();
      if (!disponivel) {
        aviso(salvo.historico && salvo.historico.capitulos.length >= N.history.limits.chapters
          ? 'Limite de 10 fases atingido. O histórico permanece completo e pode ser baixado.'
          : salvo.mensagem);
        conferir();
        return;
      }
      ocupado = true;
      conferir();
      aviso('Interpretando o seu texto segundo as Leis do NEXUS...');
      try {
        const resposta = await N.universeSource.fromBackend(texto, undefined, N.history.latest(salvo.historico));
        const historico = N.history.append(salvo.historico, resposta.especificacao);
        // saveHistory compila antes de salvar. Uma falha não substitui o histórico válido.
        const resultado = N.universeSource.saveHistory(historico);
        if (!resultado.ok) throw { mensagem: resultado.mensagem };
        if (!resultado.persistido) {
          aviso(resultado.mensagem + ' Use Baixar histórico JSON ou Continuar meu universo.');
          acoesMemoria.classList.remove('oculto');
          return;
        }
        N.start.entrar(resultado.universo);
      } catch (erro) {
        // Rede, cuidado, identidade, capacidade ou validação não acrescentam fase.
        // As novidades ficam no campo para que a pessoa possa tentar novamente.
        aviso(erro.tipo === 'validacao'
          ? 'Não consegui validar essa atualização. O histórico anterior foi preservado. Revise as novidades (entre 100 e 3.000 caracteres).'
          : N.start.mensagens[erro.tipo] || erro.mensagem || erro.message || N.start.mensagens.servidor);
      } finally {
        ocupado = false;
        carregarHistorico();
        conferir();
      }
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

    function abrirSalvo() {
      if (ocupado) return;
      try {
        const salvo = N.universeStore.load();
        if (!salvo.ok || !salvo.historico) throw { mensagem: salvo.mensagem };
        N.start.entrar(N.universeSource.fromHistory(salvo.historico));
      } catch (erro) { aviso(erro.mensagem || erro.message); }
    }

    voltarBtn.addEventListener('click', () => { if (!ocupado) N.ui.mostrarInicial(); });
    atualizarBtn.addEventListener('click', atualizar);
    campo.addEventListener('input', conferir);
    N.atualizar = {
      abrir() {
        N.ui.usarDesfoque(tela);
        tela.classList.remove('oculto');
        tela.setAttribute('aria-hidden', 'false');
        const salvo = carregarHistorico();
        if (!disponivel) aviso(salvo.historico ? 'Limite de 10 fases atingido. O histórico permanece completo e pode ser baixado.' : salvo.mensagem);
        conferir();
        campo.focus();
      },
      ocultar() {
        tela.classList.add('oculto');
        tela.setAttribute('aria-hidden', 'true');
      }
    };
    conferir();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preparar);
  else preparar();
})();
