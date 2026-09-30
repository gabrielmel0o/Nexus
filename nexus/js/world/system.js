/* system.js — monta UM sistema inteiro: uma "caixa" (grupo) com posição própria que guarda
   a estrela, a luz da estrela, as órbitas e os planetas. Cada sistema tem a sua caixa. */
(function () {
  const N = NEXUS;

  N.buildSystem = function (systemData) {
    const group = new THREE.Group();                         // a caixa deste sistema
    group.position.set(...systemData.position);              // coloca a caixa no lugar certo do universo
    group.rotation.x = .16;                                  // leve inclinação, dá profundidade
    N.scene.add(group);

    // Luz DESTA estrela: cor da estrela bem clareada, com alcance limitado (60).
    // Assim ela não ilumina os outros sistemas, que ficam bem longe.
    const lightColor = new THREE.Color(systemData.starColor).lerp(new THREE.Color(0xffffff), .75);
    group.add(new THREE.PointLight(lightColor, 1.7, 60, .5));

    const sun = N.buildSun(systemData, group);
    const planets = N.buildPlanets(systemData.planets, group);
    const system = { data: systemData, group, sun, planets };
    system.lod = N.buildLOD(group, planets);                 // nível de detalhe por distância (lod.js)
    return system;
  };

  // Chamado a cada quadro para cada sistema: gira a estrela e move os planetas.
  N.updateSystem = (system, dt) => {
    system.sun.rotation.y += dt * .05;
    // "nomes" = quão visíveis os nomes estão agora (0 a 1). No 1º quadro o LOD ainda não calculou: começa em 0.
    const nomes = system.lod.cur ? system.lod.cur.nomes : 0;
    N.updatePlanets(system.planets, dt, nomes);
    N.updateLOD(system, dt);                                 // depois dos planetas: usa a posição nova deles
  };
})();
