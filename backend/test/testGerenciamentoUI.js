/* testGerenciamentoUI.js — testa a tela 4 no Edge, com perfil temporário isolado.
   Execute da raiz: node backend/test/testGerenciamentoUI.js
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
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-tela4-'));
const navegador = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + pasta,
  'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, proximo = 0, grupos = 0;
const pendentes = new Map(), erros = [];
let dialogo = null;
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
  await esperar('!!(window.NEXUS && NEXUS.gerenciamento && NEXUS.start)');
  await executar(`document.getElementById('botao-gerenciamento').click()`);
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

  // Arquivos e diálogos são reais; todos os dados pertencem ao perfil fictício.
  async function importarArquivo(nome, texto) {
    const destino = path.join(pasta, nome);
    fs.writeFileSync(destino, texto, 'utf8');
    const documento = await chamar('DOM.getDocument');
    const entrada = await chamar('DOM.querySelector', { nodeId: documento.root.nodeId,
      selector: '#tela-gerenciamento input[type=file]' });
    await chamar('DOM.setFileInputFiles', { nodeId: entrada.nodeId, files: [destino] });
    await esperar(`document.getElementById('painel-gerenciamento').getAttribute('aria-busy') === 'false'`);
  }
  async function excluir(aceitar) {
    dialogo = null;
    const clique = executar(`document.getElementById('botao-apagar-historico').click()`);
    for (let i = 0; i < 50 && !dialogo; i++) await pausa(100);
    assert.ok(dialogo, 'A exclusão deve pedir confirmação.');
    assert.equal(dialogo.type, 'confirm');
    await chamar('Page.handleJavaScriptDialog', { accept: aceitar });
    await clique;
  }
  await abrir();
  assert.equal(await executar(`document.getElementById('contagem-fases').textContent`), '0 fase(s)');
  assert.equal(await executar(`document.getElementById('botao-baixar-historico').disabled && document.getElementById('botao-apagar-historico').disabled`), true);
  assert.equal(await executar(`document.getElementById('fundo-desfocado').parentElement.id`), 'tela-gerenciamento');
  await executar('document.fonts.ready');
  await capturar('tela4-vazia');
  ok('sem histórico, contagem zero, ações indisponíveis e desfoque compartilhado');

  const historico = await executar(`(()=>{let h=NEXUS.history.create(NEXUS.specs.helena);
    h=NEXUS.history.append(h,NEXUS.specs.helena);h=NEXUS.history.append(h,NEXUS.specs.helena);
    return NEXUS.history.serialize(h);})()`);
  await importarArquivo('tres-fases.json', historico);
  assert.equal(await executar(`document.getElementById('contagem-fases').textContent`), '3 fase(s)');
  assert.equal(await executar(`document.getElementById('tela-gerenciamento').classList.contains('oculto') || !!NEXUS.currentUniverse`), false);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')`), historico);
  await capturar('tela4-importada');
  ok('seletor real importa três fases completas e permanece no gerenciamento sem boot');

  await executar(`document.getElementById('botao-baixar-historico').click()`);
  const baixado = path.join(downloads, 'nexus-historico.json');
  for (let i = 0; i < 100 && !fs.existsSync(baixado); i++) await pausa(100);
  assert.ok(fs.existsSync(baixado));
  assert.deepEqual(JSON.parse(fs.readFileSync(baixado, 'utf8')), JSON.parse(historico));
  ok('download real contém todas as fases e metadados');

  for (const [nome, conteudo] of [['invalido.json', '{'], ['versao.json', '{"versao":999}'],
    ['grande.json', 'a'.repeat(1024 * 1024 + 1)]]) {
    await importarArquivo(nome, conteudo);
    assert.equal(await executar(`localStorage.getItem('nexus:universo')`), historico);
    assert.equal(await executar('NEXUS.universeStore.load().historico.capitulos.length'), 3);
  }
  // O mesmo arquivo pode ser escolhido novamente, depois de uma falha.
  await importarArquivo('invalido.json', '{');
  assert.equal(await executar(`document.querySelector('#tela-gerenciamento input[type=file]').value`), '');
  ok('JSON inválido, versão desconhecida, bytes excedidos e nova seleção preservam dados');

  const legado = JSON.stringify({ versao: 1, salvoEm: '2026-10-15T12:00:00.000Z',
    especificacao: JSON.parse(historico).capitulos[0].especificacao });
  await importarArquivo('legado.json', legado);
  assert.equal(await executar('NEXUS.universeStore.load().historico.capitulos.length'), 1);
  await importarArquivo('tres-fases.json', historico);
  ok('importação antiga migra para uma fase; histórico completo volta sem backend');

  await executar(`window.compilarOriginal=NEXUS.compileHistory;NEXUS.compileHistory=()=>{throw Error('Falha fictícia de compilação');}`);
  await importarArquivo('tres-fases.json', historico);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')`), historico);
  await executar('NEXUS.compileHistory=compilarOriginal');
  ok('falha de compilação não substitui o histórico válido');

  // A leitura demorada mantém a tela ocupada, sem duplicar importações/exclusões.
  await executar(`window.lerOriginal=File.prototype.text;File.prototype.text=function(){return new Promise(resolve=>{
    window.liberarImportacao=()=>lerOriginal.call(this).then(resolve);});}`);
  const doc = await chamar('DOM.getDocument');
  const entrada = await chamar('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#tela-gerenciamento input[type=file]' });
  await chamar('DOM.setFileInputFiles', { nodeId: entrada.nodeId, files: [path.join(pasta, 'tres-fases.json')] });
  assert.equal(await executar(`document.getElementById('botao-voltar-gerenciamento').disabled && document.getElementById('botao-apagar-historico').disabled && document.getElementById('botao-importar-historico').disabled`), true);
  await executar('liberarImportacao();File.prototype.text=lerOriginal');
  await esperar(`!document.getElementById('botao-voltar-gerenciamento').disabled`);
  ok('importação em andamento bloqueia operações concorrentes e retorno');

  await executar(`localStorage.setItem('chave-alheia','preservar')`);
  await excluir(false);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')`), historico);
  await excluir(true);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')`), null);
  assert.equal(await executar(`localStorage.getItem('chave-alheia')`), 'preservar');
  assert.equal(await executar(`document.getElementById('contagem-fases').textContent`), '0 fase(s)');
  await executar(`document.getElementById('botao-voltar-gerenciamento').click()`);
  assert.equal(await executar(`document.getElementById('botao-atualizar').disabled`), true);
  await executar(`document.getElementById('botao-gerenciamento').click()`);
  ok('cancelar preserva histórico; confirmar apaga somente NEXUS e sincroniza início');

  await importarArquivo('tres-fases.json', historico);
  await executar(`window.removerOriginal=Storage.prototype.removeItem;Storage.prototype.removeItem=()=>{throw Error('Exclusão bloqueada');}`);
  await excluir(true);
  assert.equal(await executar('NEXUS.universeStore.load().historico.capitulos.length'), 3);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')`), historico);
  await executar('Storage.prototype.removeItem=removerOriginal');
  ok('exclusão bloqueada preserva memória e disco e informa falha');

  await executar(`Storage.prototype.setItem=()=>{throw Error('Quota fictícia');}`);
  const novo = JSON.parse(historico);
  novo.capitulos.push(JSON.parse(JSON.stringify(novo.capitulos[2])));
  await importarArquivo('quatro-fases.json', JSON.stringify(novo));
  assert.equal(await executar('NEXUS.universeStore.load().historico.capitulos.length'), 4);
  assert.equal(await executar(`localStorage.getItem('nexus:universo')`), historico);
  assert.equal(await executar(`document.getElementById('contagem-fases').textContent`), '4 fase(s)');
  assert.equal(await executar(`document.querySelector('#tela-gerenciamento [role=status]').textContent.includes('memória')`), true);
  await capturar('tela4-memoria');
  ok('quota preserva disco anterior e mantém histórico importado inteiro em memória');

  assert.equal(await executar('pedidos.length'), 0);
  assert.equal(await executar('!!NEXUS.currentUniverse'), false);
  ok('gerenciamento não chama API nem monta universo');
  assert.deepEqual(erros, []);
  ok('nenhuma exceção JavaScript não tratada');
  console.log('OK: ' + grupos + ' grupos no Edge; API simulada, sem Gemini real. Capturas: ' + pasta);
  await chamar('Browser.close');
}

testar().catch(erro => { console.error(erro); process.exitCode = 1; })
  .finally(() => { clearTimeout(limite); if (socket) socket.close(); navegador.kill(); });
