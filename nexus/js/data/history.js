/* history.js — Contrato puro do histórico: formato, identidade e capacidade.
   Não acessa armazenamento, rede ou motor. Compartilhado com o backend.
   IDs compatíveis não provam que a IA preservou todo o significado. */
(function () {
  'use strict';
  var validateLaws = typeof module !== 'undefined' && module.exports
    ? require('./validator.js') : NEXUS.validateSpec;
  var LIMITS = Object.freeze({ chapters: 10, historyBytes: 1024 * 1024,
    specificationBytes: 128 * 1024, httpBytes: 160 * 1024,
    bodies: 128, systems: 16, forces: 32, routines: 50 });
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function fail(code, message) {
    var error = new Error(message); error.code = code; throw error;
  }
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function keys(value, allowed, required) {
    if (!object(value) || Object.keys(value).some(function (k) { return allowed.indexOf(k) < 0; })
      || (required || []).some(function (k) { return !own(value, k); })) {
      fail('formato', 'Formato inválido ou campos não permitidos. Nenhum dado foi substituído.');
    }
  }
  function bytes(text) {
    // Conta UTF-8 também em navegador file://, sem carregar arquivos externos.
    var total = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c < 128) total++;
      else if (c < 2048) total += 2;
      else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < text.length
        && text.charCodeAt(i + 1) >= 0xDC00 && text.charCodeAt(i + 1) <= 0xDFFF) { total += 4; i++; }
      else total += 3;
    }
    return total;
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)
      || !Number.isFinite(Date.parse(value))
      || new Date(value).toISOString() !== (value.length === 20 ? value.slice(0, -1) + '.000Z' : value)) {
      fail('formato', 'A data do histórico é inválida.');
    }
    return value;
  }
  // O guarda de estrutura complementa as Leis. Campos extras, inclusive relato
  // e respostas em qualquer nível, são recusados em vez de removidos em silêncio.
  function text(value) {
    if (typeof value !== 'string' || value.length > 500) fail('formato', 'Texto semântico inválido ou muito longo.');
  }
  function number(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) fail('formato', 'Escala semântica inválida.');
  }
  function enumeration(values) { return function (v) { if (values.indexOf(v) < 0) fail('formato', 'Valor fora do catálogo semântico.'); }; }
  function id(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 128
      || /[\u0000-\u001f\u007f]/.test(value)
      || ['eu', '__proto__', 'prototype', 'constructor'].indexOf(value) >= 0) fail('identidade', 'ID inválido ou reservado.');
  }
  var law = enumeration(['luz', 'massa', 'distancia', 'escala', 'evolucao']);
  var description = { rotulo: text, label: text, resumo: text, summary: text,
    porque: text, why: text, fase: text, phase: text, lei: law, law: law };
  var aliases = { rotulo: 'label', resumo: 'summary', porque: 'why', fase: 'phase', lei: 'law' };
  function record(fields, required) {
    return function (value) {
      keys(value, Object.keys(fields), []);
      required.forEach(function (k) {
        if (!own(value, k) && !(aliases[k] && own(value, aliases[k]))) fail('formato', 'Campo semântico obrigatório ausente.');
      });
      Object.keys(value).forEach(function (k) { fields[k](value[k]); });
      Object.keys(aliases).forEach(function (k) {
        if (own(value, k) && own(value, aliases[k]) && value[k] !== value[aliases[k]]) fail('formato', 'Aliases semânticos conflitantes.');
      });
    };
  }
  function list(check, min, max) {
    return function (value) {
      if (!Array.isArray(value) || value.length < min || value.length > max) fail('formato', 'Quantidade semântica fora do limite.');
      value.forEach(check);
    };
  }
  var bodyTexts = ['rotulo', 'resumo', 'porque', 'fase', 'lei'];
  var element = record(Object.assign({}, description, { id: id, tipo: enumeration(['passageiro', 'sinal']), titulo: text,
    aproximacao: number, presenca: number, indiceSinal: function (v) {
      if (!Number.isInteger(v) || v < 1 || v > 5) fail('formato', 'Índice de sinal inválido.');
    } }), ['id', 'tipo', 'titulo']);
  var moon = record(Object.assign({}, description, { id: id, nome: text, massa: number, tamanho: number,
    tom: enumeration(['claro', 'escuro']) }), ['id', 'nome', 'massa', 'tamanho'].concat(bodyTexts));
  var planet = record(Object.assign({}, description, { id: id, nome: text,
    tipo: enumeration(['rochoso', 'gasoso', 'aneis', 'exo']), massa: number, tamanho: number, atmosfera: number,
    sinais: number, camadasAneis: enumeration(['mistas', 'afetivas', 'pendencias']),
    luas: list(moon, 0, 3), elementos: list(element, 0, 5) }), ['id', 'nome', 'tipo', 'massa', 'tamanho'].concat(bodyTexts));
  var orbiter = record(Object.assign({}, description, { id: id, nome: text, tipo: enumeration(['companheira', 'sonho']),
    massa: number, brilho: number, alcance: number }), ['id', 'nome', 'tipo', 'massa'].concat(bodyTexts));
  var center = record(Object.assign({}, description, { tipo: enumeration(['estrela', 'anaBranca', 'anaMarrom', 'binaria', 'buracoNegro', 'nebulosa', 'visitante']),
    massa: number, brilho: number, temperatura: enumeration(['quente', 'neutra', 'fria']),
    tensao: number, disco: number, protoestrela: number, aproximacao: number }), ['tipo', 'massa'].concat(bodyTexts));
  var system = record({ id: id, nome: text, profundidade: function (v) {
    if (!Number.isInteger(v) || v < 0 || v > 4) fail('formato', 'Profundidade inválida.');
  }, centro: center, planetas: list(planet, 0, 6), orbitantes: list(orbiter, 0, 3) }, ['id', 'nome', 'profundidade', 'centro']);
  var force = record(Object.assign({}, description, { id: id, tipo: enumeration(['mare', 'eclipse', 'gravidade']),
    origem: id, alvos: list(id, 1, 128), estrela: id, intensidade: number }), ['id', 'tipo', 'origem', 'alvos', 'intensidade', 'rotulo', 'resumo', 'porque', 'lei']);
  var specification = record({ titulo: text, rotinas: list(record({ id: id, nome: text }, ['id', 'nome']), 0, 5),
    sistemas: list(system, 1, 10), forcas: list(force, 1, 10) }, ['titulo', 'rotinas', 'sistemas', 'forcas']);

  function identities(spec) {
    var result = new Map();
    function add(value, category, parent, type) {
      if (result.has(value.id)) fail('identidade', 'IDs devem ser únicos entre corpos, forças e rotinas.');
      result.set(value.id, { category: category, parent: parent, type: type || category });
    }
    spec.rotinas.forEach(function (r) { add(r, 'rotina', null); });
    spec.sistemas.forEach(function (s) {
      add(s, 'sistema', null, s.centro.tipo);
      (s.planetas || []).forEach(function (p) {
        add(p, 'planeta', s.id, p.tipo);
        (p.luas || []).forEach(function (m) { add(m, 'lua', p.id); });
        (p.elementos || []).forEach(function (e) { add(e, 'elemento', p.id, e.tipo); });
      });
      (s.orbitantes || []).forEach(function (o) { add(o, 'orbitante', s.id, o.tipo); });
    });
    spec.forcas.forEach(function (f) { add(f, 'forca', null, f.tipo); });
    spec.forcas.forEach(function (f) {
      [f.origem].concat(f.alvos, f.estrela ? [f.estrela] : []).forEach(function (ref) {
        var entry = result.get(ref);
        if (!entry || ['rotina', 'forca'].indexOf(entry.category) >= 0) fail('identidade', 'Referência de força deve apontar para um corpo presente na especificação.');
      });
      if (f.tipo === 'eclipse') {
        var star = result.get(f.estrela);
        if (!star || star.category !== 'sistema'
          || ['estrela', 'anaBranca', 'anaMarrom', 'binaria'].indexOf(star.type) < 0) fail('identidade', 'A referência de estrela no eclipse não é um centro estelar.');
      }
    });
    return result;
  }
  function assertSpec(spec) {
    specification(spec);
    if (bytes(JSON.stringify(spec)) > LIMITS.specificationBytes) fail('capacidade', 'Uma especificação pode ter no máximo 128 KiB.');
    var checked;
    try { checked = validateLaws(spec); } catch (_) { fail('formato', 'Especificação semântica inválida.'); }
    if (!checked.ok) fail('validacao', 'A especificação não respeita as Leis do NEXUS.');
    return identities(spec);
  }
  function mergeIds(registry, next) {
    next.forEach(function (entry, key) {
      var old = registry.get(key);
      if (old && (old.category !== entry.category || old.type !== entry.type || old.parent !== entry.parent)) {
        fail('identidade', 'O ID ' + JSON.stringify(key) + ' mudou de categoria, tipo ou pai. Preserve categoria '
          + old.category + ', tipo ' + old.type + ' e pai ' + JSON.stringify(old.parent) + '.');
      }
      registry.set(key, entry);
    });
  }
  function assertCapacity(registry) {
    var counts = { bodies: 1, systems: 1, forces: 0, routines: 0 };
    var names = { bodies: 'corpos', systems: 'sistemas', forces: 'forças', routines: 'rotinas' };
    registry.forEach(function (entry) {
      if (entry.category === 'forca') counts.forces++;
      else if (entry.category === 'rotina') counts.routines++;
      else { counts.bodies++; if (entry.category === 'sistema') counts.systems++; }
    });
    Object.keys(counts).forEach(function (k) {
      if (counts[k] > LIMITS[k]) fail('capacidade', 'A união do histórico excede o limite de ' + LIMITS[k] + ' ' + names[k] + '. Nenhuma fase foi descartada.');
    });
  }
  function normalize(input) {
    var envelope;
    if (input && input.versao === 1) {
      keys(input, ['versao', 'salvoEm', 'especificacao'], ['versao', 'salvoEm', 'especificacao']);
      date(input.salvoEm);
      envelope = { versao: 2, salvoEm: input.salvoEm, capitulos: [{ criadoEm: input.salvoEm,
        versaoLayout: 0, especificacao: input.especificacao }] };
    } else {
      keys(input, ['versao', 'salvoEm', 'capitulos'], ['versao', 'salvoEm', 'capitulos']);
      if (input.versao !== 2) fail('versao', 'Versão de histórico desconhecida.');
      envelope = input;
    }
    date(envelope.salvoEm);
    if (!Array.isArray(envelope.capitulos) || !envelope.capitulos.length) fail('formato', 'O histórico precisa de um capítulo inicial.');
    if (envelope.capitulos.length > LIMITS.chapters) fail('capacidade', 'O histórico pode ter no máximo 10 capítulos. Nenhuma fase foi descartada.');
    var registry = new Map();
    envelope.capitulos.forEach(function (chapter) {
      keys(chapter, ['criadoEm', 'versaoLayout', 'especificacao'], ['criadoEm', 'versaoLayout', 'especificacao']);
      date(chapter.criadoEm);
      if (chapter.versaoLayout !== 0 && chapter.versaoLayout !== 1) fail('versao', 'Versão de layout desconhecida.');
      mergeIds(registry, assertSpec(chapter.especificacao));
    });
    assertCapacity(registry);
    if (bytes(JSON.stringify(envelope)) > LIMITS.historyBytes) fail('capacidade', 'O histórico excede 1 MiB. Nenhuma fase foi descartada.');
    return copy(envelope);
  }
  function create(spec, now) {
    var time = now || new Date().toISOString();
    return normalize({ versao: 2, salvoEm: time, capitulos: [{ criadoEm: time, versaoLayout: 1, especificacao: spec }] });
  }
  function append(history, spec, now) {
    var result = normalize(history), time = now || new Date().toISOString();
    result.capitulos.push({ criadoEm: time, versaoLayout: 1, especificacao: spec });
    result.salvoEm = time;
    return normalize(result);
  }
  function parse(textValue) {
    if (typeof textValue !== 'string') fail('formato', 'O arquivo precisa ser JSON em texto.');
    if (bytes(textValue) > LIMITS.historyBytes) fail('capacidade', 'O arquivo excede 1 MiB.');
    var input;
    try { input = JSON.parse(textValue); } catch (_) { fail('formato', 'O arquivo não contém JSON válido.'); }
    return normalize(input);
  }
  function validateSpecification(spec) {
    // Mantém os erros das Leis para o ciclo de correção existente; não os registra.
    var errors = [];
    try { var laws = validateLaws(spec); if (!laws.ok) errors = laws.erros.slice(); }
    catch (_) { errors.push('Especificação semântica inválida.'); }
    try { assertSpec(spec); } catch (e) { errors.push(e.message); }
    return { ok: !errors.length, erros: errors };
  }
  function validateTransition(previous, candidate) {
    try { mergeIds(assertSpec(previous), assertSpec(candidate)); return { ok: true, erros: [] }; }
    catch (e) { return { ok: false, erros: [e.message] }; }
  }
  var api = Object.freeze({ limits: LIMITS, bytes: bytes, normalize: normalize, create: create, append: append,
    parse: parse, serialize: function (h) { return JSON.stringify(normalize(h)); },
    latest: function (h) { var n = normalize(h); return n.capitulos[n.capitulos.length - 1].especificacao; },
    validateSpecification: validateSpecification, validateTransition: validateTransition });
  if (typeof NEXUS !== 'undefined') NEXUS.history = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
