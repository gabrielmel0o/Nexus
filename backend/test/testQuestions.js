/* testQuestions.js — Uma rodada de dúvidas, sem chamar IA nem ler .env.
   Execute da raiz: node backend/test/testQuestions.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { createRequire } = require('node:module');
const helena = require('../../nexus/js/data/spec/helenaSpec.js');
const validate = require('../../nexus/js/data/validator.js');
const compile = require('../../nexus/js/data/compiler.js');
const root = path.resolve(__dirname, '../..');
const texto = 'Relato fictício sobre uma fase de mudança, criação e vínculos. '.repeat(12);
const pergunta = 'O que costuma trazer energia para você nesta fase?';
let respostasIA = [], chamadasIA = [], logs = [], count = 0;

function loadBackend(name, overrides = {}) {
  const file = path.join(root, 'backend', name);
  const realRequire = createRequire(file);
  const context = {
    module: { exports: {} }, __dirname: path.dirname(file), Buffer,
    require: id => overrides[id] || realRequire(id),
    process: { env: { GEMINI_API_KEY: 'chave-ficticia-de-teste', MODO_SIMULADO: '0' } },
    console: { log: (...parts) => logs.push(parts.join(' ')) },
    AbortController, setTimeout, clearTimeout,
    fetch: async (_url, options) => {
      chamadasIA.push(JSON.parse(options.body));
      assert.ok(respostasIA.length, 'A chamada à IA precisa de resposta simulada');
      const item = respostasIA.shift();
      if (item.httpError) return { ok: false, status: item.httpError, text: async () => JSON.stringify({ error: { message: 'MARCADOR_PRIVADO' } }) };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(item) }] } }] }) };
    }
  };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context.module.exports;
}

function element() {
  return {
    style: {}, events: {}, attrs: {}, children: [], value: '', hidden: false,
    classList: { add() {}, remove() {} },
    addEventListener(k, fn) { this.events[k] = fn; },
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; }, focus() {}
  };
}

async function run() {
  const gemini = loadBackend('gemini.js');
  let server;
  loadBackend('server.js', {
    './gemini.js': gemini,
    http: { createServer(handler) {
      server = http.createServer(handler);
      const listen = server.listen.bind(server);
      server.listen = (_port, host, callback) => listen(0, host, callback);
      return server;
    } }
  });
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/universo`;
  const request = async payload => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return { status: response.status, data: await response.json() };
  };
  try {
    respostasIA = [{ duvidas: [pergunta] }];
    let result = await request({ texto });
    assert.deepEqual(result.data, { duvidas: [pergunta] });
    assert.equal(result.status, 200);
    assert.ok(chamadasIA.at(-1).generationConfig.responseSchema.anyOf.some(s => s.properties.duvidas)); count++;

    for (const respostas of [[], ['Pergunta fictícia\nResposta: criar espaços']]) {
      respostasIA = [helena];
      result = await request({ texto, respostas });
      assert.equal(result.status, 200);
      assert.equal(validate(result.data.spec).ok, true);
      const call = chamadasIA.at(-1);
      assert.deepEqual(JSON.parse(call.contents[0].parts[0].text).respostas, respostas);
      assert.ok(!call.generationConfig.responseSchema.anyOf.some(s => s.properties.duvidas)); count++;
    }
    // Cuidado vence perguntas e especificação, também quando vem das respostas.
    for (const extra of [{}, { respostas: ['Resposta fictícia'] }]) {
      respostasIA = [{ alerta_cuidado: true, duvidas: [pergunta] }];
      result = await request({ texto, ...extra });
      assert.deepEqual(result.data, { erro: 'cuidado' }); count++;
    }
    // O servidor não repassa uma segunda rodada, mesmo se a IA desobedecer.
    respostasIA = Array(3).fill({ duvidas: [pergunta] });
    const before = chamadasIA.length;
    result = await request({ texto, respostas: [] });
    assert.equal(result.status, 422);
    assert.equal(chamadasIA.length - before, 3);
    assert.ok(!result.data.duvidas); count++;

    for (const duvidas of [[], Array(6).fill(pergunta), [''], ['x'.repeat(201)], [pergunta, pergunta]]) {
      respostasIA = [{ duvidas }, helena];
      result = await request({ texto });
      assert.equal(result.status, 200);
      assert.ok(result.data.spec);
      assert.ok(!chamadasIA.at(-1).generationConfig.responseSchema.anyOf.some(s => s.properties.duvidas)); count++;
    }
    for (const respostas of [null, 'inválido', [1], Array(6).fill('a'), ['x'.repeat(501)]]) {
      const before = chamadasIA.length;
      result = await request({ texto, respostas });
      assert.equal(result.status, 400);
      assert.equal(chamadasIA.length, before); count++;
    }
    respostasIA = [{ httpError: 429 }];
    result = await request({ texto });
    assert.equal(result.status, 429);
    assert.ok(!logs.join('\n').includes('MARCADOR_PRIVADO'));
    assert.ok(!logs.join('\n').includes(texto));
    assert.ok(!logs.join('\n').includes(pergunta)); count++;

    // Integra Start + cliente + servidor + Gemini simulado, com compilação real.
    for (const action of ['continuar', 'pular', 'cuidado', 'editar', 'falha']) {
      const selectors = {};
      for (const name of ['textarea', 'counter', 'gen-btn', 'status', 'questions', 'question-fields', 'continue', 'skip']) selectors['.nexus-start-' + name] = element();
      const form = element(), container = element(), startBtn = element();
      form.querySelector = s => selectors[s];
      const textarea = selectors['.nexus-start-textarea']; textarea.value = texto;
      const payloads = [], universes = [];
      const context = {
        NEXUS: { validateSpec: validate, compileSpec: compile, boot: u => universes.push(u) },
        document: { readyState: 'complete', body: { classList: { contains: () => false, remove() {} } },
          querySelector: s => s === '.nexus-start-container' ? container : startBtn, createElement: () => {
            if (!container.children.length) return form;
            return element();
          } },
        setTimeout: () => {}, performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
        fetch: (_url, options) => { payloads.push(JSON.parse(options.body)); return fetch(url, options); }
      };
      vm.runInNewContext(fs.readFileSync(path.join(root, 'nexus/js/data/universeSource.js'), 'utf8'), context);
      vm.runInNewContext(fs.readFileSync(path.join(root, 'nexus/js/ui/start.js'), 'utf8'), context);
      respostasIA = [{ duvidas: [pergunta] }];
      const event = { stopPropagation() {} };
      await selectors['.nexus-start-gen-btn'].events.click(event);
      assert.equal(universes.length, 0);
      assert.equal(selectors['.nexus-start-questions'].hidden, false);
      const input = selectors['.nexus-start-question-fields'].children[0].children[1];
      input.value = 'Criar espaços';
      if (action === 'editar') {
        textarea.value = texto + ' Outro ponto fictício.';
        textarea.events.input();
        assert.equal(selectors['.nexus-start-questions'].hidden, true);
        assert.equal(selectors['.nexus-start-gen-btn'].hidden, false); count++;
        continue;
      }
      respostasIA = [action === 'cuidado' ? { alerta_cuidado: true } : action === 'falha' ? { httpError: 429 } : helena];
      const button = selectors[action === 'pular' ? '.nexus-start-skip' : '.nexus-start-continue'];
      await button.events.click(event);
      assert.equal(textarea.value, texto);
      assert.equal(textarea.disabled, false);
      assert.equal(startBtn.disabled, false);
      assert.ok(Object.hasOwn(payloads[1], 'respostas'));
      if (action === 'pular') assert.deepEqual(payloads[1].respostas, []);
      else assert.ok(payloads[1].respostas[0].includes(pergunta) && payloads[1].respostas[0].includes('Criar espaços'));
      if (action === 'cuidado') {
        assert.equal(universes.length, 0);
        assert.ok(selectors['.nexus-start-status'].className.includes('is-care'));
        assert.equal(selectors['.nexus-start-questions'].hidden, true);
      } else if (action === 'falha') {
        assert.equal(universes.length, 0);
        assert.equal(input.value, 'Criar espaços');
        assert.equal(selectors['.nexus-start-questions'].hidden, false);
      } else assert.equal(universes.length, 1);
      count++;
    }
    assert.ok(!logs.join('\n').includes('Criar espaços'));
    console.log(`[OK] ${count} cenários de dúvidas, respostas, pular, cuidado, limites, correções e privacidade.`);
    console.log('Gemini e DOM simulados; nenhuma chave real ou texto pessoal foi usado.');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
