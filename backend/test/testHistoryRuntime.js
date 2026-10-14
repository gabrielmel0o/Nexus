/* testHistoryRuntime.js — Executa os controladores reais em DOM/3D simulados.
   Conta recursos, testa presença e estados; não substitui conferência visual. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { fixtures, history } = require('./testHistoryCompiler.js');
const compose = require('../../nexus/js/data/historyCompiler.js');
let resources = { objects: 0, geometries: 0, materials: 0, textures: 0, removed: 0, disposed: 0 };
class V {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  clone() { return new V(this.x, this.y, this.z); }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  subVectors(a, b) { return this.copy(a).sub(b); }
  addVectors(a, b) { return this.copy(a).add(b); }
  multiplyScalar(k) { this.x *= k; this.y *= k; this.z *= k; return this; }
  addScaledVector(v, k) { return this.add(v.clone().multiplyScalar(k)); }
  normalize() { return this.multiplyScalar(1 / (Math.hypot(this.x, this.y, this.z) || 1)); }
  distanceTo(v) { return this.clone().sub(v).length(); }
  length() { return Math.hypot(this.x, this.y, this.z); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  project() { return this; }
  applyQuaternion() { return this; }
}
class C {
  constructor(v = 0xffffff) { this.set(v); }
  set(v) { if (v instanceof C) return this.copy(v); if (typeof v === 'string') v = parseInt(v.slice(1), 16); this.r = ((v >> 16) & 255) / 255; this.g = ((v >> 8) & 255) / 255; this.b = (v & 255) / 255; return this; }
  clone() { return new C().copy(this); }
  copy(v) { return this.setRGB(v.r, v.g, v.b); }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  setScalar(k) { return this.setRGB(k, k, k); }
  multiplyScalar(k) { return this.setRGB(this.r * k, this.g * k, this.b * k); }
  lerp(v, t) { return this.setRGB(this.r + (v.r - this.r) * t, this.g + (v.g - this.g) * t, this.b + (v.b - this.b) * t); }
  getHSL(out) { return Object.assign(out, { h: .5, s: .5, l: .5 }); }
  setHSL() { return this; }
  getHex() { return Math.round(this.r * 255) << 16 | Math.round(this.g * 255) << 8 | Math.round(this.b * 255); }
}
class O {
  constructor() { resources.objects++; this.children = []; this.position = new V(); this.rotation = new V(); this.scale = new V(1, 1, 1); this.userData = {}; this.visible = true; this.quaternion = { copy() {}, setFromUnitVectors() {} }; }
  add(...objects) { objects.forEach(o => { o.parent = this; this.children.push(o); }); }
  remove(o) { resources.removed++; this.children = this.children.filter(c => c !== o); }
  traverse(fn) { fn(this); this.children.forEach(o => o.traverse(fn)); }
  getWorldPosition(v) { v.copy(this.position); for (let p = this.parent; p; p = p.parent) v.add(p.position); return v; }
  worldToLocal(v) { return v.sub(this.getWorldPosition(new V())); }
  updateMatrixWorld() {}
  raycast(_ray, hits) { hits.push({ object: this }); }
}
class G {
  constructor() { resources.geometries++; this.attributes = { position: new A(new Float32Array(12), 3) }; this.userData = {}; this.drawRange = { start: 0, count: Infinity }; }
  setAttribute(k, a) { this.attributes[k] = a; return this; }
  getAttribute(k) { return this.attributes[k]; }
  setFromPoints(points) { this.attributes.position = new A(new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3); return this; }
  setDrawRange(start, count) { this.drawRange = { start, count }; }
  toNonIndexed() { return this; }
  computeVertexNormals() {}
  setIndex(value) { this.index = value; return this; }
  dispose() { resources.disposed++; }
}
class A { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; } getX(i) { return this.array[i * this.itemSize]; } getY(i) { return this.array[i * this.itemSize + 1]; } }
class M { constructor(props = {}) { resources.materials++; Object.assign(this, { opacity: 1, transparent: false }, props); this.color = new C(props.color); } dispose() { resources.disposed++; } }
class Mesh extends O { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class Sprite extends O { constructor(material) { super(); this.material = material; this.isSprite = true; } }
class Light extends O { constructor(color, intensity) { super(); this.color = new C(color); this.intensity = intensity; } }
class Texture { constructor() { resources.textures++; } dispose() { resources.disposed++; } }
const THREE = { Vector3: V, Vector2: V, Color: C, Group: O, Object3D: O, Mesh, Line: Mesh, Sprite, Points: Mesh,
  PointLight: Light, AmbientLight: Light, BufferGeometry: G, SphereGeometry: G, RingGeometry: G, IcosahedronGeometry: G,
  BufferAttribute: A, CanvasTexture: Texture, MeshBasicMaterial: M, MeshToonMaterial: M, MeshLambertMaterial: M,
  SpriteMaterial: M, PointsMaterial: M, LineBasicMaterial: M, ShaderMaterial: M,
  Quaternion: class { setFromUnitVectors() {} copy() {} }, AdditiveBlending: 2, NormalBlending: 1,
  DoubleSide: 2, BackSide: 1, Raycaster: class { setFromCamera() {} intersectObjects() { return []; } } };
function element() {
  const classes = new Set();
  return { style: {}, dataset: {}, children: [], className: '', innerHTML: '', textContent: '',
    classList: { add: (...v) => v.forEach(k => classes.add(k)), remove: (...v) => v.forEach(k => classes.delete(k)), contains: k => classes.has(k) },
    appendChild(o) { this.children.push(o); o.parentNode = this; }, setAttribute() {}, addEventListener() {}, matches() { return false; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    getContext() { return { createRadialGradient() { return { addColorStop() {} }; }, fillRect() {} }; } };
}
function setup(universe) {
  const body = element(), N = { scene: new O(), cam: { position: new V(0, 0, 60), quaternion: {} },
    renderer: { domElement: element(), render() {} }, ROTACAO_GALAXIA: false,
    controls: { update() {}, flyHome() { N.homeFlights = (N.homeFlights || 0) + 1; }, flyTo() {} },
    buildBackground() {}, buildStarfield() {}, buildHalo() {}, capsule() {}, blobs() {},
    makeTexture: () => new Texture(), sparkTexture: () => texture,
    createRNG: id => { let n = id.length; return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296); } };
  const texture = new Texture(); const scheduled = [];
  const ctx = vm.createContext({ NEXUS: N, THREE, console, innerWidth: 1280, innerHeight: 720,
    window: { location: { search: '' }, addEventListener() {} },
    document: { body, createElement: element, querySelector() { return null; }, readyState: 'complete' },
    performance: { now: () => 0 }, URLSearchParams, requestAnimationFrame(fn) { scheduled.push(fn); return scheduled.length; },
    cancelAnimationFrame() {}, setTimeout() { return 1; }, clearTimeout() {} });
  function load(file) { vm.runInContext(fs.readFileSync('nexus/js/' + file, 'utf8'), ctx, { filename: file }); }
  for (const file of ['data/mockUniverse.js', 'data/compiler.js', 'core/state.js', 'core/presence.js',
    'core/picking.js', 'world/sun.js', 'world/binary.js', 'world/accretionDisk.js', 'world/blackhole.js', 'world/nebula.js', 'world/visitor.js',
    'world/elements/companion.js', 'world/elements/dream.js', 'world/elements/star.js', 'world/elements/comet.js',
    'ui/labels.js', 'ui/panel.js', 'world/orbits.js', 'world/lod.js', 'world/planets.js', 'world/system.js',
    'world/forces.js', 'world/arms.js', 'world/events/supernova.js', 'main.js']) load(file);
  N.boot(universe || N.getUniverse());
  function tick(dt = 0) { N.state.update(dt); N.scene.updateMatrixWorld(true); N.updateForces(dt);
    Object.values(N.systemsById).forEach(s => N.updateSystem(s, dt)); N.updateOrbitsFX(); N.panel.update(); }
  return { N, body, scheduled, tick };
}
let count = 0;
function test(name, fn) { fn(); count++; console.log('[OK] ' + name); }
const input = history(fixtures()), original = JSON.stringify(input), universe = compose(input), snapshots = JSON.stringify(universe.historyFrames);
const { N, body, tick } = setup(universe);
test('boot inicia diretamente na última fase, incluindo caches dos construtores', () => {
  assert.equal(N.state.chapter, 2); assert.equal(N.planetsById.corpo.curSize, .45);
  assert.equal(N.planetsById.carreira.moonsById.aprovacao.moonMesh.scale.x, 0);
  assert.equal(N.systemsById.mae.group.visible, true);
});
const baseline = { ...resources }, objects = [];
N.scene.traverse(o => objects.push(o));
test('navegação fora de ordem preserva recursos e snapshots', () => {
  for (const phase of [0, 2, 1, 0, 1, 2, 0, 2]) { N.state.applyChapter(phase); tick(.016); }
  assert.deepEqual(resources, baseline);
  const now = []; N.scene.traverse(o => now.push(o)); assert.deepEqual(now, objects);
  assert.equal(JSON.stringify(universe.historyFrames), snapshots); assert.equal(JSON.stringify(input), original);
});
test('desaparecimento desfaz seleção, fecha painel e devolve câmera', () => {
  N.state.applyChapter(0); N.selectBody('mae'); assert.equal(N.selected, 'mae');
  N.state.applyChapter(1); assert.equal(N.selected, null); assert.equal(N.panel.isOpen(), false); assert.ok(N.homeFlights);
  N.selectBody('mae'); assert.equal(N.selected, null); assert.equal(N.panel.isOpen(), false);
});
test('ausência apaga sistema, planeta zero, filhos, órbitas e luz', () => {
  N.state.applyChapter(1); tick();
  assert.equal(N.systemsById.mae.group.visible, false); assert.equal(N.systemsById.mae.group.scale.x, 0);
  assert.equal(N.systemsById.nebulosa.group.visible, false);
  assert.equal(N.planetsById.corpo.orbitGroup.visible, false); assert.equal(N.planetsById.corpo.orbit.visible, false);
  assert.equal(N.presence.isPresent('proposta'), false); assert.equal(N.presence.isPresent('sonho-recorrente'), false);
  assert.equal(N.presence.isPresent('eu'), true);
  for (const orbit of N.registeredOrbits) if (!N.presence.isPresent(orbit.ownerId)) assert.equal(orbit.line.visible, false);
});
test('forças removidas deixam modificadores neutros; origem zero não atua', () => {
  N.state.applyChapter(1); tick(.016);
  const career = N.planetsById.carreira;
  assert.equal(career.scaleModifier, 1); assert.equal(career.haloModifier, 1); assert.equal(career.colorModifier.r, 1);
  N.state.applyChapter(2); tick(.016); assert.equal(career.scaleModifier, 1);
});
test('painel usa fase, escapa HTML e mostra massa zero sem recuperar antiga', () => {
  N.state.applyChapter(1); N.selectBody('criacao');
  const panel = body.children.find(e => e.className === 'nexus-panel');
  assert.ok(panel.innerHTML.includes('&lt;img')); assert.ok(!panel.innerHTML.includes('<img'));
  assert.ok(!panel.innerHTML.includes('nexus-panel-dot is-filled'));
  N.state.applyChapter(0); assert.ok(!panel.innerHTML.includes('fase intermediária'));
});
test('geometria converge ao layout da fase, preservando o ângulo orbital em andamento', () => {
  for (const phase of [0, 1, 2, 0]) {
    N.state.applyChapter(phase); tick(1);
    const data = N.state.frame.bodies.criacao.system, group = N.systemsById.criacao.group;
    assert.ok(Math.abs(Math.hypot(group.position.x, group.position.z) - Math.hypot(data.position[0], data.position[2])) < 1e-9);
    for (const p of data.planets) {
      assert.equal(N.planetsById[p.id].d.orbit, p.orbit);
      assert.equal(N.planetsById[p.id].curOrbit, p.orbit);
      assert.ok(Math.abs(N.planetsById[p.id].visualGroup.scale.x - p.size * N.planetsById[p.id].scaleModifier) < 1e-9);
    }
  }
});
test('LOD distante contém somente planetas presentes, sem ponto na origem', () => {
  N.state.applyChapter(1); N.cam.position.set(0, 0, 100000); tick(1);
  const system = N.systemsById.criacao;
  assert.equal(system.lod.geo.drawRange.count, N.state.frame.bodies.criacao.system.planets.filter(p => N.presence.isPresent(p.id)).length);
  N.cam.position.set(0, 0, 60);
});
test('remover sistema iluminado apaga luz e todos os seus filhos sem liberar recursos', () => {
  const a = fixtures()[0], extra = JSON.parse(JSON.stringify(a.sistemas.find(s => s.id === 'criacao')));
  extra.id = 'outra-estrela'; extra.nome = 'Outro valor'; extra.orbitantes = [];
  extra.planetas = extra.planetas.slice(0, 2).map((p, i) => ({ ...p, id: 'outra-area-' + i, luas: [], elementos: [] }));
  a.sistemas.push(extra);
  const b = JSON.parse(JSON.stringify(a)); b.sistemas = b.sistemas.filter(s => s.id !== 'criacao');
  b.forcas = b.forcas.filter(f => f.tipo === 'gravidade'); b.forcas[0].alvos = ['exoplaneta'];
  const t = setup(compose(history([a, b]))), before = { ...resources };
  t.N.state.applyChapter(0); t.tick(.1); assert.ok(t.N.systemsById.criacao.pointLight.intensity > 0);
  t.N.selectBody('carreira'); t.N.state.applyChapter(1); t.tick(.1);
  assert.equal(t.N.systemsById.criacao.pointLight.intensity, 0);
  assert.equal(t.N.selected, null);
  for (const id of ['carreira', 'corpo', 'familia', 'aprovacao', 'medo', 'proposta', 'cuidado']) assert.equal(t.N.presence.isPresent(id), false);
  assert.deepEqual(resources, before);
});
test('Helena monta supernova uma vez; ativar, terminar e limpar reutilizam recursos', () => {
  const t = setup(), base = { ...resources }, nodes = [];
  t.N.scene.traverse(o => nodes.push(o));
  for (let i = 0; i < 3; i++) { t.N.events.supernova(); t.N.events.update(.5); t.N.events.update(4); t.N.events.cleanup(); }
  assert.deepEqual(resources, base);
  const after = []; t.N.scene.traverse(o => after.push(o)); assert.deepEqual(after, nodes);
  assert.equal(t.N.data.chapters.length, 4);
});
test('gravidade usa posição de origens que não são sistemas e para quando a origem fica ausente', () => {
  for (const source of ['corpo', 'aprovacao', 'proposta', 'sonho-recorrente']) {
    const a = fixtures()[0]; a.forcas = a.forcas.filter(f => f.tipo === 'gravidade');
    a.forcas[0].origem = source;
    const b = JSON.parse(JSON.stringify(a));
    if (source === 'corpo') b.sistemas.flatMap(s => s.planetas).find(p => p.id === source).tamanho = 0;
    const t = setup(compose(history(source === 'corpo' ? [a, b] : [a])));
    t.N.state.applyChapter(0);
    let reads = 0;
    const position = t.N.pickRegistry[source].getPos;
    t.N.pickRegistry[source].getPos = () => { reads++; return position(); };
    t.tick(.1);
    assert.ok(reads > 0, 'A força precisa usar a posição da origem ' + source);
    const planet = t.N.planetsById.exoplaneta;
    assert.ok(Math.abs(planet.orbitGroup.rotation.x) + Math.abs(planet.orbitGroup.rotation.z) > 0);
    assert.ok(Math.abs(planet.orbitGroup.rotation.x) <= .2 && Math.abs(planet.orbitGroup.rotation.z) <= .2);
    if (source === 'corpo') {
      t.N.state.applyChapter(1); reads = 0; t.tick(.1);
      assert.equal(reads, 0); assert.equal(planet.orbitGroup.rotation.x, 0); assert.equal(planet.orbitGroup.rotation.z, 0);
    }
  }
});
test('trocar fase preserva movimento; somente valores alterados interpolam, sem fade', () => {
  const a = fixtures()[0], b = JSON.parse(JSON.stringify(a));
  b.sistemas.find(s => s.id === 'criacao').planetas.find(p => p.id === 'corpo').tamanho = 8;
  const u = compose(history([a, b])), before = JSON.stringify(u.historyFrames), t = setup(u);
  t.N.state.applyChapter(0); t.tick(1);
  const base = { ...resources };
  const planet = t.N.planetsById.carreira, moon = planet.moonsById.aprovacao;
  const system = t.N.systemsById.criacao, changed = t.N.planetsById.corpo;
  const angles = t.N.registeredOrbits.map(o => o.getPhase ? o.getPhase() : null);
  const planetAngle = planet.angle, moonAngle = moon.angle, galaxyAngle = system.galaxyOrbit.angle;
  const oldSize = changed.curSize, nextSize = u.historyFrames[1].set.corpo.size;
  const oldRadius = system.galaxyOrbit.r;
  t.N.selectBody('carreira');
  t.N.state.applyChapter(1);
  assert.equal(planet.angle, planetAngle); assert.equal(moon.angle, moonAngle);
  assert.equal(system.galaxyOrbit.angle, galaxyAngle); assert.equal(system.galaxyOrbit.r, oldRadius);
  assert.deepEqual(t.N.registeredOrbits.map(o => o.getPhase ? o.getPhase() : null), angles);
  assert.equal(t.N.selected, 'carreira'); assert.equal(changed.curSize, oldSize);
  assert.equal(t.N.state.target.corpo.size, nextSize);
  t.tick(.1);
  assert.ok(changed.curSize > oldSize && changed.curSize < nextSize);
  assert.ok(Math.abs(planet.angle - (planetAngle + planet.d.speed * .1)) < 1e-9);
  assert.ok(Math.abs(moon.angle - (moonAngle + moon.data.speed * .1)) < 1e-9);
  t.N.state.applyChapter(0); t.N.state.applyChapter(1); t.tick(1);
  assert.equal(changed.curSize, nextSize); assert.equal(t.N.state.chapter, 1);
  assert.equal(t.N.renderer.domElement.style.opacity, undefined);
  assert.equal(JSON.stringify(u.historyFrames), before);
  assert.deepEqual(resources, base);
  const helena = setup(); helena.N.state.applyChapter(1); helena.tick(.1);
  assert.ok(helena.N.state.current.carreira.mass > 9 && helena.N.state.current.carreira.mass < 10);
});
test('tamanhos e órbitas intermediários preservam Eu e separação durante a transição', () => {
  const t = setup(compose(history(fixtures())));
  for (const phase of [0, 1, 2, 1, 0]) {
    t.N.state.applyChapter(phase);
    for (let step = 0; step < 80; step++) {
      t.tick(.016);
      const envelopes = [];
      for (const runtime of Object.values(t.N.systemsById)) {
        const id = runtime.data.id;
        if (id === 'eu' || !t.N.presence.isPresent(id)) continue;
        const live = JSON.parse(JSON.stringify(t.N.state.frame.bodies[id].system));
        live.planets = live.planets.filter(p => t.N.presence.isPresent(p.id)).map(p => {
          const body = t.N.planetsById[p.id]; p.orbit = body.curOrbit; p.size = body.curSize;
          p.params.size = 1; p.params.atmosphere = body.curAtmo;
          p.moons = p.moons.filter(m => t.N.presence.isPresent(m.id)).map(m => {
            const moon = body.moonsById[m.id]; m.orbit = moon.curOrbit; m.size = moon.moonMesh.scale.x; return m;
          });
          return p;
        });
        const radius = t.N.compileSpec.geometry.systemRadius(live), distance = runtime.group.position.length();
        assert.ok(distance - radius >= t.N.compileSpec.geometry.forbiddenRadius - 1e-7,
          'Transição invade Eu: fase ' + phase + ', sistema ' + id);
        envelopes.forEach(other => {
          assert.ok(runtime.group.position.distanceTo(other.position) >= radius + other.radius - 1e-7,
            'Transição sobrepõe sistemas: fase ' + phase + ', ' + id + ' e ' + other.id);
        });
        envelopes.push({ id, position: runtime.group.position, radius });
      }
    }
  }
});
console.log('OK: ' + count + ' grupos com controladores reais e DOM/3D simulados. Conferência visual continua manual.');
