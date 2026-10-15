/* iniciar.js — Abertura local pelo atalho que chama explicitamente node.exe.
   Só o Node filho carrega .env; nenhum conteúdo desse arquivo vai para a saída.
   O backend não recebe relatos neste fluxo e nenhum pedido é feito ao Gemini. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { fork, execFile } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const readline = require('node:readline');
const { status } = require('./readiness.js');
const pasta = __dirname;
const arquivoEnv = path.join(pasta, '.env');
const index = path.resolve(pasta, '../nexus/index.html');

function ambienteDoBackend() {
  const env = { ...process.env };
  // A configuração do NEXUS vem do .env, não de variáveis antigas do terminal.
  for (const nome of Object.keys(env)) {
    if (['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_MODEL_RESERVA', 'PORT', 'MODO_SIMULADO'].includes(nome.toUpperCase())) delete env[nome];
  }
  return env;
}

// Esta execução isolada devolve somente configuração não secreta por IPC.
function enviarConfiguracao() {
  const port = process.env.PORT || '3000';
  process.send({ port, ...status() }, () => process.disconnect());
}

function carregarConfiguracao() {
  return new Promise((resolve, reject) => {
    const filho = fork(__filename, ['--configuracao'], {
      cwd: pasta, execArgv: ['--env-file=' + arquivoEnv],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true, env: ambienteDoBackend()
    });
    let recebido;
    const timer = setTimeout(() => { filho.kill(); reject(new Error('Não foi possível carregar a configuração. Confira backend/.env.')); }, 5000);
    filho.on('message', valor => { recebido = valor; });
    filho.on('error', () => { clearTimeout(timer); reject(new Error('Não foi possível iniciar o Node. Confira a instalação e o atalho.')); });
    filho.on('exit', code => {
      clearTimeout(timer);
      if (code === 0 && recebido) resolve(recebido);
      else reject(new Error('Não foi possível carregar a configuração. Confira backend/.env; seus valores não serão exibidos.'));
    });
  });
}

function consultar(port) {
  return new Promise(resolve => {
    let terminou = false;
    const concluir = valor => { if (!terminou) { terminou = true; resolve(valor); } };
    const req = http.get({ hostname: '127.0.0.1', port, path: '/api/pronto', agent: false }, res => {
      let corpo = '';
      res.on('data', parte => {
        corpo += parte;
        if (corpo.length > 4096) { concluir({ tipo: 'ocupada' }); res.destroy(); }
      });
      res.on('end', () => {
        try { concluir({ tipo: 'resposta', status: res.statusCode, dados: JSON.parse(corpo) }); }
        catch (_) { concluir({ tipo: 'ocupada' }); }
      });
      res.on('error', () => concluir({ tipo: 'ocupada' }));
    });
    // Tempo total limitado, inclusive se outro programa enviar dados aos poucos.
    const timer = setTimeout(() => { concluir({ tipo: 'ocupada' }); req.destroy(); }, 1000);
    req.on('close', () => clearTimeout(timer));
    req.on('error', erro => concluir({ tipo: erro.code === 'ECONNREFUSED' ? 'livre' : 'ocupada' }));
  });
}

function compativel(resposta, config) {
  const d = resposta.dados;
  return resposta.tipo === 'resposta' && resposta.status === 200 && d && d.aplicativo === 'NEXUS'
    && d.protocolo === config.protocolo && d.projeto === config.projeto
    && d.simulado === config.simulado && d.pronto === true;
}

function abrirNavegador() {
  // O caminho vira URL file://; aspas simples são escapadas para o PowerShell.
  // O navegador não precisa nem deve herdar a chave do backend.
  const url = pathToFileURL(index).href.replace(/'/g, "''");
  const script = "$ErrorActionPreference = 'Stop'; Start-Process -FilePath '" + url + "'";
  const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const env = { ...process.env };
  for (const nome of Object.keys(env)) if (nome.toUpperCase() === 'GEMINI_API_KEY') delete env[nome];
  return new Promise((resolve, reject) => {
    execFile(executable, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      { windowsHide: true, env, timeout: 15000 }, erro => erro
        ? reject(new Error('Não foi possível abrir o navegador. Abra nexus/index.html no Explorador e escolha COMEÇAR para Helena.')) : resolve());
  });
}

function esperarEnter(mensagem) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(mensagem + '\n', () => { rl.close(); resolve(); });
    rl.on('close', resolve);
  });
}

async function preparar(config, opcoes = {}) {
  const abrir = opcoes.abrir || abrirNavegador;
  const iniciar = opcoes.iniciar || (() => fork(path.join(pasta, 'server.js'), [], {
    cwd: pasta, execArgv: ['--env-file=' + arquivoEnv],
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true, env: ambienteDoBackend()
  }));
  let resposta = await consultar(Number(config.port));
  if (compativel(resposta, config)) { await abrir(); return { reutilizado: true }; }
  if (resposta.tipo !== 'livre') throw new Error('A porta 3000 está ocupada por outro programa ou um NEXUS incompatível. Feche-o pela própria janela, se desejar, e tente de novo. Nenhum processo foi encerrado.');
  const filho = iniciar();
  let encerrou = false;
  filho.once('error', () => { encerrou = true; });
  filho.once('exit', () => { encerrou = true; });
  try {
    const limite = Date.now() + 15000;
    while (Date.now() < limite) {
      resposta = await consultar(Number(config.port));
      if (compativel(resposta, config)) {
        await abrir();
        // Duas aberturas simultâneas podem disputar a porta; só uma a obtém.
        const proprio = resposta.dados.processo === filho.pid;
        if (!proprio && !encerrou) filho.kill();
        return { reutilizado: !proprio, filho: proprio ? filho : undefined };
      }
      if (encerrou) throw new Error('O servidor não iniciou. Confira backend/.env e se a porta 3000 está livre.');
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('O backend não confirmou prontidão em 15 segundos. Confira a configuração e tente novamente.');
  } catch (erro) {
    // Encerra exclusivamente o filho criado nesta tentativa.
    if (!encerrou) filho.kill();
    throw erro;
  }
}

async function main() {
  console.log('NEXUS — abertura local');
  try {
    const [major, minor] = process.versions.node.split('.').map(Number);
    if (major < 20 || (major === 20 && minor < 6)) throw new Error('Instale Node.js 20.6 ou superior e atualize o destino do atalho para esse node.exe.');
    if (!fs.existsSync(arquivoEnv)) throw new Error('Falta backend/.env. No Explorador, copie .env.example para .env e configure sua própria chave.');
    if (!fs.existsSync(index)) throw new Error('Falta nexus/index.html. Extraia o projeto inteiro antes de usar o atalho.');
    const config = await carregarConfiguracao();
    if (String(config.port) !== '3000') throw new Error('Use PORT=3000 em backend/.env: a interface atual conecta nessa porta.');
    if (!config.pronto) throw new Error('Configure sua própria GEMINI_API_KEY em backend/.env ou use MODO_SIMULADO=1 para teste sem IA.');
    console.log('Conferindo backend em 127.0.0.1:3000…');
    const resultado = await preparar(config);
    console.log('Navegador solicitado com o mesmo nexus/index.html local.');
    if (resultado.reutilizado) {
      console.log('Backend compatível reutilizado. Esta janela não encerra o servidor já existente.');
      await esperarEnter('Pressione Enter para fechar esta janela.');
    } else {
      console.log('Backend pronto. Modo simulado: ' + (config.simulado ? 'LIGADO (sem Gemini).' : 'DESLIGADO (usa Gemini).'));
      console.log('Fechar o navegador não encerra o backend.');
      const encerrar = () => { if (resultado.filho.connected) resultado.filho.disconnect(); };
      process.once('SIGINT', encerrar);
      process.once('exit', encerrar);
      resultado.filho.once('exit', () => {
        console.log('Backend encerrado. Para iniciar novamente, use o atalho.');
      });
      await esperarEnter('Mantenha esta janela aberta. Pressione Enter para encerrar este backend e fechar.');
      encerrar();
    }
  } catch (erro) {
    console.log(erro.message);
    await esperarEnter('Pressione Enter para abrir Helena sem backend, ou feche esta janela.');
    try { await abrirNavegador(); }
    catch (falha) { console.log(falha.message); await esperarEnter('Pressione Enter para fechar.'); }
  }
}

if (require.main === module) {
  if (process.argv[2] === '--configuracao' && process.send) enviarConfiguracao();
  else main().catch(() => { console.log('Falha na abertura. Abra nexus/index.html no Explorador para usar Helena.'); process.exitCode = 1; });
}
module.exports = { consultar, compativel, preparar, carregarConfiguracao, abrirNavegador };
