/* testLauncher.js — Processos e HTTP reais em cópia temporária com .env fictício.
   Não abre o .env do projeto, navegador, Gemini ou servidores do usuário. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { fork, spawn } = require('node:child_process');
const { once } = require('node:events');
const { pathToFileURL } = require('node:url');
const raiz = path.resolve(__dirname, '../..');
const temporaria = fs.mkdtempSync(path.join(os.tmpdir(), 'NEXUS espaço e acentuação '));
const copia = path.join(temporaria, 'projeto');
const filhos = [];
let grupos = 0;
async function teste(nome, fn) { await fn(); grupos++; console.log('[OK] ' + nome); }
async function portaLivre() {
  const s = http.createServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening');
  const port = s.address().port; await new Promise(resolve => s.close(resolve)); return port;
}
async function encerrar(filho) {
  if (filho.exitCode !== null || filho.signalCode !== null) return;
  const saiu = once(filho, 'exit');
  if (filho.connected) filho.disconnect(); else filho.kill();
  await saiu;
}
async function run() {
  // Copia apenas arquivos públicos necessários, nunca enumera/lê backend/.env.
  fs.mkdirSync(path.join(copia, 'backend'), { recursive: true });
  for (const nome of ['iniciar.js', 'readiness.js', 'server.js', 'gemini.js', 'prompt.js']) {
    fs.copyFileSync(path.join(raiz, 'backend', nome), path.join(copia, 'backend', nome));
  }
  fs.cpSync(path.join(raiz, 'nexus/js/data'), path.join(copia, 'nexus/js/data'), { recursive: true });
  fs.copyFileSync(path.join(raiz, 'nexus/index.html'), path.join(copia, 'nexus/index.html'));
  const launcher = require(path.join(copia, 'backend/iniciar.js'));
  const port = await portaLivre();
  const envPath = path.join(copia, 'backend/.env');
  fs.writeFileSync(envPath, 'PORT=' + port + '\nMODO_SIMULADO=1\nGEMINI_API_KEY=SEGREDO_FICTICIO_NAO_EXIBIR\n');
  let config, servidor, aberturas = 0;
  const abrir = async () => {
    assert.equal(launcher.compativel(await launcher.consultar(port), config), true, 'Só abre depois de pronto');
    aberturas++;
  };
  const iniciar = () => {
    const filho = fork(path.join(copia, 'backend/server.js'), [], {
      cwd: os.tmpdir(), execArgv: ['--env-file=' + envPath],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true
    }); filhos.push(filho); return filho;
  };
  await teste('configuração isolada e caminhos com espaços/acentos; sem chave no IPC', async () => {
    config = await launcher.carregarConfiguracao();
    assert.equal(config.port, String(port)); assert.equal(config.simulado, true);
    assert.equal(JSON.stringify(config).includes('SEGREDO'), false);
  });
  await teste('configuração sem chave e sem simulação sinaliza indisponibilidade sem pedir IA', async () => {
    fs.writeFileSync(envPath, 'PORT=' + port + '\nMODO_SIMULADO=0\n');
    const semChave = await launcher.carregarConfiguracao(); assert.equal(semChave.pronto, false);
    fs.writeFileSync(envPath, 'PORT=' + port + '\nMODO_SIMULADO=1\nGEMINI_API_KEY=SEGREDO_FICTICIO_NAO_EXIBIR\n');
  });
  await teste('tudo fechado: inicia servidor real e só solicita navegador depois de pronto', async () => {
    const result = await launcher.preparar(config, { abrir, iniciar });
    assert.equal(result.reutilizado, false); servidor = result.filho; assert.equal(aberturas, 1);
    const resposta = await launcher.consultar(port);
    assert.equal(resposta.dados.processo, servidor.pid);
    assert.deepEqual(Object.keys(resposta.dados).sort(), ['aplicativo', 'processo', 'projeto', 'pronto', 'protocolo', 'simulado']);
    assert.equal(JSON.stringify(resposta).includes('SEGREDO'), false);
  });
  await teste('segunda abertura e backend já ativo: reutiliza sem iniciar processo', async () => {
    const result = await launcher.preparar(config, { abrir, iniciar: () => { throw Error('Duplicou'); } });
    assert.equal(result.reutilizado, true); assert.equal(aberturas, 2);
    assert.equal((await launcher.consultar(port)).dados.processo, servidor.pid);
  });
  await teste('modo ou cópia incompatível: recusa sem encerrar servidor existente', async () => {
    await assert.rejects(launcher.preparar({ ...config, simulado: false }, { abrir, iniciar }), /ocupada/);
    await assert.rejects(launcher.preparar({ ...config, projeto: 'outra-copia' }, { abrir, iniciar }), /ocupada/);
    assert.equal((await launcher.consultar(port)).dados.processo, servidor.pid);
  });
  await teste('encerramento por IPC e nova abertura', async () => {
    await encerrar(servidor); assert.equal((await launcher.consultar(port)).tipo, 'livre');
    const result = await launcher.preparar(config, { abrir, iniciar });
    servidor = result.filho; assert.equal(result.reutilizado, false);
    await encerrar(servidor);
  });
  await teste('backend iniciado manualmente sem IPC também é reutilizado e preservado', async () => {
    const manual = spawn(process.execPath, ['--env-file=' + envPath, path.join(copia, 'backend/server.js')], {
      cwd: os.tmpdir(), stdio: 'ignore', windowsHide: true
    }); filhos.push(manual);
    for (let i = 0; i < 50; i++) {
      if (launcher.compativel(await launcher.consultar(port), config)) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const result = await launcher.preparar(config, { abrir, iniciar: () => { throw Error('Duplicou'); } });
    assert.equal(result.reutilizado, true);
    assert.equal((await launcher.consultar(port)).dados.processo, manual.pid);
    await encerrar(manual); // Só o servidor fictício criado aqui.
  });
  await teste('fechamento abrupto do processo pai desconecta e encerra o backend filho', async () => {
    const helper = path.join(copia, 'backend/pai-de-teste.js');
    fs.writeFileSync(helper, "const { fork } = require('node:child_process');\n" +
      "fork(require('node:path').join(__dirname, 'server.js'), [], { execArgv: ['--env-file=' + require('node:path').join(__dirname, '.env')], stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true });\n");
    const pai = spawn(process.execPath, [helper], { stdio: 'ignore', windowsHide: true }); filhos.push(pai);
    let pronto = false;
    for (let i = 0; i < 50; i++) {
      if (launcher.compativel(await launcher.consultar(port), config)) { pronto = true; break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(pronto, true);
    await encerrar(pai); // Simula fechamento da janela; somente o pai fictício criado aqui.
    let livre = false;
    for (let i = 0; i < 50; i++) {
      if ((await launcher.consultar(port)).tipo === 'livre') { livre = true; break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(livre, true);
  });
  await teste('duas aberturas simultâneas mantêm somente um servidor e identificam o proprietário', async () => {
    const results = await Promise.all([launcher.preparar(config, { abrir, iniciar }), launcher.preparar(config, { abrir, iniciar })]);
    assert.equal(results.filter(r => r.reutilizado).length, 1);
    const proprio = results.find(r => r.filho).filho;
    assert.equal((await launcher.consultar(port)).dados.processo, proprio.pid);
    await encerrar(proprio);
  });
  await teste('falha de inicialização do servidor não solicita abertura como se estivesse pronto', async () => {
    const iniciarComFalha = () => {
      const filho = spawn(process.execPath, ['-e', 'process.exit(1)'], { stdio: 'ignore', windowsHide: true });
      filhos.push(filho); return filho;
    };
    await assert.rejects(launcher.preparar(config, { abrir: () => { throw Error('Abriu antes de pronto'); }, iniciar: iniciarComFalha }), /servidor não iniciou/);
  });
  await teste('porta ocupada por outro programa: não inicia nem encerra processos', async () => {
    const outro = http.createServer((_req, res) => res.end('Outro programa'));
    outro.listen(port, '127.0.0.1'); await once(outro, 'listening');
    try {
      await assert.rejects(launcher.preparar(config, { abrir, iniciar: () => { throw Error('Iniciou indevidamente'); } }), /ocupada/);
      assert.equal(outro.listening, true);
    } finally { await new Promise(resolve => outro.close(resolve)); }
  });
  await teste('falha ao abrir navegador encerra somente o filho desta tentativa', async () => {
    await assert.rejects(launcher.preparar(config, { abrir: async () => { throw Error('Navegador indisponível'); }, iniciar }), /Navegador/);
    await encerrar(filhos.at(-1));
    assert.equal((await launcher.consultar(port)).tipo, 'livre');
  });
  await teste('.env ausente: mensagem visível e alternativa Helena; nenhum segredo na saída', async () => {
    fs.unlinkSync(envPath); // Somente o arquivo fictício criado pelo teste.
    const filho = spawn(process.execPath, [path.join(copia, 'backend/iniciar.js')], {
      cwd: os.tmpdir(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true
    }); filhos.push(filho);
    let saida = '';
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Mensagem não apareceu')), 5000);
      filho.stdout.on('data', chunk => {
        saida += chunk.toString();
        if (saida.includes('Pressione Enter para abrir Helena')) { clearTimeout(timer); resolve(); }
      });
    });
    assert.match(saida, /Falta backend\/\.env/); assert.equal(saida.includes('SEGREDO'), false);
    await encerrar(filho);
  });
  await teste('URL file idêntica ao index original e HTML preservado', async () => {
    const url = pathToFileURL(path.join(raiz, 'nexus/index.html')).href;
    assert.equal(new URL(url).protocol, 'file:');
    assert.equal(url.includes('?'), false); assert.equal(url.includes('#'), false);
    assert.equal(fs.readFileSync(path.join(raiz, 'nexus/index.html'), 'utf8'), fs.readFileSync(path.join(copia, 'nexus/index.html'), 'utf8'));
    // Isso confere o endereço, não o localStorage do navegador real.
  });
  console.log('PASSOU: ' + grupos + ' grupos. Navegador/atalho/download e localStorage visual não executados.');
}
run().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(async () => {
  for (const filho of filhos) await encerrar(filho);
  // A pasta é a criada acima por mkdtemp, nunca uma pasta do usuário.
  fs.rmSync(temporaria, { recursive: true, force: true });
});
