/* system.js — monta UM sistema inteiro: uma "caixa" (grupo) com posição própria que guarda
   o centro (via centerBuilders), a luz (só em sistemas com planetas), planetas, orbitantes e LOD.

   Orbitantes (orbiters) são construídos via N.elementBuilders[type]:
     companion, dream etc. São filhos do grupo do sistema (não do planeta). */
(function () {
  var N = NEXUS;

  N.buildSystem = function (systemData) {
    var group = new THREE.Group();                          // a caixa deste sistema
    group.position.set.apply(group.position, systemData.position);
    group.rotation.x = .16;                                 // leve inclinação — dá profundidade
    N.scene.add(group);

    // A estrela emite PointLight SOMENTE se o sistema tiver planetas.
    // No universo de Helena, só "criacao" e "nao-escolhida" têm planetas.
    var pointLight = null;
    if (systemData.planets && systemData.planets.length > 0) {
      var baseColor = systemData.center && systemData.center.color
        ? systemData.center.color
        : '#ffffff';
      var lightColor = new THREE.Color(baseColor).lerp(new THREE.Color(0xffffff), .75);
      pointLight = new THREE.PointLight(lightColor, 1.7, 60, .5);
      group.add(pointLight);
    }

    // ── Centro visual (por kind: star, binary, blackhole, nebula, visitor…) ──
    N.centerBuilders = N.centerBuilders || {};
    var kind = (systemData.center && systemData.center.kind) || 'star';
    var builder = N.centerBuilders[kind];

    // Fallback: se não conhecer o kind, usa 'star' e avisa no console
    if (!builder) {
      console.warn('Center kind \'' + kind + '\' desconhecido. Usando \'star\'.');
      builder = N.centerBuilders['star'];
    }

    var centerObj = builder(systemData, group);

    // Registra o CENTRO do sistema no mapa de seleção.
    // getPos: função que devolve a posição ATUAL do centro no mundo (o grupo do sistema).
    // radius: tamanho aproximado do centro — usado pelo flyTo para não entrar dentro.
    var RAIOS_CENTRO = { star: 4, binary: 10, blackhole: 6, nebula: 9, visitor: 3 };
    var centroRadius = RAIOS_CENTRO[(systemData.center && systemData.center.kind) || 'star'] || 4;
    var centroWP = new THREE.Vector3();
    N.pickRegistry[systemData.id] = {
      getPos: function () {
        group.getWorldPosition(centroWP);
        return centroWP;
      },
      radius: centroRadius
    };

    // ── Planetas ──────────────────────────────────────────────────────────────
    var planets = (systemData.planets && systemData.planets.length > 0)
      ? N.buildPlanets(systemData.planets, group)
      : [];

    // ── Orbitantes (companion, dream etc.) ────────────────────────────────────
    // São filhos do grupo do sistema (orbitam o centro, não um planeta).
    var orbiters = [];
    var orbitersData = systemData.orbiters || [];
    orbitersData.forEach(function (orb) {
      N.elementBuilders = N.elementBuilders || {};
      var orbBuilder = N.elementBuilders[orb.type];
      if (orbBuilder) {
        var inst = orbBuilder(orb, systemData);
        group.add(inst.object);
        orbiters.push(inst);

        // Registra o orbitante: getPos segue o objeto 3D em movimento
        var orbWP = new THREE.Vector3();
        N.pickRegistry[orb.id] = {
          getPos: (function (obj) {
            return function () {
              obj.getWorldPosition(orbWP);
              return orbWP;
            };
          })(inst.object),
          radius: 1.5  // anã vermelha / sonho recorrente são pequenos
        };
      } else {
        console.warn('Orbiter type \'' + orb.type + '\' sem builder. Ignorado.');
      }
    });

    // Rótulo com o nome do sistema (vinculado ao id para highlight)
    var label = N.createLabel(systemData.name, systemData.id);

    // ── Rotação diferencial galáctica em torno do Eu [0,0,0] (Extra E4) ──────
    // Fórmula: ω(r) = ω0 / (1 + r / 40)
    // ω0 calibrado para o sistema mais próximo (criacao, r≈51.26) dar 1 volta em 10 min (600s).
    var isEu = systemData.id === 'eu';
    var isRafael = systemData.id === 'rafael';
    var x0 = systemData.position[0];
    var y0 = systemData.position[1];
    var z0 = systemData.position[2];
    var rXZ = Math.sqrt(x0 * x0 + z0 * z0);
    var theta0 = Math.atan2(z0, x0);
    var OMEGA_0 = (2 * Math.PI / N.VOLTA_GALAXIA_SEGUNDOS) * (1 + 51.264 / 40);
    var omega = (isEu || isRafael || rXZ < 0.001) ? 0 : (OMEGA_0 / (1 + rXZ / 40));

    var galaxyOrbit = {
      isStatic: isEu || isRafael || rXZ < 0.001,
      r: rXZ,
      y: y0,
      angle: theta0,
      omega: omega
    };

    // ── Linha de órbita do sistema em torno de O Eu (Correção 2) ──────────
    var galaxyOrbitLine = null;
    if (!galaxyOrbit.isStatic) {
      var ptsCount = 128;
      var pts = [];
      for (var i = 0; i <= ptsCount; i++) {
        var a = (i / ptsCount) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * rXZ, y0, Math.sin(a) * rXZ));
      }
      var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      var lineMat = N.createOrbitMaterial ? N.createOrbitMaterial(0x8a8fe8) : new THREE.LineBasicMaterial({ color: 0x8a8fe8, transparent: true, opacity: 0.2 });
      galaxyOrbitLine = new THREE.Line(lineGeo, lineMat);
      N.scene.add(galaxyOrbitLine);

      if (N.registerOrbit) {
        var sysOrbitWP = new THREE.Vector3();
        N.registerOrbit({
          line: galaxyOrbitLine,
          category: 'major',
          getBodyPos: function () {
            group.getWorldPosition(sysOrbitWP);
            return sysOrbitWP;
          },
          getPhase: function () {
            return galaxyOrbit ? (galaxyOrbit.angle / (Math.PI * 2)) : 0;
          },
          getDir: function () {
            return (galaxyOrbit.omega < 0) ? -1.0 : 1.0;
          }
        });
      }
    }

    var system = {
      data: systemData,
      group: group,
      centerObj: centerObj,
      pointLight: pointLight,
      planets: planets,
      orbiters: orbiters,
      label: label,
      galaxyOrbit: galaxyOrbit,
      galaxyOrbitLine: galaxyOrbitLine
    };

    // Registra no mapa global de sistemas para acesso direto por forças / outros módulos
    N.systemsById = N.systemsById || {};
    N.systemsById[systemData.id] = system;

    // LOD cuida de esconder planetas, luas, órbitas, nomes e elementos quando longe
    // O centro NUNCA some — o LOD só controla planetas, órbitas, nomes e elementos.
    system.lod = N.buildLOD(group, planets);
    return system;
  };

  // Chamado a cada quadro para cada sistema
  N.updateSystem = function (system, dt) {
    // 0) Rotação diferencial da galáxia em torno do Eu (eixo Y horizontal)
    if (system.galaxyOrbit && !system.galaxyOrbit.isStatic) {
      if (N.ROTACAO_GALAXIA !== false) {
        system.galaxyOrbit.angle += system.galaxyOrbit.omega * dt;
        system.group.position.x = system.galaxyOrbit.r * Math.cos(system.galaxyOrbit.angle);
        system.group.position.z = system.galaxyOrbit.r * Math.sin(system.galaxyOrbit.angle);
        system.group.position.y = system.galaxyOrbit.y;
      } else {
        // Retorna ao estado estático caso ROTACAO_GALAXIA seja desligado
        system.group.position.x = system.data.position[0];
        system.group.position.y = system.data.position[1];
        system.group.position.z = system.data.position[2];
      }
    }

    // Atualiza o centro (seja ele qual for)
    system.centerObj.update(dt);

    // Atualiza os orbitantes (companion, dream etc.)
    system.orbiters.forEach(function (o) { o.update(dt); });

    // "nomes" = quão visíveis os nomes estão agora (0 a 1). No 1º quadro o LOD ainda não calculou: começa em 0.
    var nomes = system.lod.cur ? system.lod.cur.nomes : 0;

    // Atualiza o rótulo do sistema com a curva de distância da categoria 'major'
    var sysWP = new THREE.Vector3();
    system.group.getWorldPosition(sysWP);
    var sysLabelAlpha = N.getLabelDistFactor ? N.getLabelDistFactor(sysWP, 'major') : nomes;
    N.updateLabel(system.label, system.group, 4, sysLabelAlpha);

    if (system.planets.length > 0) {
      N.updatePlanets(system.planets, dt, nomes);
    }

    N.updateLOD(system, dt);
  };
})();
