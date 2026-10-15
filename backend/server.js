/* server.js — Servidor HTTP local do NEXUS.
   Módulo http nativo do Node.js, sem dependências externas.
   Escuta estritamente em 127.0.0.1 na porta especificada em process.env.PORT (padrão 3000).
   
   REGRAS DE PRIVACIDADE:
   - NUNCA registra o texto da pessoa no console ou arquivos.
   - NUNCA registra a resposta da IA.
   - Logs registram apenas: timestamp, evento, status e duração em ms.
*/

const http = require('http');

// Carrega o validador e a Helena convertida diretamente do repositório (sem duplicação)
const history = require('../nexus/js/data/history.js');
const compileHistory = require('../nexus/js/data/historyCompiler.js');
const helenaSpec = require('../nexus/js/data/spec/helenaSpec.js');
const { chamarGemini } = require('./gemini.js');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '127.0.0.1';
const { status: statusLocal } = require('./readiness.js');
// Apenas uma especificação anterior (128 KiB), texto e envelope. Nunca histórico.
const LIMITE_CORPO_BYTES = history.limits.httpBytes;

// Configuração de CORS seguro para execução local
function aplicarCors(res, req) {
  const origin = req.headers.origin;
  // Permite páginas locais abertas por duplo clique (origin: "null") ou localhost/127.0.0.1
  if (!origin || origin === 'null' || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function responderJson(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

const server = http.createServer(async (req, res) => {
  const inicioTempo = Date.now();
  aplicarCors(res, req);

  // Confirma que esta cópia do NEXUS está escutando. Não testa a API do Google.
  if (req.method === 'GET' && req.url === '/api/pronto') {
    res.setHeader('Cache-Control', 'no-store');
    responderJson(res, 200, statusLocal());
    return;
  }

  // Tratamento de requisição preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rota principal: POST /api/universo
  if (req.method === 'POST' && req.url === '/api/universo') {
    console.log(`[${new Date().toISOString()}] Pedido recebido em /api/universo`);

    const chunks = [];
    let bytesRecebidos = 0;

    req.on('data', chunk => {
      bytesRecebidos += chunk.length;
      if (bytesRecebidos > LIMITE_CORPO_BYTES) {
        if (!res.writableEnded) responderJson(res, 413, { erro: 'Tamanho da requisição excede o limite permitido (160 KiB).' });
        chunks.length = 0;
      } else {
        chunks.push(chunk);
      }
    });

    req.on('end', async () => {
      if (res.writableEnded) return;

      // 1. Checagem de corpo vazio
      if (chunks.length === 0 || bytesRecebidos === 0) {
        console.log(`[${new Date().toISOString()}] Status 400 (Corpo vazio) | Duração: ${Date.now() - inicioTempo}ms`);
        responderJson(res, 400, { erro: 'O corpo da requisição está vazio.' });
        return;
      }

      // Decodifica todos os bytes concatenados de uma única vez em UTF-8
      const bodyRaw = Buffer.concat(chunks).toString('utf8');

      // 2. Checagem de JSON válido
      let payload;
      try {
        payload = JSON.parse(bodyRaw);
      } catch (err) {
        console.log(`[${new Date().toISOString()}] Status 400 (JSON inválido) | Duração: ${Date.now() - inicioTempo}ms`);
        responderJson(res, 400, { erro: 'O corpo enviado não é um JSON válido.' });
        return;
      }

      // 3. Checagem do campo "texto"
      if (!payload || typeof payload !== 'object' || !('texto' in payload)) {
        console.log(`[${new Date().toISOString()}] Status 400 (Campo texto ausente) | Duração: ${Date.now() - inicioTempo}ms`);
        responderJson(res, 400, { erro: 'O campo "texto" não foi fornecido no JSON.' });
        return;
      }

      const atualizacao = Object.prototype.hasOwnProperty.call(payload, 'especificacaoAnterior');
      const segundaRodada = Object.prototype.hasOwnProperty.call(payload, 'respostas');
      if (Array.isArray(payload) || Object.keys(payload).some(k => !['texto', 'respostas', 'especificacaoAnterior'].includes(k))
        || (atualizacao && segundaRodada)) {
        responderJson(res, 400, { erro: 'Envie somente texto e, separadamente, respostas ou uma especificação anterior. Não envie histórico.' });
        return;
      }
      if (atualizacao && !history.validateSpecification(payload.especificacaoAnterior).ok) {
        responderJson(res, 400, { erro: 'A especificação anterior é inválida ou excede 128 KiB.' });
        return;
      }
      const especificacaoAnterior = atualizacao ? payload.especificacaoAnterior : undefined;

      if (typeof payload.texto !== 'string') {
        console.log(`[${new Date().toISOString()}] Status 400 (Campo texto não é string) | Duração: ${Date.now() - inicioTempo}ms`);
        responderJson(res, 400, { erro: 'O campo "texto" deve ser uma string.' });
        return;
      }

      const texto = payload.texto.trim();
      const numCaracteres = texto.length; // contagem exata de caracteres

      // Primeiro relato: 500; novidades de atualização: 100. Ambos até 3.000.
      const minimoCaracteres = atualizacao ? 100 : 500;
      if (numCaracteres < minimoCaracteres || numCaracteres > 3000) {
        console.log(`[${new Date().toISOString()}] Status 400 (Texto fora do limite: ${numCaracteres} caracteres) | Duração: ${Date.now() - inicioTempo}ms`);
        responderJson(res, 400, {
          erro: `O texto deve ter entre ${minimoCaracteres} e 3.000 caracteres. O texto enviado possui ${numCaracteres} caracteres.`
        });
        return;
      }

      // A presença do campo, inclusive [], indica a segunda e última rodada.
      if (segundaRodada && (!Array.isArray(payload.respostas) || payload.respostas.length > 5
        || payload.respostas.some(r => typeof r !== 'string' || r.length > 500))) {
        responderJson(res, 400, { erro: 'Envie até 5 respostas, com até 500 caracteres cada.' });
        return;
      }
      const respostas = segundaRodada ? payload.respostas.map(r => r.trim()) : undefined;
      // (b) MODO_SIMULADO=1: Devolve a Helena sem chamar a API externa
      const modoSimulado = process.env.MODO_SIMULADO === '1' || process.env.MODO_SIMULADO === 'true';
      if (modoSimulado) {
        // Simulação fixa: não interpreta novidades; não modifica a Helena canônica.
        const spec = JSON.parse(JSON.stringify(atualizacao ? especificacaoAnterior : helenaSpec));
        if (atualizacao) {
          const centro = spec.sistemas[0].centro;
          if (Object.prototype.hasOwnProperty.call(centro, 'summary')) centro.summary = 'Atualização simulada: a estrutura anterior foi preservada.';
          if (Object.prototype.hasOwnProperty.call(centro, 'resumo') || !Object.prototype.hasOwnProperty.call(centro, 'summary')) {
            centro.resumo = 'Atualização simulada: a estrutura anterior foi preservada.';
          }
        }
        console.log(`[${new Date().toISOString()}] Status 200 (Modo Simulado) | Duração: ${Date.now() - inicioTempo}ms`);
        responderJson(res, 200, { spec });
        return;
      }

      // (c) Chamada com IA Gemini e ciclo de correção (máx 2 novas tentativas)
      const LIMITE_GLOBAL_MS = 180000; // Máximo de ~3 minutos no total do pedido

      try {
        let tentativasRestantes = 2;
        let errosAnteriores = null;
        let respostaAnterior = null;
        let specFinal = null;

        while (tentativasRestantes >= 0) {
          // Checagem de segurança de tempo total da requisição
          if (Date.now() - inicioTempo > LIMITE_GLOBAL_MS) {
            const errTimeout = new Error('Tempo total de processamento excedeu o limite de 3 minutos.');
            errTimeout.status = 504;
            throw errTimeout;
          }

          const resultadoGemini = await chamarGemini(
            texto,
            errosAnteriores,
            respostaAnterior,
            infoRetry => {
              // Log conciso e seguro da tentativa de conexão (sem texto nem corpo)
              console.log(`[${new Date().toISOString()}] Falha na tentativa ${infoRetry.tentativa} | Status ${infoRetry.status} | Duração: ${infoRetry.duracao}ms`);
            },
            respostas,
            especificacaoAnterior
          );
          const specCandidata = resultadoGemini.parsed;

          // Verificação da Regra de Segurança e Cuidado
          if (specCandidata && (specCandidata.alerta_cuidado === true || specCandidata.erro === 'cuidado')) {
            console.log(`[${new Date().toISOString()}] Status 200 (Alerta de cuidado acionado) | Duração: ${Date.now() - inicioTempo}ms`);
            responderJson(res, 200, { erro: 'cuidado' });
            return;
          }

          // Validação segundo as Leis do NEXUS
          let errosDuvidas = null;
          if (specCandidata && Object.prototype.hasOwnProperty.call(specCandidata, 'duvidas')) {
            const duvidas = specCandidata.duvidas;
            const formatoValido = Object.keys(specCandidata).length === 1 && Array.isArray(duvidas)
              && duvidas.length >= 1 && duvidas.length <= 5
              && duvidas.every(q => typeof q === 'string' && q.trim().length > 0 && q.length <= 200)
              && new Set(duvidas.map(q => q.trim().toLowerCase())).size === duvidas.length;
            if (!atualizacao && !segundaRodada && !errosAnteriores && formatoValido) {
              console.log(`[${new Date().toISOString()}] Status 200 (Dúvidas) | Duração: ${Date.now() - inicioTempo}ms`);
              responderJson(res, 200, { duvidas: duvidas.map(q => q.trim()) });
              return;
            }
            errosDuvidas = ['Não faça novas perguntas. Gere a especificação com os dados disponíveis, ou acione cuidado.'];
          }
          const validacao = errosDuvidas ? { ok: false, erros: errosDuvidas }
            : history.validateSpecification(specCandidata);
          if (validacao.ok && atualizacao) {
            const identidade = history.validateTransition(especificacaoAnterior, specCandidata);
            if (!identidade.ok) { validacao.ok = false; validacao.erros = identidade.erros; }
          }
          if (validacao.ok) {
            const forcas = compileHistory.validateForces(specCandidata);
            if (!forcas.ok) { validacao.ok = false; validacao.erros = forcas.erros; }
          }

          if (validacao.ok) {
            specFinal = specCandidata;
            break;
          } else {
            console.log(`[${new Date().toISOString()}] Validação semântica falhou (${validacao.erros.length} erros). Tentativas de correção restantes: ${tentativasRestantes}`);
            if (tentativasRestantes > 0) {
              errosAnteriores = validacao.erros;
              respostaAnterior = resultadoGemini.rawText;
            }
            tentativasRestantes--;
          }
        }

        if (specFinal) {
          console.log(`[${new Date().toISOString()}] Status 200 (Especificação gerada e validada) | Duração: ${Date.now() - inicioTempo}ms`);
          responderJson(res, 200, { spec: specFinal });
        } else {
          console.log(`[${new Date().toISOString()}] Status 422 (Validação esgotou tentativas sem sucesso) | Duração: ${Date.now() - inicioTempo}ms`);
          responderJson(res, 422, {
            erro: 'A inteligência artificial não conseguiu produzir uma especificação compatível com as Leis do NEXUS após as tentativas de correção.'
          });
        }
      } catch (err) {
        let status = err.status || 500;
        let mensagemAmigavel = 'Ocorreu um erro interno no servidor.';

        if (status === 500) {
          mensagemAmigavel = 'Chave da API do Gemini ausente ou não configurada. Por favor, preencha a chave em backend/.env.';
        } else if (status === 429) {
          mensagemAmigavel = 'Limite de requisições do Gemini atingido temporariamente. Por favor, aguarde alguns instantes e tente novamente.';
        } else if (status === 502 || status === 504 || status === 503) {
          // Se tudo falhar em relação à IA ou timeout, responde 502 com a mensagem solicitada
          status = 502;
          mensagemAmigavel = 'O serviço está ocupado ou demorou demais para responder. Tente de novo em instantes ou explore a galáxia de Helena.';
        }

        // Mensagens externas podem repetir dados pessoais: registra somente status e tempo.
        console.log(`[${new Date().toISOString()}] Status ${status} | Duração: ${Date.now() - inicioTempo}ms`);
        responderJson(res, status, { erro: mensagemAmigavel });
      }
    });

    return;
  }

  // Qualquer outra rota não reconhecida
  responderJson(res, 404, { erro: 'Rota não encontrada.' });
});

server.listen(PORT, HOST, () => {
  const modoSimulado = process.env.MODO_SIMULADO === '1' || process.env.MODO_SIMULADO === 'true';
  console.log(`====================================================`);
  console.log(`   NEXUS Backend ativo em http://${HOST}:${PORT}`);
  console.log(`   Modo Simulado: ${modoSimulado ? 'LIGADO (não chama Gemini)' : 'DESLIGADO (usa Gemini)'}`);
  console.log(`====================================================`);
});

// O iniciador usa IPC: se sua janela fechar, encerra apenas o servidor que criou.
// npm start e iniciar.bat não usam IPC e conservam seu funcionamento anterior.
if (process.send) {
  process.on('disconnect', () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  });
}
