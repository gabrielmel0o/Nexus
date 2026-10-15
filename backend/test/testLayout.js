/* testLayout.js — Proteção do Eu e separação de sistemas compilados.
   Execute da raiz: node backend/test/testLayout.js
   Usa somente personagens fictícios e módulos nativos do Node. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const compile = require('../../nexus/js/data/compiler.js');
const validate = require('../../nexus/js/data/validator.js');
const helena = require('../../nexus/js/data/spec/helenaSpec.js');
const geometry = compile.geometry;
const EPS = 1e-8;
const clone = value => JSON.parse(JSON.stringify(value));

// Confere o resultado, incluindo o espaço entre anéis mesmo se os ângulos mudarem.
function checkLayout(universe) {
  const systems = universe.systems.filter(s => s.id !== 'eu');
  const eu = universe.systems.find(s => s.id === 'eu');
  assert.deepEqual(eu.position, [0, 0, 0]);
  for (const s of systems) {
    const distance = Math.hypot(...s.position);
    const radius = geometry.systemRadius(s);
    assert.ok(distance - radius >= geometry.forbiddenRadius - EPS, `${s.id}: invade a proteção do Eu`);
    for (const other of systems) {
      if (other === s) continue;
      const otherDistance = Math.hypot(...other.position);
      const otherRadius = geometry.systemRadius(other);
      assert.ok(Math.abs(distance - otherDistance) >= radius + otherRadius + geometry.systemGap - EPS,
        `${s.id}/${other.id}: anéis se sobrepõem durante a rotação`);
      if (other.depth > s.depth) assert.ok(otherDistance > distance, 'Profundidade invertida');
    }
    // Limites independentes: órbitas externas, luas, anéis e sprites do motor.
    for (const p of s.planets) {
      assert.ok(radius >= p.orbit + p.size * 1.04, 'Corpo fora do limite');
      for (const m of p.moons) assert.ok(radius >= p.orbit + m.orbit + m.size, 'Lua fora do limite');
      for (const r of p.rings || []) assert.ok(radius >= p.orbit + p.size * r.outer * 1.04, 'Anel fora do limite');
      for (const e of p.elements || []) {
        const local = e.type === 'comet' ? 13 : p.size * 2.7 + 2.85 / Math.SQRT2;
        assert.ok(radius >= p.orbit + local, 'Elemento fora do limite');
      }
    }
    for (const o of s.orbiters) {
      const local = o.type === 'companion' ? 16 / Math.SQRT2 : 2.4 / Math.SQRT2;
      assert.ok(radius >= o.orbit + local, 'Orbitante fora do limite');
    }
    if (s.center.kind === 'star') {
      const widths = { sun: 48, whiteDwarf: 9, brownDwarf: 10 };
      assert.ok(radius >= widths[s.center.spectral] * Math.max(s.center.params.brightness, 0.04) / Math.SQRT2,
        'Brilho fora do limite');
    }
    if (s.center.kind === 'nebula') assert.ok(radius >= 21, 'Nebulosa fora do limite');
    if (s.center.kind === 'binary') assert.ok(radius >= 8 + 12 / Math.SQRT2, 'Binária fora do limite');
    if (s.center.kind === 'blackhole') assert.ok(radius >= 2.4 * 4.4 * 1.03, 'Disco fora do limite');
    if (s.center.kind === 'visitor') {
      // Caminho completo: o motor pode escolher qualquer aproximação de 0 a 1.
      for (let step = 0; step <= 20; step++) {
        const t = step / 20;
        const point = s.center.path[0].map((v, i) => v + (s.center.path[1][i] - v) * t);
        assert.ok(Math.hypot(...point) - 1.04 * 5.8 >= geometry.forbiddenRadius - EPS, 'Caminho invade o Eu');
        const offset = Math.hypot(...point.map((v, i) => v - s.position[i]));
        assert.ok(offset + 1.04 * 5.8 <= radius + EPS, 'Caminho sai do anel reservado');
      }
    }
  }
}

function variedSpec(variation, seed, depths) {
  const spec = clone(helena);
  const renames = new Map(spec.sistemas.map(s => [s.id, `${s.id}-teste-${variation}-${seed}`]));
  // Renomeia também referências nas forças, sem mudar a história fictícia.
  function rename(value, key) {
    if (typeof value === 'string') return ['id', 'origem', 'alvos', 'estrela'].includes(key) ? renames.get(value) || value : value;
    if (Array.isArray(value)) return value.map(v => rename(v, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rename(v, k)]));
    return value;
  }
  const result = rename(spec);
  result.sistemas.forEach((s, i) => {
    s.profundidade = depths[i];
    for (const key of ['brilho', 'tensao', 'disco', 'protoestrela', 'aproximacao']) {
      if (s.centro[key] !== undefined) s.centro[key] = variation % 2 ? 10 : 0;
    }
    for (const p of s.planetas || []) {
      p.tamanho = variation % 2 ? 10 : 0;
      if (p.atmosfera !== undefined) p.atmosfera = variation % 2 ? 10 : 0;
      for (const m of p.luas || []) m.tamanho = variation % 2 ? 10 : 0;
    }
  });
  // Caso com seis planetas e a última órbita a 70 unidades.
  if (variation === 4) {
    result.sistemas.find(s => s.centro.tipo === 'anaMarrom').planetas = [];
    result.forcas = result.forcas.filter(f => f.tipo !== 'gravidade');
    const planets = result.sistemas[0].planetas;
    for (let i = 0; i < 3; i++) {
      const p = clone(planets[0]);
      p.id = `planeta-extra-${i}`;
      p.nome = `Área fictícia ${i}`;
      planets.push(p);
    }
  }
  if (variation === 3) result.sistemas.reverse();
  return result;
}

function run() {
  assert.equal(geometry.selfRadius, 4.2);
  assert.ok(Math.abs(geometry.diskRadius - 18.48) < EPS);
  assert.ok(Math.abs(geometry.forbiddenRadius - 23.48) < EPS);
  // Se o motor mudar, este teste avisa que a cópia dos tamanhos precisa de revisão.
  const engine = fs.readFileSync(path.join(__dirname, '../../nexus/js/world/blackhole.js'), 'utf8');
  assert.match(engine, /const raioEu = 4\.2/);
  assert.match(engine, /const menorDistanciaSistema = 51\.35/);
  assert.match(engine, /const raioMaximoSeguro = menorDistanciaSistema \* 0\.7/);
  assert.match(engine, /Math\.min\(raioEu \* 4\.4, raioMaximoSeguro\)/);
  checkLayout(compile(helena));
  let count = 1;
  for (let variation = 0; variation < 5; variation++) {
    for (let seed = 0; seed < 20; seed++) {
      // Todas as profundidades no mesmo mapa e três sistemas na profundidade zero.
      const depthSets = [[0, 0, 0, 1, 2, 3, 4], ...[0, 1, 2, 3, 4].map(d => Array(7).fill(d))];
      for (const depths of depthSets) {
        const spec = variedSpec(variation, seed, depths);
        const validation = validate(spec);
        assert.equal(validation.ok, true, `Variação ${variation}: ${validation.erros.join('; ')}`);
        const before = JSON.stringify(spec);
        const universe = compile(spec);
        checkLayout(universe);
        assert.equal(JSON.stringify(compile(spec)), JSON.stringify(universe), 'Semente deixou de ser determinística');
        assert.equal(JSON.stringify(spec), before, 'Entrada alterada');
        count++;
      }
    }
  }
  // O mesmo compilador continua carregando como JavaScript clássico no navegador.
  const context = { NEXUS: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../nexus/js/data/compiler.js'), 'utf8'), context);
  assert.equal(JSON.stringify(context.NEXUS.compileSpec(helena)), JSON.stringify(compile(helena)));
  console.log(`[OK] ${count} universos: proteção do Eu, órbitas, separação, profundidades e determinismo.`);
  console.log('Limite: visitor.js substitui o caminho quando encontra criacao e nao-escolhida; este teste confere o caminho compilado.');
}

module.exports = { checkLayout };
if (require.main === module) run();
