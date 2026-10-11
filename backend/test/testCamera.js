/* testCamera.js — Enquadramento de universos, sem dependências ou IA.
   Execute da raiz: node backend/test/testCamera.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compile = require('../../nexus/js/data/compiler.js');
const helenaSpec = require('../../nexus/js/data/spec/helenaSpec.js');
const root = path.resolve(__dirname, '../..');

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
}

function setup(aspect) {
  const events = {}, windowEvents = {};
  const N = {
    compileSpec: compile,
    renderer: { domElement: { addEventListener: (name, fn) => { events[name] = fn; } } },
    cam: { fov: 38, aspect, far: 2000, position: new Vector3(), lookAt() {}, updateProjectionMatrix() {} },
    startMode: () => false
  };
  const ctx = vm.createContext({ NEXUS: N, THREE: { Vector3 }, console,
    window: { addEventListener: (name, fn) => { windowEvents[name] = fn; } } });
  for (const file of ['data/mockUniverse.js', 'core/controls.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'nexus/js', file), 'utf8'), ctx);
  }
  return { N, events, windowEvents };
}

// Confere pontos da superfície dos limites de cada sistema no volume da câmera.
// Não usa a fórmula do enquadramento para decidir se os pontos cabem.
function assertFits(N) {
  const eye = [N.cam.position.x, N.cam.position.y, N.cam.position.z];
  const length = Math.hypot(...eye);
  const forward = eye.map(x => -x / length);
  const rightLength = Math.hypot(forward[0], forward[2]);
  const right = [-forward[2] / rightLength, 0, forward[0] / rightLength];
  const up = [right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  const tangent = Math.tan(N.cam.fov * Math.PI / 360);
  for (const system of N.currentUniverse.systems) {
    const radius = compile.geometry.systemRadius(system);
    for (let i = 0; i < 160; i++) {
      const z = 1 - 2 * (i + 0.5) / 160;
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      const ring = Math.sqrt(1 - z * z);
      const direction = [ring * Math.cos(angle), z, ring * Math.sin(angle)];
      const delta = system.position.map((value, axis) => value + radius * direction[axis] - eye[axis]);
      const depth = dot(delta, forward);
      assert.ok(depth > 0.1 && depth < N.cam.far, 'Sistema fora dos planos da câmera: ' + system.id);
      assert.ok(Math.abs(dot(delta, right) / (depth * tangent * N.cam.aspect)) < 1, 'Corte lateral: ' + system.id);
      assert.ok(Math.abs(dot(delta, up) / (depth * tangent)) < 1, 'Corte vertical: ' + system.id);
    }
  }
}

const original = setup(1440 / 900);
original.N.currentUniverse = compile.prepareUniverseForDisplay(original.N.data);
assert.equal(original.N.controls.getOverviewRadius(), 52);
original.N.controls.state.r = 16;
original.N.controls.flyHome();
assert.equal(original.N.controls.target.r, 52);
original.events.wheel({ deltaY: 10000 });
assert.equal(original.N.controls.target.r, 260);
assert.equal(original.N.cam.far, 2000);

const universes = [compile(helenaSpec)];
for (let seed = 0; seed < 5; seed++) {
  const spec = JSON.parse(JSON.stringify(helenaSpec));
  spec.titulo = 'Universo fictício ' + seed;
  spec.sistemas.forEach((s, i) => { s.profundidade = (i + seed) % 5; });
  universes.push(compile(spec));
}
let scenarios = 0;
for (const universe of universes) {
  for (const aspect of [1440 / 900, 375 / 812, 812 / 375]) {
    const { N, events, windowEvents } = setup(aspect);
    N.currentUniverse = universe;
    const before = JSON.stringify(universe);
    const radius = N.controls.getOverviewRadius();
    assert.ok(radius > 260);
    for (const angles of [[0.5, 1.12], [2, 0.4], [-1, 2.5]]) {
      Object.assign(N.controls.state, { th: angles[0], ph: angles[1], r: radius });
      Object.assign(N.controls.target, N.controls.state);
      N.controls.update(0);
      assertFits(N); scenarios++;
    }
    const body = new Vector3(50, 0, 20);
    N.controls.flyTo(() => body, 8, 1);
    assert.equal(N.controls.target.r, 8);
    assert.equal(N.controls.lookT.x, 50);
    N.controls.state.r = 8;
    N.controls.flyHome();
    assert.equal(N.controls.target.r, radius);
    assert.equal(N.controls.lookT.x, 0);
    events.wheel({ deltaY: 10000 });
    assert.ok(N.controls.target.r > radius);

    // A janela estreita reenquadra a visão geral, mas não interrompe a seleção.
    N.cam.aspect = 0.3;
    windowEvents.resize();
    assert.ok(N.controls.target.r > radius);
    N.selected = 'astro-ficticio';
    N.controls.flyTo(() => body, 8, 1);
    N.cam.aspect = 2;
    windowEvents.resize();
    assert.equal(N.controls.target.r, 8);
    assert.equal(N.controls.lookT.x, 50);
    N.selected = null; N.startMode = () => true;
    N.controls.target.r = N.controls.START_DIST;
    windowEvents.resize();
    assert.equal(N.controls.target.r, N.controls.START_DIST);
    assert.equal(JSON.stringify(universe), before);
  }
}
console.log(`OK: ${scenarios} enquadramentos, Helena original, zoom, retorno, resize e seleção preservados.`);
