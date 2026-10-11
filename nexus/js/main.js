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
  let previa = null;
  let previaFrame = null;
  let fundoPronto = false;

  function montarFundo() {
    if (fundoPronto) return;
    N.buildBackground();
    N.buildStarfield();
    fundoPronto = true;
  }

  function retirarPrevia() {
    if (previaFrame !== null) cancelAnimationFrame(previaFrame);
    previaFrame = null;
    if (!previa) return;
    N.scene.remove(previa.group);
    // O Eu da prévia possui suas próprias geometrias, materiais e texturas do disco.
    previa.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      const materiais = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
      materiais.forEach(material => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    });
    previa = null;
  }

  function mostrarPrevia() {
    montarFundo();
    const eu = N.getUniverse().systems.find(s => s.center && s.center.variant === 'self');
    const group = new THREE.Group();
    group.position.set.apply(group.position, eu.position);
    group.rotation.x = .16; // Mesma inclinação usada em world/system.js.
    N.scene.add(group);
    previa = { group, center: N.centerBuilders.blackhole(eu, group) };
    // A prévia não registra seleção nem define o universo ativo.
    let last = performance.now();
    function desenharPrevia(now) {
      const dt = Math.min((now - last) / 1000, .05);
      last = now;
      N.controls.update(dt);
      previa.center.update(dt);
      N.renderer.render(N.scene, N.cam);
      previaFrame = requestAnimationFrame(desenharPrevia);
    }
    previaFrame = requestAnimationFrame(desenharPrevia);
  }

  // Função de BOOT que recebe os dados do universo e monta a cena
  N.boot = function (universoRecebido) {
    if (jaFezBoot) return;
    jaFezBoot = true;
    retirarPrevia();

    // Define o universo ativo e inicializa os parâmetros no state
    const source = universoRecebido || N.getUniverse();
    // Completa apenas os dados dos sinais, preservando o universo original.
    const universe = N.prepareUniverseForDisplay ? N.prepareUniverseForDisplay(source) : source;
    N.currentUniverse = universe;
    if (N.state && typeof N.state.init === 'function') {
      N.state.init(universe);
    }
    if (N.time && N.time.refresh) N.time.refresh();

    montarFundo();                            // 2) monta o mundo, peça por peça
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
  if (!jaFezBoot && document.body.classList.contains('modo-start')) mostrarPrevia();
})();
