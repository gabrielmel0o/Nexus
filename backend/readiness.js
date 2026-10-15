/* readiness.js — Identificação local, sem chave, caminhos ou conteúdo pessoal. */
const { createHash } = require('node:crypto');
const { realpathSync } = require('node:fs');

function status(env = process.env) {
  return {
    aplicativo: 'NEXUS',
    protocolo: 1,
    processo: process.pid,
    projeto: createHash('sha256').update(realpathSync(__dirname)).digest('hex'),
    simulado: env.MODO_SIMULADO === '1' || env.MODO_SIMULADO === 'true',
    pronto: env.MODO_SIMULADO === '1' || env.MODO_SIMULADO === 'true' || Boolean((env.GEMINI_API_KEY || '').trim())
  };
}

module.exports = { status };
