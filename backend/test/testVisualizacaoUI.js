/* testVisualizacaoUI.js — testa a tela 5 no Edge, com perfil temporário isolado.
   Execute da raiz: node backend/test/testVisualizacaoUI.js
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
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-tela5-'));
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
  console.error('Diagnóstico do perfil fictício:', await executar(`({pronto:document.readyState,
    start:!!(NEXUS.startMode&&NEXUS.startMode()),travado:NEXUS.travado,
    capitulos:NEXUS.currentUniverse&&NEXUS.currentUniverse.chapters.length,
    status:document.querySelector('.nexus-start-status').textContent,
    r:NEXUS.controls.state.r,alvo:NEXUS.controls.target.r})`));
  throw Error('Estado esperado não apareceu: ' + expression);
}
function ok(nome) { grupos++; console.log('[OK] ' + nome); }
async function abrir() {
  await chamar('Page.navigate', { url: pathToFileURL(path.resolve(__dirname, '../../nexus/index.html')).href });
  await chamar('Page.bringToFront');
  await chamar('Emulation.setFocusEmulationEnabled', { enabled: true });
  await esperar('document.readyState === "complete" && !!(window.NEXUS && NEXUS.start && document.querySelector(".legenda-barra"))');
}
async function clicar(id) {
  const ponto = await executar(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await chamar('Input.dispatchMouseEvent', {type:'mouseMoved',...ponto});
  await chamar('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...ponto});
  await chamar('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...ponto});
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
  assert.equal(await executar(`document.getElementById('tela-visualizacao').classList.contains('oculto')`), true);
  await clicar('botao-helena');
  await esperar('NEXUS.travado===false');
  assert.equal(await executar(`document.getElementById('tela-visualizacao').classList.contains('oculto')`), false);
  assert.equal(await executar(`document.querySelectorAll('.nexus-time-control').length`), 0);
  assert.equal(await executar(`document.querySelectorAll('canvas').length`), 1);
  assert.equal(await executar(`document.getElementById('botao-menu').disabled`), false);
  assert.equal(await executar(`document.getElementById('botao-retroceder').disabled`), true);
  assert.equal(await executar(`document.getElementById('botao-avancar').disabled`), false);
  assert.equal(await executar(`getComputedStyle(document.getElementById('botao-retroceder')).opacity`), '0.35');
  assert.equal(await executar(`getComputedStyle(document.getElementById('botao-retroceder')).cursor`), 'not-allowed');
  await clicar('botao-retroceder');
  assert.equal(await executar('NEXUS.state.chapter'), 0);
  assert.equal(await executar(`getComputedStyle(document.querySelector('#botao-retroceder .btn__feixe')).display`), 'none');
  await capturar('tela5-helena');
  ok('Helena abre barra única, extremos corretos e menu disponível');

  await executar(`window.objetos=[];NEXUS.scene.traverse(o=>objetos.push(o.uuid));
    window.limpezas=0;window.supernovas=0;
    const limpar=NEXUS.events.cleanup;NEXUS.events.cleanup=()=>{limpezas++;limpar();};
    const supernova=NEXUS.events.supernova;NEXUS.events.supernova=()=>{supernovas++;supernova();};`);
  for (const fase of [1,2,3]) {
    await clicar('botao-avancar');
    assert.equal(await executar('NEXUS.state.chapter'), fase);
  }
  assert.equal(await executar(`document.getElementById('botao-avancar').disabled`), true);
  await clicar('botao-avancar');
  assert.equal(await executar('NEXUS.state.chapter'), 3);
  assert.equal(await executar(`getComputedStyle(document.getElementById('botao-avancar')).opacity`), '0.35');
  assert.equal(await executar(`getComputedStyle(document.querySelector('#botao-avancar .btn__feixe')).display`), 'none');
  for (const fase of [2,1,0]) {
    await clicar('botao-retroceder');
    assert.equal(await executar('NEXUS.state.chapter'), fase);
  }
  assert.equal(await executar('supernovas'), 1);
  assert.equal(await executar('limpezas'), 6);
  assert.equal(await executar(`(()=>{const agora=[];NEXUS.scene.traverse(o=>agora.push(o.uuid));return JSON.stringify(agora)===JSON.stringify(objetos);})()`), true);
  ok('um capítulo por clique nos dois sentidos, eventos limpos e objetos preservados');

  // A mesma barra mantém os limites com guia, astro, menu e confirmação abertos.
  await executar(`NEXUS.state.applyChapter(3);NEXUS.selectBody('criacao');NEXUS.legend.open();`);
  assert.equal(await executar(`document.getElementById('botao-avancar').disabled
    && !document.getElementById('botao-retroceder').disabled`), true);
  await clicar('botao-menu');
  await clicar('botao-voltar-inicio');
  await clicar('botao-cancelar-sair');
  await chamar('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar(`document.querySelectorAll('#barra-inferior').length===1
    && document.getElementById('botao-avancar').disabled
    && !document.getElementById('botao-retroceder').disabled`), true);
  await executar(`NEXUS.state.applyChapter(0)`);
  assert.equal(await executar(`!document.getElementById('botao-avancar').disabled
    && document.getElementById('botao-retroceder').disabled`), true);
  ok('disabled bloqueia clique e hover; aplicação direta de fase e retorno entre telas atualizam a barra única');

  await clicar('botao-avancar');
  await chamar('Input.dispatchMouseEvent', {type:'mouseMoved',x:1850,y:100});
  assert.equal(await executar(`document.querySelector('.legenda-barra').classList.contains('is-visible')`), true);
  assert.equal(await executar(`(()=>{const c=document.querySelector('.legenda-barra').getBoundingClientRect();const b=document.getElementById('barra-inferior').getBoundingClientRect();return c.bottom<b.top;})()`), true);
  await pausa(5200);
  assert.equal(await executar(`document.querySelector('.legenda-barra').classList.contains('is-visible')`), false);
  // Hover sem clique também mostra a legenda; sair deve ocultá-la.
  const hover = await executar(`(()=>{const r=document.getElementById('botao-avancar').getBoundingClientRect();return {x:r.x+5,y:r.y+5};})()`);
  await chamar('Input.dispatchMouseEvent', {type:'mouseMoved',...hover});
  assert.equal(await executar(`document.querySelector('.legenda-barra').classList.contains('is-visible')`), true);
  await pausa(100);
  await chamar('Input.dispatchMouseEvent', {type:'mouseMoved',x:1850,y:100});
  assert.equal(await executar(`document.querySelector('.legenda-barra').classList.contains('is-visible')`), false);
  ok('legenda acima da barra: hover, saída do hover e cinco segundos após clique');

  // Coordenadas reais permitem conferir que a barra não captura o canvas fora dos botões.
  assert.equal(await executar(`document.elementFromPoint(900,500).tagName`), 'CANVAS');
  assert.equal(await executar(`document.elementFromPoint(500,1050).tagName`), 'CANVAS');
  const angulo = await executar('NEXUS.controls.target.th');
  await chamar('Input.dispatchMouseEvent', {type:'mouseMoved',x:900,y:500});
  await chamar('Input.dispatchMouseEvent', {type:'mousePressed',x:900,y:500,button:'left',clickCount:1});
  await chamar('Input.dispatchMouseEvent', {type:'mouseMoved',x:1100,y:500,buttons:1});
  await chamar('Input.dispatchMouseEvent', {type:'mouseReleased',x:1100,y:500,button:'left',clickCount:1});
  assert.ok(Math.abs((await executar('NEXUS.controls.target.th'))-angulo)>.5);
  ok('áreas vazias da UI chegam ao canvas e permitem arrastar a câmera');

  await clicar('botao-saibamais');
  assert.equal(await executar('NEXUS.legend.isOpen()'), true);
  await clicar('botao-saibamais');
  assert.equal(await executar('NEXUS.legend.isOpen()'), false);
  await executar(`NEXUS.selectBody('criacao')`);
  await clicar('botao-saibamais');
  await chamar('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar('NEXUS.legend.isOpen()'), false);
  assert.equal(await executar('NEXUS.panel.isOpen()'), true);
  await chamar('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar('NEXUS.panel.isOpen()'), false);
  ok('Saiba Mais alterna e Esc fecha guia antes da seleção');

  await abrir();
  await executar(`let h=NEXUS.history.create(NEXUS.specs.helena);
    h=NEXUS.history.append(h,NEXUS.specs.helena);h=NEXUS.history.append(h,NEXUS.specs.helena);
    NEXUS.universeSource.saveHistory(h);NEXUS.ui.mostrarInicial();
    window.salvoAntes=localStorage.getItem('nexus:universo');document.getElementById('botao-comecar').click();`);
  await esperar('NEXUS.travado===false');
  assert.equal(await executar('NEXUS.state.chapter'), 2);
  assert.equal(await executar(`document.getElementById('botao-avancar').disabled
    && !document.getElementById('botao-retroceder').disabled`), true);
  await clicar('botao-retroceder');
  assert.equal(await executar('NEXUS.state.chapter'), 1);
  assert.equal(await executar(`document.querySelector('.legenda-barra').textContent`), 'Fase 2 de 3');
  await clicar('botao-avancar');
  assert.equal(await executar('NEXUS.state.chapter'), 2);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')===salvoAntes`), true);
  assert.equal(await executar('pedidos.length'), 0);
  ok('histórico abre última fase, navega sem rede e não regrava snapshots');

  await abrir();
  await executar(`NEXUS.universeSource.saveHistory(NEXUS.history.create(NEXUS.specs.helena));
    NEXUS.ui.mostrarInicial();document.getElementById('botao-comecar').click();`);
  await esperar('NEXUS.travado===false');
  assert.equal(await executar(`getComputedStyle(document.querySelector('.barra-centro')).visibility`), 'hidden');
  assert.equal(await executar(`document.getElementById('botao-avancar').disabled
    && document.getElementById('botao-retroceder').disabled`), true);
  assert.equal(await executar(`document.getElementById('botao-saibamais').getBoundingClientRect().left>1800`), true);
  assert.equal(await executar(`getComputedStyle(document.querySelector('.legenda-barra')).display`), 'none');
  await capturar('tela5-uma-fase');
  ok('uma fase oculta tempo e mantém Saiba Mais à direita');
  // Histórico vazio não é aceito no fluxo real. Simula apenas a lista vazia
  // para verificar o recálculo da UI sem pedir ao motor para montar outro universo.
  await executar(`window.caps=NEXUS.currentUniverse.chapters;
    NEXUS.currentUniverse.chapters=[];NEXUS.time.refresh();`);
  assert.equal(await executar(`document.getElementById('botao-avancar').disabled
    && document.getElementById('botao-retroceder').disabled`), true);
  await executar(`NEXUS.currentUniverse.chapters=caps;NEXUS.time.refresh();`);
  ok('lista vazia também deixa os dois botões desabilitados');
  assert.deepEqual(erros, []);
  ok('nenhuma exceção JavaScript não tratada');
  console.log('OK: ' + grupos + ' grupos no Edge; API simulada, sem Gemini real. Capturas: ' + pasta);
  await chamar('Browser.close');
}

testar().catch(erro => { console.error(erro); process.exitCode = 1; })
  .finally(() => { clearTimeout(limite); if (socket) socket.close(); navegador.kill(); });
