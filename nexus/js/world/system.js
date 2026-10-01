/* system.js — monta UM sistema inteiro: uma "caixa" (grupo) com posição própria que guarda
   a estrela, a luz da estrela (só em sistemas com planetas), as órbitas e os planetas.

   A partir do P6, cada sistema tem um "center" tipado (kind: 'star', 'blackhole', 'binary', etc.).
   Por enquanto, QUALQUER tipo de center é desenhado como a estrela simples (sun.js),
   até que os builders específicos sejam criados (P8, P10, P11...).

   No P7, sun.js vai se registrar em NEXUS.centerBuilders['star'] e este arquivo vai
   chamar centerBuilders[kind]. Por ora, chama buildSun diretamente. */
(function () {
  const N = NEXUS;

  N.buildSystem = function (systemData) {
    const group = new THREE.Group();                         // a caixa deste sistema
    group.position.set(...systemData.position);             // coloca no lugar certo do universo
    group.rotation.x = .16;                                 // leve inclinação — dá profundidade
    N.scene.add(group);

    // A estrela emite PointLight SOMENTE se o sistema tiver planetas.
    // (Lei: só estrelas com planetas iluminam área. Buraco negro, binária, etc. sem planetas = sem luz.)
    // No universo de Helena, só "criacao" e "nao-escolhida" têm planetas.
    if (systemData.planets && systemData.planets.length > 0) {
      // Usa a cor do center (campo "color"); se não tiver, usa branco como fallback seguro.
      const baseColor = systemData.center && systemData.center.color
        ? systemData.center.color
        : '#ffffff';
      const lightColor = new THREE.Color(baseColor).lerp(new THREE.Color(0xffffff), .75);
      group.add(new THREE.PointLight(lightColor, 1.7, 60, .5));
    }

    // Constrói o centro visual. Por enquanto usa buildSun para qualquer kind.
    // buildSun espera um objeto com "starColor" e "starPatch" — montamos esses campos
    // a partir do novo formato (center.color, center.patch) sem quebrar sun.js.
    const centerData = systemData.center || {};
    const fakeSystem = {
      // sun.js usa esses dois campos; traduzimos aqui para não alterar sun.js agora
      starColor: centerData.color || '#ffb020',
      starPatch:  centerData.patch || ['#ffd43b', '#ff8a1f', '#fff3a0']
    };
    const sun = N.buildSun(fakeSystem, group);

    // Planetas: só monta se existirem. Sistemas sem planetas (Eu, binária, etc.) ficam sem planetas.
    const planets = (systemData.planets && systemData.planets.length > 0)
      ? N.buildPlanets(systemData.planets, group)
      : [];

    const system = { data: systemData, group, sun, planets };

    // LOD: só faz sentido se houver planetas.
    system.lod = N.buildLOD(group, planets);
    return system;
  };

  // Chamado a cada quadro: gira a estrela e move os planetas.
  N.updateSystem = (system, dt) => {
    system.sun.rotation.y += dt * .05;
    // "nomes" = quão visíveis os nomes estão agora (0 a 1). No 1º quadro o LOD ainda não calculou: começa em 0.
    const nomes = system.lod.cur ? system.lod.cur.nomes : 0;
    if (system.planets.length > 0) {
      N.updatePlanets(system.planets, dt, nomes);
    }
    N.updateLOD(system, dt);   // depois dos planetas: usa a posição nova deles
  };
})();
