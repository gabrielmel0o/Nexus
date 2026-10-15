/* testSaibaMaisUI.js — testa a tela 6 no Edge, com perfil temporário isolado.
   Execute da raiz: node backend/test/testSaibaMaisUI.js
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
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-tela6-'));
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
  await executar(`window.barraOriginal=document.getElementById('barra-inferior');
    window.cenaOriginal=[];NEXUS.scene.traverse(o=>cenaOriginal.push(o.uuid));`);
  await clicar('botao-saibamais');
  assert.equal(await executar(`document.getElementById('tela-saibamais').classList.contains('oculto')`), false);
  assert.equal(await executar(`document.querySelectorAll('.nexus-legend').length`), 0);
  assert.equal(await executar(`document.querySelectorAll('#barra-inferior').length`), 1);
  assert.equal(await executar(`document.getElementById('barra-inferior')===barraOriginal`), true);
  assert.equal(await executar(`document.getElementById('botao-saibamais').getAttribute('aria-expanded')`), 'true');
  assert.equal(await executar(`document.querySelectorAll('#painel-saibamais .item-definicao').length`), 8);
  assert.equal(await executar(`document.querySelector('#painel-saibamais').getBoundingClientRect().left>1400`), true);
  assert.equal(await executar(`document.querySelector('#fundo-desfocado').getBoundingClientRect().width`), 0);
  await capturar('tela6-guia');
  ok('guia aprovado à direita, oito definições, sem desfoque ou barra duplicada');

  await clicar('botao-avancar');
  assert.equal(await executar('NEXUS.state.chapter'), 1);
  assert.equal(await executar('NEXUS.legend.isOpen()'), true);
  await clicar('botao-retroceder');
  assert.equal(await executar('NEXUS.state.chapter'), 0);
  assert.equal(await executar('NEXUS.legend.isOpen()'), true);
  assert.equal(await executar(`(()=>{const agora=[];NEXUS.scene.traverse(o=>agora.push(o.uuid));return JSON.stringify(agora)===JSON.stringify(cenaOriginal);})()`), true);
  ok('navegar mantém guia aberto, botões únicos e recursos da cena preservados');

  assert.equal(await executar(`document.elementFromPoint(900,500).tagName`), 'CANVAS');
  const angulo = await executar('NEXUS.controls.target.th');
  await chamar('Input.dispatchMouseEvent', {type:'mouseMoved',x:900,y:500});
  await chamar('Input.dispatchMouseEvent', {type:'mousePressed',x:900,y:500,button:'left',clickCount:1});
  await chamar('Input.dispatchMouseEvent', {type:'mouseMoved',x:1100,y:500,buttons:1});
  await chamar('Input.dispatchMouseEvent', {type:'mouseReleased',x:1100,y:500,button:'left',clickCount:1});
  assert.ok(Math.abs((await executar('NEXUS.controls.target.th'))-angulo)>.5);
  assert.equal(await executar('NEXUS.legend.isOpen()'), true);
  ok('guia permite arrasto do canvas nas áreas livres');

  await executar(`document.getElementById('painel-saibamais').focus()`);
  await chamar('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar('NEXUS.legend.isOpen()'), false);
  assert.equal(await executar(`document.activeElement.id`), 'botao-saibamais');
  assert.equal(await executar(`document.getElementById('botao-saibamais').getAttribute('aria-expanded')`), 'false');
  await clicar('botao-saibamais');
  await clicar('botao-saibamais');
  assert.equal(await executar('NEXUS.legend.isOpen()'), false);
  ok('Esc fecha guia e devolve foco; botão ? também alterna');

  await executar(`NEXUS.selectBody('criacao')`);
  await clicar('botao-saibamais');
  assert.equal(await executar('NEXUS.panel.isOpen() && NEXUS.legend.isOpen()'), true);
  assert.equal(await executar(`(()=>{const a=document.querySelector('.nexus-panel').getBoundingClientRect();
    const g=document.getElementById('painel-saibamais').getBoundingClientRect();
    const x=(Math.max(a.left,g.left)+Math.min(a.right,g.right))/2;
    const y=(Math.max(a.top,g.top)+Math.min(a.bottom,g.bottom))/2;
    return a.left>1000 && g.left>1000 && !!document.elementFromPoint(x,y).closest('#painel-saibamais');})()`), true);
  await capturar('tela6-com-astro');
  await chamar('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar('NEXUS.panel.isOpen() && !NEXUS.legend.isOpen()'), true);
  await chamar('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar('NEXUS.panel.isOpen()'), false);
  ok('painéis à direita, guia acima na sobreposição e Esc preserva seleção');

  await chamar('Emulation.setDeviceMetricsOverride', {width:1280,height:400,deviceScaleFactor:1,mobile:false});
  await clicar('botao-saibamais');
  const ponto = await executar(`(()=>{const p=document.getElementById('painel-saibamais');const r=p.getBoundingClientRect();return {x:r.x+30,y:r.y+100,rolavel:p.scrollHeight>p.clientHeight};})()`);
  assert.equal(ponto.rolavel, true);
  const raio = await executar('NEXUS.controls.target.r');
  await chamar('Input.dispatchMouseEvent', {type:'mouseWheel',x:ponto.x,y:ponto.y,deltaX:0,deltaY:400});
  await pausa(300);
  assert.ok(await executar(`document.getElementById('painel-saibamais').scrollTop>0`));
  assert.equal(await executar('NEXUS.controls.target.r'), raio);
  await capturar('tela6-rolagem');
  assert.equal(await executar('pedidos.length'), 0);
  ok('rolagem interna em janela baixa não altera zoom nem chama API');
  assert.deepEqual(erros, []);
  ok('nenhuma exceção JavaScript não tratada');
  console.log('OK: ' + grupos + ' grupos no Edge; API simulada, sem Gemini real. Capturas: ' + pasta);
  await chamar('Browser.close');
}

testar().catch(erro => { console.error(erro); process.exitCode = 1; })
  .finally(() => { clearTimeout(limite); if (socket) socket.close(); navegador.kill(); });
