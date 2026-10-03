/* scale.js — tabela de diâmetros em UC e conversor para unidades do mundo.
   Deve ser carregado ANTES de mockUniverse.js.

   NEXUS.scale.UC_PARA_MUNDO   — fator de conversão (unidades do mundo por UC)
   NEXUS.scale.uc(n)           — converte n UC → unidades do mundo
   NEXUS.scale.raio(classeId)  — devolve o raio em unidades do mundo para uma classe

   Tabela de diâmetros (seção 5.1 de NEXUS_TAMANHOS.md):
     Corpos com classe definida no documento ficam com a classe do documento.
     Corpos sem classe definida:
       anaBrancaMarrom → usa 'anaVermelha' (por regra do item 3 da instrução)
       rafael          → usa 'anaBranca'   (por regra do item 3)
       sinal           → 27 UC             (por regra do item 3)
       sonhoRecorrente → usa 'lua'          (por regra do item 3)
       luaAprovacao    → 20 UC             (por regra do item 3)
       luaMedo         → 16 UC             (por regra do item 3) */

(function () {
  'use strict';
  var N = NEXUS;

  // ══════════════════════════════════════════════════════════════════
  // FATOR DE CONVERSÃO — mude aqui para ajustar a escala global.
  // 0.001 significa: 1 UC = 0.001 unidade do mundo
  // → Halo de 360.000 UC = 360 unidades; Eu de 8.000 UC = 8 unidades.
  // ══════════════════════════════════════════════════════════════════
  var UC_PARA_MUNDO = 0.001;

  // ── Tabela de diâmetros em UC por classe ────────────────────────
  // (seção 5.1 do NEXUS_TAMANHOS.md + regras do item 3)
  var DIAMETROS_UC = {
    // Doc 5.1 — corpos definidos no documento
    eu:                8000,   // Buraco negro supermassivo (O Eu)
    estrelaPadrao:     2400,   // Estrela padrão
    estrelaBinaria:    2000,   // Cada estrela de uma binária
    anaVermelha:       1200,   // Anã vermelha
    anaBranca:          480,   // Anã branca
    buracoNegroEstelar: 700,   // Buraco negro estelar (A perda da mãe)
    gigante:            180,   // Gigante gasoso
    rochoso:             90,   // Planeta rochoso
    planetaAneis:       110,   // Planeta com anéis (corpo — não inclui anéis)
    exoplaneta:          75,   // Exoplaneta
    lua:                 18,   // Lua (genérica)
    nucleoCometa:         8,   // Núcleo de cometa

    // Regra item 3 — corpos sem classe no documento:
    anaBrancaMarrom:   1200,   // Anã marrom → classe anaVermelha (mesma proporção)
    rafael:             480,   // Rafael → classe anaBranca
    sinal:               27,   // Sinais no exoplaneta → 27 UC (definido item 3)
    sonhoRecorrente:     18,   // Sonho recorrente → classe lua
    luaAprovacao:        20,   // Lua da aprovação → 20 UC (item 3)
    luaMedo:             16    // Lua do medo → 16 UC (item 3)
  };

  // ── API pública ─────────────────────────────────────────────────
  N.scale = {
    UC_PARA_MUNDO: UC_PARA_MUNDO,

    // Converte n UC para unidades do mundo
    uc: function (n) {
      return n * UC_PARA_MUNDO;
    },

    // Devolve o RAIO em unidades do mundo para uma classe da tabela
    // Raio = diâmetro / 2, convertido pelo fator.
    raio: function (classeId) {
      var diam = DIAMETROS_UC[classeId];
      if (diam === undefined) {
        console.warn('[scale.js] Classe desconhecida:', classeId, '— usando lua como fallback.');
        diam = DIAMETROS_UC.lua;
      }
      return (diam * UC_PARA_MUNDO) / 2;
    },

    // Tabela completa (somente leitura — não modifique externamente)
    diametros: DIAMETROS_UC
  };

})();
