/* testHistoryFlow.js — Fluxo R4 com DOM, armazenamento e respostas fictícias.
   Usa os scripts reais; não lê .env, não acessa rede nem substitui teste visual. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const H = require('../../nexus/js/data/history.js');
const { fixtures, history } = require('./testHistoryCompiler.js');
const copy = v => JSON.parse(JSON.stringify(v));
const event = { stopPropagation() {}, preventDefault() {} };
function element() {
  const classes = new Set();
  return { style: {}, attrs: {}, events: {}, children: [], value: '', hidden: false,
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, fn) { this.events[k] = fn; },
    appendChild(c) { this.children.push(c); }, append(...c) { this.children.push(...c); },
    replaceChildren() { this.children = []; }, focus() {}, matches: () => false,
    click() { this.clicked = true; }, remove() { this.removed = true; }
  };
}
function disk() {
  return { data: new Map(), writes: 0, removals: 0, blocked: false, readBlocked: false,
    getItem(k) { if (this.readBlocked) throw Error('bloqueado'); return this.data.get(k) ?? null; },
    setItem(k, v) { if (this.blocked) throw Error('quota'); this.writes++; this.data.set(k, v); },
    removeItem(k) { if (this.blocked) throw Error('bloqueado'); this.removals++; this.data.delete(k); }
  };
}
function session(storage) {
  const selectors = {};
  for (const name of ['textarea', 'counter', 'generate', 'status', 'questions', 'question-fields', 'continue', 'skip',
    'history-info', 'resume', 'update', 'download', 'import', 'file', 'delete', 'cancel-update', 'operation']) {
    selectors['.nexus-start-' + name] = element();
  }
  const form = element(), container = element(), start = element(), body = element();
  body.classList.add('modo-start');
  form.querySelector = s => selectors[s];
  let formCreated = false;
  const requests = [], queue = [], boots = [], downloads = [], links = [];
  const N = { events: {}, boot(u) { boots.push(u); N.currentUniverse = u; N.state.init(u); N.time.refresh(); } };
  const ctx = vm.createContext({ NEXUS: N, console, TextEncoder, localStorage: storage,
    performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    setTimeout: () => 1, clearTimeout() {}, Blob,
    URL: { createObjectURL(blob) { downloads.push(blob); return 'blob:ficticio'; }, revokeObjectURL() {} },
    document: { body, readyState: 'complete',
      querySelector: s => s === '.nexus-start-container' ? container : s === '.nexus-start-btn' ? start : null,
      createElement(tag) {
        if (!formCreated && tag === 'div') { formCreated = true; return form; }
        const el = element(); if (tag === 'a') links.push(el); return el;
      } },
    fetch: async (url, options) => {
      requests.push({ url, payload: JSON.parse(options.body) });
      assert.ok(queue.length, 'Toda resposta precisa ser fictícia e preparada');
      const response = queue.shift();
      if (response.networkError) throw Error('rede fictícia');
      if (response.wait) return response.wait;
      return { ok: response.status === undefined || response.status === 200, status: response.status || 200,
        json: async () => response.data || { spec: response.spec } };
    }
  });
  function load(file) { vm.runInContext(fs.readFileSync(path.join(__dirname, '../../nexus/js', file), 'utf8'), ctx, { filename: file }); }
  // Mesma ordem de dependências de index.html, incluindo a Store antes da Start.
  for (const file of ['data/mockUniverse.js', 'data/validator.js', 'data/history.js', 'data/universeStore.js',
    'data/compiler.js', 'data/historyCompiler.js', 'data/universeSource.js', 'core/state.js', 'ui/start.js', 'ui/time.js', 'ui/panel.js']) load(file);
  const el = name => selectors['.nexus-start-' + name];
  const click = name => el(name).events.click(event);
  const text = value => { el('textarea').value = value; el('textarea').events.input(); };
  const importText = async (raw, size = Buffer.byteLength(raw)) => {
    el('file').files = [{ size, text: async () => raw }];
    await el('file').events.change();
  };
  const time = body.children.find(e => e.className === 'nexus-time-control');
  return { N, el, click, text, importText, requests, queue, boots, downloads, links, time, body, start };
}
const relato = 'Relato inteiramente fictício sobre criatividade, trabalho e vínculos. '.repeat(10);
const novidades = 'Novidades fictícias: mais espaço para descanso e criação nesta fase. '.repeat(3);
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('[OK] ' + name); }
async function run() {
  const [a, b, c] = fixtures(), storage = disk();
  let s;
  await test('gerar salva uma fase e abre esse universo; dados privados não entram no envelope', async () => {
    s = session(storage); s.queue.push({ spec: a }); s.text(relato); await s.click('generate');
    assert.equal(s.boots.length, 1); assert.equal(s.N.state.chapter, 0);
    assert.equal(s.N.currentUniverse.chapters.length, 1); assert.equal(s.time.style.display, 'none');
    assert.equal(storage.writes, 1);
    const saved = storage.data.get('nexus:universo');
    assert.ok(!saved.includes(relato)); assert.ok(!saved.includes('respostas'));
    assert.match(s.el('operation').textContent || s.el('operation').innerHTML || fs.readFileSync(path.join(__dirname, '../../nexus/js/ui/start.js'), 'utf8'), /substitui/);
  });
  await test('F5, atualizar duas vezes e abrir a última: somente a especificação mais recente via HTTP', async () => {
    for (const [spec, previous, index] of [[b, a, 1], [c, b, 2]]) {
      s = session(storage); s.click('update'); s.text(novidades);
      s.queue.push({ spec }); await s.click('generate');
      assert.equal(s.N.state.chapter, index); assert.equal(s.boots.length, 1);
      const payload = s.requests[0].payload;
      assert.deepEqual(payload, { texto: novidades.trim(), especificacaoAnterior: previous });
      const saved = H.parse(storage.data.get('nexus:universo'));
      assert.deepEqual(saved.capitulos[0].especificacao, a);
      assert.equal(saved.capitulos.length, index + 1);
    }
  });
  await test('continuar após F5 dispensa backend; cada clique anda uma fase e respeita os extremos', async () => {
    s = session(storage); s.click('resume');
    assert.equal(s.N.state.chapter, 2); assert.equal(s.requests.length, 0);
    const original = storage.data.get('nexus:universo'), writes = storage.writes;
    const [next, , previous] = s.time.children[1].children;
    assert.equal(next.disabled, true); assert.equal(previous.disabled, false);
    previous.events.click(event); assert.equal(s.N.state.chapter, 1);
    assert.equal(s.time.children[0].textContent, 'Fase 2 de 3');
    next.events.click(event); assert.equal(s.N.state.chapter, 2);
    next.events.click(event); assert.equal(s.N.state.chapter, 2);
    previous.events.click(event); previous.events.click(event); previous.events.click(event);
    assert.equal(s.N.state.chapter, 0); assert.equal(previous.disabled, true);
    assert.equal(next.disabled, false); next.events.click(event); assert.equal(s.N.state.chapter, 1);
    assert.equal(s.requests.length, 0); assert.equal(storage.writes, writes);
    assert.equal(storage.data.get('nexus:universo'), original); assert.equal(s.boots.length, 1);
    assert.deepEqual(copy(s.N.universeStore.load().historico.capitulos[2].especificacao), c);
  });
  await test('painel acompanha a fase selecionada, escapa texto e preserva massa zero', async () => {
    s.N.panel.open('criacao');
    const panel = s.body.children.find(e => e.className === 'nexus-panel');
    assert.match(panel.innerHTML, /Massa: 0\/10/);
    assert.match(panel.innerHTML, /&lt;img/); assert.ok(!panel.innerHTML.includes('<img'));
    s.N.previousChapter(); assert.ok(!panel.innerHTML.includes('Texto da fase intermediária'));
    s.N.nextChapter(); assert.match(panel.innerHTML, /Texto da fase intermediária/);
  });
  await test('exportar, apagar e importar abre o histórico inteiro na fase mais recente sem rede', async () => {
    s = session(storage); s.click('download');
    const json = await s.downloads[0].text();
    assert.equal(H.parse(json).capitulos.length, 3);
    assert.equal(s.links[0].download, 'nexus-historico.json'); assert.equal(s.links[0].clicked, true);
    s.click('delete'); assert.equal(storage.data.has('nexus:universo'), false);
    assert.equal(s.el('resume').disabled, true); assert.equal(s.el('update').disabled, true);
    await s.importText(json);
    assert.equal(s.N.state.chapter, 2); assert.equal(s.N.currentUniverse.chapters.length, 3);
    assert.equal(s.requests.length, 0);
  });
  await test('importação inválida, versão desconhecida e bytes excedidos preservam disco e memória', async () => {
    s = session(storage); const before = storage.data.get('nexus:universo'), writes = storage.writes;
    const incompatibleImport = copy(history([a, c]));
    incompatibleImport.capitulos[1].especificacao.sistemas[0].planetas[0].tipo = 'gasoso';
    assert.equal(H.validateSpecification(incompatibleImport.capitulos[1].especificacao).ok, true);
    for (const raw of ['{inválido', JSON.stringify({ versao: 99 }), JSON.stringify({ ...history([a]), relato: 'não permitido' }),
      JSON.stringify(incompatibleImport)]) {
      await s.importText(raw); assert.equal(storage.data.get('nexus:universo'), before);
      assert.equal(s.boots.length, 0); assert.ok(s.el('status').className.includes('is-error'));
    }
    await s.importText('{}', H.limits.historyBytes + 1);
    assert.match(s.el('status').textContent, /1 MiB/); assert.equal(storage.writes, writes);
    assert.equal(s.N.universeStore.load().historico.capitulos.length, 3);
  });
  await test('rede, cuidado, inválida e incompatibilidade na atualização não acrescentam fase', async () => {
    const invalid = copy(c); invalid.sistemas[0].centro.massa = 99;
    const incompatible = copy(c); incompatible.sistemas[0].planetas[0].tipo = 'gasoso';
    assert.equal(H.validateSpecification(incompatible).ok, true);
    const before = storage.data.get('nexus:universo'), writes = storage.writes;
    for (const response of [{ networkError: true }, { status: 422, data: { erro: 'cuidado' } },
      { spec: invalid }, { spec: incompatible }]) {
      s = session(storage); s.click('update'); s.text(novidades); s.queue.push(response); await s.click('generate');
      assert.equal(storage.data.get('nexus:universo'), before); assert.equal(s.boots.length, 0);
      assert.equal(s.el('textarea').value, novidades); assert.equal(s.N.universeStore.load().historico.capitulos.length, 3);
      assert.equal(s.el('update').disabled, false);
    }
    assert.equal(storage.writes, writes);
  });
  await test('falha de compilação na geração/importação não substitui histórico válido', async () => {
    const unsupported = copy(a); unsupported.forcas[0].origem = 'criacao';
    assert.equal(H.validateSpecification(unsupported).ok, true);
    const before = storage.data.get('nexus:universo');
    s = session(storage); s.text(relato); s.queue.push({ spec: unsupported }); await s.click('generate');
    assert.equal(s.boots.length, 0); assert.equal(storage.data.get('nexus:universo'), before);
    await s.importText(H.serialize(history([unsupported])));
    assert.equal(s.boots.length, 0); assert.equal(storage.data.get('nexus:universo'), before);
  });
  await test('uma nova geração substitui por um universo de uma fase, sem misturar pessoas', async () => {
    s = session(storage); s.text(relato); s.queue.push({ spec: a }); await s.click('generate');
    assert.equal(H.parse(storage.data.get('nexus:universo')).capitulos.length, 1);
    assert.equal(s.N.state.chapter, 0); assert.equal(s.N.currentUniverse.chapters.length, 1);
  });
  await test('quota mantém atualização completa em memória; download e continuar funcionam sem persistência', async () => {
    const before = storage.data.get('nexus:universo'); storage.blocked = true;
    s = session(storage); s.click('update'); s.text(novidades); s.queue.push({ spec: b }); await s.click('generate');
    assert.equal(storage.data.get('nexus:universo'), before); assert.equal(s.boots.length, 0);
    assert.equal(s.N.universeStore.load().historico.capitulos.length, 2);
    assert.match(s.el('status').textContent, /somente em memória/);
    s.click('download'); const exported = H.parse(await s.downloads[0].text());
    assert.deepEqual(exported.capitulos[1].especificacao, b);
    s.click('resume'); assert.equal(s.N.state.chapter, 1);
    assert.equal(s.requests.length, 1);
    const reloaded = session(storage); reloaded.click('resume'); assert.equal(reloaded.N.state.chapter, 0);
    storage.blocked = false;
  });
  await test('armazenamento bloqueado desde a abertura e exclusão bloqueada são informados', async () => {
    const blocked = disk(); blocked.blocked = blocked.readBlocked = true;
    s = session(blocked); assert.match(s.el('history-info').textContent, /bloqueado/);
    s.text(relato); s.queue.push({ spec: a }); await s.click('generate');
    assert.equal(s.el('download').disabled, false); assert.equal(s.boots.length, 0);
    s.click('delete'); assert.match(s.el('status').textContent, /Não foi possível apagar/);
    assert.equal(s.N.universeStore.load().historico.capitulos.length, 1);
  });
  await test('10 capítulos bloqueiam atualização antes da rede e importação maior não trunca', async () => {
    const fullDisk = disk(); fullDisk.setItem('nexus:universo', H.serialize(history(Array(10).fill(a))));
    s = session(fullDisk); assert.equal(s.el('update').disabled, true);
    const before = fullDisk.data.get('nexus:universo');
    const extra = JSON.parse(before); extra.capitulos.push(copy(extra.capitulos[0]));
    await s.importText(JSON.stringify(extra));
    assert.match(s.el('status').textContent, /10 capítulos/);
    assert.equal(fullDisk.data.get('nexus:universo'), before); assert.equal(s.requests.length, 0);
  });
  await test('versão 1 importa como uma fase com layout original e sem backend', async () => {
    s = session(disk()); await s.importText(JSON.stringify({ versao: 1, salvoEm: '2026-10-13T15:00:00.000Z', especificacao: a }));
    assert.equal(s.N.state.chapter, 0); assert.equal(s.time.style.display, 'none');
    assert.equal(s.N.universeStore.load().historico.capitulos[0].versaoLayout, 0);
    assert.equal(s.requests.length, 0);
  });
  await test('carregamento bloqueia outras operações e não duplica pedidos', async () => {
    s = session(storage); s.click('update'); s.text(novidades);
    let resolve;
    s.queue.push({ wait: new Promise(r => { resolve = r; }) });
    const pending = s.click('generate');
    await s.click('generate'); s.click('delete'); s.click('resume');
    assert.equal(s.requests.length, 1); assert.equal(s.boots.length, 0);
    assert.equal(s.el('import').disabled, true); assert.equal(s.start.disabled, true);
    resolve({ ok: true, status: 200, json: async () => ({ spec: b }) }); await pending;
    assert.equal(s.boots.length, 1); assert.equal(s.N.state.chapter, 1);
  });
  await test('Helena percorre 4 fases nos dois sentidos; recuar limpa sem disparar supernova', async () => {
    s = session(disk()); const before = JSON.stringify(s.N.getUniverse());
    let events = 0, cleanups = 0;
    s.N.events.supernova = () => { events++; };
    s.N.events.cleanup = () => { cleanups++; };
    s.start.events.click(event); assert.equal(s.N.state.chapter, 0);
    const [next, , previous] = s.time.children[1].children;
    next.events.click(event); next.events.click(event); assert.equal(events, 1);
    next.events.click(event); assert.equal(s.N.state.chapter, 3);
    previous.events.click(event); assert.equal(s.N.state.chapter, 2); assert.equal(events, 1);
    assert.equal(s.N.state.target.proposta.appear, 1);
    previous.events.click(event); assert.equal(s.N.state.chapter, 1); assert.equal(events, 1);
    assert.equal(s.N.state.target.mae.tone, s.N.state.initial.mae.tone);
    assert.equal(s.N.state.target.nebulosa.protostar, s.N.state.initial.nebulosa.protostar);
    previous.events.click(event); previous.events.click(event);
    assert.equal(s.N.state.chapter, 0);
    assert.equal(s.N.state.target.proposta.appear, s.N.state.initial.proposta.appear);
    assert.equal(s.N.state.target.proposta.approach, s.N.state.initial.proposta.approach);
    assert.equal(previous.disabled, true); assert.equal(cleanups, 6);
    next.events.click(event); next.events.click(event); assert.equal(events, 2);
    assert.match(s.time.children[0].textContent, /^Fase 3 de 4/);
    assert.equal(JSON.stringify(s.N.getUniverse()), before);
    assert.equal(s.requests.length, 0); assert.equal(s.boots.length, 1);
  });
  console.log(`OK: ${count} grupos de fluxo histórico R4, sem Gemini real e sem navegador.`);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
