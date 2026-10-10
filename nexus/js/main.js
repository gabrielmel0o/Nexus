/* main.js — o MAESTRO. Não desenha nada: só chama cada peça, na ordem, e mantém o relógio andando. */
(function () {
  // ══════════════════════════════════════════════════════════════════
  // ROTAÇÃO GALÁCTICA (Extra E4)
  // Com false, o universo volta a ficar parado como era antes.
  // ══════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════
  const ROTACAO_GALAXIA = true;
  const VOLTA_GALAXIA_SEGUNDOS = 240;

  const N = NEXUS;
  N.ROTACAO_GALAXIA = ROTACAO_GALAXIA;
  N.VOLTA_GALAXIA_SEGUNDOS = VOLTA_GALAXIA_SEGUNDOS;

  let jaFezBoot = false;

  // Função de BOOT que recebe os dados do universo e monta a cena
  N.boot = function (universoRecebido) {
    if (jaFezBoot) return;
    jaFezBoot = true;

    // Define o universo ativo e inicializa os parâmetros no state
    const universe = universoRecebido || N.getUniverse();
    N.currentUniverse = universe;
    if (N.state && typeof N.state.init === 'function') {
      N.state.init(universe);
    }

    N.buildBackground();                       // 2) monta o mundo, peça por peça
    N.buildStarfield();
    if (N.buildHalo) N.buildHalo();            // halo de matéria escura (inconsciente herdado)
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
      if (N.updateOrbitsFX) N.updateOrbitsFX();        // atenuação por distância e rastro invertido das órbitas
      if (N.events && N.events.update) N.events.update(dt); // eventos cósmicos como supernova
      if (N.panel && N.panel.update) N.panel.update(); // atualiza painel se capítulo mudar
      
      N.renderer.render(N.scene, N.cam);       // desenha
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };

  // Flag de teste via URL: ?universo=helena-compilada
  const params = new URLSearchParams(window.location.search);
  if (params.get('universo') === 'helena-compilada') {
    if (N.universeSource && typeof N.universeSource.fromHelenaCompilada === 'function') {
      try {
        const uComp = N.universeSource.fromHelenaCompilada();
        N.boot(uComp);
      } catch (err) {
        console.error('Falha ao compilar Helena via flag:', err);
        N.boot(N.getUniverse());
      }
    } else {
      N.boot(N.getUniverse());
    }
  }
})();
