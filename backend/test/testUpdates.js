/* testUpdates.js — HTTP, Gemini simulado e Store: integração R2.
   Não lê .env, não usa chave/cota real, usa porta temporária em 127.0.0.1.
   Execute da raiz: node backend/test/testUpdates.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { createRequire } = require('node:module');
const H = require('../../nexus/js/data/history.js');
const compose = require('../../nexus/js/data/historyCompiler.js');
const { createStore } = require('../../nexus/js/data/universeStore.js');
const canonical = require('../../nexus/js/data/spec/helenaSpec.js');
const clone = v => JSON.parse(JSON.stringify(v));
const original = JSON.stringify(canonical);
const now = '2026-10-13T15:00:00.000Z';
const texto = 'Novidade fictícia: a criação ganhou energia, com o restante preservado. '.repeat(3);
const env = { GEMINI_API_KEY: 'chave-ficticia-de-teste', MODO_SIMULADO: '0' };
let queue = [], calls = [], logs = [], server, count = 0;
function load(name, overrides = {}) {
  const file = path.resolve('backend', name), requireFile = createRequire(file);
  const context = { module: { exports: {} }, __dirname: path.dirname(file), Buffer,
    require: id => overrides[id] || requireFile(id), process: { env },
    console: { log: (...args) => logs.push(args.join(' ')) }, AbortController, setTimeout, clearTimeout,
    fetch: async (_url, options) => {
      calls.push(JSON.parse(options.body)); assert.ok(queue.length, 'Resposta simulada precisa estar preparada');
      const item = queue.shift();
      if (item.network) throw Error('MARCADOR_PRIVADO_REDE');
      if (item.http) return { ok: false, status: item.http, text: async () => JSON.stringify({ error: { message: 'MARCADOR_PRIVADO_ERRO' } }) };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(item) }] } }] }) };
    } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context.module.exports;
}
async function test(name, fn) { await fn(); count++; console.log('[OK] ' + name); }
async function run() {
  const gemini = load('gemini.js');
  load('server.js', { './gemini.js': gemini, http: { createServer(handler) {
    server = http.createServer(handler); const listen = server.listen.bind(server);
    server.listen = (_port, host, callback) => listen(0, host, callback); return server;
  } } });
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/universo';
  const request = async payload => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) });
    return { status: response.status, data: await response.json() };
  };
  try {
    const storage = new Map();
    const store = createStore(() => ({ getItem: k => storage.has(k) ? storage.get(k) : null,
      setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }));
    await test('novidades de 100 caracteres aceitas; geração ainda exige 500', async () => {
      const priorCalls = calls.length;
      const result = await request({ texto: 'x'.repeat(100) }); assert.equal(result.status, 400); assert.equal(calls.length, priorCalls);
      queue = [canonical];
      assert.equal((await request({ texto: 'x'.repeat(100), especificacaoAnterior: canonical })).status, 200);
      assert.equal((await request({ texto: 'x'.repeat(99), especificacaoAnterior: canonical })).status, 400);
      assert.equal((await request({ texto: 'x'.repeat(3001), especificacaoAnterior: canonical })).status, 400);
    });
    await test('geração e duas atualizações preservam snapshots e só enviam fase mais recente', async () => {
      queue = [canonical]; const generated = await request({ texto: 'Relato fictício. '.repeat(40) });
      assert.equal(generated.status, 200); assert.equal(store.generate(generated.data.spec, now).ok, true);
      const first = store.exportJSON().json;
      for (let i = 0; i < 2; i++) {
        const previous = H.latest(store.load().historico), next = clone(previous);
        next.sistemas[0].centro.summary = 'MARCADOR_PRIVADO_SPEC_' + i;
        queue = [next]; const result = await request({ texto, especificacaoAnterior: previous });
        assert.equal(result.status, 200); assert.equal(store.append(result.data.spec, now).ok, true);
        const sent = JSON.parse(calls.at(-1).contents[0].parts[0].text);
        assert.deepEqual(Object.keys(sent), ['texto', 'especificacaoAnterior']);
        assert.deepEqual(sent.especificacaoAnterior, previous);
        assert.ok(!calls.at(-1).generationConfig.responseSchema.anyOf.some(s => s.properties.duvidas));
      }
      const h = store.load().historico; assert.equal(h.capitulos.length, 3);
      assert.deepEqual(h.capitulos[0], H.parse(first).capitulos[0]);
      assert.equal(h.capitulos[1].especificacao.sistemas[0].centro.summary, 'MARCADOR_PRIVADO_SPEC_0');
    });
    await test('histórico inteiro, respostas misturadas e mapa inválido recusados antes da IA', async () => {
      const before = calls.length;
      for (const payload of [
        { texto, especificacaoAnterior: canonical, respostas: [] },
        { texto, especificacaoAnterior: canonical, historico: store.load().historico },
        { texto, especificacaoAnterior: store.load().historico },
        { texto, especificacaoAnterior: null },
        { texto, especificacaoAnterior: { ...clone(canonical), relato: 'MARCADOR_PRIVADO_RELATO' } }
      ]) assert.equal((await request(payload)).status, 400);
      assert.equal(calls.length, before);
    });
    await test('tipo incompatível entra no ciclo de correção sem aumentar tentativas', async () => {
      const wrong = clone(canonical); wrong.sistemas[0].planetas[0].tipo = 'gasoso';
      const before = calls.length; queue = [wrong, canonical];
      const result = await request({ texto, especificacaoAnterior: canonical });
      assert.equal(result.status, 200); assert.equal(calls.length - before, 2);
      assert.match(calls.at(-1).contents[2].parts[0].text, /categoria, tipo ou pai/);
      assert.deepEqual(JSON.parse(calls.at(-1).contents[0].parts[0].text).especificacaoAnterior, canonical);
      queue = [wrong, wrong, wrong]; const exhausted = calls.length;
      const fail = await request({ texto, especificacaoAnterior: canonical });
      assert.equal(fail.status, 422); assert.equal(fail.data.spec, undefined); assert.equal(calls.length - exhausted, 3);
    });
    await test('mudança de pai também passa pela correção existente', async () => {
      const wrong = clone(canonical), planet = wrong.sistemas[0].planetas.shift();
      wrong.sistemas.find(s => s.id === 'mae').planetas = [planet];
      queue = [wrong, canonical];
      assert.equal((await request({ texto, especificacaoAnterior: canonical })).status, 200);
      assert.match(calls.at(-1).contents[2].parts[0].text, /categoria, tipo ou pai/);
    });
    await test('forças incompatíveis com o motor entram na correção na geração e atualização', async () => {
      const cases = [
        ['mare', f => { f.origem = 'corpo'; }, /lua/],
        ['eclipse', f => { f.origem = 'criacao'; f.alvos = ['mae']; }, /lua/],
        ['mare', f => { f.alvos = ['corpo']; }, /lua/],
        ['gravidade', f => { f.alvos = ['criacao']; }, /alvos em planetas/]
      ];
      for (const [type, change, message] of cases) {
        const wrong = clone(canonical); change(wrong.forcas.find(f => f.tipo === type));
        const originalWrong = JSON.stringify(wrong);
        assert.equal(H.validateSpecification(wrong).ok, true, 'Reproduz a divergência com a validação semântica');
        assert.throws(() => compose(H.create(wrong, now)), message);
        for (const update of [false, true]) {
          const before = calls.length; queue = [wrong, canonical];
          const payload = update ? { texto, especificacaoAnterior: canonical } : { texto: 'Relato fictício. '.repeat(40) };
          const result = await request(payload);
          assert.equal(result.status, 200); assert.equal(calls.length - before, 2);
          assert.match(calls.at(-1).contents[2].parts[0].text, message);
          assert.deepEqual(result.data.spec, canonical);
          assert.doesNotThrow(() => compose(H.create(result.data.spec, now)));
        }
        assert.equal(JSON.stringify(wrong), originalWrong, 'A validação não reescreve a força');
      }
    });
    await test('força incompatível persistente esgota somente duas correções e preserva histórico', async () => {
      const beforeHistory = store.exportJSON().json, before = calls.length;
      const wrong = H.latest(store.load().historico);
      wrong.forcas.find(f => f.tipo === 'gravidade').alvos = ['criacao'];
      queue = [wrong, wrong, wrong];
      const result = await request({ texto, especificacaoAnterior: H.latest(store.load().historico) });
      assert.equal(result.status, 422); assert.equal(result.data.spec, undefined);
      assert.equal(calls.length - before, 3); assert.equal(queue.length, 0);
      assert.equal(store.exportJSON().json, beforeHistory);
    });
    await test('gravidade com origem não estelar continua aceita sem correções ou reinterpretação', async () => {
      for (const source of ['corpo', 'aprovacao', 'proposta', 'sonho-recorrente']) {
        const spec = clone(canonical); spec.forcas.find(f => f.tipo === 'gravidade').origem = source;
        const before = calls.length; queue = [spec];
        const result = await request({ texto, especificacaoAnterior: canonical });
        assert.equal(result.status, 200); assert.equal(calls.length - before, 1);
        assert.deepEqual(result.data.spec, spec);
        assert.doesNotThrow(() => compose(H.create(result.data.spec, now)));
      }
    });
    await test('perguntas na atualização são corrigidas, nunca repassadas', async () => {
      queue = [{ duvidas: ['Pergunta fictícia indevida?'] }, canonical];
      const result = await request({ texto, especificacaoAnterior: canonical });
      assert.equal(result.status, 200); assert.equal(result.data.duvidas, undefined);
      assert.match(calls.at(-1).contents[2].parts[0].text, /Não faça novas perguntas/);
    });
    await test('cuidado, rede e limite não alteram histórico válido', async () => {
      const before = store.exportJSON().json;
      for (const item of [{ alerta_cuidado: true }, { network: true }, { http: 429 }]) {
        queue = [item]; const result = await request({ texto, especificacaoAnterior: H.latest(store.load().historico) });
        assert.equal(result.data.spec, undefined);
        if (item.alerta_cuidado) { assert.equal(result.status, 200); assert.equal(result.data.erro, 'cuidado'); }
        else assert.equal(result.status, item.http || 502);
        assert.equal(store.exportJSON().json, before);
      }
    });
    await test('retorno a ID antigo incompatível é recusado pelo histórico completo', async () => {
      const local = createStore(() => ({ getItem: () => null, setItem() {}, removeItem() {} }));
      local.generate(canonical, now);
      const absent = clone(canonical); absent.sistemas[0].planetas.find(p => p.id === 'carreira').elementos = [];
      local.append(absent, now); const before = local.exportJSON().json;
      const wrong = clone(absent), exo = wrong.sistemas.find(s => s.id === 'nao-escolhida').planetas[0];
      exo.elementos.push({ id: 'proposta', tipo: 'sinal', titulo: 'Sinal fictício' });
      queue = [wrong]; const result = await request({ texto, especificacaoAnterior: absent });
      // O servidor só conhece a fase anterior. O navegador conhece o ID removido.
      assert.equal(result.status, 200); assert.equal(local.append(result.data.spec, now).codigo, 'identidade');
      assert.equal(local.exportJSON().json, before);
    });
    await test('limite de especificação (128 KiB) separado do limite HTTP (160 KiB)', async () => {
      const previous = clone(canonical); previous.titulo = 'á'.repeat(500);
      queue = [previous]; assert.equal((await request({ texto, especificacaoAnterior: previous })).status, 200);
      const oversized = clone(canonical);
      const templateSystem = clone(oversized.sistemas.find(s => s.id === 'nebulosa'));
      const templateOrbiter = clone(oversized.sistemas[0].orbitantes[0]);
      while (oversized.sistemas.length < 10) {
        const s = clone(templateSystem); s.id = 'sistema-extra-' + oversized.sistemas.length;
        s.orbitantes = []; oversized.sistemas.push(s);
      }
      oversized.sistemas.forEach(s => {
        s.orbitantes = s.orbitantes || [];
        while (s.orbitantes.length < 3) {
          const o = clone(templateOrbiter); o.id = 'orbiter-' + s.id + '-' + s.orbitantes.length; s.orbitantes.push(o);
        }
      });
      function fill(value) {
        if (!value || typeof value !== 'object') return;
        for (const k of Object.keys(value)) {
          if (['summary', 'why', 'phase', 'rotulo'].includes(k) && typeof value[k] === 'string'
            && H.bytes(JSON.stringify(oversized)) <= H.limits.specificationBytes) value[k] = 'á'.repeat(500);
          else if (typeof value[k] === 'object') fill(value[k]);
        }
      }
      fill(oversized);
      assert.ok(H.bytes(JSON.stringify(oversized)) > H.limits.specificationBytes);
      assert.ok(H.bytes(JSON.stringify({ texto, especificacaoAnterior: oversized })) < H.limits.httpBytes);
      const before = calls.length;
      const result = await request({ texto, especificacaoAnterior: oversized });
      assert.equal(result.status, 400); assert.equal(calls.length, before);
    });
    await test('limite HTTP de 160 KiB retorna 413 sem derrubar servidor', async () => {
      const before = calls.length;
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: ' '.repeat(H.limits.httpBytes + 1) });
      assert.equal(response.status, 413); assert.equal(calls.length, before);
      env.MODO_SIMULADO = '1';
      assert.equal((await request({ texto, especificacaoAnterior: canonical })).status, 200);
      env.MODO_SIMULADO = '0';
    });
    await test('modo simulado atualiza cópia do mapa anterior sem chamar IA', async () => {
      const before = calls.length, previous = clone(canonical);
      previous.titulo = 'Título fictício preservado'; const oldJSON = JSON.stringify(previous);
      env.MODO_SIMULADO = '1';
      const result = await request({ texto, especificacaoAnterior: previous });
      env.MODO_SIMULADO = '0';
      assert.equal(result.status, 200); assert.equal(calls.length, before);
      assert.equal(result.data.spec.titulo, previous.titulo);
      assert.equal(H.validateTransition(previous, result.data.spec).ok, true);
      assert.notEqual(JSON.stringify(result.data.spec), oldJSON);
      assert.equal(JSON.stringify(previous), oldJSON); assert.equal(JSON.stringify(canonical), original);
    });
    await test('logs não contêm relatos, respostas, especificações ou erros externos', async () => {
      const recorded = logs.join('\n');
      for (const marker of [texto, 'MARCADOR_PRIVADO', 'Título fictício preservado', canonical.sistemas[0].centro.summary]) assert.ok(!recorded.includes(marker));
      assert.doesNotMatch(recorded, /Maré e eclipse exigem|A gravidade atual exige/);
      assert.equal(server.address().address, '127.0.0.1');
    });
    console.log('OK: ' + count + ' grupos de cenários HTTP/atualização. Gemini simulado; servidor temporário encerrado.');
  } finally { await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
