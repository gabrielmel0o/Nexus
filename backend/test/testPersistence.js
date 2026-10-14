/* testPersistence.js — R2: histórico, migração e identidade, sem .env ou Google.
   Execute da raiz: node backend/test/testPersistence.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const H = require('../../nexus/js/data/history.js');
const { createStore, key } = require('../../nexus/js/data/universeStore.js');
const canonical = require('../../nexus/js/data/spec/helenaSpec.js');
const clone = value => JSON.parse(JSON.stringify(value));
const now = '2026-10-13T15:00:00.000Z';
let count = 0;
function test(name, fn) { fn(); count++; console.log('[OK] ' + name); }
function rejected(fn, code) { assert.throws(fn, error => error.code === code); }
function freeze(value) { Object.values(value).forEach(v => { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(value); }
function disk() {
  const data = new Map();
  return { data, getItem: k => data.has(k) ? data.get(k) : null,
    setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
}
function changed() {
  const spec = clone(canonical);
  spec.sistemas[0].centro.summary = 'Uma alteração fictícia de significado, sem guardar relato.';
  spec.sistemas[0].centro.massa = 0;
  return spec;
}
function allChildren(spec) {
  return spec.sistemas.flatMap(s => [ ...(s.orbitantes || []),
    ...(s.planetas || []).flatMap(p => [...(p.luas || []), ...(p.elementos || [])]) ]);
}
function richSpec() {
  const descriptions = { rotulo: 'Astro', resumo: 'Descrição fictícia.', porque: 'Metáfora fictícia.', fase: 'Fase atual', lei: 'massa' };
  const spec = { titulo: 'Universo fictício de limites', rotinas: [], sistemas: [], forcas: [] };
  for (let i = 0; i < 10; i++) {
    const s = { id: 's-' + i, nome: 'Sistema ' + i, profundidade: i % 5,
      centro: { ...descriptions, tipo: i === 0 ? 'estrela' : 'nebulosa', massa: 5 }, planetas: [], orbitantes: [] };
    for (let j = 0; j < 3; j++) s.orbitantes.push({ ...descriptions, id: 'o-' + i + '-' + j, nome: 'Sonho', tipo: 'sonho', massa: 3 });
    if (i === 0) for (let j = 0; j < 6; j++) {
      const p = { ...descriptions, id: 'p-' + j, nome: 'Área ' + j, tipo: 'rochoso', massa: 3, tamanho: 5, luas: [], elementos: [] };
      for (let k = 0; k < 3; k++) p.luas.push({ ...descriptions, id: 'm-' + j + '-' + k, nome: 'Lua', massa: 2, tamanho: 2 });
      for (let k = 0; k < 5; k++) p.elementos.push({ id: 'e-' + j + '-' + k, tipo: 'passageiro', titulo: 'Evento' });
      s.planetas.push(p);
    }
    spec.sistemas.push(s);
  }
  spec.forcas.push({ ...descriptions, id: 'f', tipo: 'gravidade', origem: 's-0', alvos: ['p-0'], intensidade: 3 });
  delete spec.forcas[0].fase;
  assert.equal(H.validateSpecification(spec).ok, true);
  return spec;
}
const old = { versao: 1, salvoEm: now, especificacao: clone(canonical) };
const first = H.create(canonical, now);
test('UTF-8 conta acentos, emoji e surrogate isolado como Buffer', () => {
  for (const text of ['a', 'ação', '🪐', '\ud800', 'á🪐\udc00']) assert.equal(H.bytes(text), Buffer.byteLength(text));
});
test('capítulo inicial independente e somente metadados permitidos', () => {
  const spec = changed(), history = H.create(spec, now);
  spec.sistemas[0].centro.massa = 9;
  assert.equal(history.capitulos[0].especificacao.sistemas[0].centro.massa, 0);
  assert.deepEqual(Object.keys(history), ['versao', 'salvoEm', 'capitulos']);
  assert.deepEqual(Object.keys(history.capitulos[0]), ['criadoEm', 'versaoLayout', 'especificacao']);
});
test('migração versão 1 mantém mapa, data e layout antigo', () => {
  const history = H.normalize(freeze(clone(old)));
  assert.equal(history.versao, 2); assert.equal(history.capitulos.length, 1);
  assert.equal(history.capitulos[0].versaoLayout, 0);
  assert.deepEqual(history.capitulos[0].especificacao, canonical);
  assert.equal(H.parse(JSON.stringify(old)).salvoEm, now);
});
test('duas atualizações preservam fases congeladas e usam somente a última', () => {
  const second = H.append(freeze(clone(first)), changed(), now);
  const third = H.append(freeze(clone(second)), canonical, now);
  assert.equal(third.capitulos.length, 3);
  assert.deepEqual(third.capitulos[0], first.capitulos[0]);
  assert.deepEqual(third.capitulos[1], second.capitulos[1]);
  third.capitulos[0].especificacao.titulo = 'Alteração externa';
  assert.equal(second.capitulos[0].especificacao.titulo, canonical.titulo);
  const latest = H.latest(second); latest.titulo = 'Alteração externa';
  assert.notEqual(H.latest(second).titulo, latest.titulo);
});
test('exportação/importação completas e JSON legado', () => {
  const history = H.append(first, changed(), now);
  assert.deepEqual(H.parse(H.serialize(history)), history);
  assert.equal(H.parse(JSON.stringify(old)).capitulos.length, 1);
});
test('aliases canônicos aceitos, aliases conflitantes recusados', () => {
  const spec = changed(); spec.sistemas[0].centro.resumo = 'Outra versão';
  assert.equal(H.validateSpecification(canonical).ok, true);
  assert.equal(H.validateSpecification(spec).ok, false);
  const invalidLaw = changed();
  invalidLaw.sistemas[0].planetas.find(p => p.id === 'carreira').elementos[0].law = 'lei-inventada';
  assert.equal(H.validateSpecification(invalidLaw).ok, false);
});
test('campos privados extras recusados em todos os níveis', () => {
  for (const field of ['texto', 'respostas', 'relato', 'resumoDoRelato']) {
    const h = clone(first); h[field] = 'MARCADOR_PRIVADO'; rejected(() => H.normalize(h), 'formato');
    const spec = changed(); spec[field] = 'MARCADOR_PRIVADO'; rejected(() => H.create(spec, now), 'formato');
    const nested = changed(); nested.sistemas[0].planetas[0][field] = 'MARCADOR_PRIVADO'; rejected(() => H.create(nested, now), 'formato');
    const chapter = clone(first); chapter.capitulos[0][field] = 'MARCADOR_PRIVADO'; rejected(() => H.normalize(chapter), 'formato');
  }
});
test('formatos inválidos, números e datas são recusados', () => {
  for (const value of [null, [], {}, { versao: 99, salvoEm: now, capitulos: [] }]) assert.throws(() => H.normalize(value));
  rejected(() => H.parse('{'), 'formato');
  for (const value of [null, 'texto', Infinity, NaN, 11]) {
    const spec = changed(); spec.sistemas[0].centro.massa = value;
    assert.equal(H.validateSpecification(spec).ok, false);
  }
  for (const time of ['ontem', '2026-02-30T15:00:00.000Z']) rejected(() => H.create(canonical, time), 'formato');
  const h = clone(first); h.capitulos[0].versaoLayout = 99; rejected(() => H.normalize(h), 'versao');
});
test('IDs reservados, duplicados entre rotinas e corpos e referências de forças', () => {
  for (const reserved of ['eu', '__proto__', 'constructor']) {
    const spec = changed(); spec.rotinas[0].id = reserved; rejected(() => H.create(spec, now), 'identidade');
  }
  const duplicate = changed(); duplicate.rotinas[0].id = duplicate.sistemas[0].id;
  rejected(() => H.create(duplicate, now), 'identidade');
  const ref = changed(); ref.forcas[0].origem = ref.rotinas[0].id;
  rejected(() => H.create(ref, now), 'validacao');
});
test('tipo, categoria e pai de IDs existentes não mudam', () => {
  const type = changed(); type.sistemas[0].planetas[0].tipo = 'gasoso';
  rejected(() => H.append(first, type, now), 'identidade');
  assert.equal(H.validateTransition(canonical, type).ok, false);
  const parent = changed(), planet = parent.sistemas[0].planetas.shift();
  parent.sistemas.find(s => s.id === 'mae').planetas = [planet];
  rejected(() => H.append(first, parent, now), 'identidade');
  const category = changed(); category.rotinas[0].id = 'proposta';
  const career = category.sistemas[0].planetas.find(p => p.id === 'carreira'); career.elementos = [];
  rejected(() => H.append(first, category, now), 'identidade');
});
test('ausência e reaparecimento compatível conservam identidade histórica', () => {
  const absent = changed(); absent.sistemas[0].planetas.find(p => p.id === 'carreira').elementos = [];
  const history = H.append(first, absent, now);
  assert.equal(H.append(history, canonical, now).capitulos.length, 3);
  const incompatible = changed();
  incompatible.sistemas[0].planetas.find(p => p.id === 'carreira').elementos[0].tipo = 'sinal';
  // Transfere para um exo válido: só o registro de fases antigas conhece o pai original.
  const event = incompatible.sistemas[0].planetas.find(p => p.id === 'carreira').elementos.pop();
  incompatible.sistemas.find(s => s.id === 'nao-escolhida').planetas[0].elementos.push(event);
  assert.equal(H.validateTransition(absent, incompatible).ok, true);
  rejected(() => H.append(history, incompatible, now), 'identidade');
});
test('nome e ordem podem mudar, sem renomear IDs por aproximação', () => {
  const spec = changed(); spec.sistemas.reverse(); spec.sistemas.find(s => s.id === 'criacao').nome = 'Criação atual';
  assert.equal(H.append(first, spec, now).capitulos.length, 2);
});
test('10 capítulos aceitos; décimo primeiro recusado sem truncar', () => {
  let h = first; for (let i = 1; i < 10; i++) h = H.append(h, canonical, now);
  const before = H.serialize(h); rejected(() => H.append(h, canonical, now), 'capacidade');
  assert.equal(H.serialize(h), before);
});
test('50 rotinas históricas aceitas em dez fases', () => {
  let h;
  for (let i = 0; i < 10; i++) {
    const spec = changed(); spec.rotinas.forEach(r => { r.id += '-' + i; });
    h = h ? H.append(h, spec, now) : H.create(spec, now);
  }
  assert.equal(h.capitulos.length, 10);
});
test('128 corpos aceitos; 129 recusados na união', () => {
  const rich = richSpec(), next = clone(rich);
  allChildren(next).slice(0, 33).forEach(o => { o.id += '-novo'; });
  const h = H.append(H.create(rich, now), next, now);
  const overflow = clone(next); allChildren(overflow)[33].id += '-extra';
  rejected(() => H.append(h, overflow, now), 'capacidade');
});
test('limite de 16 sistemas inclui Eu e ausências históricas', () => {
  let h = first;
  for (let i = 1; i <= 8; i++) {
    const spec = changed(), s = spec.sistemas.find(s => s.id === 'nebulosa');
    s.id += '-' + i; (s.orbitantes || []).forEach(o => { o.id += '-' + i; });
    h = H.append(h, spec, now);
  }
  const spec = changed(), s = spec.sistemas.find(s => s.id === 'nebulosa');
  s.id += '-9'; s.orbitantes.forEach(o => { o.id += '-9'; });
  rejected(() => H.append(h, spec, now), 'capacidade');
});
test('32 forças aceitas; nova união com 40 recusada', () => {
  let h;
  for (let i = 0; i < 3; i++) {
    const spec = changed(), f = spec.forcas[2];
    spec.forcas = Array.from({ length: 10 }, (_, j) => ({ ...clone(f), id: 'forca-' + i + '-' + j }));
    h = h ? H.append(h, spec, now) : H.create(spec, now);
  }
  const spec = H.latest(h); spec.forcas[0].id = 'forca-extra-0'; spec.forcas[1].id = 'forca-extra-1';
  h = H.append(h, spec, now);
  spec.forcas.forEach((f, i) => { f.id = 'forca-excesso-' + i; });
  rejected(() => H.append(h, spec, now), 'capacidade');
});
test('limites UTF-8 de uma especificação, histórico e arquivo são independentes', () => {
  const rich = richSpec();
  const descriptions = [ ...rich.sistemas.map(s => s.centro), ...rich.sistemas[0].planetas,
    ...allChildren(rich).filter(o => o.resumo), ...rich.forcas ];
  for (const obj of descriptions) for (const field of ['resumo', 'porque', 'rotulo', 'fase']) if (field in obj) obj[field] = 'á'.repeat(500);
  assert.ok(H.bytes(JSON.stringify(rich)) > H.limits.specificationBytes);
  rejected(() => H.create(rich, now), 'capacidade');
  // Aproxima uma fase do limite sem passar dele. As outras mantêm IDs iguais.
  for (const obj of descriptions) for (const field of ['resumo', 'porque', 'rotulo', 'fase']) if (field in obj) obj[field] = 'x';
  for (const obj of descriptions) for (const field of ['resumo', 'porque', 'rotulo', 'fase']) if (field in obj) {
    obj[field] = 'á'.repeat(500);
    if (H.bytes(JSON.stringify(rich)) > H.limits.specificationBytes) obj[field] = 'x';
  }
  let h = H.create(rich, now); assert.ok(H.bytes(JSON.stringify(rich)) > 120 * 1024);
  for (let i = 1; i < 7; i++) h = H.append(h, rich, now);
  assert.equal(h.capitulos.length, 7);
  // Oito ou nove fases atingem o limite total, antes do limite de capítulos.
  while (H.bytes(H.serialize(h)) + H.bytes(JSON.stringify(rich)) + 200 <= H.limits.historyBytes) h = H.append(h, rich, now);
  rejected(() => H.append(h, rich, now), 'capacidade');
  rejected(() => H.parse(' '.repeat(H.limits.historyBytes + 1)), 'capacidade');
});
test('Store migra no mesmo localStorage e preserva outras chaves', () => {
  const storage = disk(); storage.setItem(key, JSON.stringify(old)); storage.setItem('outro-app', 'preservado');
  const store = createStore(() => storage), loaded = store.load();
  assert.equal(loaded.migrado, true); assert.equal(loaded.persistido, true);
  assert.equal(JSON.parse(storage.getItem(key)).versao, 2);
  assert.deepEqual(loaded.historico.capitulos[0].especificacao, canonical);
  assert.equal(store.remove().ok, true); assert.equal(storage.getItem('outro-app'), 'preservado');
});
test('importação e append inválidos preservam memória e disco', () => {
  const storage = disk(), store = createStore(() => storage);
  store.generate(canonical, now); const before = storage.getItem(key);
  assert.equal(store.importJSON('{').ok, false);
  assert.equal(store.append({ erro: 'cuidado' }, now).ok, false);
  assert.equal(store.append(null, now).ok, false);
  assert.equal(storage.getItem(key), before);
  assert.equal(store.exportJSON().json, before);
  const leak = store.load(); leak.historico.capitulos.length = 0;
  assert.equal(store.load().historico.capitulos.length, 1);
});
test('quota bloqueada mantém resultado inteiro em memória e antigo no disco', () => {
  const storage = disk(), store = createStore(() => storage); store.generate(canonical, now);
  const before = storage.getItem(key); storage.setItem = () => { throw Error('quota'); };
  const result = store.append(changed(), now);
  assert.equal(result.ok, true); assert.equal(result.persistido, false); assert.equal(result.emMemoria, true);
  assert.match(result.mensagem, /Baixe/); assert.equal(result.historico.capitulos.length, 2);
  assert.equal(storage.getItem(key), before);
  assert.equal(H.parse(store.exportJSON().json).capitulos.length, 2);
  assert.equal(createStore(() => storage).load().historico.capitulos.length, 1);
});
test('capacidade esgotada e geração inválida não substituem o histórico salvo', () => {
  const storage = disk(), store = createStore(() => storage);
  store.generate(canonical, now);
  for (let i = 1; i < 10; i++) assert.equal(store.append(canonical, now).ok, true);
  const before = store.exportJSON().json;
  assert.equal(store.append(changed(), now).codigo, 'capacidade');
  assert.equal(store.generate({ erro: 'cuidado' }, now).ok, false);
  assert.equal(store.exportJSON().json, before); assert.equal(storage.getItem(key), before);
  // Uma geração válida inicia outro histórico; não mistura pessoas.
  assert.equal(store.generate(changed(), now).historico.capitulos.length, 1);
});
test('getter de storage bloqueado, migração sem escrita e exclusão falha', () => {
  const store = createStore(() => { throw Error('bloqueado'); });
  assert.equal(store.load().ok, true); assert.equal(store.generate(canonical, now).persistido, false);
  assert.equal(store.append(changed(), now).historico.capitulos.length, 2);
  assert.equal(store.remove().ok, false); assert.equal(store.load().historico.capitulos.length, 2);
  const storage = disk(); storage.setItem(key, JSON.stringify(old)); storage.setItem = () => { throw Error('quota'); };
  const migrated = createStore(() => storage).load();
  assert.equal(migrated.migrado, true); assert.equal(migrated.persistido, false);
  assert.equal(JSON.parse(storage.getItem(key)).versao, 1);
});
test('storage inválido não é apagado nem substituído pela leitura', () => {
  const storage = disk(); storage.setItem(key, '{');
  const store = createStore(() => storage); assert.equal(store.load().ok, false);
  assert.equal(storage.getItem(key), '{');
  assert.equal(store.importJSON(JSON.stringify(old)).ok, true);
});
test('JavaScript clássico funciona em navegador simulado sem require ou fetch', () => {
  const storage = disk(), context = { NEXUS: {}, localStorage: storage };
  for (const file of ['validator.js', 'history.js', 'universeStore.js']) vm.runInNewContext(fs.readFileSync('nexus/js/data/' + file, 'utf8'), context);
  assert.equal(context.NEXUS.universeStore.generate(canonical, now).persistido, true);
  assert.equal(context.NEXUS.universeStore.append(changed(), now).historico.capitulos.length, 2);
  assert.equal(H.parse(context.NEXUS.universeStore.exportJSON().json).capitulos.length, 2);
});
console.log('OK: ' + count + ' grupos de cenários R2. Sem navegador real, IA ou leitura de .env.');
