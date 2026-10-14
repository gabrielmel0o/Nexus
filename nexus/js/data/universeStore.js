/* universeStore.js — Histórico no navegador e JSON transportável.
   Nenhuma operação deste módulo chama IA ou monta a cena.
   O resultado informa se persistiu ou se está apenas em memória. */
(function () {
  'use strict';
  var H = typeof module !== 'undefined' && module.exports ? require('./history.js') : NEXUS.history;
  var KEY = 'nexus:universo';
  function createStore(getStorage) {
    var memory = null, persisted = false;
    function snapshot() { return memory ? H.normalize(memory) : null; }
    function result(extra) { return Object.assign({ ok: true, historico: snapshot(), persistido: persisted,
      emMemoria: !!memory && !persisted, mensagem: persisted ? 'Histórico salvo neste navegador.'
        : 'O histórico está somente em memória. Baixe o JSON antes de recarregar.' }, extra); }
    function error(e) { return { ok: false, codigo: e.code || 'formato', mensagem: e.message,
      historico: snapshot(), persistido: persisted, emMemoria: !!memory && !persisted }; }
    function save(history) {
      var validated;
      try { validated = H.normalize(history); } catch (e) { return error(e); }
      // setItem é atômico: falha de quota mantém o valor anterior no disco.
      // A nova versão completa continua disponível para exportação em memória.
      memory = validated; persisted = false;
      try { getStorage().setItem(KEY, H.serialize(memory)); persisted = true; } catch (_) { /* Avisado no resultado. */ }
      return result();
    }
    function load() {
      if (memory) return result();
      var raw;
      try { raw = getStorage().getItem(KEY); }
      catch (_) { return result({ mensagem: 'O armazenamento está bloqueado. Um resultado novo poderá ser baixado em JSON.' }); }
      if (raw === null) return result({ mensagem: 'Nenhum histórico salvo neste navegador.' });
      try {
        var validated = H.parse(raw), migrated = JSON.parse(raw).versao === 1;
        if (migrated) return Object.assign(save(validated), { migrado: true });
        memory = validated; persisted = true; return result({ migrado: false });
      } catch (e) { return error(e); } // Não apaga um arquivo inválido sem solicitação.
    }
    function generate(spec, now) {
      try { return save(H.create(spec, now)); } catch (e) { return error(e); }
    }
    function update(spec, now) {
      var loaded = load();
      if (!loaded.ok) return loaded;
      if (!memory) return error({ code: 'formato', message: 'Carregue um histórico antes de atualizar.' });
      try { return save(H.append(memory, spec, now)); } catch (e) { return error(e); }
    }
    function importJSON(text) {
      try { return save(H.parse(text)); } catch (e) { return error(e); }
    }
    function exportJSON() {
      var loaded = load();
      if (!loaded.ok) return loaded;
      if (!memory) return error({ code: 'formato', message: 'Nenhum histórico disponível para baixar.' });
      return Object.assign(result(), { json: H.serialize(memory), nomeArquivo: 'nexus-historico.json' });
    }
    function remove() {
      try { getStorage().removeItem(KEY); }
      catch (_) { return error({ code: 'armazenamento', message: 'Não foi possível apagar o histórico armazenado. Nada foi descartado da memória.' }); }
      memory = null; persisted = false;
      return result({ mensagem: 'Histórico apagado deste navegador.' });
    }
    return Object.freeze({ load: load, save: save, generate: generate, append: update,
      importJSON: importJSON, exportJSON: exportJSON, remove: remove });
  }
  var api = createStore(function () { return localStorage; });
  if (typeof NEXUS !== 'undefined') NEXUS.universeStore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = { key: KEY, createStore: createStore };
})();
