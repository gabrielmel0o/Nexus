/* main.js — o MAESTRO. Não desenha nada: só chama cada peça, na ordem, e mantém o relógio andando. */
(function () {
  const N = NEXUS;
  const universe = N.getUniverse();          // 1) pega os dados

  N.buildBackground();                       // 2) monta o mundo, peça por peça
  N.buildStarfield();
  const systems = universe.systems.map(s => N.buildSystem(s));   // um sistema para cada item dos dados

  let last = performance.now();
  function loop(now) {                       // 3) a cada quadro (~60x por segundo):
    const dt = Math.min((now - last) / 1000, .05);   //    quanto tempo passou
    last = now;
    N.controls.update(dt);                   //    mexe a câmera
    systems.forEach(s => N.updateSystem(s, dt));     //    gira estrelas e move planetas de cada sistema
    N.renderer.render(N.scene, N.cam);       //    desenha
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
