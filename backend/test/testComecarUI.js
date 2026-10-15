/* testComecarUI.js — testa a tela 2 no Edge, com perfil temporário isolado.
   Execute da raiz: node backend/test/testComecarUI.js
   A API é simulada no navegador. Não abre .env nem chama backend/Gemini.
   O perfil e as capturas ficam na pasta temporária do Windows. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const edge = process.env.NEXUS_TEST_EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
assert.ok(fs.existsSync(edge), 'Instale Edge ou indique seu executável em NEXUS_TEST_EDGE.');
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-tela2-'));
const navegador = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + pasta,
  'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, proximo = 0, grupos = 0;
const pendentes = new Map(), erros = [];
const limite = setTimeout(() => { navegador.kill(); console.error('FALHOU: tempo limite do teste.'); process.exit(1); }, 90000);

function chamar(method, params = {}) {
  return new Promise((resolve, reject) => {
    pendentes.set(++proximo, { resolve, reject });
    socket.send(JSON.stringify({ id: proximo, method, params }));
  });
}
async function executar(expression) {
  const retorno = await chamar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (retorno.exceptionDetails) throw Error('Falha ao executar uma verificação no navegador.');
  return retorno.result.value;
}
async function esperar(expression) {
  for (let i = 0; i < 150; i++) {
    if (await executar(expression)) return;
    await pausa(100);
  }
  throw Error('Estado esperado não apareceu: ' + expression);
}
function ok(nome) { grupos++; console.log('[OK] ' + nome); }
async function abrir() {
  await chamar('Page.navigate', { url: pathToFileURL(path.resolve(__dirname, '../../nexus/index.html')).href });
  await esperar('!!(window.NEXUS && NEXUS.comecar && NEXUS.start)');
  await executar(`document.getElementById('botao-comecar').click()`);
}
async function preencher(texto) {
  await executar(`document.getElementById('campo-texto-mente').value=${JSON.stringify(texto)};
    document.getElementById('campo-texto-mente').dispatchEvent(new Event('input'))`);
}
async function gerar(resposta) {
  await executar(`cenarios.push(${resposta});document.getElementById('botao-gerar-universo').click()`);
  await esperar(`document.querySelector('#tela-comecar .bloco-formulario').getAttribute('aria-busy') === 'false'`);
}
async function capturar(nome) {
  const imagem = await chamar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(pasta, nome + '.png'), Buffer.from(imagem.data, 'base64'));
}

async function testar() {
  let porta;
  for (let i = 0; i < 100; i++) {
    try { porta = fs.readFileSync(path.join(pasta, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; }
    catch (_) { await pausa(100); }
  }
  assert.ok(porta, 'Edge não iniciou o modo de teste.');
  const paginas = await (await fetch('http://127.0.0.1:' + porta + '/json')).json();
  socket = new WebSocket(paginas.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = evento => {
    const mensagem = JSON.parse(evento.data);
    if (mensagem.id) {
      const pedido = pendentes.get(mensagem.id);
      pendentes.delete(mensagem.id);
      if (mensagem.error) pedido.reject(mensagem.error); else pedido.resolve(mensagem.result);
    }
    if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails.text);
  };
  await chamar('Runtime.enable');
  await chamar('Page.enable');
  const downloads = path.join(pasta, 'downloads');
  fs.mkdirSync(downloads);
  await chamar('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await chamar('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  // O perfil pertence somente ao teste. Cada rodada começa sem histórico.
  await chamar('Page.addScriptToEvaluateOnNewDocument', { source: `
    localStorage.clear();window.cenarios=[];window.pedidos=[];
    window.fetch=async function(url,options){
      if(url!=='http://127.0.0.1:3000/api/universo') throw Error('Rede proibida no teste');
      pedidos.push(JSON.parse(options.body));
      const c=cenarios.shift();if(!c) throw Error('Sem resposta fictícia');
      if(c.rede) throw Error('Rede fictícia indisponível');
      if(c.esperar) await new Promise(resolve=>{window.liberar=resolve;});
      return new Response(JSON.stringify(c.dados),{status:c.status||200});
    };` });

  await abrir();
  assert.equal(await executar(`getComputedStyle(document.getElementById('fundo-desfocado')).backdropFilter`), 'blur(8.5px)');
  assert.equal(await executar(`document.querySelectorAll('canvas').length`), 1);
  assert.equal(await executar(`document.getElementById('botao-gerar-universo').disabled`), true);
  await executar('document.fonts.ready');
  await capturar('tela2-inicial');
  ok('tela aprovada, desfoque e canvas único');

  for (const [tamanho, desabilitado] of [[499, true], [500, false], [3000, false], [3001, true]]) {
    await preencher('a'.repeat(tamanho));
    assert.equal(await executar(`document.getElementById('botao-gerar-universo').disabled`), desabilitado);
    assert.equal(await executar(`document.getElementById('caracteres-digitados-comecar').textContent`), String(tamanho));
  }
  await preencher(' '.repeat(500));
  assert.equal(await executar(`document.getElementById('botao-gerar-universo').disabled`), true);
  ok('limites 499/500/3000/3001 e espaços sem significado');

  const relato = 'Exemplo fictício de criação, trabalho e vínculos. '.repeat(15);
  await preencher(relato);
  await executar(`document.getElementById('botao-voltar-comecar').click();document.getElementById('botao-comecar').click()`);
  assert.equal(await executar(`document.getElementById('campo-texto-mente').value`), relato);
  ok('voltar e reabrir preserva o rascunho sem boot');

  for (const resposta of ['{rede:true}', '{dados:{erro:"cuidado"}}', '{status:429,dados:{erro:"limite"}}', '{status:422,dados:{erro:"validacao"}}']) {
    await gerar(resposta);
    assert.equal(await executar(`document.getElementById('campo-texto-mente').value`), relato);
    assert.equal(await executar(`!!NEXUS.currentUniverse || localStorage.getItem('nexus:universo')!==null`), false);
    assert.equal(await executar(`document.querySelector('.estado-comecar').classList.contains('oculto')`), false);
  }
  await capturar('tela2-erro');
  ok('rede, cuidado, limite e validação preservam relato e não geram histórico');

  await executar(`cenarios.push({esperar:true,dados:{erro:'cuidado'}});document.getElementById('botao-gerar-universo').click()`);
  assert.equal(await executar(`document.getElementById('botao-voltar-comecar').disabled && document.getElementById('campo-texto-mente').disabled`), true);
  const antes = await executar('pedidos.length');
  await executar(`document.getElementById('botao-gerar-universo').click();document.getElementById('botao-voltar-comecar').click()`);
  assert.equal(await executar('pedidos.length'), antes);
  await executar('liberar()');
  await esperar(`!document.getElementById('botao-voltar-comecar').disabled`);
  ok('carregamento bloqueia saída e pedidos duplicados');

  await gerar('{dados:{duvidas:["Como está a criação?","<img src=x onerror=alert(1)>"]}}');
  assert.equal(await executar(`document.querySelectorAll('.perguntas-comecar img').length`), 0);
  await capturar('tela2-perguntas');
  await executar(`document.querySelector('.perguntas-comecar input').value='Resposta fictícia';
    cenarios.push({rede:true});document.querySelector('.acoes-comecar button').click()`);
  await esperar(`!document.getElementById('botao-voltar-comecar').disabled`);
  assert.equal(await executar(`pedidos[pedidos.length-1].respostas[0].includes('Resposta fictícia')`), true);
  assert.equal(await executar(`document.querySelector('.perguntas-comecar input').value`), 'Resposta fictícia');
  ok('perguntas escapadas, Continuar e respostas preservadas após falha');

  await executar(`cenarios.push({dados:{erro:'cuidado'}});document.querySelectorAll('.acoes-comecar button')[1].click()`);
  await esperar(`!document.getElementById('botao-voltar-comecar').disabled`);
  assert.equal(await executar('pedidos[pedidos.length-1].respostas.length'), 0);
  assert.equal(await executar(`document.querySelector('.perguntas-comecar').classList.contains('oculto')`), true);
  assert.equal(await executar(`document.getElementById('campo-texto-mente').value`), relato);
  ok('Pular envia lista vazia; cuidado limpa perguntas e preserva relato');

  await gerar('{dados:{duvidas:["O que ajuda você a criar?"]}}');
  await executar(`document.querySelector('.perguntas-comecar input').value='RESPOSTA_FICTICIA_PRIVADA';
    cenarios.push({dados:{spec:NEXUS.specs.helena}});document.querySelector('.acoes-comecar button').click()`);
  await esperar(`!!NEXUS.currentUniverse`);
  assert.equal(await executar('NEXUS.state.chapter'), 0);
  assert.equal(await executar(`NEXUS.currentUniverse.chapters.length`), 1);
  assert.equal(await executar(`document.getElementById('tela-comecar').classList.contains('oculto')`), true);
  assert.equal(await executar(`JSON.stringify(localStorage.getItem('nexus:universo')).includes('Exemplo fictício')`), false);
  assert.equal(await executar(`localStorage.getItem('nexus:universo').includes('RESPOSTA_FICTICIA_PRIVADA')`), false);
  ok('geração valida, salva uma fase e abre sem guardar relato/respostas');

  await abrir();
  await preencher(relato);
  await executar(`NEXUS.universeSource.saveHistory(NEXUS.history.create(NEXUS.specs.helena));
    window.discoAnterior=localStorage.getItem('nexus:universo');
    Storage.prototype.setItem=function(){throw new Error('Quota fictícia');}`);
  await gerar('{dados:{spec:NEXUS.specs.helena}}');
  assert.equal(await executar(`localStorage.getItem('nexus:universo')===discoAnterior && NEXUS.universeStore.load().emMemoria`), true);
  assert.equal(await executar(`document.querySelectorAll('.acoes-comecar')[1].classList.contains('oculto')`), false);
  assert.equal(await executar(`NEXUS.universeStore.exportJSON().ok`), true);
  await capturar('tela2-memoria');
  await executar(`document.querySelectorAll('.acoes-comecar')[1].querySelector('button').click()`);
  const arquivo = path.join(downloads, 'nexus-historico.json');
  for (let i = 0; i < 100 && !fs.existsSync(arquivo); i++) await pausa(100);
  assert.ok(fs.existsSync(arquivo), 'Download não foi concluído.');
  assert.equal(JSON.parse(fs.readFileSync(arquivo, 'utf8')).capitulos.length, 1);
  ok('botão de download produz JSON completo do resultado em memória');
  await executar(`document.querySelectorAll('.acoes-comecar')[1].querySelectorAll('button')[1].click()`);
  assert.equal(await executar('NEXUS.currentUniverse.chapters.length'), 1);
  ok('storage bloqueado mantém disco, oferece JSON e permite abrir resultado em memória');

  assert.deepEqual(erros, []);
  ok('nenhuma exceção JavaScript não tratada');
  console.log('OK: ' + grupos + ' grupos no Edge; API simulada, sem Gemini real. Capturas: ' + pasta);
  await chamar('Browser.close');
}

testar().catch(erro => { console.error(erro); process.exitCode = 1; })
  .finally(() => { clearTimeout(limite); if (socket) socket.close(); navegador.kill(); });
