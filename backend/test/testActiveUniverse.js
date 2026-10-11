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
  remove(o) { this.children = this.children.filter(c => c !== o); o.parent = null; }
  traverse(fn) { fn(this); this.children.forEach(c => c.traverse(fn)); }
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
  constructor(material) { super(); this.material = material; this.isSprite = true; }
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
function setup(withPreview = false) {
  const body = element(), canvas = element(), labels = [], frames = [];
  if (withPreview) body.classList.add('modo-start');
  const cancelledFrames = [];
  const windowListeners = [];
  // Simula captura antes da propagação, como o navegador faz com o Esc.
  const windowEvents = {
    location: { search: '' },
    addEventListener(name, fn, capture) { windowListeners.push({ name, fn, capture: capture === true }); },
    dispatchKey(key) {
      let stopped = false;
      const event = { key, stopImmediatePropagation() { stopped = true; } };
      for (const capture of [true, false]) {
        for (const listener of windowListeners.filter(l => l.name === 'keydown' && l.capture === capture)) {
          listener.fn(event);
          if (stopped) return;
        }
      }
    }
  };
  const N = {
    renderer: { domElement: canvas, render() {} }, scene: new Object3D(), cam: { position: new Vector3() },
    controls: { flyTo(fn) { N.cameraTarget = fn(); },
      flyHome() { N.cameraTarget = new Vector3(); N.homeFlights = (N.homeFlights || 0) + 1; }, update() {} },
    createRNG: () => () => 0.5, sparkTexture() {},
    createLabel(name) { labels.push(name); return element(); }, updateLabel() {},
    buildBackground() { N.backgroundBuilds = (N.backgroundBuilds || 0) + 1; },
    buildStarfield() { N.starfieldBuilds = (N.starfieldBuilds || 0) + 1; }, updateSystem() {}
  };
  // A prévia usa o construtor do Eu, sem montar sistemas ou registrar cliques.
  N.centerBuilders = { blackhole(data, parent) {
    const object = new Object3D(); parent.add(object);
    object.geometry = { dispose() { N.disposedGeometry = true; } };
    object.material = { map: { dispose() { N.disposedTexture = true; } },
      dispose() { N.disposedMaterial = true; } };
    return { object, update() { N.previewUpdates = (N.previewUpdates || 0) + 1; } };
  } };
  class Raycaster {
    setFromCamera() {}
    intersectObjects() {
      const hits = [];
      for (const object of N.hitObjects || (N.hitObject ? [N.hitObject] : [])) object.raycast(this, hits);
      return hits;
    }
  }
  const THREE = {
    Vector3, Vector2: class {}, Color, Group: Object3D, Object3D, Sprite, BufferGeometry, AdditiveBlending: 2,
    BufferAttribute: class {}, SpriteMaterial: class { constructor(o) { Object.assign(this, o); this.color = new Color(); } },
    PointsMaterial: class {}, Points: Object3D, Raycaster
  };
  const ctx = vm.createContext({
    NEXUS: N, THREE, console: { log() {}, warn() {}, error() {} }, URLSearchParams,
    performance: { now: () => 0 }, requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
    cancelAnimationFrame(id) { cancelledFrames.push(id); },
    setTimeout() {}, clearTimeout() {}, window: windowEvents,
    MutationObserver: class { observe() {} },
    document: { body, readyState: 'complete', createElement: element, querySelector() { return null; }, addEventListener() {} }
  });
  function load(f) { vm.runInContext(fs.readFileSync(path.join(__dirname, '../../nexus/js', f), 'utf8'), ctx, { filename: f }); }
  for (const f of ['data/mockUniverse.js', 'data/compiler.js', 'core/state.js', 'core/picking.js',
    'ui/panel.js', 'ui/legend.js', 'ui/time.js', 'world/arms.js', 'world/forces.js', 'world/elements/star.js']) load(f);
  N.buildSystem = s => ({ data: s });
  load('main.js');
  return { N, body, canvas, labels, frames, windowEvents, cancelledFrames };
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

// O halo da estrela na frente do planeta não rouba hover, clique ou painel.
const glowParent = new Object3D(); glowParent.userData.pickId = 'criacao';
const decorativeGlow = new Sprite({ blending: 2 }); glowParent.add(decorativeGlow);
const planetHit = new Object3D(); planetHit.userData.pickId = 'corpo';
planetHit.raycast = (_raycaster, hits) => hits.push({ object: planetHit });
helena.N.hitObjects = [decorativeGlow, planetHit];
helena.canvas.dispatch('pointermove', { clientX: 1, clientY: 1 });
assert.equal(helena.N.hoveredId, 'corpo');
click(); assert.equal(helena.N.selected, 'corpo');
assert.ok(helena.body.children.find(e => e.className === 'nexus-panel').innerHTML.includes(
  prepared.systems.flatMap(s => s.planets).find(p => p.id === 'corpo').info.summary));

// A esfera invisível da estrela também não cobre o planeta visível.
const expandedStarHit = new Object3D(); expandedStarHit.userData.pickId = 'criacao';
expandedStarHit.material = { transparent: true, opacity: 0 };
expandedStarHit.raycast = (_raycaster, hits) => hits.push({ object: expandedStarHit });
helena.N.hitObjects = [expandedStarHit, decorativeGlow, planetHit];
helena.canvas.dispatch('pointermove', { clientX: 1, clientY: 1 });
assert.equal(helena.N.hoveredId, 'corpo');
click(); assert.equal(helena.N.selected, 'corpo');

// Sem corpo visível, o alvo ampliado ainda facilita o clique na estrela.
helena.N.hitObjects = [expandedStarHit, decorativeGlow]; click();
assert.equal(helena.N.selected, 'criacao');

// Um brilho sem corpo atrás equivale ao espaço vazio, sem abrir painel.
helena.N.hitObjects = [decorativeGlow]; click();
assert.equal(helena.N.selected, null);
assert.equal(helena.N.hoveredId, null);
assert.equal(helena.N.panel.isOpen(), false);

// Alvos de estrelas e sinais identificados continuam funcionando.
const starHit = new Object3D(); starHit.userData.pickId = 'criacao';
starHit.raycast = (_raycaster, hits) => hits.push({ object: starHit });
helena.N.hitObjects = [decorativeGlow, starHit]; click();
assert.equal(helena.N.selected, 'criacao');
helena.N.hitObjects = [starHit, planetHit]; click();
assert.equal(helena.N.selected, 'criacao');
helena.N.state.current[exo.id].signals = 1; instance.update(0.1);
helena.N.hitObjects = [decorativeGlow, instance.object.children[1]]; click();
assert.equal(helena.N.selected, signal.id);
delete helena.N.hitObjects;

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

// Dados externos não podem criar HTML, nem sair do atributo de massa.
const protectedPanel = setup();
const unsafeUniverse = JSON.parse(JSON.stringify(protectedPanel.N.getUniverse()));
const unsafeSystem = unsafeUniverse.systems.find(s => s.id === 'criacao');
const markup = '<img src=x onerror="window.NEXUS_TEST_MARKER=true">';
unsafeSystem.name = markup;
for (const field of ['label', 'summary', 'why', 'phase']) unsafeSystem.center.info[field] = markup;
unsafeSystem.center.info.notes = { 0: markup };
unsafeUniverse.laws[unsafeSystem.center.info.law] = markup;
protectedPanel.N.boot(unsafeUniverse);
protectedPanel.N.selectBody('criacao');
const protectedElement = protectedPanel.body.children.find(e => e.className === 'nexus-panel');
assert.equal(protectedElement.innerHTML.includes('<img'), false);
assert.equal((protectedElement.innerHTML.match(/&lt;img /g) || []).length, 7);

// Caracteres comuns continuam presentes, sem permitir atributos de evento.
protectedPanel.N.currentUniverse.systems.find(s => s.id === 'criacao').center.info.summary = 'Afeto & "memória" < 10 > 2; d\'água';
protectedPanel.N.state.get = () => '" onmouseover="window.NEXUS_TEST_MARKER=true';
protectedPanel.N.panel.refresh();
assert.ok(protectedElement.innerHTML.includes('Afeto &amp; &quot;memória&quot; &lt; 10 &gt; 2; d&#39;água'));
assert.equal(/title="[^"]*"\s+onmouseover=/.test(protectedElement.innerHTML), false);
assert.ok(protectedElement.innerHTML.includes('title="Massa: &quot; onmouseover=&quot;'));

// Esc devolve a visão geral de cada fonte e mantém a prioridade da legenda.
for (const source of ['helena', 'compilada', 'ficticia']) {
  const test = setup();
  const universe = source === 'helena' ? test.N.getUniverse() : test.N.compileSpec(semantic);
  if (source === 'ficticia') universe.systems[1].id = 'astro-ficticio';
  test.N.boot(universe);
  const id = universe.systems[1].id;
  test.N.pickRegistry[id] = { getPos: () => new Vector3(70, 2, 40), radius: 4 };
  test.N.selectBody(id);
  test.windowEvents.dispatchKey('Escape');
  assert.equal(test.N.selected, null);
  assert.equal(test.N.panel.isOpen(), false);
  assert.equal(test.body.classList.contains('painel-aberto'), false);
  assert.equal(test.N.cameraTarget.x, 0);
  assert.equal(test.N.cameraTarget.z, 0);
  assert.equal(test.N.homeFlights, 1);
  test.windowEvents.dispatchKey('Escape');
  assert.equal(test.N.homeFlights, 1);

  test.N.selectBody(id); test.N.legend.open();
  assert.equal(test.body.classList.contains('legenda-aberta'), true);
  test.windowEvents.dispatchKey('Escape');
  assert.equal(test.N.legend.isOpen(), false);
  assert.equal(test.body.classList.contains('legenda-aberta'), false);
  assert.equal(test.N.panel.isOpen(), true);
  assert.equal(test.N.selected, id);
  assert.equal(test.N.cameraTarget.x, 70);
  assert.equal(test.N.homeFlights, 1);
  test.windowEvents.dispatchKey('Escape');
  assert.equal(test.N.panel.isOpen(), false);
  assert.equal(test.N.selected, null);
  assert.equal(test.N.homeFlights, 2);

  // A trava da Start continua impedindo alterações pela tecla.
  test.N.selectBody(id); test.N.travado = true;
  test.windowEvents.dispatchKey('Escape');
  assert.equal(test.N.selected, id);
  assert.equal(test.N.panel.isOpen(), true);
  assert.equal(test.N.homeFlights, 2);
}

// A abertura renderiza antes da escolha, sem impedir o boot de outra pessoa.
for (const source of ['helena', 'ficticia']) {
  const test = setup(true);
  assert.equal(test.N.currentUniverse, undefined);
  assert.equal(Object.keys(test.N.pickRegistry).length, 0);
  assert.equal(test.N.scene.children.length, 1);
  assert.equal(test.N.backgroundBuilds, 1);
  test.frames[0](16);
  assert.equal(test.N.previewUpdates, 1);
  const universe = source === 'helena' ? test.N.getUniverse() : test.N.compileSpec(semantic);
  if (source === 'ficticia') universe.systems[1].id = 'estrela-outra-pessoa';
  test.N.boot(universe);
  assert.equal(test.N.currentUniverse.systems[1].id, universe.systems[1].id);
  assert.equal(test.N.scene.children.some(c => c.children.some(o => o.geometry)), false);
  assert.equal(test.cancelledFrames.length, 1);
  assert.ok(test.N.disposedGeometry && test.N.disposedMaterial && test.N.disposedTexture);
  assert.equal(test.N.backgroundBuilds, 1);
  assert.equal(test.N.starfieldBuilds, 1);
  const framesAfterBoot = test.frames.length;
  test.N.boot(test.N.getUniverse());
  assert.equal(test.frames.length, framesAfterBoot);
  assert.equal(test.N.currentUniverse.systems[1].id, universe.systems[1].id);
}

console.log('OK: prévia da Start, boot, tempo, capítulos, forças, seleção, painel seguro e Esc com prioridade da legenda.');
console.log('Teste com DOM e 3D simulados; a conferência visual/F12 permanece manual.');
