/* historyCompiler.js — Compõe fases aprovadas para uma única montagem.
   Cada layout depende somente de sua fase e de sua versão, nunca de fases futuras.
   A união é técnica: não é uma especificação enviada à IA. */
(function () {
  'use strict';
  var node = typeof module !== 'undefined' && module.exports;
  var H = node ? require('./history.js') : NEXUS.history;
  var compile = node ? require('./compiler.js') : NEXUS.compileSpec;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function freeze(v) { Object.keys(v).forEach(function (k) { if (v[k] && typeof v[k] === 'object') freeze(v[k]); }); return Object.freeze(v); }
  function sorted(spec) {
    var result = copy(spec);
    function walk(v) {
      if (!v || typeof v !== 'object') return;
      if (Array.isArray(v) && v.every(function (e) { return e && typeof e === 'object' && typeof e.id === 'string'; })) {
        v.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
      }
      if (Array.isArray(v) && v.every(function (e) { return typeof e === 'string'; })) v.sort();
      Object.keys(v).forEach(function (k) { walk(v[k]); });
    }
    walk(result); return result;
  }
  function fail(message) { var e = new Error(message); e.code = 'compilacao'; throw e; }
  function index(universe) {
    var bodies = Object.create(null), parents = Object.create(null);
    universe.systems.forEach(function (s) {
      bodies[s.id] = { id: s.id, name: s.name, depth: s.depth, params: s.center.params, info: s.center.info, system: s }; parents[s.id] = null;
      s.planets.forEach(function (p) {
        bodies[p.id] = Object.assign({ depth: s.depth }, p); parents[p.id] = s.id;
        p.moons.forEach(function (m) { bodies[m.id] = Object.assign({ depth: s.depth }, m); parents[m.id] = p.id; });
        p.elements.forEach(function (e) { bodies[e.id] = Object.assign({ name: e.title, depth: s.depth }, e); parents[e.id] = p.id; });
      });
      s.orbiters.forEach(function (o) { bodies[o.id] = Object.assign({ depth: s.depth }, o); parents[o.id] = s.id; });
    });
    return { bodies: bodies, parents: parents };
  }
  function checkForces(universe, frame) {
    universe.forces.forEach(function (f) {
      if (f.kind === 'gravity') {
        // A origem pode ser qualquer corpo: o efeito lê sua posição pelo
        // registro de seleção e confere sua presença. Não precisa ser sistema.
        if (f.targets.some(function (id) { return !frame.bodies[id].kind; })) {
          fail('A gravidade atual exige alvos em planetas. A fase não foi aceita em silêncio.');
        }
      } else if (f.targets.some(function (id) { return frame.parents[f.source] !== id || !frame.bodies[id].kind; })) {
        fail('Maré e eclipse exigem uma lua de cada planeta alvo no motor atual.');
      }
    });
  }
  function compileHistory(input) {
    var history = H.normalize(input), frames = [], union = new Map(), forces = new Map(), routines = new Map(), maxExtent = 0;
    history.capitulos.forEach(function (chapter, i) {
      var spec = chapter.versaoLayout === 0 ? copy(chapter.especificacao) : sorted(chapter.especificacao);
      var u = compile(spec);
      if (chapter.versaoLayout === 1) {
        // No histórico novo, tamanho é real e relativo à geometria-base. Zero
        // não vira 0,6 por um limite visual do compilador antigo.
        spec.sistemas.forEach(function (s) {
          var system = u.systems.find(function (v) { return v.id === s.id; });
          if (s.centro.tipo === 'binaria') system.center.params.brightness = s.centro.brilho === undefined ? 1 : s.centro.brilho * 0.15;
          if (s.centro.tipo === 'anaBranca' && s.centro.temperatura === 'neutra') system.center.params.tone = 0.5;
          (s.planetas || []).forEach(function (p) {
            var planet = system.planets.find(function (v) { return v.id === p.id; });
            planet.size = p.tamanho / 5;
            (p.luas || []).forEach(function (m, mi) {
              var moon = planet.moons.find(function (v) { return v.id === m.id; });
              moon.size = m.tamanho / 10; moon.historyIndex = mi; moon.startAngle = mi * 2.399963;
            });
          });
        });
        compile.layoutSystems(u);
      }
      var frame = index(u);
      spec.sistemas.forEach(function (s) { (s.planetas || []).forEach(function (p) {
        (p.elementos || []).forEach(function (e) { frame.bodies[e.id].historyDeclaredAppear = e.presenca !== undefined; });
      }); });
      // A versão antiga conserva tamanhos/órbitas; os índices também são dados de fase.
      u.systems.forEach(function (s) { s.planets.forEach(function (p) { p.moons.forEach(function (m, mi) {
        frame.bodies[m.id].historyIndex = mi; frame.bodies[m.id].startAngle = mi * 2.399963;
      }); }); });
      frame.forces = u.forces; frame.routines = u.galaxy.arms.routines; frame.set = Object.create(null); frame.extent = 0;
      checkForces(u, frame);
      u.systems.forEach(function (s) {
        var radius = compile.geometry.systemRadius(s), distance = Math.hypot.apply(Math, s.position);
        frame.extent = Math.max(frame.extent, distance + radius);
        if (s.id !== 'eu' && distance - radius < compile.geometry.forbiddenRadius - 1e-7) fail('O layout invade a área protegida do Eu.');
        if (!union.has(s.id)) union.set(s.id, copy(s));
        var shell = union.get(s.id);
        function merge(list, additions) {
          additions.forEach(function (v) {
            var old = list.find(function (a) { return a.id === v.id; });
            if (!old) list.push(copy(v));
            else if (v.moons) { merge(old.moons, v.moons); merge(old.elements, v.elements); }
          });
        }
        merge(shell.planets, s.planets); merge(shell.orbiters, s.orbiters);
        // As variantes já conhecidas serão preparadas antes da exploração.
        shell.historyCenters = shell.historyCenters || [];
        if (!shell.historyCenters.some(function (c) { return c.color === s.center.color; })) shell.historyCenters.push(copy(s.center));
      });
      // A separação vale em cada configuração original, não em um layout refeito.
      var systems = u.systems.filter(function (s) { return s.id !== 'eu'; });
      systems.forEach(function (a, ai) { systems.slice(ai + 1).forEach(function (b) {
        if (Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2])
          < compile.geometry.systemRadius(a) + compile.geometry.systemRadius(b) + compile.geometry.systemGap - 1e-7) fail('Sistemas se sobrepõem nesta fase.');
      }); });
      u.forces.forEach(function (f) { if (!forces.has(f.id)) forces.set(f.id, copy(f)); });
      frame.routines.forEach(function (r) { if (!routines.has(r.id)) routines.set(r.id, copy(r)); });
      frames.push(frame); maxExtent = Math.max(maxExtent, frame.extent);
    });
    var systems = Array.from(union.values());
    // Bases positivas evitam divisão por zero e não mudam com fases futuras.
    systems.forEach(function (s) { s.planets.forEach(function (p) {
      p.size = 1;
      p.moons.forEach(function (m) { m.size = 1; });
    }); });
    var universe = { title: history.capitulos[history.capitulos.length - 1].especificacao.titulo,
      chapter: frames.length - 1, laws: compile(history.capitulos[0].especificacao).laws,
      systems: systems, forces: Array.from(forces.values()), galaxy: { arms: { routines: Array.from(routines.values()) } },
      historyFrames: frames, historyExtent: maxExtent, chapters: [] };
    var identities = index(universe);
    universe.historyParents = identities.parents;
    frames.forEach(function (frame, i) {
      Object.keys(identities.bodies).forEach(function (id) {
        var body = frame.bodies[id], defaults = identities.bodies[id].params || {};
        var params = Object.create(null);
        // Zera todos os parâmetros possíveis; em seguida aplica a fase inteira.
        frames.forEach(function (f) { if (f.bodies[id]) Object.keys(f.bodies[id].params || {}).forEach(function (k) { params[k] = 0; }); });
        Object.keys(defaults).forEach(function (k) { params[k] = 0; });
        if (body) Object.assign(params, body.params);
        if (body && body.system && body.system.center.kind === 'binary' && params.brightness === undefined) params.brightness = 1;
        params.presence = body ? 1 : 0;
        if (identities.bodies[id].kind) { params.size = body ? body.size : 0; params.atmosphere = body && body.params.atmosphere !== undefined ? body.params.atmosphere : 0; }
        if (identities.parents[id] && identities.bodies[identities.parents[id]].kind && !identities.bodies[id].type) params.size = body ? body.size : 0;
        frame.set[id] = params;
      });
      universe.forces.forEach(function (f) {
        var actual = frame.forces.find(function (v) { return v.id === f.id; });
        frame.set[f.id] = { presence: actual ? 1 : 0, strength: actual ? actual.params.strength : 0 };
      });
      universe.chapters.push({ id: i, title: 'Fase ' + (i + 1), caption: 'Fase ' + (i + 1) + ' de ' + frames.length, set: frame.set });
      freeze(frame);
    });
    return universe;
  }
  // O backend usa a mesma regra dos efeitos antes de aceitar uma resposta da IA.
  // Recebe uma especificação já validada, sem compor ou enviar o histórico.
  compileHistory.validateForces = function (spec) {
    var universe = compile(spec);
    try {
      checkForces(universe, index(universe));
      return { ok: true, erros: [] };
    } catch (e) {
      if (e.code !== 'compilacao') throw e;
      return { ok: false, erros: [e.message] };
    }
  };
  if (typeof NEXUS !== 'undefined') NEXUS.compileHistory = compileHistory;
  if (node) module.exports = compileHistory;
})();
