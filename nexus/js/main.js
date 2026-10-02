/* main.js — o MAESTRO. Não desenha nada: só chama cada peça, na ordem, e mantém o relógio andando. */
(function () {
  const N = NEXUS;
  const universe = N.getUniverse();          // 1) pega os dados

  N.buildBackground();                       // 2) monta o mundo, peça por peça
  N.buildStarfield();
  const arms = N.buildArms ? N.buildArms() : null; // braços espirais da galáxia (rotinas)
  
  // Cria um sistema para cada item dos dados
  const systems = universe.systems.map(s => N.buildSystem(s));   

  let last = performance.now();
  function loop(now) {                       // 3) a cada quadro (~60x por segundo):
    const dt = Math.min((now - last) / 1000, .05);   // quanto tempo passou
    last = now;
    
    N.state.update(dt);                      // aproxima valores animáveis (suavização)
    N.controls.update(dt);                   // mexe a câmera
    if (N.updateForces) N.updateForces(dt);  // sentimentos como forças: marés, eclipses, gravidade
    if (arms && arms.update) arms.update(dt);// rotação dos braços e rótulos
    systems.forEach(s => N.updateSystem(s, dt));     // gira estrelas e move planetas
    if (N.events && N.events.update) N.events.update(dt); // eventos cósmicos como supernova
    if (N.panel && N.panel.update) N.panel.update(); // atualiza painel se capítulo mudar
    
    N.renderer.render(N.scene, N.cam);       // desenha
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
