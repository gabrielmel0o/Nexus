/* gemini.js — Comunicação com a API do Google Gemini via fetch nativo do Node.js.
   Utiliza a chave em process.env.GEMINI_API_KEY e o modelo configurado em process.env.GEMINI_MODEL.
   Envia instruções do sistema e schema para saída estruturada em JSON.
*/

const fs = require('fs');
const path = require('path');
const { SYSTEM_INSTRUCTION } = require('./prompt.js');

// Carrega o schema semântico original
const schemaPath = path.join(__dirname, '../nexus/js/data/spec/nexusSpec.schema.json');
const originalSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

/**
 * Converte o schema JSON Schema padrão para o subset OpenAPI 3.0 aceito pelo Gemini responseSchema.
 * - Mantém tipos em minúsculas (string, number, integer, object, array).
 * - Preserva limites numéricos e descreve limites de listas para a IA.
 */
function prepararSchemaParaGemini(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const clone = Array.isArray(schema) ? [] : {};

  // O modelo aceita limites numéricos, mas rejeitou com HTTP 400 os limites
  // de listas neste schema aninhado. Esses limites vão na descrição abaixo;
  // o validador local continua exigindo as quantidades antes de desenhar.
  const chavesIgnoradas = new Set([
    '$schema',
    'title',
    'minItems',
    'maxItems'
  ]);

  for (const key of Object.keys(schema)) {
    if (chavesIgnoradas.has(key)) continue;

    const val = schema[key];
    if (key === 'type' && typeof val === 'string') {
      // OpenAPI 3.0 no Gemini exige minúsculas ('string', 'object', 'array', etc.)
      clone[key] = val.toLowerCase();
    } else if (typeof val === 'object' && val !== null) {
      clone[key] = prepararSchemaParaGemini(val);
    } else {
      clone[key] = val;
    }
  }
  if (schema.type === 'array' && (schema.minItems !== undefined || schema.maxItems !== undefined)) {
    const limites = [];
    if (schema.minItems !== undefined) limites.push('mínimo ' + schema.minItems);
    if (schema.maxItems !== undefined) limites.push('máximo ' + schema.maxItems);
    clone.description = (clone.description ? clone.description + ' ' : '')
      + 'Quantidade de itens nesta lista: ' + limites.join('; ') + '.';
  }
  return clone;
}

const geminiResponseSchema = prepararSchemaParaGemini(originalSchema);

/**
 * Executa uma única tentativa de chamada à API do Gemini com timeout de 45s.
 * @param {string} texto Relato da pessoa
 * @param {Array<string>} [errosAnteriores] Erros do validador para a IA corrigir
 * @param {string} [respostaAnterior] Resposta anterior da IA que falhou
 * @param {string} [modelOverride] Modelo específico a ser chamado
 * @param {Array<string>} [respostas] Respostas da única rodada de dúvidas, ou [] para pular
 * @returns {Promise<object>} Objeto parsed e rawText
 */
async function chamarTentativaGemini(texto, errosAnteriores = null, respostaAnterior = null, modelOverride = null, respostas) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'cole_sua_chave_aqui' || apiKey.trim() === '') {
    const err = new Error('Chave da API do Gemini não configurada em backend/.env');
    err.status = 500;
    throw err;
  }

  const model = modelOverride || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];

  // Primeira mensagem do usuário: o texto pessoal
  contents.push({
    role: 'user',
    parts: [
      {
        text: JSON.stringify({ texto, ...(respostas !== undefined ? { respostas } : {}) })
      }
    ]
  });

  // Se houver histórico de erro para nova tentativa de correção
  if (errosAnteriores && errosAnteriores.length > 0 && respostaAnterior) {
    contents.push({
      role: 'model',
      parts: [{ text: respostaAnterior }]
    });

    contents.push({
      role: 'user',
      parts: [
        {
          text: `A especificação JSON que você gerou continha os seguintes erros segundo as Leis do NEXUS:\n- ${errosAnteriores.join('\n- ')}\n\nCorrija os erros listados e preserve os campos válidos, salvo quando uma mudança for necessária para resolver esses erros. Não troque tipos de astros sem necessidade. Antes de devolver o JSON completo, confira novamente TODAS as regras, inclusive as quantidades totais e a compatibilidade de exo e sinal. Não faça perguntas nesta correção.`
        }
      ]
    });
  }

  // O formato semântico original continua intacto. Só o envelope da API muda.
  const permiteDuvidas = respostas === undefined && !errosAnteriores;
  const alternativas = [geminiResponseSchema, {
    type: 'object', properties: { alerta_cuidado: { type: 'boolean' } }, required: ['alerta_cuidado']
  }];
  if (permiteDuvidas) alternativas.push({
    type: 'object',
    properties: { duvidas: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', maxLength: 200 } } },
    required: ['duvidas']
  });
  const etapa = permiteDuvidas ? 'PRIMEIRO PEDIDO: perguntas opcionais apenas se necessárias.'
    : 'SEGUNDO PEDIDO OU CORREÇÃO: não faça perguntas; gere a especificação, ou acione cuidado.';
  const body = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION + '\n\n' + etapa }]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: { anyOf: alternativas },
      temperature: 0.3,
      // Nível mínimo de raciocínio no Gemini 3.8 Flash para resposta mais rápida
      thinkingConfig: {
        thinkingLevel: 'low'
      }
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45 segundos de timeout por tentativa

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      const e = new Error('Tempo limite de 45s excedido ao consultar o Gemini.');
      e.status = 504;
      e.modeloTentado = model;
      throw e;
    }
    const e = new Error('Falha de conexão com a API do Gemini: ' + err.message);
    e.status = 502;
    e.modeloTentado = model;
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let googleErrorMessage = '';
    try {
      const parsedError = JSON.parse(errorText);
      googleErrorMessage = parsedError?.error?.message || '';
    } catch (_) {
      googleErrorMessage = errorText;
    }

    const err = new Error(googleErrorMessage || `HTTP ${response.status}`);
    err.status = response.status === 429 ? 429 : 502; // 429 rate limit, 502 para demais falhas (inclui 503)
    err.httpStatusOriginal = response.status;
    err.googleMessage = googleErrorMessage.slice(0, 300);
    err.modeloTentado = model;
    throw err;
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    const err = new Error('A API do Gemini não retornou nenhum conteúdo válido.');
    err.status = 502;
    err.modeloTentado = model;
    throw err;
  }

  try {
    const jsonParsed = JSON.parse(rawText);
    return {
      parsed: jsonParsed,
      rawText: rawText
    };
  } catch (err) {
    const e = new Error('Falha ao processar a resposta JSON retornada pelo Gemini.');
    e.status = 422;
    e.modeloTentado = model;
    throw e;
  }
}

/**
 * Função utilitária de espera (pausa assíncrona).
 */
function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chama o Gemini gerenciando retries em caso de HTTP 503 ou Timeout (504).
 * - Até 2 retries (3 tentativas no total).
 * - Pausa de ~3 segundos entre tentativas.
 * - Na 2ª tentativa (1º retry), passa a usar GEMINI_MODEL_RESERVA se configurado.
 */
async function chamarGemini(texto, errosAnteriores = null, respostaAnterior = null, onRetryLog = null, respostas) {
  const modelPrincipal = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const modelReserva = process.env.GEMINI_MODEL_RESERVA && process.env.GEMINI_MODEL_RESERVA.trim() !== ''
    ? process.env.GEMINI_MODEL_RESERVA.trim()
    : modelPrincipal;

  let ultimoErro = null;

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    // A partir da 2ª tentativa, usa o modelo reserva se configurado
    const modeloAtual = tentativa === 1 ? modelPrincipal : modelReserva;
    const inicioTentativa = Date.now();

    try {
      const resultado = await chamarTentativaGemini(texto, errosAnteriores, respostaAnterior, modeloAtual, respostas);
      return resultado;
    } catch (err) {
      ultimoErro = err;
      const duracaoTentativa = Date.now() - inicioTentativa;
      const eh503 = err.httpStatusOriginal === 503 || (err.message && err.message.includes('503'));
      const ehTimeout = err.status === 504;

      if (onRetryLog) {
        onRetryLog({
          tentativa,
          status: err.httpStatusOriginal || err.status,
          modelo: modeloAtual,
          mensagem: (err.googleMessage || err.message || '').slice(0, 300),
          duracao: duracaoTentativa
        });
      }

      // Se for 503 ou timeout e ainda houver tentativas, espera 3s e tenta de novo
      if ((eh503 || ehTimeout) && tentativa < 3) {
        await esperar(3000);
        continue;
      }

      // Se for outro erro (ex: 400, 429, 422) ou última tentativa, propaga o erro
      throw err;
    }
  }

  throw ultimoErro;
}

module.exports = {
  chamarGemini
};
