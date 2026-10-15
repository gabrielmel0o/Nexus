/* testMenuUI.js — testa as telas 8 e 9 no Edge, com perfil temporário isolado.
   Execute da raiz: node backend/test/testMenuUI.js
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
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-tela8-'));
const navegador = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + pasta,
  'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, dialogo, proximo = 0, grupos = 0;
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
    if (mensagem.method === 'Page.javascriptDialogOpening') dialogo = mensagem.params;
    if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails.text);
  };
  await chamar('Runtime.enable');
  await chamar('Page.enable');
  const downloads = path.join(pasta, 'downloads');
  fs.mkdirSync(downloads);
  await chamar('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await chamar('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  // Dados fictícios; a rede da aplicação fica proibida durante toda a prova.
  await chamar('Page.addScriptToEvaluateOnNewDocument', {source:
    `window.fetch=()=>{throw Error('O menu não pode chamar a API');};`});
  await abrir();
  await executar('localStorage.clear()');
  await clicar('botao-helena');
  await esperar('NEXUS.travado===false');
  await executar(`NEXUS.state.applyChapter(1);NEXUS.selectBody('criacao');NEXUS.legend.open();
    window.nos=[];NEXUS.scene.traverse(o=>nos.push(o.uuid));
    window.salvo=localStorage.getItem('nexus:universo');window.capitulo=NEXUS.state.chapter;`);
  await clicar('botao-menu');
  assert.equal(await executar(`!document.getElementById('tela-menu').classList.contains('oculto')
    && NEXUS.travado && !NEXUS.panel.isOpen() && !NEXUS.legend.isOpen()
    && document.getElementById('tela-visualizacao').classList.contains('oculto')
    && document.getElementById('fundo-desfocado').parentElement.id==='tela-menu'
    && document.activeElement.id==='botao-voltar-inicio'`), true);
  assert.equal(await executar(`document.querySelectorAll('#fundo-desfocado').length===1
    && !document.getElementById('botao-sair') && document.getElementById('logo-menu').naturalWidth>0`),true);
  await capturar('tela8-menu');
  const raio=await executar('NEXUS.controls.target.r');
  await chamar('Input.dispatchMouseEvent',{type:'mouseWheel',x:1500,y:500,deltaX:0,deltaY:9000});
  assert.equal(await executar('NEXUS.controls.target.r'),raio);
  await chamar('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar(`!NEXUS.travado && NEXUS.selected==='criacao'
    && document.getElementById('tela-menu').classList.contains('oculto')
    && !document.getElementById('tela-visualizacao').classList.contains('oculto')`),true);
  ok('menu aprovado, fundo único, painéis ocultos, zoom bloqueado e Esc preserva seleção');

  await clicar('botao-menu');
  await chamar('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:1500,y:500});
  await chamar('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:1500,y:500});
  assert.equal(await executar(`!NEXUS.travado && NEXUS.selected==='criacao'
    && document.getElementById('tela-menu').classList.contains('oculto')
    && NEXUS.state.chapter===capitulo
    && localStorage.getItem('nexus:universo')===salvo
    && (()=>{const a=[];NEXUS.scene.traverse(o=>a.push(o.uuid));return JSON.stringify(a)===JSON.stringify(nos);})()`),true);
  ok('clique fora é consumido; mesmos objetos, fase, seleção e armazenamento');

  await clicar('botao-menu');
  await clicar('botao-voltar-inicio');
  assert.equal(await executar(`NEXUS.saida.isOpen() && NEXUS.travado
    && document.getElementById('tela-menu').inert
    && document.activeElement.id==='botao-cancelar-sair'
    && document.getElementById('fundo-desfocado').parentElement.id==='tela-sair'
    && getComputedStyle(document.getElementById('fundo-desfocado')).zIndex==='15'
    && getComputedStyle(document.getElementById('tela-sair')).zIndex==='20'`),true);
  // Mede o resultado desenhado, inclusive o texto, em duas larguras de janela.
  for (const [width, height] of [[1366, 768], [1920, 1080]]) {
    await chamar('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false});
    const medidas = await executar(`(async()=>{
      await document.fonts.ready;
      const botoes=['botao-cancelar-sair','botao-confirmar-sair'].map(id=>document.getElementById(id));
      const base=document.querySelector('.modal-sair-base').getBoundingClientRect();
      return botoes.map(b=>{
        const r=b.getBoundingClientRect(),s=getComputedStyle(b);
        const texto=[...b.childNodes].find(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim());
        const faixa=document.createRange();faixa.selectNodeContents(texto);
        const t=faixa.getBoundingClientRect();
        return {largura:r.width,altura:r.height,esquerda:r.left-base.left,direita:base.right-r.right,
          fonte:s.fontSize,familia:s.fontFamily,peso:s.fontWeight,
          centroX:Math.abs((t.left+t.right-r.left-r.right)/2),
          centroY:Math.abs((t.top+t.bottom-r.top-r.bottom)/2)};
      });
    })()`);
    assert.ok(Math.abs(medidas[0].largura-medidas[1].largura)<1);
    assert.equal(medidas[0].altura,medidas[1].altura);
    assert.ok(Math.abs(medidas[0].esquerda-medidas[1].direita)<1);
    assert.equal(medidas[0].fonte,medidas[1].fonte);
    assert.equal(medidas[0].familia,medidas[1].familia);
    assert.equal(medidas[0].peso,medidas[1].peso);
    assert.ok(medidas.every(m=>m.centroX<1 && m.centroY<2));
  }
  ok('botões com larguras e alturas iguais, margens simétricas, fonte igual e textos centralizados em 1366 e 1920 px');
  await capturar('tela9-confirmacao');
  await chamar('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});
  assert.equal(await executar('document.activeElement.id'),'botao-confirmar-sair');
  await chamar('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8});
  assert.equal(await executar('document.activeElement.id'),'botao-cancelar-sair');
  await chamar('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:1500,y:950});
  await chamar('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:1500,y:950});
  assert.equal(await executar('NEXUS.saida.isOpen() && NEXUS.travado'),true);
  await clicar('botao-cancelar-sair');
  assert.equal(await executar(`!NEXUS.saida.isOpen() && NEXUS.travado
    && !document.getElementById('tela-menu').inert
    && document.activeElement.id==='botao-voltar-inicio'
    && document.getElementById('fundo-desfocado').parentElement.id==='tela-menu'
    && !document.getElementById('fundo-desfocado').classList.contains('desfoque-sobre-interfaces')`),true);
  await clicar('botao-voltar-inicio');
  await chamar('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  assert.equal(await executar(`!NEXUS.saida.isOpen() && NEXUS.travado
    && !document.getElementById('tela-menu').classList.contains('oculto')
    && NEXUS.selected==='criacao' && NEXUS.state.chapter===capitulo
    && localStorage.getItem('nexus:universo')===salvo
    && (()=>{const a=[];NEXUS.scene.traverse(o=>a.push(o.uuid));return JSON.stringify(a)===JSON.stringify(nos);})()`),true);
  await chamar('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  ok('tela 9: camadas, foco contido, clique fora bloqueado, cancelar e Esc preservam menu e universo');

  const {fixtures,history}=require('./testHistoryCompiler.js');
  const historico=history(fixtures());
  await executar(`NEXUS.universeSource.saveHistory(${JSON.stringify(historico)})`);
  await clicar('botao-menu');
  await clicar('botao-voltar-inicio');
  await clicar('botao-confirmar-sair');
  await esperar(`document.readyState==='complete' && window.NEXUS && NEXUS.start
    && !document.getElementById('tela-inicial').classList.contains('oculto')`);
  assert.equal(dialogo,undefined);
  assert.equal(await executar('NEXUS.universeStore.load().historico.capitulos.length'),historico.capitulos.length);
  assert.equal(await executar(`location.protocol==='file:' && location.pathname.endsWith('/nexus/index.html')`),true);
  ok('histórico salvo sobrevive ao retorno ao mesmo index.html, sem confirmação');

  await clicar('botao-comecar');
  await esperar('NEXUS.travado===false');
  // Simula falha real de gravação: mantém o histórico antigo no disco e o novo em memória.
  await executar(`window.disco=localStorage.getItem('nexus:universo');
    Storage.prototype.setItem=function(){throw Error('Quota fictícia');};
    NEXUS.universeStore.generate(${JSON.stringify(fixtures()[0])});`);
  assert.equal(await executar('NEXUS.universeStore.load().emMemoria'),true);
  await clicar('botao-menu');
  await clicar('botao-voltar-inicio');
  const cancelar=executar(`document.getElementById('botao-confirmar-sair').click()`);
  for(let i=0;i<100&&!dialogo;i++) await pausa(50);
  assert.equal(dialogo.type,'confirm');
  assert.match(dialogo.message,/somente na memória/);
  await chamar('Page.handleJavaScriptDialog',{accept:false});
  await cancelar;
  assert.equal(await executar(`NEXUS.universeStore.load().emMemoria
    && NEXUS.saida.isOpen()
    && !document.getElementById('tela-menu').classList.contains('oculto')
    && localStorage.getItem('nexus:universo')===disco`),true);
  ok('cancelar confirmação mantém o resultado em memória e o disco anterior');

  dialogo=undefined;
  const aceitar=executar(`document.getElementById('botao-confirmar-sair').click()`).catch(()=>{});
  for(let i=0;i<100&&!dialogo;i++) await pausa(50);
  assert.equal(dialogo.type,'confirm');
  await chamar('Page.handleJavaScriptDialog',{accept:true});
  await aceitar;
  await esperar(`document.readyState==='complete' && window.NEXUS && NEXUS.start
    && !document.getElementById('tela-inicial').classList.contains('oculto')`);
  assert.equal(await executar('NEXUS.universeStore.load().historico.capitulos.length'),historico.capitulos.length);
  ok('aceitar retorna ao início; histórico anterior em disco permanece intacto');
  assert.deepEqual(erros,[]);
  ok('nenhuma exceção JavaScript não tratada e nenhuma chamada à API');
  console.log('OK: '+grupos+' grupos no Edge. Capturas: '+pasta);
  await chamar('Browser.close');
}

testar().catch(erro=>{console.error(erro);process.exitCode=1;})
  .finally(()=>{clearTimeout(limite);if(socket)socket.close();navegador.kill();});
