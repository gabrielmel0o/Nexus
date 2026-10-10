/* compiler.js — Compilador determinístico do NEXUS.
   Converte a especificação semântica (Formato A, só significado)
   no formato exato do mockUniverse.js (Formato B, consumido pelo motor 3D).
   
   Funciona tanto no navegador (NEXUS.compileSpec) quanto no Node.js (module.exports).
   NÃO altera o objeto spec original.
*/

(function () {
  // Textos fixos das Leis (seção 3 do NEXUS_CONTEXT.md)
  var LAWS = {
    luz: 'Lei da luz: quem emite luz é interno; quem reflete é derivado; quem não faz nem um nem outro é inconsciente.',
    massa: 'Lei da massa: massa é carga afetiva. O pequeno e denso pesa mais que o grande e difuso.',
    distancia: 'Lei da distância: mede o quanto algo é acessível à consciência, não o quanto importa.',
    escala: 'Lei da escala: a duração de um astro é a permanência dele na mente.',
    evolucao: 'Lei da evolução: nada é só uma coisa; tudo tem uma fase.'
  };

  // Gerador de números pseudo-aleatórios determinístico baseado em semente (string)
  function createRNG(seedStr) {
    var h = 2166136261 >>> 0;
    var str = String(seedStr || 'nexus');
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return function () {
      h += 0x6D2B79F5;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Paletas fixas do catálogo de visual do NEXUS
  var PALETAS = {
    // Estrelas
    estrela_quente: { color: '#ffb020', patch: ['#ffd43b', '#ff8a1f', '#fff3a0'] },
    estrela_neutra: { color: '#ffe066', patch: ['#fff3bf', '#fcc419', '#ffec99'] },
    estrela_fria:   { color: '#ff922b', patch: ['#ffa94d', '#f76707', '#ffd8a8'] },
    anaBranca_fria:   { color: '#cfe8ff', patch: ['#e8f4ff', '#b8d8f8', '#a0c8f0'] },
    anaBranca_quente: { color: '#fff3bf', patch: ['#fffae6', '#ffe066', '#fff9db'] },
    anaMarrom:        { color: '#8a4b3a', patch: ['#a06040', '#6a3525', '#c07050'] },
    companheira:      { color: '#ff6b6b', patch: ['#fa5252', '#ff8787', '#e03131'] }, // anã vermelha
    visitante:        { color: '#ffd166', patch: ['#ffe599', '#e6a800', '#fff0b0'] },
    
    // Binária
    binaria: {
      colorA: '#ff6b6b', patchA: ['#ffa8a8', '#e03131', '#ffe3e3'],
      colorB: '#74c0fc', patchB: ['#d0ebff', '#339af0', '#a5d8ff']
    },

    // Buracos negros e Nebulosas
    buracoNegro_trauma: { color: '#0d0015', patch: ['#9b5de5', '#c77dff', '#6a1fa0'] },
    buracoNegro_self:   { color: '#1a0a2e', patch: ['#2a1045', '#150830', '#0d0520'] },
    nebulosa_dark:      { color: '#0f1535', patch: ['#141c40', '#0a1028', '#1a2250'] },

    // Planetas
    rocky: { base: '#c9714a', patch: ['#e8956a', '#a0522d', '#d4895f'] },
    gas:   { base: '#4a90d9', patch: ['#7bb3e8', '#2d6ba8', '#a8cff0'] },
    ringed:{ base: '#e8c46a', patch: ['#f5d87a', '#c49a3a', '#ffe8a0'] },
    exo:   { base: '#3d5a80', patch: ['#5b7fa6', '#2a3f5c', '#7aa0c4'] },

    // Luas
    lua_clara:  { color: '#f9e4a0' },
    lua_escura: { color: '#8b5cf6' }
  };

  // Faixas radiais de distância por profundidade (escala UC baseada no mockUniverse)
  var FAIXAS_PROFUNDIDADE = {
    0: { rMin: 0,   rMax: 0 },
    1: { rMin: 45,  rMax: 70 },
    2: { rMin: 75,  rMax: 115 },
    3: { rMin: 95,  rMax: 135 },
    4: { rMin: 140, rMax: 170 }
  };

  var DISTANCIA_MINIMA_SISTEMAS = 55; // Garante sem sobreposição visual entre sistemas

  function compileSpec(spec) {
    if (!spec || typeof spec !== 'object') {
      throw new Error('compileSpec: spec inválida');
    }

    // 1. Criar o esqueleto do universo
    var universe = {
      title: spec.titulo || 'O universo NEXUS',
      chapter: 0,
      galaxy: {
        arms: {
          routines: []
        }
      },
      laws: {
        luz: LAWS.luz,
        massa: LAWS.massa,
        distancia: LAWS.distancia,
        escala: LAWS.escala,
        evolucao: LAWS.evolucao
      },
      systems: [],
      forces: [],
      chapters: [
        {
          id: 0,
          title: (spec.titulo || 'O universo') + ' hoje',
          caption: (spec.titulo || 'O universo') + ' hoje: estado inicial da mente.',
          set: {}
        }
      ]
    };

    // 2. Mapear rotinas nos braços da galáxia
    if (Array.isArray(spec.rotinas)) {
      var totalRot = spec.rotinas.length;
      spec.rotinas.forEach(function (r, idx) {
        var progress = totalRot > 1 ? (0.2 + (idx / (totalRot - 1)) * 0.68) : 0.5;
        universe.galaxy.arms.routines.push({
          id: r.id,
          name: r.nome,
          arm: idx % 2,
          progress: Math.round(progress * 100) / 100
        });
      });
    }

    // 3. Sistema SEMPRE presente: O Eu na origem [0, 0, 0]
    universe.systems.push({
      id: 'eu',
      name: 'O Eu',
      position: [0, 0, 0],
      depth: 0,
      center: {
        kind: 'blackhole',
        variant: 'self',
        subtype: 'supermassivo',
        color: PALETAS.buracoNegro_self.color,
        patch: PALETAS.buracoNegro_self.patch.slice(),
        params: { mass: 10 },
        info: {
          label: 'Buraco negro · O Eu',
          summary: 'O centro de gravidade da mente. Nunca visto diretamente, deduzido pela órbita de todas as outras estruturas.',
          law: 'luz',
          why: 'O Eu nunca é visto diretamente; é deduzido pela órbita de tudo ao redor. Um buraco negro supermassivo que mantém a galáxia unida sem emitir luz própria.',
          phase: 'sempre presente, nunca observável',
          notes: {}
        }
      },
      planets: [],
      orbiters: []
    });

    // 4. Posicionamento determinístico dos sistemas sem sobreposição
    var posicoesOcupadas = [[0, 0, 0]]; // O Eu já ocupa a origem
    var sistemasEntrada = spec.sistemas || [];

    sistemasEntrada.forEach(function (sis, sisIdx) {
      var rng = createRNG(sis.id || ('sys_' + sisIdx));
      var depth = (sis.profundidade !== undefined && sis.profundidade !== null) ? sis.profundidade : 1;
      var faixa = FAIXAS_PROFUNDIDADE[depth] || FAIXAS_PROFUNDIDADE[1];

      var raio = faixa.rMin + rng() * (faixa.rMax - faixa.rMin);
      // Espalhar uniformemente ao redor do círculo + variação da semente
      var anguloBase = (sisIdx / Math.max(1, sistemasEntrada.length)) * (Math.PI * 2);
      var angulo = anguloBase + (rng() - 0.5) * 0.5;

      var x = Math.round(raio * Math.cos(angulo));
      var z = Math.round(raio * Math.sin(angulo));

      // Verificação de distância mínima contra posições já existentes
      var tentativas = 0;
      var conflito = true;
      while (conflito && tentativas < 20) {
        conflito = false;
        for (var p = 0; p < posicoesOcupadas.length; p++) {
          var op = posicoesOcupadas[p];
          var dist = Math.hypot(x - op[0], z - op[2]);
          if (dist < DISTANCIA_MINIMA_SISTEMAS) {
            conflito = true;
            angulo += 0.45;
            x = Math.round(raio * Math.cos(angulo));
            z = Math.round(raio * Math.sin(angulo));
            break;
          }
        }
        tentativas++;
      }

      var posFinal = [x, 0, z];
      posicoesOcupadas.push(posFinal);

      // Compilar Centro do Sistema
      var cSrc = sis.centro || {};
      var cCompiled = compileCenter(sis.id, cSrc, rng, posFinal);

      // Compilar Planetas
      var compiledPlanets = [];
      var planetasSrc = sis.planetas || [];
      var raioOrbitaPlaneta = 10;

      planetasSrc.forEach(function (pSrc, pIdx) {
        var pCompiled = compilePlanet(pSrc, pIdx, raioOrbitaPlaneta, rng);
        compiledPlanets.push(pCompiled);
        raioOrbitaPlaneta += 12; // Espaçamento radial entre planetas
      });

      // Compilar Orbitantes
      var compiledOrbiters = [];
      var orbitantesSrc = sis.orbitantes || [];
      orbitantesSrc.forEach(function (oSrc, oIdx) {
        var oCompiled = compileOrbiter(oSrc, oIdx, rng);
        compiledOrbiters.push(oCompiled);
      });

      universe.systems.push({
        id: sis.id,
        name: sis.nome,
        position: posFinal,
        depth: depth,
        center: cCompiled,
        planets: compiledPlanets,
        orbiters: compiledOrbiters
      });
    });

    // 5. Compilar Forças
    if (Array.isArray(spec.forcas)) {
      spec.forcas.forEach(function (fSrc) {
        var fCompiled = {
          id: fSrc.id,
          kind: fSrc.tipo === 'mare' ? 'tide' : (fSrc.tipo === 'gravidade' ? 'gravity' : fSrc.tipo),
          source: fSrc.origem,
          targets: Array.isArray(fSrc.alvos) ? fSrc.alvos.slice() : [],
          params: {
            strength: Math.round(((fSrc.intensidade !== undefined ? fSrc.intensidade : 5) / 10) * 100) / 100
          },
          info: {
            label: fSrc.rotulo || fSrc.label || 'Força',
            summary: fSrc.resumo || fSrc.summary || '',
            law: fSrc.lei || fSrc.law || 'massa',
            why: fSrc.porque || fSrc.why || ''
          }
        };

        if (fSrc.tipo === 'eclipse' && fSrc.estrela) {
          fCompiled.star = fSrc.estrela;
        }

        universe.forces.push(fCompiled);
      });
    }

    return universe;
  }

  // Compilação do Centro
  function compileCenter(sisId, cSrc, rng, posFinal) {
    var c = {
      info: {
        label: cSrc.rotulo || cSrc.label || '',
        summary: cSrc.resumo || cSrc.summary || '',
        law: cSrc.lei || cSrc.law || 'luz',
        why: cSrc.porque || cSrc.why || '',
        phase: cSrc.fase || cSrc.phase || '',
        notes: {}
      },
      params: {}
    };

    var massa = cSrc.massa !== undefined ? cSrc.massa : 5;
    c.params.mass = massa;

    if (cSrc.tipo === 'estrela') {
      c.kind = 'star';
      c.spectral = 'sun';
      var temp = cSrc.temperatura || 'quente';
      var pal = PALETAS['estrela_' + temp] || PALETAS.estrela_quente;
      c.color = pal.color;
      c.patch = pal.patch.slice();
      var brilho = cSrc.brilho !== undefined ? cSrc.brilho : 5;
      c.params.brightness = Math.round((brilho * 0.15) * 100) / 100;
    } else if (cSrc.tipo === 'anaBranca') {
      c.kind = 'star';
      c.spectral = 'whiteDwarf';
      var tempAB = cSrc.temperatura || 'fria';
      var palAB = PALETAS['anaBranca_' + tempAB] || PALETAS.anaBranca_fria;
      c.color = palAB.color;
      c.patch = palAB.patch.slice();
      var brilhoAB = cSrc.brilho !== undefined ? cSrc.brilho : 5;
      c.params.brightness = Math.round((brilhoAB * 0.15) * 100) / 100;
      c.params.tone = (tempAB === 'quente') ? 1 : 0;
    } else if (cSrc.tipo === 'anaMarrom') {
      c.kind = 'star';
      c.spectral = 'brownDwarf';
      c.color = PALETAS.anaMarrom.color;
      c.patch = PALETAS.anaMarrom.patch.slice();
      var brilhoAM = cSrc.brilho !== undefined ? cSrc.brilho : 2;
      c.params.brightness = Math.round((brilhoAM * 0.15) * 100) / 100;
    } else if (cSrc.tipo === 'binaria') {
      c.kind = 'binary';
      c.colorA = PALETAS.binaria.colorA;
      c.patchA = PALETAS.binaria.patchA.slice();
      c.colorB = PALETAS.binaria.colorB;
      c.patchB = PALETAS.binaria.patchB.slice();
      var tensao = cSrc.tensao !== undefined ? cSrc.tensao : 5;
      c.params.tension = Math.round((tensao / 10) * 100) / 100;
    } else if (cSrc.tipo === 'buracoNegro') {
      c.kind = 'blackhole';
      c.variant = 'trauma';
      c.color = PALETAS.buracoNegro_trauma.color;
      c.patch = PALETAS.buracoNegro_trauma.patch.slice();
      var disco = cSrc.disco !== undefined ? cSrc.disco : 8;
      c.params.disk = Math.round((disco / 10) * 100) / 100;
    } else if (cSrc.tipo === 'nebulosa') {
      c.kind = 'nebula';
      c.variant = 'dark';
      c.color = PALETAS.nebulosa_dark.color;
      c.patch = PALETAS.nebulosa_dark.patch.slice();
      var proto = cSrc.protoestrela !== undefined ? cSrc.protoestrela : 0;
      c.params.protostar = Math.round((proto / 10) * 100) / 100;
    } else if (cSrc.tipo === 'visitante') {
      c.kind = 'visitor';
      c.color = PALETAS.visitante.color;
      c.patch = PALETAS.visitante.patch.slice();
      var aprox = cSrc.aproximacao !== undefined ? cSrc.aproximacao : 2;
      c.params.approach = Math.round((aprox / 10) * 100) / 100;
      // Caminho de aproximação
      c.path = [
        [posFinal[0] + 10, 0, posFinal[2] + 2],
        [Math.round(posFinal[0] * 0.65), 0, Math.round(posFinal[2] * 0.65)]
      ];
    }

    return c;
  }

  // Compilação de Planeta
  function compilePlanet(pSrc, idx, orbitRadius, rng) {
    var tipo = pSrc.tipo || 'rocky';
    var palKey = (tipo === 'rochoso' ? 'rocky' : (tipo === 'gasoso' ? 'gas' : (tipo === 'aneis' ? 'ringed' : 'exo')));
    var pal = PALETAS[palKey] || PALETAS.rocky;

    // Tamanho normalizado (5 na spec -> 1.0 no motor)
    var tamanhoNorm = (pSrc.tamanho !== undefined ? pSrc.tamanho : 5) / 5;
    tamanhoNorm = Math.round(tamanhoNorm * 10) / 10;
    if (tamanhoNorm < 0.6) tamanhoNorm = 0.6;

    var speed = Math.round((0.2 / Math.sqrt(orbitRadius)) * 100) / 100;
    var startAngle = Math.round((rng() * Math.PI * 2) * 100) / 100;

    var p = {
      id: pSrc.id,
      name: pSrc.nome,
      kind: palKey,
      base: pal.base,
      patch: pal.patch.slice(),
      size: tamanhoNorm,
      orbit: orbitRadius,
      speed: speed,
      startAngle: startAngle,
      params: {
        size: 1,
        mass: pSrc.massa !== undefined ? pSrc.massa : 3
      },
      moons: [],
      elements: [],
      info: {
        label: pSrc.rotulo || pSrc.label || '',
        summary: pSrc.resumo || pSrc.summary || '',
        law: pSrc.lei || pSrc.law || 'luz',
        why: pSrc.porque || pSrc.why || '',
        phase: pSrc.fase || pSrc.phase || '',
        notes: {}
      }
    };

    if (pSrc.atmosfera !== undefined) {
      p.params.atmosphere = Math.round((pSrc.atmosfera / 10) * 100) / 100;
    }

    if (palKey === 'ringed') {
      p.rings = [
        { inner: 1.45, outer: 1.62, color: '#f5d87a' },
        { inner: 1.72, outer: 1.88, color: '#b8a5d1' },
        { inner: 1.98, outer: 2.16, color: '#ffd56b' },
        { inner: 2.26, outer: 2.42, color: '#9d8eb5' }
      ];
    }

    if (palKey === 'exo') {
      p.params.signals = Math.round((pSrc.sinais !== undefined ? pSrc.sinais : 0) / 3);
    }

    // Luas
    if (Array.isArray(pSrc.luas)) {
      var moonOrbit = 3.2;
      pSrc.luas.forEach(function (lSrc, lIdx) {
        var tom = lSrc.tom === 'escuro' ? 'lua_escura' : 'lua_clara';
        var luaSize = Math.round(((lSrc.tamanho !== undefined ? lSrc.tamanho : 2.5) / 10) * 100) / 100;
        p.moons.push({
          id: lSrc.id,
          name: lSrc.nome,
          size: luaSize,
          orbit: moonOrbit,
          speed: Math.round((0.85 + lIdx * 0.45) * 100) / 100,
          color: PALETAS[tom].color,
          params: { mass: lSrc.massa !== undefined ? lSrc.massa : 3 },
          info: {
            label: lSrc.rotulo || lSrc.label || '',
            summary: lSrc.resumo || lSrc.summary || '',
            law: lSrc.lei || lSrc.law || 'massa',
            why: lSrc.porque || lSrc.why || '',
            phase: lSrc.fase || lSrc.phase || '',
            notes: {}
          }
        });
        moonOrbit += 1.4;
      });
    }

    // Elementos
    if (Array.isArray(pSrc.elementos)) {
      pSrc.elementos.forEach(function (eSrc) {
        var el = {
          id: eSrc.id,
          type: eSrc.tipo === 'passageiro' ? 'comet' : (eSrc.tipo === 'sinal' ? 'star' : eSrc.tipo),
          title: eSrc.titulo,
          params: {}
        };

        if (eSrc.tipo === 'passageiro') {
          var ap = eSrc.aproximacao !== undefined ? eSrc.aproximacao : 1;
          var pr = eSrc.presenca !== undefined ? eSrc.presenca : 10;
          el.params.approach = Math.round((ap / 10) * 100) / 100;
          el.params.appear = Math.round((pr / 10) * 100) / 100;
        } else if (eSrc.tipo === 'sinal') {
          el.importance = 'medium';
          el.signalIndex = eSrc.indiceSinal || 1;
          var app = eSrc.presenca !== undefined ? eSrc.presenca : 0;
          el.params.appear = Math.round((app / 10) * 100) / 100;
        }

        if (eSrc.rotulo || eSrc.summary || eSrc.resumo) {
          el.info = {
            label: eSrc.rotulo || eSrc.label || '',
            summary: eSrc.resumo || eSrc.summary || '',
            law: eSrc.lei || eSrc.law || 'escala',
            why: eSrc.porque || eSrc.why || '',
            phase: eSrc.fase || eSrc.phase || '',
            notes: {}
          };
        }

        p.elements.push(el);
      });
    }

    return p;
  }

  // Compilação de Orbitante
  function compileOrbiter(oSrc, idx, rng) {
    var o = {
      id: oSrc.id,
      name: oSrc.nome,
      orbit: 9 + idx * 8,
      speed: Math.round((0.3 - idx * 0.1) * 100) / 100,
      params: {
        mass: oSrc.massa !== undefined ? oSrc.massa : 2
      },
      info: {
        label: oSrc.rotulo || oSrc.label || '',
        summary: oSrc.resumo || oSrc.summary || '',
        law: oSrc.lei || oSrc.law || 'escala',
        why: oSrc.porque || oSrc.why || '',
        phase: oSrc.fase || oSrc.phase || '',
        notes: {}
      }
    };

    if (oSrc.tipo === 'companheira') {
      o.type = 'companion';
      o.spectral = 'redDwarf';
      var br = oSrc.brilho !== undefined ? oSrc.brilho : 6.67;
      o.params.brightness = Math.round((br * 0.15) * 100) / 100;
    } else if (oSrc.tipo === 'sonho') {
      o.type = 'dream';
      var alc = oSrc.alcance !== undefined ? oSrc.alcance : 5.5;
      o.params.reach = Math.round((alc / 10) * 100) / 100;
    }

    return o;
  }

  // Exportação compatível
  if (typeof NEXUS !== 'undefined') {
    NEXUS.compileSpec = compileSpec;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = compileSpec;
  }
})();
