/* testAstroUI.js — testa a tela 7 no Edge, com perfil temporário isolado.
   Execute da raiz: node backend/test/testAstroUI.js
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
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-tela7-'));
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
  await clicar('botao-helena');
  await esperar('NEXUS.travado===false');
  await executar(`NEXUS.selectBody('criacao')`);
  assert.equal(await executar(`document.querySelectorAll('.nexus-panel').length`), 0);
  assert.equal(await executar(`document.getElementById('nome-astro').textContent`), 'A criação');
  assert.equal(await executar(`document.getElementById('tela-astro').classList.contains('oculto')`), false);
  assert.equal(await executar(`document.getElementById('painel-astro').getBoundingClientRect().right<900`), true);
  assert.equal(await executar(`document.getElementById('citacao-astro').textContent===NEXUS.currentUniverse.laws.luz`), true);
  assert.equal(await executar(`document.querySelectorAll('#pontos-peso-astro .ponto-astro').length`), 5);
  await capturar('tela7-astro');
  ok('painel aprovado à esquerda, sem duplicação, dados e lei do universo ativo');

  await pausa(1800);
  assert.equal(await executar(`(()=>{const p=NEXUS.pickRegistry.criacao.getPos().clone().project(NEXUS.cam);
    const esperado=document.getElementById('painel-astro').getBoundingClientRect().right/innerWidth;
    return Math.abs(p.x-esperado)<.08;})()`), true);
  const chegada = await executar('NEXUS.controls.target.r');
  await chamar('Input.dispatchMouseEvent', {type:'mouseWheel',x:1000,y:800,deltaX:0,deltaY:100000});
  await pausa(100);
  assert.equal(await executar('NEXUS.controls.target.r'), chegada*3);
  await executar('window.dispatchEvent(new Event("resize"))');
  await chamar('Input.dispatchMouseEvent', {type:'mouseWheel',x:1000,y:800,deltaX:0,deltaY:100000});
  await pausa(100);
  assert.equal(await executar('NEXUS.controls.target.r'), chegada*3);
  ok('painel aberto desloca astro à direita e afastamento máximo acompanha tamanho da seleção');

  await executar(`NEXUS.state.applyChapter(1)`);
  assert.equal(await executar(`(()=>{const i=NEXUS.currentUniverse.systems.find(s=>s.id==='criacao').center.info;
    return !!i.notes[1] && document.getElementById('texto-fase').textContent.includes(i.notes[1]);})()`), true);
  await clicar('botao-retroceder');
  assert.equal(await executar(`document.querySelector('.legenda-barra').textContent.startsWith('Fase 1 de 4')`), true);
  ok('nota do capítulo no bloco FASE e legenda temporal acima da barra preservadas');

  await clicar('botao-saibamais');
  assert.equal(await executar(`(()=>{const a=document.getElementById('painel-astro').getBoundingClientRect();
    const g=document.getElementById('painel-saibamais').getBoundingClientRect();return a.right<g.left;})()`), true);
  await capturar('tela7-com-guia');
  await chamar('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar('NEXUS.panel.isOpen() && !NEXUS.legend.isOpen()'), true);
  await clicar('botao-fechar-astro');
  assert.equal(await executar('NEXUS.panel.isOpen()'), false);
  assert.equal(await executar('NEXUS.selected'), 'criacao');
  assert.equal(await executar(`document.getElementById('tela-astro').classList.contains('oculto')`), true);
  await pausa(1800);
  assert.equal(await executar(`Math.abs(NEXUS.pickRegistry.criacao.getPos().clone().project(NEXUS.cam).x)<.08`), true);
  await capturar('astro-centralizado-sem-painel');
  await executar(`NEXUS.selectBody('criacao')`);
  await pausa(1800);
  assert.equal(await executar(`NEXUS.cam.view.enabled && NEXUS.cam.view.offsetX<0`), true);
  await chamar('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar('!!NEXUS.selected'), false);
  ok('guia prioriza Esc; fechar mantém seleção centralizada e reabrir recupera enquadramento lateral');

  await executar(`NEXUS.selectBody('carreira')`);
  await pausa(1800);
  assert.equal(await executar(`(()=>{const p=NEXUS.pickRegistry.carreira.getPos().clone().project(NEXUS.cam);
    const esperado=document.getElementById('painel-astro').getBoundingClientRect().right/innerWidth;
    return Math.abs(p.x-esperado)<.15;})()`), true);
  await clicar('botao-fechar-astro');
  await pausa(1800);
  assert.equal(await executar('NEXUS.selected'), 'carreira');
  assert.equal(await executar(`Math.abs(NEXUS.pickRegistry.carreira.getPos().clone().project(NEXUS.cam).x)<.15`), true);
  await executar('NEXUS.deselectBody()');
  ok('planeta em movimento acompanha os dois enquadramentos sem perder seleção ou órbita');

  // Reutiliza as fixtures existentes: massa zero, texto hostil e ausência/reaparecimento.
  const { fixtures, history } = require('./testHistoryCompiler.js');
  const historico = history(fixtures());
  await abrir();
  await executar(`NEXUS.universeSource.saveHistory(${JSON.stringify(historico)});
    NEXUS.ui.mostrarInicial();document.getElementById('botao-comecar').click();`);
  await esperar('NEXUS.travado===false');
  await executar(`NEXUS.selectBody('criacao');window.nos=[];NEXUS.scene.traverse(o=>nos.push(o.uuid));
    window.salvo=localStorage.getItem('nexus:universo');`);
  await clicar('botao-retroceder');
  assert.equal(await executar(`document.getElementById('descricao-astro').textContent.includes('<img src=x')`), true);
  assert.equal(await executar(`document.querySelectorAll('#painel-astro img').length`), 0);
  assert.equal(await executar(`document.querySelectorAll('#pontos-peso-astro .ativo').length`), 0);
  assert.equal(await executar(`document.getElementById('pontos-peso-astro').getAttribute('title')`), 'Massa: 0/10');
  assert.equal(await executar(`document.getElementById('valor-profundidade').textContent`), 'inobservável');
  await capturar('tela7-massa-zero');
  await clicar('botao-avancar');
  assert.equal(await executar(`document.getElementById('descricao-astro').textContent.includes('<img src=x')`), false);
  assert.equal(await executar(`document.querySelectorAll('#pontos-peso-astro .ativo').length>0`), true);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')===salvo`), true);
  ok('textos e profundidade acompanham a fase, HTML é texto e massa zero não recupera valor antigo');

  await executar(`NEXUS.selectBody('mae')`);
  await clicar('botao-retroceder');
  assert.equal(await executar(`NEXUS.panel.isOpen() || !!NEXUS.selected`), false);
  await clicar('botao-avancar');
  await executar(`NEXUS.selectBody('mae')`);
  assert.equal(await executar('NEXUS.panel.isOpen()'), true);
  assert.equal(await executar(`(()=>{const agora=[];NEXUS.scene.traverse(o=>agora.push(o.uuid));return JSON.stringify(agora)===JSON.stringify(nos);})()`), true);
  ok('astro ausente fecha painel e seleção; reaparecimento reutiliza os mesmos objetos');

  await chamar('Emulation.setDeviceMetricsOverride', {width:1280,height:400,deviceScaleFactor:1,mobile:false});
  const ponto = await executar(`(()=>{const p=document.getElementById('painel-astro'),r=p.getBoundingClientRect();return {x:r.x+30,y:r.y+70,rolavel:p.scrollHeight>p.clientHeight};})()`);
  assert.equal(ponto.rolavel, true);
  const raio = await executar('NEXUS.controls.target.r');
  await chamar('Input.dispatchMouseEvent', {type:'mouseWheel',x:ponto.x,y:ponto.y,deltaX:0,deltaY:400});
  await pausa(300);
  assert.ok(await executar(`document.getElementById('painel-astro').scrollTop>0`));
  assert.equal(await executar('NEXUS.controls.target.r'), raio);
  assert.equal(await executar('pedidos.length'), 0);
  ok('rolagem interna não altera zoom; seleção e histórico não chamam API');
  assert.deepEqual(erros, []);
  ok('nenhuma exceção JavaScript não tratada');
  console.log('OK: ' + grupos + ' grupos no Edge; API simulada, sem Gemini real. Capturas: ' + pasta);
  await chamar('Browser.close');
}

testar().catch(erro => { console.error(erro); process.exitCode = 1; })
  .finally(() => { clearTimeout(limite); if (socket) socket.close(); navegador.kill(); });
