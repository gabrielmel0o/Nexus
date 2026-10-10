/* testActiveUniverse.js — Regressões do universo ativo, sem dependências.
   Execute: node backend/test/testActiveUniverse.js
   Simula DOM e objetos 3D para testar integração; não substitui o teste visual. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  subVectors(a, b) { return this.set(a.x - b.x, a.y - b.y, a.z - b.z); }
  normalize() { const d = Math.hypot(this.x, this.y, this.z) || 1; return this.set(this.x / d, this.y / d, this.z / d); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
}
class Object3D {
  constructor() {
    this.position = new Vector3(); this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = new Vector3(1, 1, 1); this.children = []; this.userData = {}; this.visible = true;
  }
  add(o) { this.children.push(o); o.parent = this; }
  getWorldPosition(v) {
    v.copy(this.position);
    for (let p = this.parent; p; p = p.parent) { v.x += p.position.x; v.y += p.position.y; v.z += p.position.z; }
    return v;
  }
}
class Color {
  constructor() { this.r = this.g = this.b = 1; }
  clone() { return new Color(); }
  lerp() { return this; }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  multiplyScalar(n) { this.r *= n; this.g *= n; this.b *= n; return this; }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
}
class Sprite extends Object3D {
  constructor(material) { super(); this.material = material; }
  raycast(raycaster, hits) { hits.push({ object: this }); }
}
class BufferGeometry { setAttribute() { return this; } }
function element() {
  const classes = new Set(); const handlers = {};
  return {
    style: {}, children: [], innerHTML: '',
    classList: { add(k) { classes.add(k); }, remove(k) { classes.delete(k); }, contains(k) { return classes.has(k); } },
    addEventListener(k, fn) { (handlers[k] ||= []).push(fn); },
    dispatch(k, e) { for (const fn of handlers[k] || []) fn(e); },
    setAttribute() {}, matches() { return false; },
    appendChild(e) { this.children.push(e); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  };
}
function setup() {
  const body = element(), canvas = element(), labels = [], frames = [];
  const N = {
    renderer: { domElement: canvas, render() {} }, scene: new Object3D(), cam: { position: new Vector3() },
    controls: { flyTo(fn) { N.cameraTarget = fn(); }, flyHome() {}, update() {} },
    createRNG: () => () => 0.5, sparkTexture() {},
    createLabel(name) { labels.push(name); return element(); }, updateLabel() {},
    buildBackground() {}, buildStarfield() {}, updateSystem() {}
  };
  class Raycaster {
    setFromCamera() {}
    intersectObjects() { const hits = []; if (N.hitObject) N.hitObject.raycast(this, hits); return hits; }
  }
  const THREE = {
    Vector3, Vector2: class {}, Color, Group: Object3D, Object3D, Sprite, BufferGeometry,
    BufferAttribute: class {}, SpriteMaterial: class { constructor(o) { Object.assign(this, o); this.color = new Color(); } },
    PointsMaterial: class {}, Points: Object3D, Raycaster
  };
  const ctx = vm.createContext({
    NEXUS: N, THREE, console: { log() {}, warn() {}, error() {} }, URLSearchParams,
    performance: { now: () => 0 }, requestAnimationFrame(fn) { frames.push(fn); },
    setTimeout() {}, clearTimeout() {}, window: { location: { search: '' }, addEventListener() {} },
    document: { body, readyState: 'complete', createElement: element, querySelector() { return null; } }
  });
  function load(f) { vm.runInContext(fs.readFileSync(path.join(__dirname, '../../nexus/js', f), 'utf8'), ctx, { filename: f }); }
  for (const f of ['data/mockUniverse.js', 'data/compiler.js', 'core/state.js', 'core/picking.js',
    'ui/panel.js', 'ui/time.js', 'world/arms.js', 'world/forces.js', 'world/elements/star.js']) load(f);
  N.buildSystem = s => ({ data: s });
  load('main.js');
  return { N, body, canvas, labels, frames };
}
function getTime(t) { return t.body.children.find(e => e.className === 'nexus-time-control'); }

// O boot deve atualizar uma UI já criada; o universo inicial não é sempre Helena.
const active = setup();
const input = {
  chapter: 0, laws: active.N.data.laws,
  galaxy: { arms: { routines: [{ name: 'Rotina fictícia', arm: 0, progress: 0.4 }] } },
  systems: [], forces: [], chapters: [{ id: 0, caption: 'Agora', set: {} }]
};
active.N.boot(input);
assert.equal(getTime(active).style.display, 'none');
assert.deepEqual(active.labels, ['Rotina fictícia']);
active.N.nextChapter();
active.N.state.applyChapter(1);
assert.equal(active.N.state.chapter, 0);
assert.equal(active.N.state.target.carreira, undefined);

// Capítulos da Helena e suas notas continuam funcionando sem backend.
const helena = setup(); const before = JSON.stringify(helena.N.data);
helena.N.boot(helena.N.getUniverse());
assert.equal(getTime(helena).style.display, '');
helena.N.nextChapter();
assert.equal(helena.N.state.chapter, 1);
assert.equal(helena.N.state.target.carreira.mass, 10);
helena.N.selectBody('criacao');
assert.ok(helena.body.children.find(e => e.className === 'nexus-panel').innerHTML.includes(
  helena.N.data.systems.find(s => s.id === 'criacao').center.info.notes[1]));
helena.N.nextChapter(); helena.N.nextChapter(); helena.N.resetChapters();
assert.equal(helena.N.state.chapter, 0);
assert.equal(helena.N.state.target.carreira.mass, 9);
assert.equal(JSON.stringify(helena.N.data), before);

// state.init deve trocar também a fonte dos capítulos, mesmo com IDs novos.
active.N.state.init({ chapter: 0, systems: [], forces: [], chapters: [
  { id: 0, set: {} }, { id: 1, set: { 'corpo-ficticio': { mass: 6 } } }
] });
active.N.state.applyChapter(1);
assert.equal(active.N.state.target['corpo-ficticio'].mass, 6);
assert.equal(active.N.state.target.carreira, undefined);

// Forças usam referências do universo ativo e respeitam intensidade zero.
const planet = {
  moonsById: { 'lua-ficticia': { angle: Math.PI / 4, moonMesh: new Object3D() } },
  group: new Object3D(), orbitGroup: new Object3D(), colorModifier: new Color()
};
active.N.planetsById = { 'planeta-ficticio': planet };
active.N.currentUniverse.forces = [{ id: 'mare-ficticia', kind: 'tide', source: 'lua-ficticia',
  targets: ['planeta-ficticio'], params: { strength: 0.5 } }];
active.N.state.init(active.N.currentUniverse);
active.N.updateForces(0.1);
assert.equal(planet.scaleModifier, 1.02);
active.N.state.current['mare-ficticia'].strength = 0;
active.N.updateForces(0.1);
assert.equal(planet.scaleModifier, 1);
planet.moonsById['lua-ficticia'].moonMesh.position.x = 1;
const star = new Object3D(); star.position.x = 10;
active.N.systemsById = { 'estrela-ficticia': { group: star, centerObj: { object: new Object3D() } } };
active.N.currentUniverse.forces = [{ id: 'eclipse-ficticio', kind: 'eclipse', source: 'lua-ficticia',
  star: 'estrela-ficticia', targets: ['planeta-ficticio'], params: { strength: 1 } }];
active.N.state.init(active.N.currentUniverse); active.N.updateForces(0.1);
assert.ok(planet.colorModifier.r < 1);
active.N.currentUniverse.forces = [{ id: 'gravidade-ficticia', kind: 'gravity', source: 'estrela-ficticia',
  targets: ['planeta-ficticio'], params: { strength: 1 } }];
active.N.state.init(active.N.currentUniverse); active.N.updateForces(0.1);
assert.ok(planet.orbitGroup.rotation.z < 0);

// Sinais ganham info sem alterar o mock. Cliques só funcionam quando visíveis.
const prepared = helena.N.currentUniverse;
const exo = prepared.systems.flatMap(s => s.planets).find(p => p.kind === 'exo');
const signal = exo.elements[0];
assert.ok(signal.info.summary && prepared.laws[signal.info.law]);
const instance = helena.N.elementBuilders.star(signal, exo);
helena.N.scene.add(instance.object);
helena.N.hitObject = instance.object.children[1];
function click() {
  const event = { clientX: 1, clientY: 1 };
  helena.canvas.dispatch('pointerdown', event); helena.canvas.dispatch('pointerup', event);
}
helena.N.deselectBody(); instance.update(0.1); click();
assert.equal(helena.N.selected, null);
helena.N.state.current[exo.id].signals = 1;
instance.update(0.1); click();
assert.equal(helena.N.selected, signal.id);
assert.equal(helena.N.cameraTarget.x, exo.size * 2.7);
assert.ok(helena.body.children.find(e => e.className === 'nexus-panel').innerHTML.includes(signal.info.summary));
instance.object.visible = false; helena.N.deselectBody(); click();
assert.equal(helena.N.selected, null);
instance.object.visible = true; helena.N.state.current[exo.id].signals = 0;
instance.update(0.1); click(); assert.equal(helena.N.selected, null);

// Textos semânticos existentes dos sinais são preservados.
const withText = JSON.parse(JSON.stringify(prepared));
const withTextSignal = withText.systems.flatMap(s => s.planets).find(p => p.kind === 'exo').elements[0];
withTextSignal.info.summary = 'Descrição fictícia específica';
const normalized = helena.N.prepareUniverseForDisplay(withText);
assert.equal(normalized.systems.flatMap(s => s.planets).find(p => p.kind === 'exo').elements[0].info.summary,
  'Descrição fictícia específica');

// Um sinal pode trazer só uma parte da descrição na especificação semântica.
const semantic = require('../../nexus/js/data/spec/helenaSpec.js');
const partial = JSON.parse(JSON.stringify(semantic));
const partialSignal = partial.sistemas.flatMap(s => s.planetas).find(p => p.tipo === 'exo').elementos[0];
partialSignal.porque = 'Justificativa fictícia fornecida na especificação';
const partialCompiled = helena.N.compileSpec(partial);
assert.equal(partialCompiled.systems.flatMap(s => s.planets).find(p => p.kind === 'exo').elements[0].info.why,
  partialSignal.porque);

console.log('OK: boot, tempo, capítulos, rotinas, maré, eclipse, gravidade e seleção/painel de sinais.');
console.log('Teste com DOM e 3D simulados; a conferência visual/F12 permanece manual.');
