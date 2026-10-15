/* comecar.js — formulário aprovado da tela 2.
   Relato e respostas ficam somente nesta página. Os dados só são salvos
   depois de validar e compilar, pelos mesmos módulos usados pela Start antiga. */
(function () {
  const N = NEXUS;

  function preparar() {
    const tela = document.getElementById('tela-comecar');
    const formulario = tela.querySelector('.bloco-formulario');
    const campo = document.getElementById('campo-texto-mente');
    const contador = document.getElementById('caracteres-digitados-comecar');
    const gerarBtn = document.getElementById('botao-gerar-universo');
    const voltarBtn = document.getElementById('botao-voltar-comecar');
    let ocupado = false;
    let textoDaRodada = null;
    let respostas = [];

    // Cada botão adicional usa o anel, as cores e as fontes já aprovadas.
    function botao(texto, acao, grupo) {
      const elemento = document.createElement('button');
      elemento.type = 'button';
      elemento.className = 'btn btn-padrao';
      const feixe = document.createElement('span');
      feixe.className = 'btn__feixe';
      feixe.setAttribute('aria-hidden', 'true');
      elemento.append(feixe, document.createTextNode(texto));
      elemento.addEventListener('click', acao);
      grupo.appendChild(elemento);
      return elemento;
    }

    const perguntas = document.createElement('div');
    perguntas.className = 'perguntas-comecar rolagem-nexus oculto';
    const avisoPerguntas = document.createElement('p');
    avisoPerguntas.className = 'texto-privacidade';
    avisoPerguntas.textContent = 'Se quiser, esclareça estes pontos. As respostas também são enviadas ao Google; evite dados que identifiquem pessoas. Você pode deixar campos vazios ou pular.';
    const campos = document.createElement('div');
    campos.className = 'perguntas-comecar';
    const acoesPerguntas = document.createElement('div');
    acoesPerguntas.className = 'acoes-comecar';
    const continuarBtn = botao('Continuar', () => gerar(respostas.map(r =>
      r.pergunta + '\nResposta: ' + (r.campo.value.trim() || '(não informada)'))), acoesPerguntas);
    const pularBtn = botao('Pular perguntas', () => gerar([]), acoesPerguntas);
    perguntas.append(avisoPerguntas, campos, acoesPerguntas);

    const status = document.createElement('p');
    status.className = 'texto-privacidade estado-comecar oculto';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const acoesMemoria = document.createElement('div');
    acoesMemoria.className = 'acoes-comecar oculto';
    botao('Baixar histórico JSON', baixar, acoesMemoria);
    botao('Continuar meu universo', abrirSalvo, acoesMemoria);
    formulario.append(perguntas, status, acoesMemoria);
    campo.setAttribute('aria-label', 'Texto sobre a sua mente');
    campo.setAttribute('aria-describedby', 'contador-caracteres-comecar aviso-privacidade-comecar');

    function aviso(texto) {
      status.textContent = texto;
      status.classList.remove('oculto');
    }

    function conferir() {
      // O contador mostra tudo o que foi digitado. A validação desconsidera
      // espaços nas pontas, como o backend e o formulário anterior.
      contador.textContent = campo.value.length;
      const tamanho = campo.value.trim().length;
      gerarBtn.disabled = ocupado || tamanho < 500 || campo.value.length > 3000;
      voltarBtn.disabled = ocupado;
      campo.disabled = ocupado;
      continuarBtn.disabled = pularBtn.disabled = ocupado;
      respostas.forEach(r => { r.campo.disabled = ocupado; });
      formulario.setAttribute('aria-busy', String(ocupado));
    }

    function mostrarPerguntas(lista, texto) {
      textoDaRodada = texto;
      campos.replaceChildren();
      respostas = lista.map(pergunta => {
        const label = document.createElement('label');
        const titulo = document.createElement('span');
        titulo.textContent = pergunta; // A resposta da IA nunca entra como HTML.
        const entrada = document.createElement('input');
        entrada.type = 'text';
        entrada.maxLength = 280;
        entrada.autocomplete = 'off';
        entrada.className = 'campo-texto';
        entrada.setAttribute('aria-label', pergunta);
        label.append(titulo, entrada);
        campos.appendChild(label);
        return { pergunta, campo: entrada };
      });
      // Troca somente o conteúdo central; mantém cabeçalho, painel e botão voltar.
      [campo, document.getElementById('contador-caracteres-comecar'),
        document.getElementById('aviso-privacidade-comecar'), gerarBtn].forEach(el => el.classList.add('oculto'));
      perguntas.classList.remove('oculto');
      status.classList.add('oculto');
      respostas[0].campo.focus();
    }

    function limparPerguntas() {
      textoDaRodada = null;
      respostas = [];
      campos.replaceChildren();
      perguntas.classList.add('oculto');
      [campo, document.getElementById('contador-caracteres-comecar'),
        document.getElementById('aviso-privacidade-comecar'), gerarBtn].forEach(el => el.classList.remove('oculto'));
    }

    async function gerar(esclarecimentos) {
      if (ocupado) return;
      const texto = esclarecimentos === undefined ? campo.value.trim() : textoDaRodada;
      if (!texto || texto.length < 500 || texto.length > 3000 || campo.value.length > 3000) return;
      ocupado = true;
      conferir();
      aviso('Interpretando o seu texto segundo as Leis do NEXUS...');
      try {
        const resposta = await N.universeSource.fromBackend(texto, esclarecimentos);
        if (resposta.duvidas) {
          mostrarPerguntas(resposta.duvidas, texto);
          return;
        }
        const resultado = N.universeSource.saveHistory(N.history.create(resposta.especificacao));
        if (!resultado.ok) throw { mensagem: resultado.mensagem };
        limparPerguntas();
        if (!resultado.persistido) {
          aviso(resultado.mensagem + ' Use Baixar histórico JSON ou Continuar meu universo.');
          acoesMemoria.classList.remove('oculto');
          return;
        }
        N.start.entrar(resultado.universo);
      } catch (erro) {
        // Cuidado encerra a rodada opcional, como antes. O relato é preservado.
        if (erro.tipo === 'cuidado') limparPerguntas();
        // Nas outras falhas, as respostas também permanecem disponíveis.
        aviso(N.start.mensagens[erro.tipo] || erro.mensagem || erro.message || N.start.mensagens.servidor);
      } finally {
        ocupado = false;
        conferir();
        if (textoDaRodada !== null && !perguntas.classList.contains('oculto')) respostas[0].campo.focus();
      }
    }

    function abrirSalvo() {
      if (ocupado) return;
      try {
        const salvo = N.universeStore.load();
        if (!salvo.ok || !salvo.historico) throw { mensagem: salvo.mensagem };
        N.start.entrar(N.universeSource.fromHistory(salvo.historico));
      } catch (erro) { aviso(erro.mensagem || erro.message); }
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

    voltarBtn.addEventListener('click', () => { if (!ocupado) N.ui.mostrarInicial(); });
    gerarBtn.addEventListener('click', () => gerar());
    campo.addEventListener('input', conferir);
    N.comecar = {
      abrir() {
        tela.classList.remove('oculto');
        tela.setAttribute('aria-hidden', 'false');
        conferir();
        if (textoDaRodada !== null) respostas[0].campo.focus();
        else campo.focus();
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
