/* testAtualizarUI.js — testa a tela 3 no Edge, com perfil temporário isolado.
   Execute da raiz: node backend/test/testAtualizarUI.js
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
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-tela3-'));
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
async function abrir(reiniciar = true) {
  await chamar('Page.navigate', { url: pathToFileURL(path.resolve(__dirname, '../../nexus/index.html')).href });
  await esperar('!!(window.NEXUS && NEXUS.atualizar && NEXUS.start)');
  if (reiniciar) await executar(`
    let h=NEXUS.history.create(NEXUS.specs.helena);
    const nova=JSON.parse(JSON.stringify(NEXUS.specs.helena));
    nova.titulo='Contexto mais recente';
    h=NEXUS.history.append(h,nova);
    NEXUS.universeSource.saveHistory(h);`);
  await executar(`NEXUS.ui.mostrarInicial();document.getElementById('botao-atualizar').click()`);
}
async function preencher(texto) {
  await executar(`document.getElementById('campo-texto-mudancas').value=${JSON.stringify(texto)};
    document.getElementById('campo-texto-mudancas').dispatchEvent(new Event('input'))`);
}
async function gerar(resposta) {
  await executar(`cenarios.push(${resposta});document.getElementById('botao-atualizar-universo').click()`);
  await esperar(`document.querySelector('#tela-atualizar .bloco-formulario').getAttribute('aria-busy') === 'false'`);
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
  // O perfil pertence somente ao teste. O reload preserva o disco ficticio.
  await chamar('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.cenarios=[];window.pedidos=[];
    window.fetch=async function(url,options){
      if(url!=='http://127.0.0.1:3000/api/universo') throw Error('Rede proibida no teste');
      pedidos.push(JSON.parse(options.body));
      const c=cenarios.shift();if(!c) throw Error('Sem resposta fictícia');
      if(c.rede) throw Error('Rede fictícia indisponível');
      if(c.esperar) await new Promise(resolve=>{window.liberar=resolve;});
      return new Response(JSON.stringify(c.dados),{status:c.status||200});
    };` });

  await abrir(false);
  assert.equal(await executar(`document.getElementById('botao-atualizar').disabled`), true);
  ok('sem histórico, ATUALIZAR não abre o formulário');

  await abrir();
  await executar('document.fonts.ready');
  await capturar('tela3-inicial');
  assert.equal(await executar(`document.getElementById('fundo-desfocado').parentElement.id`), 'tela-atualizar');
  assert.equal(await executar(`getComputedStyle(document.getElementById('fundo-desfocado')).backdropFilter`), 'blur(8.5px)');
  assert.equal(await executar(`document.getElementById('aviso-privacidade-atualizar').textContent.includes('especificação mais recente')`), true);
  assert.equal(await executar(`document.querySelectorAll('canvas').length`), 1);
  ok('painel aprovado, aviso completo, desfoque compartilhado e canvas único');

  for (const [tamanho, desabilitado] of [[99, true], [100, false], [3000, false], [3001, true]]) {
    await preencher('a'.repeat(tamanho));
    assert.equal(await executar(`document.getElementById('botao-atualizar-universo').disabled`), desabilitado);
    assert.equal(await executar(`document.getElementById('caracteres-digitados-atualizar').textContent`), String(tamanho));
  }
  await preencher(' '.repeat(100));
  assert.equal(await executar(`document.getElementById('botao-atualizar-universo').disabled`), true);
  ok('limites 99/100/3000/3001 e espaços vazios');

  const novidades = 'Novidades totalmente fictícias: mais descanso e tempo de criação. '.repeat(3);
  await preencher(novidades);
  await executar(`document.getElementById('botao-voltar-atualizar').click();document.getElementById('botao-atualizar').click()`);
  assert.equal(await executar(`document.getElementById('campo-texto-mudancas').value`), novidades);
  assert.equal(await executar(`document.getElementById('tela-comecar').classList.contains('oculto')`), true);
  ok('voltar e reabrir preserva novidades sem mostrar outra tela');

  await executar(`window.anterior=localStorage.getItem('nexus:universo');`);
  for (const resposta of ['{rede:true}', '{dados:{erro:"cuidado"}}', '{status:429,dados:{erro:"limite"}}',
    '{status:422,dados:{erro:"validacao"}}', '{dados:{duvidas:["Pergunta indevida na atualização"]}}',
    '{dados:{spec:{titulo:"Inválido"}}}']) {
    await gerar(resposta);
    assert.equal(await executar(`document.getElementById('campo-texto-mudancas').value`), novidades);
    assert.equal(await executar(`localStorage.getItem('nexus:universo')===anterior && !NEXUS.currentUniverse`), true);
  }
  await capturar('tela3-erro');
  ok('rede, cuidado, limite, validação e perguntas indevidas preservam o histórico');

  await gerar(`{dados:{spec:(()=>{const s=JSON.parse(JSON.stringify(NEXUS.specs.helena));s.sistemas[0].id='identidade-incompativel';return s;})()}}`);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')===anterior`), true);
  ok('especificação incompatível ou referências inválidas não substituem fases');

  await executar(`cenarios.push({esperar:true,dados:{erro:'cuidado'}});document.getElementById('botao-atualizar-universo').click()`);
  assert.equal(await executar(`document.getElementById('botao-voltar-atualizar').disabled && document.getElementById('campo-texto-mudancas').disabled`), true);
  const antes = await executar('pedidos.length');
  await executar(`document.getElementById('botao-atualizar-universo').click();document.getElementById('botao-voltar-atualizar').click()`);
  assert.equal(await executar('pedidos.length'), antes);
  await executar('liberar()');
  await esperar(`!document.getElementById('botao-voltar-atualizar').disabled`);
  ok('carregamento bloqueia saída e repetição do pedido');

  // O capítulo visualizado não escolhe o contexto da atualização.
  await executar('NEXUS.state.chapter=0');
  await gerar('{dados:{spec:NEXUS.history.latest(NEXUS.universeStore.load().historico)}}');
  assert.equal(await executar('NEXUS.state.chapter'), 2);
  assert.equal(await executar('NEXUS.currentUniverse.chapters.length'), 3);
  assert.equal(await executar(`JSON.stringify(Object.keys(pedidos[pedidos.length-1]).sort())`), '["especificacaoAnterior","texto"]');
  assert.equal(await executar('pedidos[pedidos.length-1].especificacaoAnterior.titulo'), 'Contexto mais recente');
  assert.equal(await executar(`JSON.stringify(NEXUS.universeStore.load().historico.capitulos.slice(0,2))===JSON.stringify(JSON.parse(anterior).capitulos)`), true);
  assert.equal(await executar(`localStorage.getItem('nexus:universo').includes('Novidades totalmente fictícias')`), false);
  assert.equal(await executar(`document.getElementById('tela-atualizar').classList.contains('oculto')`), true);
  ok('envia apenas novidades e última especificação, acrescenta fase 3 e preserva fases 1/2');

  await abrir(false);
  await preencher(novidades);
  await executar(`window.antesSegunda=localStorage.getItem('nexus:universo')`);
  await gerar('{dados:{spec:NEXUS.history.latest(NEXUS.universeStore.load().historico)}}');
  assert.equal(await executar('NEXUS.currentUniverse.chapters.length'), 4);
  assert.equal(await executar('NEXUS.state.chapter'), 3);
  assert.equal(await executar(`JSON.stringify(NEXUS.universeStore.load().historico.capitulos.slice(0,3))===JSON.stringify(JSON.parse(antesSegunda).capitulos)`), true);
  ok('após F5, segunda atualização acrescenta fase 4 sem reescrever anteriores');

  await abrir();
  await preencher(novidades);
  await executar(`(()=>{let h=NEXUS.universeStore.load().historico;
    while(h.capitulos.length<10) h=NEXUS.history.append(h,NEXUS.history.latest(h));
    NEXUS.universeSource.saveHistory(h);window.limiteAnterior=localStorage.getItem('nexus:universo');})()`);
  await gerar('{dados:{spec:NEXUS.specs.helena}}');
  assert.equal(await executar('pedidos.length'), 0);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')===limiteAnterior`), true);
  ok('limite de dez fases é conferido novamente antes de chamar a API');

  await abrir();
  await preencher(novidades);
  await executar(`window.discoAnterior=localStorage.getItem('nexus:universo');
    Storage.prototype.setItem=function(){throw Error('Quota fictícia');}`);
  await gerar('{dados:{spec:NEXUS.history.latest(NEXUS.universeStore.load().historico)}}');
  assert.equal(await executar(`localStorage.getItem('nexus:universo')===discoAnterior && NEXUS.universeStore.load().emMemoria`), true);
  assert.equal(await executar('NEXUS.universeStore.load().historico.capitulos.length'), 3);
  await capturar('tela3-memoria');
  await executar(`document.querySelector('#tela-atualizar .acoes-comecar button').click()`);
  const arquivo = path.join(downloads, 'nexus-historico.json');
  for (let i = 0; i < 100 && !fs.existsSync(arquivo); i++) await pausa(100);
  assert.ok(fs.existsSync(arquivo), 'Download não foi concluído.');
  assert.equal(JSON.parse(fs.readFileSync(arquivo, 'utf8')).capitulos.length, 3);
  await executar(`document.querySelectorAll('#tela-atualizar .acoes-comecar button')[1].click()`);
  assert.equal(await executar('NEXUS.currentUniverse.chapters.length'), 3);
  assert.equal(await executar('NEXUS.state.chapter'), 2);
  ok('storage bloqueado preserva disco, baixa três fases e abre resultado em memória');
  assert.deepEqual(erros, []);
  ok('nenhuma exceção JavaScript não tratada');
  console.log('OK: ' + grupos + ' grupos no Edge; API simulada, sem Gemini real. Capturas: ' + pasta);
  await chamar('Browser.close');
}

testar().catch(erro => { console.error(erro); process.exitCode = 1; })
  .finally(() => { clearTimeout(limite); if (socket) socket.close(); navegador.kill(); });
