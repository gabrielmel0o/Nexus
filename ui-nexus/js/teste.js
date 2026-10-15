/*
  ============================================================
  NEXUS — teste.js
  JavaScript mínimo apenas para os testes de interface.
  NÃO contém lógica do projeto (motor 3D, dados, API, etc.).

  Use este arquivo somente para:
  - Confirmar que os elementos carregaram corretamente
  - Simular cliques e troca de telas durante o desenvolvimento
  ============================================================
*/

/* Avisa no console que a interface foi carregada com sucesso */
console.log('[NEXUS UI] Interface carregada.');

/*
  Para testar a navegação entre telas, descomente e adapte:

  document.getElementById('botao-comecar').addEventListener('click', function () {
    console.log('[NEXUS UI] Clique em COMEÇAR');
    // Aqui o projeto vai mostrar a tela 2 ou 5
  });

  document.getElementById('botao-atualizar').addEventListener('click', function () {
    console.log('[NEXUS UI] Clique em ATUALIZAR');
    // Aqui o projeto vai mostrar a tela 3
  });

  document.getElementById('botao-gerenciamento').addEventListener('click', function () {
    console.log('[NEXUS UI] Clique em GERENCIAMENTO');
    // Aqui o projeto vai mostrar a tela 4
  });

  document.getElementById('botao-helena').addEventListener('click', function () {
    console.log('[NEXUS UI] Clique em HELENA');
    // Aqui o projeto vai mostrar a tela 5 (demonstração)
  });
*/

/*
  Teste interativo de digitação para simular a interface das telas 2 e 3:
  Atualiza o contador dinâmico e habilita o botão ao atingir 500 caracteres.
*/
var campoMente = document.getElementById('campo-texto-mente');
if (campoMente) {
  var contador = document.getElementById('caracteres-digitados-comecar') || document.getElementById('caracteres-digitados');
  var btnGerar = document.getElementById('botao-gerar-universo');
  campoMente.addEventListener('input', function () {
    var qtd = campoMente.value.length;
    if (contador) { contador.textContent = qtd; }
    if (btnGerar) { btnGerar.disabled = qtd < 500; }
  });
}

/* Tela 3 — ATUALIZAR: mínimo 100 caracteres */
var campoMudancas = document.getElementById('campo-texto-mudancas');
if (campoMudancas) {
  var contadorAt = document.getElementById('caracteres-digitados-atualizar') || document.getElementById('caracteres-digitados');
  var btnAtualizar = document.getElementById('botao-atualizar-universo');
  campoMudancas.addEventListener('input', function () {
    var qtd = campoMudancas.value.length;
    if (contadorAt) { contadorAt.textContent = qtd; }
    if (btnAtualizar) { btnAtualizar.disabled = qtd < 100; }
  });
}

/* Tela 8 — MENU: atalho de tecla ESC para fechar menu */
window.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    console.log('[NEXUS UI] Tecla ESC pressionada: fechar menu e voltar para tela 5.');
  }
});

/* Tela 9 — SAÍDA: ações dos botões do modal */
var btnCancelarSair = document.getElementById('botao-cancelar-sair');
if (btnCancelarSair) {
  btnCancelarSair.addEventListener('click', function () {
    console.log('[NEXUS UI] Clique em "NÃO, CONTINUAR NO NEXUS" (retornar ao menu/visualização).');
  });
}

var btnConfirmarSair = document.getElementById('botao-confirmar-sair');
if (btnConfirmarSair) {
  btnConfirmarSair.addEventListener('click', function () {
    console.log('[NEXUS UI] Clique em "SIM, SAIR DO NEXUS" (encerrar sessão).');
  });
}


