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

  // O motor não exporta estes tamanhos. Valores copiados de world/blackhole.js:
  // raioEu = 4.2; disco externo = min(raioEu * 4.4, 51.35 * 0.7).
  var RAIO_EU = 4.2;
  var RAIO_DISCO_EU = Math.min(RAIO_EU * 4.4, 51.35 * 0.7);
  var FOLGA_EU = 5;
  var RAIO_PROIBIDO_EU = RAIO_DISCO_EU + FOLGA_EU;
  var FOLGA_SISTEMAS = 5;
  var FOLGA_PROFUNDIDADE = 10;
  var VARIACAO_RADIAL = 4;
  var DESLOCAMENTO_VISITANTE = 5;

  // Limites visuais conservadores dos construtores, em unidades do motor.
  // Para sprites quadrados, a meia diagonal cobre qualquer direção da câmera.
  var VISUAL = {
    // world/sun.js: raio do corpo e largura do maior glow.
    sun: { raio: 4, glow: 48 },
    whiteDwarf: { raio: 1, glow: 9 },
    brownDwarf: { raio: 1.4, glow: 10 },
    // world/binary.js: afastamento máximo 8 e sprite de largura 12.
    binaria: 8 + 12 / Math.SQRT2,
    // world/blackhole.js: disco 2.4 * 4.4, pulsação máxima 1.03.
    buracoNegro: 2.4 * 4.4 * 1.03,
    // world/nebula.js: inclui nuvens, deslocamentos e estrelas de fundo.
    nebulosa: 21,
    // world/visitor.js: ondas 1.04 * 5.8, maiores que o glow.
    visitante: 1.04 * 5.8,
    // elements/companion.js e dream.js: maior sprite de cada objeto.
    companheira: 16 / Math.SQRT2,
    sonho: 2.4 / Math.SQRT2,
    // elements/comet.js: órbita 7, cauda/pulsação/hover contidos em 6.
    passageiro: 7 + 6,
    // elements/star.js: sinal médio 1.5 * 1.9; posição size * 2.7.
    sinal: 2.85 / Math.SQRT2,
    // forces.js: maré aumenta o corpo 4% e o halo 10%.
    mareCorpo: 1.04,
    mareHalo: 1.1
  };

  // Envolve todos os corpos e todas as fases das órbitas, não só seus centros.
  function getSystemRadius(system) {
    var c = system.center;
    var radius = 0;
    if (c.kind === 'star') {
      var visual = VISUAL[c.spectral] || VISUAL.sun;
      radius = Math.max(visual.raio, visual.glow * Math.max(c.params.brightness, 0.04) / Math.SQRT2);
      if (c.spectral === 'whiteDwarf') radius = Math.max(radius, 2 * 4 / 1.9);
    } else if (c.kind === 'binary') radius = VISUAL.binaria;
    else if (c.kind === 'blackhole') radius = c.variant === 'self' ? RAIO_DISCO_EU : VISUAL.buracoNegro;
    else if (c.kind === 'nebula') radius = VISUAL.nebulosa;
    else if (c.kind === 'visitor') radius = VISUAL.visitante + DESLOCAMENTO_VISITANTE;

    (system.planets || []).forEach(function (p) {
      var local = p.size * Math.max(1.02, (1.05 + 0.35 * (p.params.atmosphere || 0)) * VISUAL.mareHalo);
      (p.rings || []).forEach(function (ring) { local = Math.max(local, p.size * ring.outer); });
      local *= (p.params.size || 1) * VISUAL.mareCorpo;
      (p.moons || []).forEach(function (m) { local = Math.max(local, m.orbit + m.size); });
      (p.elements || []).forEach(function (e) {
        if (e.type === 'comet') local = Math.max(local, VISUAL.passageiro);
        if (e.type === 'star') local = Math.max(local, p.size * 2.7 + VISUAL.sinal);
      });
      radius = Math.max(radius, p.orbit + local);
    });
    (system.orbiters || []).forEach(function (o) {
      radius = Math.max(radius, o.orbit + (o.type === 'companion' ? VISUAL.companheira : VISUAL.sonho));
    });
    return radius;
  }

  // Faixas adaptáveis: cada profundidade começa depois da faixa anterior.
  // Cada sistema ocupa um anel próprio. Assim a rotação diferencial não faz
  // sistemas que estavam separados no início colidirem mais tarde.
  function positionSystems(entries) {
    var cursor = RAIO_PROIBIDO_EU;
    for (var depth = 0; depth <= 4; depth++) {
      if (depth > 0) cursor += FOLGA_PROFUNDIDADE;
      entries.filter(function (entry) { return entry.system.depth === depth; }).forEach(function (entry) {
        var system = entry.system;
        var radius = getSystemRadius(system);
        var distance = cursor + radius + entry.radial * VARIACAO_RADIAL;
        var x = distance * Math.cos(entry.angle);
        var z = distance * Math.sin(entry.angle);
        system.position = [x, 0, z];
        if (system.center.kind === 'visitor') {
          // Aproximação inteira contida no anel reservado ao visitante.
          system.center.path = [DESLOCAMENTO_VISITANTE, -DESLOCAMENTO_VISITANTE].map(function (delta) {
            return [(distance + delta) * Math.cos(entry.angle), 0, (distance + delta) * Math.sin(entry.angle)];
          });
        }
        cursor = distance + radius + FOLGA_SISTEMAS;
      });
    }
  }

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
    var sistemasEntrada = spec.sistemas || [];
    var entries = [];

    sistemasEntrada.forEach(function (sis, sisIdx) {
      var rng = createRNG(sis.id || ('sys_' + sisIdx));
      var depth = (sis.profundidade !== undefined && sis.profundidade !== null) ? sis.profundidade : 1;
      // Mantém os dois sorteios anteriores às órbitas: a semente não muda os parâmetros.
      var radial = rng();
      var anguloBase = (sisIdx / Math.max(1, sistemasEntrada.length)) * (Math.PI * 2);
      var angulo = anguloBase + (rng() - 0.5) * 0.5;
      var posFinal = [0, 0, 0];

      // Compilar Centro do Sistema
      var cSrc = sis.centro || {};
      var cCompiled = compileCenter(cSrc);

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

      var system = {
        id: sis.id,
        name: sis.nome,
        position: posFinal,
        depth: depth,
        center: cCompiled,
        planets: compiledPlanets,
        orbiters: compiledOrbiters
      };
      universe.systems.push(system);
      entries.push({ system: system, radial: radial, angle: angulo });
    });
    positionSystems(entries);

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

    return prepareUniverseForDisplay(universe);
  }

  // Sinais antigos não têm info. Preenche a descrição do marcador nos dados,
  // nunca no painel, sem alterar o mock ou inventar uma história da pessoa.
  function prepareUniverseForDisplay(universe) {
    return Object.assign({}, universe, {
      systems: universe.systems.map(function (system) {
        return Object.assign({}, system, {
          planets: (system.planets || []).map(function (planet) {
            if (planet.kind !== 'exo') return planet;
            return Object.assign({}, planet, {
              elements: (planet.elements || []).map(function (element) {
                if (element.type !== 'star') return element;
                var original = element.info || {};
                var defaults = {
                  label: 'Sinal · Exoplaneta',
                  summary: 'Marcador ligado ao exoplaneta “' + planet.name + '”. Acende conforme os sinais deste planeta são ativados.',
                  law: 'distancia',
                  why: 'O sinal destaca um caminho fora do sistema principal. A distância indica acesso à consciência, não importância.',
                  phase: 'marcador de um caminho possível',
                  notes: {}
                };
                var info = {};
                Object.keys(defaults).forEach(function (key) {
                  info[key] = original[key] || defaults[key];
                });
                return Object.assign({}, element, { info: info });
              })
            });
          })
        });
      })
    });
  }

  // Compilação do Centro
  function compileCenter(cSrc) {
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
      // O caminho será calculado depois, dentro do espaço reservado ao sistema.
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

        if (eSrc.rotulo || eSrc.label || eSrc.summary || eSrc.resumo
          || eSrc.porque || eSrc.why || eSrc.fase || eSrc.phase || eSrc.lei || eSrc.law) {
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

  // Medidas para conferir a geometria no Node e no navegador, sem duplicar cálculos.
  // Reposicionamento opcional para a fase pessoal, após aplicar tamanhos reais.
  // compileSpec e Helena continuam usando exatamente o caminho original.
  compileSpec.layoutSystems = function (universe) {
    var systems = universe.systems.filter(function (s) { return s.id !== 'eu'; });
    positionSystems(systems.map(function (s, i) {
      var rng = createRNG(s.id), radial = rng();
      return { system: s, radial: radial, angle: i / systems.length * Math.PI * 2 + (rng() - 0.5) * 0.5 };
    }));
  };
  compileSpec.geometry = Object.freeze({
    selfRadius: RAIO_EU,
    diskRadius: RAIO_DISCO_EU,
    forbiddenRadius: RAIO_PROIBIDO_EU,
    systemGap: FOLGA_SISTEMAS,
    depthGap: FOLGA_PROFUNDIDADE,
    systemRadius: getSystemRadius
  });

  // Exportação compatível
  if (typeof NEXUS !== 'undefined') {
    NEXUS.compileSpec = compileSpec;
    NEXUS.prepareUniverseForDisplay = prepareUniverseForDisplay;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = compileSpec;
    module.exports.prepareUniverseForDisplay = prepareUniverseForDisplay;
  }
})();
