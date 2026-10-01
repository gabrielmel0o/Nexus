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
    if (systemData.planets && systemData.planets.length > 0) {
      var baseColor = systemData.center && systemData.center.color
        ? systemData.center.color
        : '#ffffff';
      var lightColor = new THREE.Color(baseColor).lerp(new THREE.Color(0xffffff), .75);
      group.add(new THREE.PointLight(lightColor, 1.7, 60, .5));
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

    var system = {
      data: systemData,
      group: group,
      centerObj: centerObj,
      planets: planets,
      orbiters: orbiters,
      label: label
    };

    // LOD cuida de esconder planetas, luas, órbitas, nomes e elementos quando longe
    // O centro NUNCA some — o LOD só controla planetas, órbitas, nomes e elementos.
    system.lod = N.buildLOD(group, planets);
    return system;
  };

  // Chamado a cada quadro para cada sistema
  N.updateSystem = function (system, dt) {
    // Atualiza o centro (seja ele qual for)
    system.centerObj.update(dt);

    // Atualiza os orbitantes (companion, dream etc.)
    system.orbiters.forEach(function (o) { o.update(dt); });

    // "nomes" = quão visíveis os nomes estão agora (0 a 1). No 1º quadro o LOD ainda não calculou: começa em 0.
    var nomes = system.lod.cur ? system.lod.cur.nomes : 0;

    // Atualiza o rótulo do sistema (posicionado logo acima do centro)
    N.updateLabel(system.label, system.group, 4, nomes);

    if (system.planets.length > 0) {
      N.updatePlanets(system.planets, dt, nomes);
    }

    N.updateLOD(system, dt);
  };
})();
