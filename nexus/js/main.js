/* main.js — o MAESTRO. Não desenha nada: só chama cada peça, na ordem, e mantém o relógio andando.

   A partir do P6, os dados vêm no formato do universo de Helena:
   { title, chapter, laws, systems[], forces[], chapters[] }
   O campo "today" foi removido dos dados e não é mais lido aqui. */
(function () {
  const N = NEXUS;
  const universe = N.getUniverse();   // 1) pega os dados (NEXUS.data, de mockUniverse.js)

  N.buildBackground();                // 2) monta o mundo, peça por peça
  N.buildStarfield();

  // Cria um grupo 3D para cada sistema do universo de Helena (8 sistemas).
  const systems = universe.systems.map(s => N.buildSystem(s));

  let last = performance.now();
  function loop(now) {                // 3) a cada quadro (~60x por segundo):
    const dt = Math.min((now - last) / 1000, .05);   // quanto tempo passou (limitado a 50ms)
    last = now;
    N.controls.update(dt);                           // mexe a câmera
    systems.forEach(s => N.updateSystem(s, dt));     // gira estrelas e move planetas de cada sistema
    N.renderer.render(N.scene, N.cam);               // desenha
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
