/* testHistoryCompiler.js — Contrato puro R3; não lê .env ou chama IA. */
const assert = require('node:assert/strict');
const H = require('../../nexus/js/data/history.js');
const compile = require('../../nexus/js/data/compiler.js');
const compose = require('../../nexus/js/data/historyCompiler.js');
const helena = require('../../nexus/js/data/spec/helenaSpec.js');
const copy = v => JSON.parse(JSON.stringify(v));
const now = '2026-10-13T15:00:00.000Z';
function fixtures() {
  const a = copy(helena), b = copy(a), c = copy(a);
  b.sistemas = b.sistemas.filter(s => !['mae', 'nebulosa'].includes(s.id));
  const star = b.sistemas.find(s => s.id === 'criacao'); star.profundidade = 4;
  star.centro.temperatura = 'fria'; star.centro.massa = 0;
  star.centro.summary = '<img src=x onerror=alert(1)>Texto da fase intermediária';
  star.planetas.find(p => p.id === 'carreira').tamanho = 10;
  star.planetas.find(p => p.id === 'carreira').elementos = [];
  star.planetas.find(p => p.id === 'corpo').tamanho = 0;
  star.planetas.find(p => p.id === 'corpo').massa = 0;
  b.forcas = b.forcas.filter(f => f.tipo === 'gravidade');
  const newPlanet = copy(c.sistemas[0].planetas[0]); newPlanet.id = 'lazer'; newPlanet.nome = 'Lazer';
  c.sistemas[0].planetas.push(newPlanet); c.sistemas[0].centro.temperatura = 'neutra';
  c.sistemas[0].planetas.find(p => p.id === 'corpo').tamanho = 2.25;
  c.sistemas[0].planetas.find(p => p.id === 'carreira').luas[0].tamanho = 0;
  c.sistemas.find(s => s.id === 'mae').centro.temperatura = 'neutra';
  return [a, b, c];
}
function history(specs) { return specs.reduce((h, s) => h ? H.append(h, s, now) : H.create(s, now), null); }
let count = 0;
function test(name, fn) { fn(); count++; console.log('[OK] ' + name); }
if (require.main === module) {
const specs = fixtures(), input = history(specs), original = JSON.stringify(input), u = compose(input);
test('entrada intacta, último capítulo e união maior que uma fase', () => {
  assert.equal(JSON.stringify(input), original); assert.equal(u.chapter, 2); assert.equal(u.chapters.length, 3);
  assert.ok(u.systems.find(s => s.id === 'mae'));
  assert.ok(u.systems.flatMap(s => s.planets).find(p => p.id === 'lazer'));
  assert.deepEqual(compose(input), u);
});
test('presença e força zero para tudo que saiu ou ainda não chegou', () => {
  assert.equal(u.chapters[0].set.lazer.presence, 0);
  for (const id of ['mae', 'nebulosa', 'sonho-recorrente', 'proposta']) assert.equal(u.chapters[1].set[id].presence, 0);
  assert.equal(u.chapters[1].set['mare-aprovacao'].strength, 0);
  assert.equal(u.chapters[1].set['eclipse-medo'].strength, 0);
  for (const f of u.historyFrames) assert.equal(f.set.eu.presence, 1);
});
test('tamanho real, inclusive zero e fração, é escala sobre base positiva', () => {
  const planets = u.systems.flatMap(s => s.planets);
  assert.equal(planets.find(p => p.id === 'corpo').size, 1);
  assert.equal(u.chapters[1].set.corpo.size, 0); assert.equal(u.chapters[1].set.carreira.size, 2);
  assert.equal(u.chapters[2].set.corpo.size, .45); assert.equal(u.chapters[2].set.aprovacao.size, 0);
});
test('textos, massa zero, temperatura e profundidade são da fase', () => {
  assert.equal(u.historyFrames[1].bodies.criacao.params.mass, 0);
  assert.equal(u.historyFrames[1].bodies.criacao.depth, 4);
  assert.match(u.historyFrames[1].bodies.criacao.info.summary, /fase intermediária/);
  assert.notEqual(u.historyFrames[0].bodies.criacao.system.center.color, u.historyFrames[1].bodies.criacao.system.center.color);
  assert.equal(u.historyFrames[2].set.mae.tone, .5);
});
test('reordenar listas não muda o layout novo', () => {
  const reordered = copy(input);
  function reverse(v) { if (!v || typeof v !== 'object') return; if (Array.isArray(v)) v.reverse(); Object.values(v).forEach(reverse); }
  reordered.capitulos.forEach(c => reverse(c.especificacao));
  assert.deepEqual(compose(reordered), u);
});
test('acrescentar fase conserva configuração espacial original das anteriores', () => {
  const prefix = compose(history(specs.slice(0, 2)));
  for (let i = 0; i < 2; i++) assert.deepEqual(prefix.historyFrames[i].bodies, u.historyFrames[i].bodies);
});
test('versão 1 migrada conserva posições e tamanhos do compilador antigo', () => {
  const migrated = compose({ versao: 1, salvoEm: now, especificacao: helena }), old = compile(helena);
  old.systems.forEach(s => {
    assert.deepEqual(migrated.historyFrames[0].bodies[s.id].system.position, s.position);
    s.planets.forEach(p => assert.equal(migrated.historyFrames[0].set[p.id].size, p.size));
  });
});
test('proteção do Eu, separação e extensão máxima em todas as fases', () => {
  for (const f of u.historyFrames) {
    const systems = Object.values(f.bodies).filter(b => b.system && b.id !== 'eu').map(b => b.system);
    for (const s of systems) assert.ok(Math.hypot(...s.position) - compile.geometry.systemRadius(s) >= compile.geometry.forbiddenRadius - 1e-7);
    assert.ok(u.historyExtent >= f.extent);
  }
});
test('extremos permitidos de brilho, atmosfera, planeta e lua cabem no layout', () => {
  for (const value of [0, 10]) {
    const spec = copy(helena);
    spec.sistemas.forEach(s => {
      if (['estrela', 'anaBranca', 'anaMarrom', 'binaria'].includes(s.centro.tipo)) s.centro.brilho = value;
      (s.planetas || []).forEach(p => { p.tamanho = value; p.atmosfera = value;
        (p.luas || []).forEach(m => { m.tamanho = value; }); });
    });
    const extreme = compose(H.create(spec, now));
    assert.ok(Number.isFinite(extreme.historyExtent));
    Object.values(extreme.historyFrames[0].bodies).filter(b => b.kind).forEach(p => assert.equal(p.size, value / 5));
  }
});
test('estrutura incompatível e mapa individual inválido não passam pelo adaptador', () => {
  const bad = copy(input); bad.capitulos[1].especificacao.sistemas.find(s => s.id === 'criacao').centro.tipo = 'anaBranca';
  assert.throws(() => compose(bad));
  const invalid = copy(input); invalid.capitulos[0].especificacao.sistemas[0].planetas = [];
  assert.throws(() => compose(invalid));
});
test('referência válida nas Leis mas não representável pelo efeito é recusada', () => {
  const spec = copy(helena); spec.forcas[0].origem = 'criacao';
  assert.equal(H.validateSpecification(spec).ok, true);
  assert.throws(() => compose(H.create(spec, now)), /lua/);
});
test('gravidade aceita origem em planeta, lua, elemento e orbitante sem reescrever o mapa', () => {
  for (const source of ['corpo', 'aprovacao', 'proposta', 'sonho-recorrente']) {
    const spec = copy(helena);
    spec.forcas.find(f => f.tipo === 'gravidade').origem = source;
    assert.equal(H.validateSpecification(spec).ok, true);
    const input = H.create(spec, now), original = JSON.stringify(input);
    const compiled = compose(input);
    assert.equal(compiled.historyFrames[0].forces.find(f => f.kind === 'gravity').source, source);
    assert.equal(JSON.stringify(input), original);
  }
  const unsupported = copy(helena);
  unsupported.forcas.find(f => f.tipo === 'gravidade').alvos = ['criacao'];
  assert.throws(() => compose(H.create(unsupported, now)), /alvos em planetas/);
});
test('snapshots derivados são congelados e não podem ser reescritos por controladores', () => {
  assert.ok(Object.isFrozen(u.historyFrames[0]));
  assert.ok(Object.isFrozen(u.historyFrames[0].bodies.corpo));
  assert.equal(JSON.stringify(input), original);
});
console.log('OK: ' + count + ' grupos de compilação histórica; nenhuma cena montada neste teste.');
}
module.exports = { fixtures, history };
