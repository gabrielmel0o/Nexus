/* presence.js — Uma regra de presença para cena, luz, órbitas e seleção.
   Os registros são montados no boot. Navegar só aplica dados e estados. */
(function () {
  var N = NEXUS, entries = [], revision = 0;
  function frame() { return N.state && N.state.frame; }
  function present(id, f) {
    if (arguments.length < 2) f = frame();
    if (!f) return true;
    var p = f.set[id];
    if (!p || !p.presence) return false;
    var body = f.bodies[id];
    if (body && body.size !== undefined && !body.type && body.size === 0) return false;
    if (body && body.type === 'comet' && p.appear === 0) return false;
    if (body && body.type === 'star') {
      if (body.historyDeclaredAppear && p.appear === 0) return false;
      var parent = f.bodies[f.parents[id]], signal = body.signalIndex;
      if (signal && (!parent || (parent.params.signals || 0) <= signal - 1)) return false;
      if (!signal && p.appear === 0) return false;
    }
    return !f.parents[id] || present(f.parents[id], f);
  }
  function gate(id, object) {
    if (!object) return;
    var active = present(id);
    object.visible = active;
    object.scale.set(active ? 1 : 0, active ? 1 : 0, active ? 1 : 0);
  }
  function apply(previous) {
    revision++;
    // Pais primeiro: um sinal já deve encontrar o tamanho restaurado do planeta.
    entries.sort(function (a, b) { return a.depth - b.depth; });
    entries.forEach(function (entry) {
      entry.apply(frame() && frame().bodies[entry.id], !!previous && present(entry.id, previous) && present(entry.id));
    });
    if (N.resetHistoryForces) N.resetHistoryForces(previous);
    if (N.selected && !present(N.selected) && N.deselectBody) N.deselectBody();
    if (N.hoveredId && !present(N.hoveredId) && N.picking && N.picking.clearHover) N.picking.clearHover();
    if (N.scene && N.scene.updateMatrixWorld) N.scene.updateMatrixWorld(true);
  }
  N.presence = { isPresent: present, isPresentIn: function (id, f) { return !!f && present(id, f); }, gate: gate, get revision() { return revision; },
    register: function (id, applyFn) {
      var parents = N.currentUniverse && N.currentUniverse.historyParents, depth = 0, parent = id;
      while (parents && parents[parent]) { depth++; parent = parents[parent]; }
      entries.push({ id: id, depth: depth, apply: applyFn }); applyFn(frame() && frame().bodies[id]);
    },
    apply: apply, body: function (id) { return frame() && frame().bodies[id]; },
    begin: function () { entries = []; revision = 0; } };
})();
